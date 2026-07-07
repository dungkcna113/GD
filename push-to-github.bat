@echo off
cd /d "%~dp0"
echo Dang day code GD COMPUTER len GitHub...
echo Repo: https://github.com/dungkcna113/GD.git
echo.

git --version
if errorlevel 1 (
  echo.
  echo Khong tim thay Git tren may. Hay cai Git tu https://git-scm.com/download/win roi chay lai file nay.
  pause
  exit /b 1
)

git branch -M main
git add .
git commit -m "Update GD COMPUTER sales app"
git remote remove origin 2>nul
git remote add origin https://github.com/dungkcna113/GD.git
git push -u origin main

echo.
echo Neu khong co loi, code da duoc day len GitHub. Hay mo GitHub repo de kiem tra co file package.json va thu muc src.
pause
