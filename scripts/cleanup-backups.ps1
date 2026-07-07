param(
  [string]$BackupDir = ".\backups",
  [int]$KeepDays = 60
)

$ErrorActionPreference = "Stop"

if ($KeepDays -lt 7) {
  Write-Error "KeepDays phai tu 7 ngay tro len de tranh xoa nham backup moi."
}

if (-not (Test-Path $BackupDir)) {
  Write-Host "Chua co thu muc backup: $BackupDir"
  exit 0
}

$resolvedBackupDir = (Resolve-Path $BackupDir).Path
$limitDate = (Get-Date).AddDays(-$KeepDays)
$allowedExtensions = @(".csv", ".dump", ".zip")

Get-ChildItem -LiteralPath $resolvedBackupDir -Recurse -File |
  Where-Object { $_.LastWriteTime -lt $limitDate -and $allowedExtensions -contains $_.Extension.ToLowerInvariant() } |
  ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Force
    Write-Host "Da xoa backup cu: $($_.FullName)"
  }

Write-Host "Da don backup cu hon $KeepDays ngay trong: $resolvedBackupDir"
