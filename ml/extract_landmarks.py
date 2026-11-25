"""Extract MediaPipe pose landmarks from videos into JSON (one file per clip).

Same model as the app (pose_landmarker_lite, VIDEO mode, 1 pose), so offline numbers match the browser.
Output: ml/data/landmarks/<clip>.json = {"fps": float, "frames": [{"t": ms, "lm": [[x, y, visibility] * 33] | null}]}
Prints one short line per clip; never prints landmarks.

Usage: python ml/extract_landmarks.py [video files or folders]   (default: public/tricks/videos)
"""
import json
import sys
import urllib.request
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions, vision

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "ml" / "data" / "landmarks"
MODEL = ROOT / "ml" / "data" / "pose_landmarker_lite.task"
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/"
    "pose_landmarker_lite.task"
)


def videos(args):
    paths = [Path(a) for a in args] or [ROOT / "public" / "tricks" / "videos"]
    for p in paths:
        yield from sorted(p.glob("*.mp4")) if p.is_dir() else [p]


def extract(path: Path, landmarker_opts) -> dict:
    cap = cv2.VideoCapture(str(path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frames = []
    with vision.PoseLandmarker.create_from_options(landmarker_opts) as lm:  # fresh tracker per clip
        i = 0
        while True:
            ok, bgr = cap.read()
            if not ok:
                break
            t = int(round(i * 1000 / fps))
            img = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
            res = lm.detect_for_video(img, t)
            pts = res.pose_landmarks[0] if res.pose_landmarks else None
            frames.append({
                "t": t,
                "lm": [[round(p.x, 5), round(p.y, 5), round(p.visibility, 3)] for p in pts] if pts else None,
            })
            i += 1
    cap.release()
    return {"fps": fps, "frames": frames}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    if not MODEL.exists():
        print("downloading pose model (~6 MB)…")
        urllib.request.urlretrieve(MODEL_URL, MODEL)
    opts = vision.PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(MODEL)),
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1,
    )
    for v in videos(sys.argv[1:]):
        data = extract(v, opts)
        n = len(data["frames"])
        found = sum(1 for f in data["frames"] if f["lm"])
        (OUT / f"{v.stem}.json").write_text(json.dumps(data, separators=(",", ":")))
        print(f"{v.stem}: {n} frames, pose in {found * 100 // max(1, n)}%")


if __name__ == "__main__":
    main()
