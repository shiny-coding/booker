# Windows Development Guide

Complete guide for developing the Bookstore application on Windows with Calibre support.

## Table of Contents
- [Option 1: Calibre in Docker (WSL2) - Recommended](#option-1-calibre-in-docker-wsl2---recommended)
- [Option 2: Native Windows Calibre](#option-2-native-windows-calibre)
- [Comparison](#comparison)
- [Troubleshooting](#troubleshooting)

---

## Option 1: Calibre in Docker (WSL2) - Recommended

This approach runs a Calibre HTTP service in Docker/WSL2, while your Next.js dev server runs natively on Windows.

### Benefits
- ✅ No Python/Calibre installation conflicts on Windows
- ✅ Matches production environment exactly
- ✅ Easy to restart/reset Calibre service
- ✅ Works with any Windows Node.js setup

### Prerequisites

1. **WSL2** installed
2. **Docker Desktop** for Windows with WSL2 backend
3. **Node.js 20+** on Windows
4. **Git** (for cloning repo)

### Installation Steps

#### 1. Install WSL2 (if not installed)

```powershell
# Run in PowerShell as Administrator
wsl --install

# Restart your computer

# Verify WSL2
wsl --list --verbose
```

#### 2. Install Docker Desktop

Download and install from: https://www.docker.com/products/docker-desktop

**Important**: Enable WSL2 backend in Docker Desktop settings:
- Settings → General → Use the WSL 2 based engine ✓

#### 3. Clone/Setup Project

```powershell
# Navigate to your projects folder
cd C:\Dev

# Clone repository
git clone <your-repo> bookstore
cd bookstore

# Install Node dependencies
npm install
```

#### 4. Configure for Remote Calibre

Create/edit `.env.local`:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=development-secret-change-me

# Library paths (Windows paths)
LIBRARY_PATH=./library
BOOKS_PATH=./library/books
COVERS_PATH=./public/covers

# IMPORTANT: Set Calibre to remote mode
CALIBRE_MODE=remote
CALIBRE_API_URL=http://localhost:8080
```

#### 5. Start Calibre Service

```powershell
# Start the Calibre Docker service
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Verify it's running
curl http://localhost:8080/health
```

You should see:
```json
{
  "status": "healthy",
  "calibre_version": "calibre (calibre 7.x.x)"
}
```

#### 6. Start Next.js Dev Server

```powershell
# In a new terminal (in bookstore folder)
npm run dev
```

Visit: http://localhost:3000

### How It Works

```
┌─────────────────────────────────────┐
│         Windows Host                │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Next.js Dev Server          │  │
│  │  (Port 3000)                 │  │
│  │                              │  │
│  │  Reads/Writes books to:      │  │
│  │  C:\Dev\bookstore\library\   │  │
│  └──────────────┬───────────────┘  │
│                 │ HTTP API          │
│                 │ localhost:8080    │
│  ┌──────────────▼───────────────┐  │
│  │  Docker (WSL2)               │  │
│  │  ┌─────────────────────────┐ │  │
│  │  │ Calibre Service         │ │  │
│  │  │ (Port 8080)             │ │  │
│  │  │                         │ │  │
│  │  │ Volume Mount:           │ │  │
│  │  │ /books → library/       │ │  │
│  │  └─────────────────────────┘ │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Flow:**
1. User uploads book via web UI → saved to `C:\Dev\bookstore\library\books\`
2. User clicks "Convert" → Next.js sends HTTP request to `http://localhost:8080/convert`
3. Docker Calibre service reads from `/books` (mounted to Windows `library/`)
4. Calibre converts the file
5. Converted file written back to mounted volume
6. Next.js reads the converted file from Windows filesystem

### Management Commands

```powershell
# Start Calibre service
docker compose -f docker-compose.dev.yml up -d

# Stop Calibre service
docker compose -f docker-compose.dev.yml stop

# Restart Calibre service
docker compose -f docker-compose.dev.yml restart

# View logs
docker compose -f docker-compose.dev.yml logs -f calibre

# Stop and remove (clean slate)
docker compose -f docker-compose.dev.yml down

# Rebuild Calibre service (after changes)
docker compose -f docker-compose.dev.yml build --no-cache
docker compose -f docker-compose.dev.yml up -d
```

### Testing the Calibre Service

```powershell
# Health check
curl http://localhost:8080/health

# Get version
curl http://localhost:8080/version

# Get supported formats
curl http://localhost:8080/formats

# Test conversion (manual)
curl -X POST http://localhost:8080/convert `
  -H "Content-Type: application/json" `
  -d '{"source_path":"books/test/test.epub","target_path":"books/test/test.pdf"}'
```

---

## Option 2: Native Windows Calibre

Install Calibre directly on Windows for local development.

### Prerequisites

1. **Node.js 20+** on Windows
2. **Python 3.7+** (required by Calibre)
3. **Calibre** for Windows

### Installation Steps

#### 1. Install Python

Download from: https://www.python.org/downloads/

**Important**: Check "Add Python to PATH" during installation.

#### 2. Install Calibre

Download from: https://calibre-ebook.com/download_windows

**Important**: Choose "Install for all users" to ensure it's added to PATH.

#### 3. Verify Installation

```powershell
# Verify Python
python --version

# Verify Calibre
ebook-convert --version
```

If `ebook-convert` is not found, add Calibre to PATH:
```powershell
# Typical Calibre location:
# C:\Program Files\Calibre2\

# Add to PATH temporarily
$env:Path += ";C:\Program Files\Calibre2\"

# Or add permanently via System Environment Variables
```

#### 4. Configure for Local Calibre

Create/edit `.env.local`:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=development-secret-change-me

# Library paths
LIBRARY_PATH=./library
BOOKS_PATH=./library/books
COVERS_PATH=./public/covers

# IMPORTANT: Use local mode (default)
CALIBRE_MODE=local

# Optional: Specify Calibre path if not in PATH
# CALIBRE_PATH=C:\Program Files\Calibre2\ebook-convert.exe
```

#### 5. Install calibre-node

```powershell
# Install the Node.js wrapper for Calibre
npm install calibre-node
```

#### 6. Start Dev Server

```powershell
npm run dev
```

Visit: http://localhost:3000

---

## Comparison

| Feature | Docker (Remote) | Native Windows |
|---------|-----------------|----------------|
| **Setup Complexity** | Medium (Docker + WSL2) | Easy (exe installer) |
| **Installation Size** | ~2GB (Docker + image) | ~300MB |
| **Matches Production** | ✅ Identical | ⚠️ Different |
| **Isolation** | ✅ Containerized | ❌ System-wide |
| **Updates** | `docker compose build` | Reinstall .exe |
| **Python Conflicts** | ✅ None | ⚠️ Possible |
| **Performance** | Slightly slower (WSL) | Native speed |
| **Recommended For** | Team projects | Solo dev |

---

## Development Workflow

### Adding a Book

1. Upload via UI or manually place in `library/books/my-book/`
2. Create folder: `library/books/my-book/`
3. Add file: `library/books/my-book/my-book.epub`
4. Click "Scan Library" in UI

### Testing Conversion

1. Upload an EPUB book
2. Click on the book card
3. Click "Convert" → Select "PDF"
4. Wait 10-30 seconds
5. Refresh and download PDF

### Hot Reload

Next.js dev server supports hot reload. Edit code and save:
- UI changes: Instant refresh
- API changes: Server restarts automatically
- Environment changes: Restart dev server manually

---

## Scripts

Create these helper scripts in `scripts/` folder:

### `scripts/dev-start.ps1` (PowerShell)

```powershell
# Start development environment

Write-Host "Starting Calibre service..." -ForegroundColor Green
docker compose -f docker-compose.dev.yml up -d

Write-Host "Waiting for Calibre to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "Starting Next.js dev server..." -ForegroundColor Green
npm run dev
```

### `scripts/dev-stop.ps1` (PowerShell)

```powershell
# Stop development environment

Write-Host "Stopping Calibre service..." -ForegroundColor Yellow
docker compose -f docker-compose.dev.yml down

Write-Host "Development environment stopped." -ForegroundColor Green
```

Make them executable and use:

```powershell
# Start everything
.\scripts\dev-start.ps1

# Stop everything
.\scripts\dev-stop.ps1
```

---

## Troubleshooting

### Docker Issues

**Problem**: `Cannot connect to Docker daemon`

**Solution**:
```powershell
# Ensure Docker Desktop is running
# Check system tray for Docker icon

# Restart Docker Desktop if needed
```

**Problem**: `Port 8080 already in use`

**Solution**:
```powershell
# Find what's using port 8080
netstat -ano | findstr :8080

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Or change port in docker-compose.dev.yml
```

### Calibre Service Issues

**Problem**: `Calibre remote service not available`

**Solution**:
```powershell
# Check if service is running
docker compose -f docker-compose.dev.yml ps

# Check logs
docker compose -f docker-compose.dev.yml logs calibre

# Restart service
docker compose -f docker-compose.dev.yml restart
```

**Problem**: `Conversion failed - file not found`

**Solution**:
- Verify the `library/` folder is in the project root
- Check Docker volume mount in `docker-compose.dev.yml`
- Ensure file paths use forward slashes: `books/my-book/book.epub`

### Native Calibre Issues

**Problem**: `ebook-convert not found`

**Solution**:
```powershell
# Add Calibre to PATH
$calibrePath = "C:\Program Files\Calibre2"
$env:Path += ";$calibrePath"

# Verify
ebook-convert --version

# Or set in .env.local
# CALIBRE_PATH=C:\Program Files\Calibre2\ebook-convert.exe
```

**Problem**: `calibre-node installation fails`

**Solution**:
```powershell
# Ensure Python is installed
python --version

# Try reinstalling
npm uninstall calibre-node
npm install calibre-node --save

# If still fails, use Docker mode instead
```

### WSL2 Issues

**Problem**: `WSL 2 installation is incomplete`

**Solution**:
```powershell
# Update WSL
wsl --update

# Set default version
wsl --set-default-version 2

# Restart Docker Desktop
```

**Problem**: File changes not detected in Docker

**Solution**:
- This is a known WSL2 issue with file watching
- Place project on WSL filesystem instead: `\\wsl$\Ubuntu\home\user\bookstore`
- Or disable file watching and refresh manually

---

## Recommended Setup (Team Environment)

For teams, standardize on **Docker (Remote) mode**:

1. Everyone uses same `docker-compose.dev.yml`
2. Same Calibre version across all machines
3. No Python/Calibre installation issues
4. Easy onboarding for new developers

Document in your team's `.env.local.example`:

```env
# TEAM STANDARD: Use Docker Calibre service
CALIBRE_MODE=remote
CALIBRE_API_URL=http://localhost:8080

# Start Calibre service:
# docker compose -f docker-compose.dev.yml up -d
```

---

## Performance Tips

### For Docker Mode

```powershell
# Allocate more resources to WSL2/Docker
# Edit: %USERPROFILE%\.wslconfig

[wsl2]
memory=4GB
processors=2
```

### For Native Mode

- Close unnecessary apps during conversion
- Calibre conversion is CPU-intensive
- Expected time: 10-30 seconds per book

---

## Next Steps

1. Set up either Docker or Native Calibre
2. Run `npm run dev`
3. Upload a test book (EPUB recommended)
4. Test conversion to PDF
5. Start developing!

---

**Questions?** Check DEPLOYMENT.md for production setup or open an issue!
