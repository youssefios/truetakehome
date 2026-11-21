@echo off
cd /d "%~dp0"
if not exist .git (
  git init -b main
  git remote add origin https://github.com/youssefios/truetakehome.git
)
git add -A
git commit -m "Update site"
git push -u origin main
echo.
echo Done. The live site updates in about a minute.
pause
