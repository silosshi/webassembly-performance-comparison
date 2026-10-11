@echo off
cd /d "%~dp0"
python --version >nul 2>&1
if not errorlevel 1 (
    python server.py
) else (
    py -3 server.py
)
pause
