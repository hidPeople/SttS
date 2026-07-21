@echo off
setlocal

cd /d "%~dp0"

echo [SttS] Starting development server...

if not exist "node_modules" (
  echo [SttS] node_modules not found. Running npm install...
  call npm install
  if errorlevel 1 (
    echo.
    echo [SttS] npm install failed.
    pause
    exit /b 1
  )
)

echo.
echo [SttS] Launching Vite. Open the URL shown below in your browser.
echo [SttS] Press Ctrl+C in this window to stop the server.
echo.

call npm run dev
if errorlevel 1 (
  echo.
  echo [SttS] npm run dev failed.
  pause
  exit /b 1
)

endlocal
