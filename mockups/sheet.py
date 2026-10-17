# Składa wszystkie klatki w jedną planszę porównawczą (4 style x 3 klatki).
import sys, os
from PIL import Image, ImageDraw, ImageFont
src = sys.argv[1] if len(sys.argv) > 1 else "out"
styles = [("A", "Dynamiczny"), ("B", "Atlas ryb"), ("C", "Dokument"), ("D", "Quiz")]
w, h, pad, head = 360, 640, 24, 70
font = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Bold.otf", 34)
sheet = Image.new("RGB", (pad + 3 * (w + pad), len(styles) * (h + head + pad) + pad), "#111")
d = ImageDraw.Draw(sheet)
for r, (key, name) in enumerate(styles):
    y = pad + r * (h + head + pad)
    d.text((pad, y + 14), f"Styl {key} — {name}", fill="white", font=font)
    for c in range(3):
        im = Image.open(os.path.join(src, f"{key}{c + 1}.png")).resize((w, h), Image.LANCZOS)
        sheet.paste(im, (pad + c * (w + pad), y + head))
sheet.save(os.path.join(src, "_wszystkie_style.jpg"), quality=90)
