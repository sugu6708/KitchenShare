@echo off
REM KitchenShare server launcher
REM Run this on the desktop PC to start the shared server (binds 0.0.0.0:8124).
title KitchenShare Server
cd /d "%~dp0"

REM Optionally change the port:  python server.py 8124
python server.py 8124

echo.
echo Server stopped or could not start.
echo If you see a "Address already in use" error, another instance is running.
pause
