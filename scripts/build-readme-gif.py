from pathlib import Path
from PIL import Image


frame_paths = sorted(Path("test-results/readme-frames").glob("frame-*.png"))
if not frame_paths:
    raise SystemExit("No README gameplay frames found.")

frames = [
    Image.open(path).convert("P", palette=Image.Palette.ADAPTIVE, colors=256)
    for path in frame_paths
]

out = Path("assets/readme/github/driving-loop.gif")
out.parent.mkdir(parents=True, exist_ok=True)
frames[0].save(
    out,
    save_all=True,
    append_images=frames[1:],
    duration=85,
    loop=0,
    optimize=False,
    disposal=2,
)

print(f"Wrote {out} ({out.stat().st_size:,} bytes)")
