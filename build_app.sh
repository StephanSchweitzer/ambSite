#!/bin/bash
#
# build_app.sh — package paintbrush.sh as a double-clickable macOS .app.
#
# Builds the bundle by hand rather than through Platypus or Automator, so the
# whole thing is reproducible from this repo with nothing extra installed.
# The bundle is just a launcher: it runs paintbrush.sh from this directory, so
# editing the script takes effect immediately without rebuilding.
#
# Usage:  ./build_app.sh  [output-directory]
#         defaults to the repo directory.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${1:-$REPO_DIR}"
APP="$OUT_DIR/Paintbrush.app"
APP_NAME="Paintbrush"

[ -f "$REPO_DIR/paintbrush.sh" ] || { echo "paintbrush.sh not found next to this script." >&2; exit 1; }

echo "Building $APP ..."
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

# ---------------------------------------------------------------------------
# Info.plist
# ---------------------------------------------------------------------------

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>            <string>$APP_NAME</string>
    <key>CFBundleDisplayName</key>     <string>$APP_NAME</string>
    <key>CFBundleExecutable</key>      <string>$APP_NAME</string>
    <key>CFBundleIdentifier</key>      <string>local.paintbrush.launcher</string>
    <key>CFBundleVersion</key>         <string>1.0</string>
    <key>CFBundleShortVersionString</key><string>1.0</string>
    <key>CFBundlePackageType</key>     <string>APPL</string>
    <key>CFBundleIconFile</key>        <string>AppIcon</string>
    <key>LSMinimumSystemVersion</key>  <string>10.13</string>
    <!-- No UI of its own: it runs, opens the browser and Claude, and exits. -->
    <key>LSUIElement</key>             <true/>
    <key>NSHighResolutionCapable</key> <true/>
</dict>
</plist>
PLIST

# ---------------------------------------------------------------------------
# Launcher stub
# ---------------------------------------------------------------------------
#
# Points at paintbrush.sh in this repo by absolute path, so the script stays
# the single source of truth and the .app never holds a stale copy.

cat > "$APP/Contents/MacOS/$APP_NAME" <<STUB
#!/bin/bash
exec "$REPO_DIR/paintbrush.sh"
STUB

chmod +x "$APP/Contents/MacOS/$APP_NAME"

# ---------------------------------------------------------------------------
# Icon
# ---------------------------------------------------------------------------

if command -v iconutil >/dev/null 2>&1 && command -v sips >/dev/null 2>&1; then
    echo "Generating icon ..."
    TMP="$(mktemp -d)"
    trap 'rm -rf "$TMP"' EXIT

    python3 "$REPO_DIR/make_icon.py" "$TMP/icon.png"

    ICONSET="$TMP/AppIcon.iconset"
    mkdir -p "$ICONSET"
    for spec in "16:16x16" "32:16x16@2x" "32:32x32" "64:32x32@2x" \
                "128:128x128" "256:128x128@2x" "256:256x256" \
                "512:256x256@2x" "512:512x512" "1024:512x512@2x"; do
        px="${spec%%:*}"
        name="${spec##*:}"
        sips -z "$px" "$px" "$TMP/icon.png" --out "$ICONSET/icon_$name.png" >/dev/null 2>&1
    done

    iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/AppIcon.icns"
    echo "Icon embedded."
else
    echo "WARNING: sips/iconutil unavailable — bundle will use the generic app icon." >&2
fi

# Refresh the icon cache so Finder shows the new icon immediately rather than
# whatever it cached for this bundle name previously.
touch "$APP"
if [ -x /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister ]; then
    /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
        -f "$APP" >/dev/null 2>&1 || true
fi

echo
echo "Built: $APP"
echo "Double-click it to launch the practice site."
