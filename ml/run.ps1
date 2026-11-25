# Trick-recognition data tools. Run from the repo root:  .\ml\run.ps1 <step> [args]
#   setup      create ml\.venv and install mediapipe + opencv (one time, ~200 MB)
#   extract    landmarks for public\tricks\videos (or the given files/folders) -> ml\data\landmarks
#   annotate   mark rep start/end in one clip:  .\ml\run.ps1 annotate public\tricks\videos\skier.mp4 skier athleteA
#   templates  build public\recognition\templates.json from annotated reps (optional: --exclude-athlete NAME)
#   eval       run the app's recognizer on all extracted clips (add --templates to use them)
param([Parameter(Mandatory)][ValidateSet('setup', 'extract', 'annotate', 'templates', 'eval')][string]$Step)
$ErrorActionPreference = 'Stop'
$py = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
switch ($Step) {
  'setup' {
    python -m venv (Join-Path $PSScriptRoot '.venv')
    & $py -m pip install -r (Join-Path $PSScriptRoot 'requirements.txt')
  }
  'extract' { & $py (Join-Path $PSScriptRoot 'extract_landmarks.py') @args }
  'annotate' { & $py (Join-Path $PSScriptRoot 'annotate.py') @args }
  'templates' { node (Join-Path $PSScriptRoot 'build_templates.ts') @args }
  'eval' { node (Join-Path $PSScriptRoot 'eval_recognizer.ts') @args }
}
