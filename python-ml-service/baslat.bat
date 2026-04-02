@echo off
echo ========================================
echo MechQuote Python ML Service Baslatiliyor
echo ========================================
echo.

cd /d "%~dp0"

echo Python versiyonu kontrol ediliyor...
python --version
if errorlevel 1 (
    echo HATA: Python yuklu degil!
    pause
    exit /b 1
)

echo.
echo ML Service baslatiliyor...
echo.

uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
