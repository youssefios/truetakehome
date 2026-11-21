@echo off
cd /d "%~dp0"
python build.py
if errorlevel 1 (echo Build failed. & pause & exit /b 1)
echo.
echo Built. Open docs\index.html to check it, then run publish.bat.
pause
