# Deployment Guide - Ubuntu Server

This guide covers deploying the Bookstore application on Ubuntu server with two approaches: Docker (recommended) and direct installation.

## Table of Contents
- [Option 1: Docker Deployment (Recommended)](#option-1-docker-deployment-recommended)
- [Option 2: Direct Ubuntu Installation](#option-2-direct-ubuntu-installation)
- [Nginx Reverse Proxy Setup](#nginx-reverse-proxy-setup)
- [SSL/HTTPS with Let's Encrypt](#sslhttps-with-lets-encrypt)
- [Maintenance & Updates](#maintenance--updates)

---

## Option 1: Docker Deployment (Recommended)

Docker is the recommended approach as it:
- ✅ Includes Calibre automatically
- ✅ Ensures consistent environment
- ✅ Easy to update and rollback
- ✅ Isolated from system packages

### Prerequisites

1. **Ubuntu Server** (20.04 LTS or newer)
2. **Docker** and **Docker Compose**
3. **Domain name** (optional, for HTTPS)

### 1.1 Install Docker

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (optional, to run without sudo)
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### 1.2 Clone/Upload Project

```bash
# Option A: Clone from Git
git clone <your-repo-url> bookstore
cd bookstore

# Option B: Upload via SCP
# From your local machine:
# scp -r bookstore/ user@your-server:/home/user/
```

### 1.3 Configure Environment

```bash
cd bookstore

# Create production environment file
cp .env.production.example .env.production

# Generate a secure secret
openssl rand -base64 32

# Edit environment file
nano .env.production
```

Update `.env.production`:
```env
NEXTAUTH_URL=https://yourdomain.com  # or http://your-server-ip:3000
NEXTAUTH_SECRET=<paste-generated-secret-here>
```

### 1.4 Create Docker Compose Override (Optional)

For production-specific settings:

```bash
nano docker-compose.prod.yml
```

```yaml
version: '3.8'

services:
  bookstore:
    build:
      context: .
      dockerfile: Dockerfile
    env_file:
      - .env.production
    restart: always
    ports:
      - "127.0.0.1:3000:3000"  # Only expose locally if using nginx
```

### 1.5 Build and Run

```bash
# Build the Docker image
docker compose build

# Start the application
docker compose up -d

# Check logs
docker compose logs -f bookstore

# Check status
docker compose ps
```

### 1.6 Verify Installation

```bash
# Test locally
curl http://localhost:3000

# Or visit in browser
# http://your-server-ip:3000
```

### 1.7 Docker Management Commands

```bash
# Stop the application
docker compose stop

# Start the application
docker compose start

# Restart the application
docker compose restart

# View logs
docker compose logs -f

# Update to new version
git pull  # or upload new files
docker compose down
docker compose build
docker compose up -d

# Clean up old images
docker image prune -a
```

---

## Option 2: Direct Ubuntu Installation

If you prefer not to use Docker, you can install directly on Ubuntu.

### 2.1 Install Dependencies

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be 20.x
npm --version
```

### 2.2 Install Calibre

```bash
# Install Calibre
sudo apt install -y wget

# Download and install Calibre
wget -nv -O- https://download.calibre-ebook.com/linux-installer.sh | sudo sh /dev/stdin

# Verify installation
ebook-convert --version

# If not in PATH, add it
echo 'export PATH="/opt/calibre:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### 2.3 Setup Application

```bash
# Clone or upload application
cd /var/www
sudo mkdir bookstore
sudo chown $USER:$USER bookstore
cd bookstore

# Copy files or clone repo
# git clone <repo-url> .

# Install dependencies
npm install --production

# Build application
npm run build
```

### 2.4 Configure Environment

```bash
# Create production environment
cp .env.production.example .env.production

# Generate secret
openssl rand -base64 32

# Edit environment file
nano .env.production
```

### 2.5 Setup PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start application
pm2 start npm --name "bookstore" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions output by the command

# Check status
pm2 status
pm2 logs bookstore
```

### 2.6 PM2 Management Commands

```bash
# View status
pm2 status

# View logs
pm2 logs bookstore

# Restart application
pm2 restart bookstore

# Stop application
pm2 stop bookstore

# Delete from PM2
pm2 delete bookstore
```

---

## Nginx Reverse Proxy Setup

For production, use Nginx as a reverse proxy (works with both Docker and direct installation).

### Install Nginx

```bash
sudo apt install nginx -y
```

### Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/bookstore
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;  # Change this

    # Increase client body size for book uploads
    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for large file uploads/downloads
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
}
```

### Enable Site

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/bookstore /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Enable Nginx on boot
sudo systemctl enable nginx
```

---

## SSL/HTTPS with Let's Encrypt

### Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Obtain SSL Certificate

```bash
# Make sure your domain points to your server IP first!
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts
# - Enter your email
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: yes)
```

### Auto-Renewal

Certbot automatically sets up renewal. Verify:

```bash
# Test renewal
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer
```

### Update Environment Variable

After SSL is configured, update your environment:

```bash
# For Docker
nano .env.production

# For Direct install
nano /var/www/bookstore/.env.production
```

Change:
```env
NEXTAUTH_URL=https://yourdomain.com  # Update to HTTPS
```

Restart application:
```bash
# Docker
docker compose restart

# PM2
pm2 restart bookstore
```

---

## Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (IMPORTANT!)
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# If not using nginx, allow direct access
# sudo ufw allow 3000/tcp

# Check status
sudo ufw status
```

---

## Maintenance & Updates

### Docker Deployment

```bash
cd /path/to/bookstore

# Pull latest changes
git pull  # or upload new files

# Rebuild and restart
docker compose down
docker compose build --no-cache
docker compose up -d

# View logs
docker compose logs -f
```

### Direct Installation

```bash
cd /var/www/bookstore

# Pull latest changes
git pull  # or upload new files

# Install dependencies (if package.json changed)
npm install --production

# Rebuild
npm run build

# Restart PM2
pm2 restart bookstore
```

---

## Backup Strategy

### Backup User Data

```bash
# Backup library and covers
tar -czf bookstore-backup-$(date +%Y%m%d).tar.gz library/ public/covers/

# Or with rsync
rsync -av library/ /backup/location/library/
rsync -av public/covers/ /backup/location/covers/
```

### Automated Backup Script

```bash
sudo nano /usr/local/bin/backup-bookstore.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backup/bookstore"
APP_DIR="/path/to/bookstore"  # or docker volume location
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup library and covers
tar -czf "$BACKUP_DIR/bookstore-$DATE.tar.gz" \
    -C "$APP_DIR" library public/covers

# Keep only last 30 days
find $BACKUP_DIR -name "bookstore-*.tar.gz" -mtime +30 -delete

echo "Backup completed: bookstore-$DATE.tar.gz"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-bookstore.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-bookstore.sh
```

---

## Troubleshooting

### Docker Issues

```bash
# Check container logs
docker compose logs -f bookstore

# Check container status
docker compose ps

# Restart container
docker compose restart

# Rebuild from scratch
docker compose down
docker compose build --no-cache
docker compose up -d

# Check Calibre in container
docker compose exec bookstore ebook-convert --version
```

### Direct Installation Issues

```bash
# Check PM2 logs
pm2 logs bookstore --lines 100

# Check if app is running
pm2 status

# Check Node.js version
node --version  # Should be 20.x

# Check Calibre
which ebook-convert
ebook-convert --version

# Restart application
pm2 restart bookstore
```

### Permission Issues

```bash
# Fix library permissions (Docker)
sudo chown -R 1001:1001 library/ public/covers/

# Fix library permissions (Direct)
sudo chown -R $USER:$USER /var/www/bookstore/library
sudo chown -R $USER:$USER /var/www/bookstore/public/covers
```

### Nginx Issues

```bash
# Test configuration
sudo nginx -t

# Check error log
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

---

## Performance Tuning

### For High Upload Traffic

Edit nginx config:
```nginx
client_max_body_size 500M;  # Increase for large books
client_body_timeout 300s;
```

### For Docker

In `docker-compose.yml`:
```yaml
services:
  bookstore:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

---

## Security Checklist

- [ ] Change default admin password (in `auth.ts`)
- [ ] Use strong NEXTAUTH_SECRET (32+ characters)
- [ ] Enable HTTPS with SSL certificate
- [ ] Configure firewall (UFW)
- [ ] Set up automated backups
- [ ] Keep system and dependencies updated
- [ ] Consider adding rate limiting (nginx)
- [ ] Implement proper password hashing (bcrypt/argon2)
- [ ] Regular security audits (`npm audit`)

---

## Support

For issues or questions:
- Check application logs
- Review this deployment guide
- Check project README.md
- Open an issue on GitHub (if applicable)

---

**Happy Deploying! 🚀**
