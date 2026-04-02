@echo off
title MechQuote - Test Baslatma
echo ================================================
echo   MechQuote TEST - Adim Adim Kontrol
echo ================================================
echo.

echo Test 1: Node.js kurulu mu?
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Node.js kurulu degil!
    echo https://nodejs.org adresinden yukleyin.
    pause
    exit /b 1
)
echo [OK] Node.js kurulu
echo.

echo Test 2: npm calisiyor mu?
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] npm calismiyor!
    pause
    exit /b 1
)
echo [OK] npm calisiyor
echo.

echo Test 3: Paketler yuklu mu?
if not exist "node_modules" (
    echo [UYARI] node_modules klasoru yok!
    echo npm install calistiriliyor...
    call npm install
)
echo [OK] Paketler yuklu
echo.

echo Test 4: Prisma kurulu mu?
call npx prisma --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Prisma kurulu degil!
    pause
    exit /b 1
)
echo [OK] Prisma kurulu
echo.

echo Test 5: Docker kurulu mu? (Opsiyonel)
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [BIlGI] Docker kurulu degil.
    echo Elasticsearch olmadan devam edilecek.
    echo.
    set USE_ES=0
) else (
    echo [OK] Docker kurulu
    set USE_ES=1
)
echo.

if %USE_ES%==1 (
    echo Test 6: Docker calisiyor mu?
    docker info >nul 2>&1
    if %errorlevel% neq 0 (
        echo [UYARI] Docker calismiyor!
        echo Docker Desktop'u baslatin.
        echo.
        set USE_ES=0
    ) else (
        echo [OK] Docker calisiyor
        echo.
    )
)

if %USE_ES%==1 (
    echo Test 7: Elasticsearch container var mi?
    docker ps --format "{{.Names}}" | findstr "mechquote-elasticsearch" >nul 2>&1
    if %errorlevel% neq 0 (
        echo [BIlGI] Elasticsearch container yok.
        echo Ilk kurulumda baslatilacak.
        echo.
    ) else (
        echo [OK] Elasticsearch calisiyor
        echo.
    )
)

echo ================================================
echo TEST TAMAMLANDI!
echo ================================================
echo.
if %USE_ES%==1 (
    echo Elasticsearch ile calisacak (hızlı arama)
) else (
    echo Elasticsearch olmadan calisacak (yavas arama)
)
echo.
echo Simdi 'baslat-gelistirici.bat' dosyasini calistirabilirsiniz.
echo.
pause
