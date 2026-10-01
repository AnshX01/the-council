@echo off
setlocal
title The Council Launcher
echo ====================================================
echo                THE COUNCIL                          
echo        Eight Autonomous AI Personas ^& Moderator     
echo ====================================================

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js 20+ LTS from https://nodejs.org
    pause
    exit /b 1
)

if not exist node_modules (
    echo [Launcher] First run detected. Installing dependencies...
    call npm ci
)

echo [Launcher] Starting The Council...
call npm run council
pause
