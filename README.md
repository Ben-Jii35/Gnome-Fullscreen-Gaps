# Fullscreen Gaps

[![GNOME Shell](https://img.shields.io/badge/GNOME-45%20%7C%2046%20%7C%2047%20%7C%2050-blue?logo=gnome&logoColor=white)](https://extensions.gnome.org/)

**Fullscreen Gaps** est une extension pour GNOME Shell qui ajoute un espace flottant (gap) et des coins arrondis autour des fenêtres lorsqu'elles passent en mode plein écran ou maximisé.

---

## 🛠️ Installation Manuelle (Téléchargement)

Pour installer l'extension manuellement sans utiliser Git, suivez ces étapes simples :

### 1. Télécharger et extraire l'extension
1. Cliquez sur le bouton vert **Code** en haut de cette page, puis sur **Download ZIP**.
2. Extrayez l'archive ZIP téléchargée.

### 2. Installer les fichiers
1. Renommez le dossier extrait en `fullscreen-gaps@ben-j.github.com`.
2. Déplacez ce dossier dans le répertoire des extensions de votre utilisateur GNOME :
   * Chemin : `~/.local/share/gnome-shell/extensions/`
   
   *(Astuce : Vous pouvez ouvrir votre gestionnaire de fichiers, afficher les dossiers cachés avec `Ctrl + H`, puis naviguer dans `.local` -> `share` -> `gnome-shell` -> `extensions`)*

### 3. Compiler le schéma de configuration
Ouvrez un terminal et exécutez la commande suivante pour finaliser l'installation :
```bash
glib-compile-schemas ~/.local/share/gnome-shell/extensions/fullscreen-gaps@ben-j.github.com/schemas/
```

### 4. Activer l'extension
1. **Redémarrez GNOME Shell** pour qu'il détecte l'extension :
   * **Sous Wayland** (par défaut sur la plupart des distributions modernes) : Déconnectez-vous de votre session utilisateur, puis reconnectez-vous.
   * **Sous X11** : Appuyez sur `Alt + F2`, saisissez `r` et appuyez sur `Entrée`.
2. Activez l'extension **Fullscreen Gaps** en ouvrant l'application **Extensions** ou **Extension Manager** (Gestionnaire d'extensions), ou via le terminal :
   ```bash
   gnome-extensions enable fullscreen-gaps@ben-j.github.com
   ```

---

## ⚙️ Configuration

Une fois l'extension activée, ouvrez l'application **Extensions** ou **Extension Manager**, cherchez **Fullscreen Gaps** et cliquez sur son icône d'engrenage pour régler :
* La taille des marges (gaps).
* Le rayon de courbure des coins arrondis.
* L'application de l'effet aux fenêtres maximisées.
