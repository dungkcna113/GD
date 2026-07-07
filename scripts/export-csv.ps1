param(
  [Parameter(Mandatory = $true)]
  [string]$DatabaseUrl,

  [string]$OutputDir = ".\backups\csv"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  Write-Error "Khong tim thay psql. Hay cai PostgreSQL client hoac Supabase CLI truoc khi xuat CSV."
}

if (-not (Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $OutputDir "gd-computer-csv-$timestamp"
New-Item -ItemType Directory -Path $backupDir | Out-Null

$tables = @(
  "profiles",
  "categories",
  "products",
  "customers",
  "suppliers",
  "purchase_orders",
  "purchase_order_items",
  "sales_orders",
  "sales_order_items",
  "stock_movements"
)

foreach ($table in $tables) {
  $csvPath = (Join-Path $backupDir "$table.csv").Replace("\", "/")
  $copyCommand = "\copy (select * from public.$table) to '$csvPath' with (format csv, header true, encoding 'UTF8')"
  psql $DatabaseUrl -v ON_ERROR_STOP=1 -c $copyCommand
}

Write-Host "Da xuat CSV vao thu muc: $backupDir"
