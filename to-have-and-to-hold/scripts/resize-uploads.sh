#!/bin/sh
# Copy photos into public/uploads/ at web size, just in case they're big.
#
#   npm run resize-uploads -- ~/Downloads/IMG_1234.HEIC ~/Desktop/scan.png
#
# Each photo is saved as public/uploads/<name>.jpg. Photos larger than
# MAX_SIDE px on their long side are scaled down, and anything that isn't
# already a small JPEG is re-encoded at QUALITY. Small JPEGs are copied as
# they are. Originals are never changed, and existing uploads are never
# overwritten. Uses sips, which ships with macOS.

set -eu

MAX_SIDE=1600
MAX_BYTES=512000 # JPEGs under this (500KB) that fit MAX_SIDE are copied untouched.
QUALITY=80

OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/uploads"

if [ "$#" -eq 0 ]; then
  echo "usage: npm run resize-uploads -- <photo> [photo...]" >&2
  exit 1
fi
if ! command -v sips >/dev/null 2>&1; then
  echo "resize-uploads needs sips (macOS)." >&2
  exit 1
fi
mkdir -p "$OUT_DIR"

status=0
for src in "$@"; do
  if [ ! -f "$src" ]; then
    echo "skip  $src: not a file" >&2
    status=1
    continue
  fi

  # "IMG 1234.HEIC" -> "img-1234.jpg"
  base=$(basename "$src")
  name=$(printf '%s' "${base%.*}" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')
  out="$OUT_DIR/$name.jpg"
  if [ -e "$out" ]; then
    echo "skip  $src: public/uploads/$name.jpg already exists" >&2
    status=1
    continue
  fi

  width=$(sips -g pixelWidth "$src" 2>/dev/null | awk '/pixelWidth/ { print $2 }')
  height=$(sips -g pixelHeight "$src" 2>/dev/null | awk '/pixelHeight/ { print $2 }')
  format=$(sips -g format "$src" 2>/dev/null | awk '/format/ { print $2 }')
  # sips prints "<nil>" rather than failing for files it can't read.
  case "$width$height" in
    '' | *[!0-9]*) width= ;;
  esac
  if [ -z "$width" ]; then
    echo "skip  $src: not an image sips can read" >&2
    status=1
    continue
  fi
  long=$((width > height ? width : height))
  bytes=$(wc -c <"$src" | tr -d ' ')

  if [ "$format" = jpeg ] && [ "$long" -le "$MAX_SIDE" ] && [ "$bytes" -le "$MAX_BYTES" ]; then
    cp "$src" "$out"
    action="copied"
  else
    # -Z would also enlarge small photos, so only pass it when shrinking.
    if [ "$long" -gt "$MAX_SIDE" ]; then
      sips -Z "$MAX_SIDE" -s format jpeg -s formatOptions "$QUALITY" "$src" --out "$out" >/dev/null
    else
      sips -s format jpeg -s formatOptions "$QUALITY" "$src" --out "$out" >/dev/null
    fi
    action="resized"
  fi

  new_bytes=$(wc -c <"$out" | tr -d ' ')
  echo "$action  $base (${width}x${height}, $((bytes / 1024))KB) -> /uploads/$name.jpg ($((new_bytes / 1024))KB)"
done

exit "$status"
