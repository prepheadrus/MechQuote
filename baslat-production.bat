@echo off
title MechQuote - Production

echo ================================================
echo   MechQuote Production Modu
echo ================================================
echo.

REM Docker kontrol
echo Docker kontrol ediliyor...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo HATA: Docker Desktop calismiyor!
    echo Lutfen Docker Desktop'u baslatin.
    pause
    exit /b 1
)
echo OK: Docker calisiyor
echo.

REM Elasticsearch kontrol
echo Elasticsearch kontrol ediliyor...
docker ps | findstr mechquote-elasticsearch >nul 2>&1
if %errorlevel% neq 0 (
    echo Elasticsearch baslatiliyor...
    call npm run docker:up
    echo 30 saniye bekleniyor...
    timeout /t 30 /nobreak >nul
) else (
    echo OK: Elasticsearch calisiyor
)
echo.

REM Build kontrol
echo Build kontrol ediliyor...
if not exist ".next" (
    echo Ilk kurulum - Build yapiliyor...
    echo Bu islem birkaç dakika surebilir...
    call npm run build
    if %errorlevel% neq 0 (
        echo HATA: Build basarisiz!
        pause
        exit /b 1
    )
) else (
    echo OK: Build mevcut
)
echo.

echo ================================================
echo   UYGULAMA HAZIR!
echo ================================================
echo.
echo Tarayici aciliyor...
start http://localhost:9002
echo.
echo Uygulama YENI BIR PENCEREDE baslatiliyor...
echo.
echo "MechQuote Production" penceresini KAPATMA!
echo.
echo Bu pencere otomatik kapaniyor...
echo.

REM Mevcut dizini kaydet
set CURRENT_DIR=%CD%

REM Production server'ı yeni pencerede başlat
start "MechQuote Production" cmd /k "cd /d %CURRENT_DIR% && echo. && echo ================================================ && echo   PRODUCTION SERVER - KAPATMA! && echo ================================================ && echo. && echo Production mode calisiyor... && echo. && npm start"

timeout /t 3 >nul
exit
