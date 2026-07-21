import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';
import Cogl from 'gi://Cogl';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const RoundedCornersEffect = GObject.registerClass({
    GTypeName: 'RoundedCornersEffect',
}, class extends Shell.GLSLEffect {
    _init() {
        super._init();
        this._sizeLocation = -1;
        this._scaleLocation = -1;
        this._radiusLocation = -1;
        this._width = 0;
        this._height = 0;
        this._radius = 0;
        this._scaleX = 1.0;
        this._scaleY = 1.0;
    }

    vfunc_build_pipeline() {
        const declarations = `
            uniform vec2 size;
            uniform vec2 scale;
            uniform float radius;
        `;

        const code = `
            vec2 tex = cogl_tex_coord_in[0].xy;
            vec2 pos = tex * size * scale;
            vec2 sz = size * scale;
            float r = radius;
            float dist = 0.0;
            bool in_corner = false;

            if (pos.x < r && pos.y < r) {
                dist = length(pos - vec2(r, r));
                in_corner = true;
            } else if (pos.x > sz.x - r && pos.y < r) {
                dist = length(pos - vec2(sz.x - r, r));
                in_corner = true;
            } else if (pos.x < r && pos.y > sz.y - r) {
                dist = length(pos - vec2(r, sz.y - r));
                in_corner = true;
            } else if (pos.x > sz.x - r && pos.y > sz.y - r) {
                dist = length(pos - vec2(sz.x - r, sz.y - r));
                in_corner = true;
            }

            if (in_corner) {
                if (dist > r) {
                    float delta = dist - r;
                    float factor = clamp(1.0 - delta, 0.0, 1.0);
                    cogl_color_out *= factor;
                }
            }
        `;

        this.add_glsl_snippet(Cogl.SnippetHook.FRAGMENT, declarations, code, false);
    }

    updateParams(width, height, radius, scale_x = 1.0, scale_y = 1.0) {
        if (this._width === width && this._height === height && this._radius === radius && this._scaleX === scale_x && this._scaleY === scale_y)
            return;

        this._width = width;
        this._height = height;
        this._radius = radius;
        this._scaleX = scale_x;
        this._scaleY = scale_y;

        if (this._sizeLocation === -1) {
            this._sizeLocation = this.get_uniform_location('size');
        }
        if (this._scaleLocation === -1) {
            this._scaleLocation = this.get_uniform_location('scale');
        }
        if (this._radiusLocation === -1) {
            this._radiusLocation = this.get_uniform_location('radius');
        }

        if (this._sizeLocation !== -1) {
            this.set_uniform_float(this._sizeLocation, 2, [width, height]);
        }
        if (this._scaleLocation !== -1) {
            this.set_uniform_float(this._scaleLocation, 2, [scale_x, scale_y]);
        }
        if (this._radiusLocation !== -1) {
            this.set_uniform_float(this._radiusLocation, 1, [radius]);
        }

        this.queue_repaint();
    }
});

class WindowTracker {
    constructor(extension) {
        this._extension = extension;
        this._signals = new Map(); // win -> { winSignals: [], actorSignals: [] }
    }

    track(win, isNew = false) {
        if (this._signals.has(win)) {
            return;
        }

        // Only track normal windows
        if (!win.is_skip_taskbar() && win.get_window_type() === Meta.WindowType.NORMAL) {
            let notifyFullscreenId = win.connect('notify::fullscreen', (w) => {
                this._extension.updateWindow(w);
            });

            let notifyMaximizedHId = win.connect('notify::maximized-horizontally', (w) => {
                this._extension.updateWindow(w);
            });

            let notifyMaximizedVId = win.connect('notify::maximized-vertically', (w) => {
                this._extension.updateWindow(w);
            });

            let sizeChangedId = win.connect('size-changed', (w) => {
                this._extension.updateWindow(w);
            });

            let unmanagedId = win.connect('unmanaged', (w) => {
                this.untrack(w);
            });

            let actorSignals = [];
            let actor = win.get_compositor_private ? win.get_compositor_private() : null;
            if (actor) {
                let sizeId = actor.connect('notify::size', () => {
                    this._extension.updateWindow(win);
                });
                let scaleXId = actor.connect('notify::scale-x', () => {
                    this._extension.handleScaleChanged(win);
                });
                let scaleYId = actor.connect('notify::scale-y', () => {
                    this._extension.handleScaleChanged(win);
                });
                actorSignals.push(
                    { obj: actor, id: sizeId },
                    { obj: actor, id: scaleXId },
                    { obj: actor, id: scaleYId }
                );
            }

            this._signals.set(win, {
                winSignals: [
                    notifyFullscreenId,
                    notifyMaximizedHId,
                    notifyMaximizedVId,
                    sizeChangedId,
                    unmanagedId
                ],
                actorSignals: actorSignals
            });

            // Initial check: if newly created, delay slightly to let mapping animations finish
            if (isNew) {
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
                    try {
                        this._extension.updateWindow(win);
                    } catch (e) {}
                    return GLib.SOURCE_REMOVE;
                });
            } else {
                this._extension.updateWindow(win);
            }
        }
    }

    untrack(win) {
        let tracking = this._signals.get(win);
        if (tracking) {
            tracking.winSignals.forEach(id => {
                if (win.disconnect) {
                    try {
                        win.disconnect(id);
                    } catch (e) {
                        // ignore
                    }
                }
            });
            tracking.actorSignals.forEach(sig => {
                try {
                    sig.obj.disconnect(sig.id);
                } catch (e) {
                    // ignore
                }
            });
            this._signals.delete(win);
        }

        this._extension.resetWindow(win);
    }

    destroy() {
        for (let win of this._signals.keys()) {
            this.untrack(win);
        }
    }
}

