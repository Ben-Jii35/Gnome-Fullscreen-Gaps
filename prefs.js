import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class FullscreenGapsPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // Create page
        const page = new Adw.PreferencesPage({
            title: 'Settings',
            icon_name: 'preferences-system-symbolic',
        });

        // Create group
        const group = new Adw.PreferencesGroup({
            title: 'Floating Windows Configuration',
            description: 'Configure the gaps and rounded corners for maximized and fullscreen windows.',
        });
        page.add(group);

        // Gap size setting row
        const rowGap = new Adw.ActionRow({
            title: 'Gap Size (pixels)',
            subtitle: 'Adjust the distance between the window and screen edges',
        });

        const spinGap = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 300,
                step_increment: 2,
                page_increment: 10,
            }),
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.END,
        });

        settings.bind(
            'gap-size',
            spinGap,
            'value',
            Gio.SettingsBindFlags.DEFAULT
        );

        rowGap.add_suffix(spinGap);
        group.add(rowGap);

        // Corner Radius setting row
        const rowRadius = new Adw.ActionRow({
            title: 'Corner Radius (pixels)',
            subtitle: 'Adjust the roundness of window corners',
        });

        const spinRadius = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 100,
                step_increment: 2,
                page_increment: 10,
            }),
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.END,
        });

        settings.bind(
            'corner-radius',
            spinRadius,
            'value',
            Gio.SettingsBindFlags.DEFAULT
        );

        rowRadius.add_suffix(spinRadius);
        group.add(rowRadius);

        // Enable Maximized switch row
        const rowMaximized = new Adw.SwitchRow({
            title: 'Apply to Maximized Windows',
            subtitle: 'Enable gaps and rounded corners for maximized windows',
        });
        settings.bind(
            'enable-maximized',
            rowMaximized,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        group.add(rowMaximized);





        window.add(page);
    }
}
