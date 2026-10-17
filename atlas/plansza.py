# Składa klatki rolki w jedną planszę podglądową.
import sys, os, glob
from PIL import Image
src = sys.argv[1]
fs = sorted(glob.glob(os.path.join(src, "[0-9][0-9].png")))
w, h, pad, cols = 360, 640, 20, 5
rows = (len(fs) + cols - 1) // cols
sheet = Image.new("RGB", (pad + cols * (w + pad), pad + rows * (h + pad)), "#111")
for i, f in enumerate(fs):
    sheet.paste(Image.open(f).convert("RGB").resize((w, h), Image.LANCZOS), (pad + (i % cols) * (w + pad), pad + (i // cols) * (h + pad)))
sheet.save(os.path.join(src, "_plansza.jpg"), quality=90)
