@echo off
echo Stopping all Node processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (echo Node processes stopped.) else (echo No Node processes were running.)
timeout /t 2 /nobreak >nul
echo Starting Next.js dev server...
cd /d "%~dp0.."
node node_modules\next\dist\bin\next dev
