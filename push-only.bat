@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo   Push to GitHub only (NO crawl) - deploys the site fast
echo   repo:   chloe19980401/businesswonly  (branch main)
echo   domain: business.foreverdoodle.com
echo   folder: %CD%
echo ============================================================
echo.

echo Regenerating static API (api\company\*.json + api\index.json)...
where node >nul 2>nul
if errorlevel 1 (
  echo   Node.js not found - skipping API regen. Install Node 22+ if you need /api endpoints.
) else (
  node crawler\gen-api.mjs
  if errorlevel 1 echo   API regen had an issue - continuing with push anyway.
)
echo.

git add -A
git commit -m "deploy: frontend + leads + regenerated static /api"
if errorlevel 1 (
  echo   Nothing new to commit, or commit failed - will still try to push.
)
git push origin main
if errorlevel 1 (
  echo.
  echo   git push FAILED. Most likely you are not signed in to GitHub on this PC.
  echo   Open GitHub Desktop, sign in to account chloe19980401, then run this again.
  pause
  exit /b 1
)
echo.
echo ============================================================
echo   DONE - pushed to GitHub.
echo   Wait 1-2 minutes, open business.foreverdoodle.com and press Ctrl+F5.
echo ============================================================
pause
