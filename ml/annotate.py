"""Mark where each repetition of the trick starts and ends in a clip (not every frame is the trick).

Keys: space play/pause · a/d one frame back/forward · j/l one second · s mark rep start · e mark rep end
      u undo last rep · q save and quit · Esc quit without saving
Output: ml/data/annotations/<clip>.json = {"trickId", "athlete", "reps": [[startMs, endMs], ...]}
`athlete` keeps train/val/test splits athlete-separated later; pass it as the 3rd argument.

Usage: python ml/annotate.py <video.mp4> [trickId (default: file name)] [athlete (default: unknown)]
"""
import json
import sys
from pathlib import Path

import cv2

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "ml" / "data" / "annotations"


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    path = Path(sys.argv[1])
    trick = sys.argv[2] if len(sys.argv) > 2 else path.stem
    athlete = sys.argv[3] if len(sys.argv) > 3 else "unknown"
    out = OUT / f"{path.stem}.json"
    reps = json.loads(out.read_text())["reps"] if out.exists() else []

    cap = cv2.VideoCapture(str(path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    i, playing, start = 0, False, None
    while True:
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ok, img = cap.read()
        if not ok:
            i, playing = max(0, n - 1), False
            continue
        ms = int(round(i * 1000 / fps))
        info = f"{trick}  {ms / 1000:.2f}s  reps:{len(reps)}" + (f"  START@{start / 1000:.2f}s" if start is not None else "")
        cv2.putText(img, info, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        cv2.imshow("annotate", img)
        k = cv2.waitKey(int(1000 / fps) if playing else 0) & 0xFF
        if k == ord(" "):
            playing = not playing
        elif k == ord("a"):
            i = max(0, i - 1)
        elif k == ord("d") or (playing and k == 255):
            i = min(n - 1, i + 1)
        elif k == ord("j"):
            i = max(0, i - int(fps))
        elif k == ord("l"):
            i = min(n - 1, i + int(fps))
        elif k == ord("s"):
            start = ms
        elif k == ord("e") and start is not None and ms > start:
            reps.append([start, ms])
            start = None
        elif k == ord("u") and reps:
            reps.pop()
        elif k == ord("q"):
            OUT.mkdir(parents=True, exist_ok=True)
            out.write_text(json.dumps({"trickId": trick, "athlete": athlete, "reps": reps}, indent=1))
            print(f"{path.stem}: saved {len(reps)} reps")
            break
        elif k == 27:
            print(f"{path.stem}: not saved")
            break
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
