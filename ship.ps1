param([string]$msg = "")

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Step($label) {
    Write-Host ""
    Write-Host "  $label" -ForegroundColor Magenta
    Write-Host "  $('─' * $label.Length)" -ForegroundColor DarkMagenta
}

function Ok($text)   { Write-Host "  ✓ $text" -ForegroundColor Green }
function Fail($text) { Write-Host "  ✗ $text" -ForegroundColor Red;   exit 1 }
function Info($text) { Write-Host "  · $text" -ForegroundColor DarkGray }

Write-Host ""
Write-Host "  ██████████  SHIP  ██████████" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor DarkCyan

# ── lint ──────────────────────────────────────────────────────────────────────
Step "LINT"
$lint = npm run lint 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ($lint | Out-String) -ForegroundColor DarkRed
    Fail "Lint failed — fix errors above before shipping"
}
Ok "No lint errors"

# ── typecheck ─────────────────────────────────────────────────────────────────
Step "TYPECHECK"
$tc = npm run typecheck 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ($tc | Out-String) -ForegroundColor DarkRed
    Fail "Typecheck failed — fix errors above before shipping"
}
Ok "Types clean"

# ── git status ────────────────────────────────────────────────────────────────
Step "GIT STATUS"
$status = git status --short
if (-not $status) { Fail "Nothing to commit" }
$status | ForEach-Object { Info $_ }
$count = ($status | Measure-Object -Line).Lines
Ok "$count file(s) changed"

# ── commit message ────────────────────────────────────────────────────────────
Step "COMMIT"
if ($msg -eq "") {
    Write-Host ""
    Write-Host "  Message: " -ForegroundColor Yellow -NoNewline
    $msg = Read-Host
}
if ($msg -eq "") { Fail "No commit message provided" }

git add -A
git commit -m $msg
if ($LASTEXITCODE -ne 0) { Fail "Commit failed" }
Ok "Committed: $msg"

# ── push ──────────────────────────────────────────────────────────────────────
Step "PUSH"
$branch = git rev-parse --abbrev-ref HEAD
Info "Branch: $branch"
git push
if ($LASTEXITCODE -ne 0) { Fail "Push failed" }
Ok "Pushed to $branch"

# ── done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ██████████  SHIPPED  ██████████" -ForegroundColor Green
Write-Host ""
