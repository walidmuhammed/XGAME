@echo off
setlocal

pushd "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File ".\serve.ps1" %*

popd
endlocal
