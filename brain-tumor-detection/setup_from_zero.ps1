# MediFollow — Installation complete du module IRM cerebrale (Python + TensorFlow)
# Apres git clone : cd brain-tumor-detection  puis  .\setup_from_zero.ps1
# Cree .venv, installe les dependances, genere brain_tumor_resnet.keras (stub, sans dataset).

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
Set-Location $Root

Write-Host "=== MediFollow — brain-tumor-detection (setup from zero) ===" -ForegroundColor Cyan
Write-Host "Dossier : $Root"

function Test-PythonVersion {
    param([string]$PythonExe)
    try {
        $v = & $PythonExe -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>$null
        if ($v -match '^3\.(11|12)$') { return $true }
    } catch { }
    return $false
}

$venvPy = Join-Path $Root ".venv\Scripts\python.exe"

if (-not (Test-Path $venvPy)) {
    Write-Host "Creation du venv .venv (Python 3.11 ou 3.12 requis pour TensorFlow)..."
    $created = $false
    foreach ($venvArgs in @(@("-3.12", "-m", "venv", ".venv"), @("-3.11", "-m", "venv", ".venv"))) {
        try {
            if (Get-Command py -ErrorAction SilentlyContinue) {
                & py @venvArgs
                if ((Test-Path $venvPy) -and (Test-PythonVersion $venvPy)) { $created = $true; break }
            }
        } catch { }
    }
    if (-not $created) {
        try {
            & python -m venv .venv
            if ((Test-Path $venvPy) -and (Test-PythonVersion $venvPy)) { $created = $true }
        } catch { }
    }
    if (-not $created -or -not (Test-Path $venvPy)) {
        Write-Host "ERREUR : installez Python 3.11 ou 3.12, puis : py -3.12 -m venv .venv" -ForegroundColor Red
        exit 1
    }
}

Write-Host "pip install -r requirements.txt (peut prendre plusieurs minutes) ..."
& $venvPy -m pip install --upgrade pip
& $venvPy -m pip install -r (Join-Path $Root "requirements.txt")

$stub = Join-Path $Root "build_stub_brain_model.py"
if (-not (Test-Path $stub)) {
    Write-Host "ERREUR : build_stub_brain_model.py introuvable. Verifiez un clone complet du depot (git pull)." -ForegroundColor Red
    exit 1
}

Write-Host "Generation de brain_tumor_resnet.keras (1ere fois : telechargement ImageNet ~100 Mo) ..."
& $venvPy $stub
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR lors de build_stub_brain_model.py" -ForegroundColor Red
    exit 1
}

$model = Join-Path $Root "brain_tumor_resnet.keras"
if (-not (Test-Path $model)) {
    Write-Host "ERREUR : fichier modele non cree." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "OK — Pret. Relancez le backend : cd ..\backend ; npm run start:dev" -ForegroundColor Green
Write-Host "Page : http://localhost:5173/doctor/brain-mri" -ForegroundColor Gray
