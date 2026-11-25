# ml/: trick-recognition data tools

Offline helpers for the in-app trick recognizer (`src/recognition/`). Nothing here ships in the app
bundle except `public/recognition/templates.json` if you build it. No paid APIs, no large downloads
(only the ~6 MB pose model on first extract).

Preprocessing is identical to the browser on purpose: Python only extracts raw landmarks with the same
MediaPipe model the app uses; all features, templates and evaluation run through the app's own
TypeScript (`node` 22.6+ runs `.ts` files directly).

```powershell
.\ml\run.ps1 setup                       # one time: ml\.venv with mediapipe + opencv
.\ml\run.ps1 extract                     # public\tricks\videos\*.mp4 -> ml\data\landmarks\*.json
.\ml\run.ps1 annotate public\tricks\videos\skier.mp4 skier athleteA   # mark each rep: s = start, e = end, q = save
.\ml\run.ps1 templates                   # annotated reps -> public\recognition\templates.json (DTW)
.\ml\run.ps1 eval                        # recognizer on every extracted clip; add --templates to use DTW
```

No Python? `npm run dev`, open the app, then in the browser console:
`const m = await import('/ml/browserEval.ts'); await m.run(['skier'])` (same detector as the app, prints short summaries).

## Rules
- `ml/data/` is gitignored: landmarks and annotations stay local.
- Evaluating on the clips the rules or templates were tuned on is optimistic. A real number needs
  recordings from athletes who were not used for tuning (`annotate ... <athlete>`, `templates --exclude-athlete <athlete>`).
- Next: a temporal CNN/GRU on `ml/data/landmarks` + annotations, athlete-separated splits, ONNX export.
