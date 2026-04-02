@echo off
echo ========================================
echo MechQuote Desktop App
echo ========================================
echo.
echo Starting server on port 3000...
echo.

cd .next\standalone
start "" node server.js

echo.
echo Server started on http://localhost:3000
echo.
echo Press Ctrl+C to stop
echo.
pause
