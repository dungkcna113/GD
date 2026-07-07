param(
  [Parameter(Mandatory = $true)]
  [string]$DatabaseUrl,

  [string]$OutputDir = ".\backups"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  Write-Error "Khong tim thay pg_dump. Hay cai PostgreSQL client hoac Supabase CLI truoc khi chay backup."
}

if (-not (Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputFile = Join-Path $OutputDir "gd-computer-$timestamp.dump"

pg_dump $DatabaseUrl --format=custom --no-owner --no-acl --file=$outputFile

Write-Host "Da tao backup: $outputFile"
