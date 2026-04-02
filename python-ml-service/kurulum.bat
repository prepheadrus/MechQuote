@echo off
echo ========================================
echo MechQuote ML Service - Tam Kurulum
echo ========================================
echo.

cd /d "%~dp0"

echo Adim 1: ML Service baslatiliyor...
echo.

start /B python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

echo Servis baslatildi, 5 saniye bekleniyor...
timeout /t 5 /nobreak >nul

echo.
echo Adim 2: Servis test ediliyor...
echo.

python -c "import requests; r = requests.get('http://localhost:8000/'); print('SUCCESS: Service running!' if r.ok else 'FAILED')"

echo.
echo Adim 3: Training script hazirlaniyor...
echo.

if exist train.py (
    echo Training script bulundu
) else (
    echo HATA: train.py bulunamadi!
    pause
    exit /b 1
)

echo.
echo ========================================
echo KURULUM TAMAMLANDI!
echo ========================================
echo.
echo ML Service: http://localhost:8000
echo API Docs:   http://localhost:8000/docs
echo Health:     http://localhost:8000/health
echo.
echo Training icin: python train.py
echo.
pause