export default class FullscreenGapsExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._tracker = new WindowTracker(this);

        // Listen for new windows
        this._windowCreatedId = global.display.connect('window-created', (display, win) => {
            GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                this._tracker.track(win);
                return GLib.SOURCE_REMOVE;
            });
        });

        // Track existing windows
        global.display.list_all_windows().forEach(win => {
            this._tracker.track(win);
        });

        // Update when settings change
        this._settingsChangedId = this._settings.connect('changed', () => {
            global.display.list_all_windows().forEach(win => {
                this.updateWindow(win);
            });
        });
    }

    disable() {
        if (this._windowCreatedId) {
            global.display.disconnect(this._windowCreatedId);
            this._windowCreatedId = null;
        }

        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }

        if (this._tracker) {
            this._tracker.destroy();
            this._tracker = null;
        }

        this._settings = null;
    }

    shouldApply(win) {
        if (!win || win.is_skip_taskbar()) {
            return false;
        }
        if (win.get_window_type() !== Meta.WindowType.NORMAL) {
            return false;
        }

        // Never apply to fullscreen windows
        if (win.is_fullscreen()) {
            return false;
        }

        if (this._settings.get_boolean('enable-maximized')) {
            if (typeof win.is_maximized === 'function') {
                if (win.is_maximized()) {
                    return true;
                }
            } else if (typeof win.get_maximized === 'function') {
                let max = win.get_maximized();
                if (max === (Meta.MaximizeFlags.HORIZONTAL | Meta.MaximizeFlags.VERTICAL)) {
                    return true;
                }
            }
        }

        return false;
    }

    updateWindow(win) {
        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            try {
                if (!win || typeof win.get_compositor_private !== 'function') {
                    return GLib.SOURCE_REMOVE;
                }

                let actor = win.get_compositor_private();
                if (!actor) {
                    return GLib.SOURCE_REMOVE;
                }

                // Ensure actor's signals are connected if they weren't when tracked
                if (this._tracker) {
                    let tracking = this._tracker._signals.get(win);
                    if (tracking && tracking.actorSignals && tracking.actorSignals.length === 0) {
                        let sizeId = actor.connect('notify::size', () => {
                            this.updateWindow(win);
                        });
                        let scaleXId = actor.connect('notify::scale-x', () => {
                            this.handleScaleChanged(win);
                        });
                        let scaleYId = actor.connect('notify::scale-y', () => {
                            this.handleScaleChanged(win);
                        });
                        tracking.actorSignals.push(
                            { obj: actor, id: sizeId },
                            { obj: actor, id: scaleXId },
                            { obj: actor, id: scaleYId }
                        );
                    }
                }

                if (this.shouldApply(win)) {
                    let effect = actor.get_effect('rounded-corners');
                    if (!effect) {
                        effect = new RoundedCornersEffect();
                        actor.add_effect_with_name('rounded-corners', effect);
                    }

                    let W = actor.get_width();
                    let H = actor.get_height();
                    let gap = this._settings.get_int('gap-size');
                    let radius = this._settings.get_int('corner-radius');

                    let scale_x = 1.0;
                    let scale_y = 1.0;
                    if (W > 2 * gap && H > 2 * gap) {
                        scale_x = (W - 2 * gap) / W;
                        scale_y = (H - 2 * gap) / H;
                    }

                    effect.updateParams(W, H, radius, scale_x, scale_y);

                    actor.set_pivot_point(0.5, 0.5);
                    actor.ease({
                        scale_x: scale_x,
                        scale_y: scale_y,
                        duration: 200,
                        mode: Clutter.AnimationMode.EASE_OUT_CUBIC,
                    });
                } else {
                    this.resetWindow(win);
                }
            } catch (err) {
                // Handle potential object destruction during idle callback
            }

            return GLib.SOURCE_REMOVE;
        });
    }

    resetWindow(win) {
        try {
            if (!win || typeof win.get_compositor_private !== 'function') {
                return;
            }
            let actor = win.get_compositor_private();
            if (actor) {
                if (actor.scale_x === 1.0 && actor.scale_y === 1.0) {
                    if (actor.get_effect && actor.get_effect('rounded-corners')) {
                        actor.remove_effect_by_name('rounded-corners');
                    }
                    return;
                }

                actor.ease({
                    scale_x: 1.0,
                    scale_y: 1.0,
                    duration: 200,
                    mode: Clutter.AnimationMode.EASE_OUT_CUBIC,
                    onComplete: () => {
                        try {
                            if (actor && actor.get_effect && actor.get_effect('rounded-corners')) {
                                actor.remove_effect_by_name('rounded-corners');
                            }
                        } catch (e) {
                            // ignore if actor is already destroyed
                        }
                    }
                });
            }
        } catch (err) {
            // Handle potential object destruction
        }
    }

    handleScaleChanged(win) {
        try {
            if (!win || typeof win.get_compositor_private !== 'function') {
                return;
            }
            let actor = win.get_compositor_private();
            if (!actor) {
                return;
            }

            if (this.shouldApply(win)) {
                // If there's an active transition on scale-x, it's our own ease animation, so ignore
                if (actor.get_transition && actor.get_transition('scale-x')) {
                    return;
                }

                let W = actor.get_width();
                let gap = this._settings.get_int('gap-size');
                let target_scale = 1.0;
                if (W > 2 * gap) {
                    target_scale = (W - 2 * gap) / W;
                }

                // If the current scale is different from the target scale
                if (Math.abs(actor.scale_x - target_scale) > 0.001) {
                    this.updateWindow(win);
                }
            }
        } catch (err) {
            // Handle potential object destruction
        }
    }
}
