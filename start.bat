@echo off
title MotoTrack System Launcher
cd /d "%~dp0"

echo ====================================================
echo        Pops Shock Attack - MotoTrack System
echo ====================================================
echo.

:: 1. Check if MySQL is running
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] MySQL is already running.
) else (
    echo [..] Starting MySQL from XAMPP...
    if exist "C:\xampp\mysql\bin\mysqld.exe" (
        start "" /b "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
        timeout /t 3 /nobreak >nul
        echo [OK] MySQL started successfully.
    ) else (
        echo [WARN] Could not find MySQL in C:\xampp\mysql\bin\mysqld.exe. Please ensure MySQL is started.
    )
)

echo.
echo [..] Opening browser at http://127.0.0.1:8000 ...
start "" "http://127.0.0.1:8000"

echo.
echo ====================================================
echo  System is running at: http://127.0.0.1:8000
echo  Press Ctrl+C to stop the server.
echo ====================================================
echo.

php artisan serve --host=127.0.0.1 --port=8000
pause
