@echo off
setlocal

pushd "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1" %*
set ERR=%ERRORLEVEL%
popd

endlocal & exit /b %ERR%
