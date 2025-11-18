# Windows Development Stop Script
# Stops Calibre service and cleans up

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Bookstore Development Shutdown" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker Calibre service is running
try {
    $dockerRunning = docker compose -f docker-compose.dev.yml ps 2>&1
    if ($dockerRunning -match "bookstore-calibre-dev") {
        Write-Host "🐳 Stopping Calibre Docker service..." -ForegroundColor Yellow
        docker compose -f docker-compose.dev.yml down

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Calibre service stopped" -ForegroundColor Green
        }
        else {
            Write-Host "⚠️  Failed to stop Calibre service" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "ℹ️  Calibre service is not running" -ForegroundColor Cyan
    }
}
catch {
    Write-Host "ℹ️  Docker not running or service not found" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "✓ Development environment stopped" -ForegroundColor Green
Write-Host ""
