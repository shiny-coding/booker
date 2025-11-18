#!/bin/bash

# Bookstore Deployment Script for Ubuntu
# This script automates the Docker deployment process

set -e  # Exit on error

echo "============================================"
echo "Bookstore Deployment Script"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on Ubuntu/Debian
if [ ! -f /etc/debian_version ]; then
    echo -e "${RED}This script is designed for Ubuntu/Debian systems.${NC}"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${GREEN}Docker installed successfully.${NC}"
    echo -e "${YELLOW}Please log out and back in for group changes to take effect.${NC}"
fi

# Check if Docker Compose is installed
if ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}Docker Compose not found. Installing...${NC}"
    sudo apt update
    sudo apt install -y docker-compose-plugin
    echo -e "${GREEN}Docker Compose installed successfully.${NC}"
fi

# Check for .env.production file
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}.env.production not found. Creating from example...${NC}"

    if [ -f .env.production.example ]; then
        cp .env.production.example .env.production

        # Generate secret
        SECRET=$(openssl rand -base64 32)

        # Update the secret in .env.production
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$SECRET|g" .env.production
        else
            sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$SECRET|g" .env.production
        fi

        echo -e "${GREEN}.env.production created with generated secret.${NC}"
        echo -e "${YELLOW}Please edit .env.production to set your NEXTAUTH_URL.${NC}"

        read -p "Press Enter to edit .env.production now, or Ctrl+C to exit and edit manually..."
        ${EDITOR:-nano} .env.production
    else
        echo -e "${RED}.env.production.example not found!${NC}"
        exit 1
    fi
fi

# Create necessary directories
echo -e "${YELLOW}Creating library directories...${NC}"
mkdir -p library/books public/covers
echo -e "${GREEN}Directories created.${NC}"

# Build the Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker compose build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Docker image built successfully.${NC}"
else
    echo -e "${RED}Failed to build Docker image.${NC}"
    exit 1
fi

# Start the application
echo -e "${YELLOW}Starting the application...${NC}"
docker compose up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Application started successfully!${NC}"
else
    echo -e "${RED}Failed to start application.${NC}"
    exit 1
fi

# Wait a moment for the app to start
echo -e "${YELLOW}Waiting for application to be ready...${NC}"
sleep 5

# Check if application is running
if docker compose ps | grep -q "Up"; then
    echo -e "${GREEN}✓ Application is running!${NC}"
    echo ""
    echo "============================================"
    echo -e "${GREEN}Deployment Complete!${NC}"
    echo "============================================"
    echo ""
    echo "Access your bookstore at:"
    echo -e "${GREEN}http://localhost:3000${NC}"
    echo ""
    echo "Default credentials:"
    echo "  Email: admin@bookstore.local"
    echo "  Password: admin123"
    echo ""
    echo "Useful commands:"
    echo "  View logs:    docker compose logs -f"
    echo "  Stop app:     docker compose stop"
    echo "  Start app:    docker compose start"
    echo "  Restart app:  docker compose restart"
    echo "  Update app:   ./scripts/update.sh"
    echo ""
else
    echo -e "${RED}✗ Application failed to start.${NC}"
    echo "Check logs with: docker compose logs -f"
    exit 1
fi
