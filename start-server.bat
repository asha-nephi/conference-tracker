@echo off
setlocal
set /p ZONE="Which zone is this laptop? (front / back): "
set /p PORT="Port [3000]: "
if "%PORT%"=="" set PORT=3000
echo.
echo Starting Conference Tracker for zone "%ZONE%" on port %PORT% ...
echo Keep this window open for the whole session.
echo.
node "%~dp0server.js" %ZONE% %PORT%
pause
