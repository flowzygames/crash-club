import sys
from pathlib import Path
from PIL import Image


frame_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("test-results/readme-frames")
out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("assets/readme/github/driving-loop.gif")
duration = int(sys.argv[3]) if len(sys.argv) > 3 else 55

frame_paths = sorted(frame_dir.glob("frame-*.png"))
if not frame_paths:
    raise SystemExit(f"No README gameplay frames found in {frame_dir}.")

frames = [
    Image.open(path).convert("P", palette=Image.Palette.ADAPTIVE, colors=256)
    for path in frame_paths
]

out.parent.mkdir(parents=True, exist_ok=True)
frames[0].save(
    out,
    save_all=True,
    append_images=frames[1:],
    duration=duration,
    loop=0,
    optimize=False,
    disposal=2,
)

print(f"Wrote {out} ({out.stat().st_size:,} bytes)")
