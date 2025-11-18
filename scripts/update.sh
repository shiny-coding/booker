#!/bin/bash

# Bookstore Update Script
# Updates the application to the latest version

set -e  # Exit on error

echo "============================================"
echo "Bookstore Update Script"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Confirm update
read -p "This will update the application. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Update cancelled."
    exit 0
fi

# Check if running in Docker or PM2 mode
if [ -f docker-compose.yml ]; then
    DEPLOY_MODE="docker"
elif command -v pm2 &> /dev/null && pm2 list | grep -q "bookstore"; then
    DEPLOY_MODE="pm2"
else
    echo -e "${RED}Could not detect deployment mode (Docker or PM2).${NC}"
    exit 1
fi

echo -e "${YELLOW}Detected deployment mode: $DEPLOY_MODE${NC}"

# Pull latest code (if git repo)
if [ -d .git ]; then
    echo -e "${YELLOW}Pulling latest changes from git...${NC}"
    git pull
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to pull latest changes.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Code updated${NC}"
else
    echo -e "${YELLOW}Not a git repository. Assuming code is already updated.${NC}"
fi

if [ "$DEPLOY_MODE" == "docker" ]; then
    # Docker update
    echo -e "${YELLOW}Stopping application...${NC}"
    docker compose down

    echo -e "${YELLOW}Rebuilding Docker image...${NC}"
    docker compose build --no-cache

    echo -e "${YELLOW}Starting updated application...${NC}"
    docker compose up -d

    echo -e "${YELLOW}Waiting for application to be ready...${NC}"
    sleep 5

    if docker compose ps | grep -q "Up"; then
        echo -e "${GREEN}✓ Application updated and running!${NC}"
    else
        echo -e "${RED}✗ Application failed to start.${NC}"
        echo "Check logs with: docker compose logs -f"
        exit 1
    fi

    # Clean up old images
    echo -e "${YELLOW}Cleaning up old Docker images...${NC}"
    docker image prune -f

elif [ "$DEPLOY_MODE" == "pm2" ]; then
    # PM2 update
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install --production

    echo -e "${YELLOW}Building application...${NC}"
    npm run build

    echo -e "${YELLOW}Restarting application...${NC}"
    pm2 restart bookstore

    echo -e "${YELLOW}Saving PM2 configuration...${NC}"
    pm2 save

    echo -e "${GREEN}✓ Application updated and restarted!${NC}"
fi

echo ""
echo "============================================"
echo -e "${GREEN}Update Complete!${NC}"
echo "============================================"
echo ""
echo "Your bookstore is now running the latest version."
echo ""

if [ "$DEPLOY_MODE" == "docker" ]; then
    echo "View logs: docker compose logs -f"
elif [ "$DEPLOY_MODE" == "pm2" ]; then
    echo "View logs: pm2 logs bookstore"
fi
