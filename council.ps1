<#
.SYNOPSIS
    The Council - One-Click Launcher for Windows PowerShell
.DESCRIPTION
    Verifies Node.js, ensures dependencies are present, launches the app,
    and opens the browser at http://localhost:3000.
#>

$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "               THE COUNCIL                          " -ForegroundColor White
Write-Host "       Eight Autonomous AI Personas & Moderator     " -ForegroundColor DarkCyan
Write-Host "====================================================" -ForegroundColor Cyan

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js 20+ LTS from https://nodejs.org" -ForegroundColor Yellow
    Exit 1
}

# Ensure node_modules exist
if (-not (Test-Path "node_modules")) {
    Write-Host "[Launcher] First run detected. Installing dependencies..." -ForegroundColor Yellow
    npm ci
}

# Launch Council
Write-Host "[Launcher] Starting The Council..." -ForegroundColor Green
npm run council
