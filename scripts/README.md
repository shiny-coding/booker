# Scripts

Helper scripts for development and deployment.

## Windows Development

### `dev-start.ps1`
Starts the development environment on Windows:
- Checks configuration
- Starts Calibre Docker service (if remote mode)
- Verifies Calibre is ready
- Starts Next.js dev server

Usage:
```powershell
.\scripts\dev-start.ps1

# Skip Calibre service (if already running)
.\scripts\dev-start.ps1 -SkipCalibre
```

### `dev-stop.ps1`
Stops the development environment:
- Stops Calibre Docker service
- Cleans up containers

Usage:
```powershell
.\scripts\dev-stop.ps1
```

## Ubuntu Deployment

### `deploy.sh`
Automated deployment script for Ubuntu:
- Installs Docker/Docker Compose if needed
- Creates environment configuration
- Builds Docker image with Calibre
- Starts the application

Usage:
```bash
./scripts/deploy.sh
```

### `update.sh`
Updates the application:
- Pulls latest code
- Rebuilds (Docker) or rebuilds (PM2)
- Restarts the application
- Cleans up old images

Usage:
```bash
./scripts/update.sh
```

## Notes

- PowerShell scripts (`.ps1`) are for Windows
- Bash scripts (`.sh`) are for Linux/macOS/WSL
- All scripts should be run from the project root directory
