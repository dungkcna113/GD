@echo off
setlocal

if "%~1"=="" (
  echo Cach dung:
  echo scripts\export-csv.bat "postgresql://postgres.xxx:MAT_KHAU@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" ".\backups\csv"
  exit /b 1
)

if "%~2"=="" (
  powershell -ExecutionPolicy Bypass -File "%~dp0export-csv.ps1" -DatabaseUrl "%~1"
) else (
  powershell -ExecutionPolicy Bypass -File "%~dp0export-csv.ps1" -DatabaseUrl "%~1" -OutputDir "%~2"
)
