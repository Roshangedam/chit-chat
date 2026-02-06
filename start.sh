#!/bin/bash

#######################################
# ChitChat - Complete Setup & Start
# एक script में सब कुछ - install, certs, build, start
# Usage: ./start.sh [SERVER_IP]
#######################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/server"
CLIENT_DIR="$SCRIPT_DIR/client"

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════╗"
echo "║      ChitChat - Setup & Start         ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${NC}"

# Get server IP
if [ -n "$1" ]; then
    SERVER_IP="$1"
else
    SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
fi
echo -e "${GREEN}📡 Server IP: $SERVER_IP${NC}"
echo ""

#######################################
# 1. Install Node.js if not present
#######################################
echo -e "${YELLOW}[1/7] Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    echo -e "${GREEN}✅ Node.js: $(node -v)${NC}"
else
    echo -e "${YELLOW}📦 Installing Node.js 20.x...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo -e "${GREEN}✅ Node.js installed${NC}"
fi

#######################################
# 2. Install PM2 if not present
#######################################
echo -e "${YELLOW}[2/7] Checking PM2...${NC}"
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✅ PM2 installed${NC}"
else
    echo -e "${YELLOW}📦 Installing PM2...${NC}"
    sudo npm install -g pm2
    echo -e "${GREEN}✅ PM2 installed${NC}"
fi

#######################################
# 3. Install build tools
#######################################
echo -e "${YELLOW}[3/7] Checking build tools...${NC}"
if dpkg -l 2>/dev/null | grep -q build-essential; then
    echo -e "${GREEN}✅ Build tools present${NC}"
else
    echo -e "${YELLOW}📦 Installing build-essential...${NC}"
    sudo apt-get update
    sudo apt-get install -y build-essential python3
    echo -e "${GREEN}✅ Build tools installed${NC}"
fi

#######################################
# 4. Install server dependencies
#######################################
echo -e "${YELLOW}[4/7] Installing server dependencies...${NC}"
cd "$SERVER_DIR"
npm install
mkdir -p uploads data
echo -e "${GREEN}✅ Server ready${NC}"

#######################################
# 5. Generate SSL certificates
#######################################
echo -e "${YELLOW}[5/7] Generating SSL certificates...${NC}"
mkdir -p "$SCRIPT_DIR/certs"
node generateCerts.js "$SERVER_IP"
echo -e "${GREEN}✅ Certificates generated${NC}"

#######################################
# 6. Install & build client
#######################################
echo -e "${YELLOW}[6/7] Building client...${NC}"
cd "$CLIENT_DIR"
npm install
npm run build
echo -e "${GREEN}✅ Client built${NC}"

#######################################
# 7. Start server with PM2
#######################################
echo -e "${YELLOW}[7/7] Starting server...${NC}"
cd "$SCRIPT_DIR"

# Stop existing if running
pm2 delete chitchat-server 2>/dev/null || true

# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start server/src/index.js --name chitchat-server --time \
    --log logs/app.log \
    --env NODE_ENV=production

# Save for auto-restart
pm2 save

echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════╗"
echo "║        🎉 Setup Complete! 🎉          ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${BLUE}📡 Access your app:${NC}"
echo -e "   🌐 https://localhost:3000"
echo -e "   🌐 https://$SERVER_IP:3000"
echo ""
echo -e "${BLUE}📌 Commands:${NC}"
echo -e "   pm2 status     - Check status"
echo -e "   pm2 logs       - View logs"
echo -e "   pm2 restart    - Restart"
echo -e "   pm2 stop all   - Stop"
echo ""
echo -e "${YELLOW}💡 Auto-start on boot:${NC}"
echo -e "   pm2 startup"
echo ""
