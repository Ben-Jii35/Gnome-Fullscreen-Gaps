#!/usr/bin/env bash

# Script d'installation pour l'extension Fullscreen Gaps

UUID="fullscreen-gaps@ben-j.github.com"
DEST_DIR="$HOME/.local/share/gnome-shell/extensions/$UUID"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "\e[1;34m=== Installation de l'extension GNOME : Fullscreen Gaps ===\e[0m"

# 1. Compilation des schémas GSettings
echo -e "\e[32m[1/3] Compilation du schéma GSettings...\e[0m"
if [ -d "$SRC_DIR/schemas" ]; then
    glib-compile-schemas "$SRC_DIR/schemas/"
else
    echo -e "\e[31mErreur : Le dossier 'schemas' n'existe pas.\e[0m"
    exit 1
fi

# 2. Copie des fichiers vers le dossier GNOME Extensions
echo -e "\e[32m[2/3] Copie des fichiers dans le dossier utilisateur des extensions...\e[0m"
rm -rf "$DEST_DIR"
mkdir -p "$DEST_DIR"
cp -r "$SRC_DIR/extension.js" "$SRC_DIR/metadata.json" "$SRC_DIR/prefs.js" "$SRC_DIR/schemas" "$DEST_DIR/"

# 3. Activation de l'extension
echo -e "\e[32m[3/3] Tentative d'activation de l'extension...\e[0m"
if command -v gnome-extensions &> /dev/null; then
    # Ré-activation pour forcer la prise en compte du nouveau code
    gnome-extensions disable "$UUID" 2>/dev/null
    gnome-extensions enable "$UUID" 2>/dev/null
    echo -e "\e[1;32mExtension installée et activée avec succès !\e[0m"
else
    echo -e "\e[33mExtension installée. Note : la commande 'gnome-extensions' n'est pas disponible pour l'auto-activation.\e[0m"
fi

echo -e "\n\e[1;33mIMPORTANT (Wayland) :\e[0m"
echo -e "Comme vous êtes sous Wayland, vous devez vous déconnecter et vous reconnecter"
echo -e "pour que GNOME Shell recharge le nouveau code et charge l'extension correctement."
