# Windows Development Startup Script
# Starts Calibre service (if using remote mode) and Next.js dev server

param(
    [switch]$SkipCalibre
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Bookstore Development Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
if (!(Test-Path ".env.local")) {
    Write-Host "⚠️  .env.local not found!" -ForegroundColor Yellow
    Write-Host "Creating from example..." -ForegroundColor Yellow
    Copy-Item ".env.local.example" ".env.local"
    Write-Host "✓ Created .env.local" -ForegroundColor Green
    Write-Host ""
    Write-Host "Please edit .env.local and configure:" -ForegroundColor Yellow
    Write-Host "  - NEXTAUTH_SECRET" -ForegroundColor Yellow
    Write-Host "  - CALIBRE_MODE (local or remote)" -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

# Read CALIBRE_MODE from .env.local
$calibreMode = "local"
if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local"
    $calibreLine = $envContent | Where-Object { $_ -match "^CALIBRE_MODE=" }
    if ($calibreLine) {
        $calibreMode = ($calibreLine -split "=")[1].Trim()
    }
}

Write-Host "📚 Calibre Mode: $calibreMode" -ForegroundColor Cyan
Write-Host ""

# Start Calibre service if in remote mode
if ($calibreMode -eq "remote" -and !$SkipCalibre) {
    Write-Host "🐳 Starting Calibre Docker service..." -ForegroundColor Green

    # Check if Docker is running
    try {
        $dockerRunning = docker info 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Docker is not running!" -ForegroundColor Red
            Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
            exit 1
        }
    }
    catch {
        Write-Host "❌ Docker is not installed or not running!" -ForegroundColor Red
        Write-Host "Please install Docker Desktop for Windows." -ForegroundColor Yellow
        exit 1
    }

    # Start the service
    docker compose -f docker-compose.dev.yml up -d

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to start Calibre service" -ForegroundColor Red
        exit 1
    }

    Write-Host "✓ Calibre service started" -ForegroundColor Green

    # Wait for service to be ready
    Write-Host "⏳ Waiting for Calibre service to be ready..." -ForegroundColor Yellow
    $maxAttempts = 10
    $attempt = 0
    $ready = $false

    while ($attempt -lt $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) {
                $ready = $true
                break
            }
        }
        catch {
            # Service not ready yet
        }

        Start-Sleep -Seconds 2
        $attempt++
        Write-Host "." -NoNewline
    }

    Write-Host ""

    if ($ready) {
        Write-Host "✓ Calibre service is ready!" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  Calibre service may not be ready yet" -ForegroundColor Yellow
        Write-Host "Check logs with: docker compose -f docker-compose.dev.yml logs" -ForegroundColor Yellow
    }

    Write-Host ""
}
elseif ($calibreMode -eq "local") {
    Write-Host "💻 Using local Calibre installation" -ForegroundColor Cyan

    # Check if Calibre is available
    try {
        $calibreVersion = ebook-convert --version 2>&1
        Write-Host "✓ Calibre found: $($calibreVersion[0])" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️  Calibre not found in PATH" -ForegroundColor Yellow
        Write-Host "Please install Calibre or switch to remote mode." -ForegroundColor Yellow
    }

    Write-Host ""
}

# Start Next.js dev server
Write-Host "🚀 Starting Next.js dev server..." -ForegroundColor Green
Write-Host ""
Write-Host "Dashboard will be available at:" -ForegroundColor Cyan
Write-Host "  http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Default login:" -ForegroundColor Cyan
Write-Host "  Email: admin@bookstore.local" -ForegroundColor Cyan
Write-Host "  Password: admin123" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start the dev server
npm run dev
