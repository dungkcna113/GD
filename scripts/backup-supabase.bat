@echo off
setlocal

if "%~1"=="" (
  echo Cach dung:
  echo scripts\backup-supabase.bat "postgresql://postgres.xxx:MAT_KHAU@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" ".\backups"
  exit /b 1
)

if "%~2"=="" (
  powershell -ExecutionPolicy Bypass -File "%~dp0backup-supabase.ps1" -DatabaseUrl "%~1"
) else (
  powershell -ExecutionPolicy Bypass -File "%~dp0backup-supabase.ps1" -DatabaseUrl "%~1" -OutputDir "%~2"
)
