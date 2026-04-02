@echo off
title MechQuote

echo ================================================
echo   MechQuote Baslatiliyor...
echo ================================================
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

echo Uygulama baslatiliyor...
echo.

REM Next.js başlat
start "MechQuote - KAPATMA" cmd /k "cd /d %CD% && echo. && echo ================================================ && echo   NEXT.JS SERVER - BU PENCEREYI KAPATMA! && echo ================================================ && echo. && echo Uygulama calisiyor... && echo. && npm run dev"

REM Tarayıcı aç
timeout /t 8 >nul
start http://localhost:9002

echo ================================================
echo   UYGULAMA BASLATILDI!
echo ================================================
echo.
echo Tarayicinizda http://localhost:9002 acilacak
echo.
echo "MechQuote - KAPATMA" penceresini KAPATMA!
echo.
echo Bu pencere otomatik kapaniyor...
echo.
timeout /t 3 >nul
exit
