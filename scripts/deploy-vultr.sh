#!/bin/bash
set -e

# =============================================================================
# GuardianFlow - Vultr VPS Deployment Script
# =============================================================================
# Usage: ./scripts/deploy-vultr.sh [OPTIONS]
#
# Options:
#   --setup    First-time setup (install Docker, create directories)
#   --update   Update existing deployment
#   --ssl      Setup SSL certificates with Let's Encrypt
#   --restart  Restart services
#   --logs     Show logs
#   --status   Check deployment status
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="/opt/guardianflow"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# First-time Setup
# =============================================================================
setup() {
    log_info "Starting first-time setup..."

    # Update system
    log_info "Updating system packages..."
    apt-get update && apt-get upgrade -y

    # Install Docker if not present
    if ! command -v docker &> /dev/null; then
        log_info "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
        systemctl enable docker
        systemctl start docker
    else
        log_info "Docker already installed"
    fi

    # Install Docker Compose if not present
    if ! command -v docker-compose &> /dev/null; then
        log_info "Installing Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    else
        log_info "Docker Compose already installed"
    fi

    # Install additional tools
    apt-get install -y git certbot python3-certbot-nginx ufw

    # Setup firewall
    log_info "Configuring firewall..."
    ufw allow ssh
    ufw allow http
    ufw allow https
    ufw --force enable

    # Create deployment directory
    log_info "Creating deployment directory..."
    mkdir -p "$DEPLOY_DIR"
    mkdir -p "$DEPLOY_DIR/nginx/ssl"
    mkdir -p "$DEPLOY_DIR/storage"
    mkdir -p "$DEPLOY_DIR/logs"

    # Create environment file template if not exists
    if [ ! -f "$DEPLOY_DIR/.env" ]; then
        log_info "Creating environment file template..."
        cat > "$DEPLOY_DIR/.env" << 'EOF'
# =============================================================================
# GuardianFlow Production Environment
# =============================================================================

# MongoDB Atlas Connection (REQUIRED)
MONGODB_URI=mongodb+srv://vivekkumar787067_db_user:Vivek09876@cluster0.xdkbkkd.mongodb.net/guardianflow?retryWrites=true&w=majority

# Security (REQUIRED - generate with: openssl rand -base64 64)
JWT_SECRET=CHANGE_THIS_TO_A_SECURE_RANDOM_STRING

# Domain Configuration
FRONTEND_URL=https://your-domain.com
PUBLIC_URL=https://your-domain.com

# AI Provider (OpenAI)
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here

# Email Configuration (optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

# Redis (optional - for caching)
REDIS_URL=

# Node Environment
NODE_ENV=production
PORT=3001
EOF
        log_warning "Environment file created at $DEPLOY_DIR/.env"
        log_warning "Please edit this file with your actual values!"
    fi

    log_success "First-time setup complete!"
    log_info "Next steps:"
    echo "  1. Edit $DEPLOY_DIR/.env with your configuration"
    echo "  2. Run: ./scripts/deploy-vultr.sh --update"
    echo "  3. Run: ./scripts/deploy-vultr.sh --ssl (for HTTPS)"
}

# =============================================================================
# Update/Deploy
# =============================================================================
update() {
    log_info "Deploying GuardianFlow..."

    # Check if .env exists
    if [ ! -f "$DEPLOY_DIR/.env" ]; then
        log_error "Environment file not found at $DEPLOY_DIR/.env"
        log_error "Run --setup first or create the file manually"
        exit 1
    fi

    # Copy project files
    log_info "Copying project files..."
    rsync -av --exclude='node_modules' --exclude='.git' --exclude='dist' \
        "$PROJECT_DIR/" "$DEPLOY_DIR/"

    cd "$DEPLOY_DIR"

    # Build the Docker image
    log_info "Building Docker image..."
    docker-compose build --no-cache

    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose down || true

    # Start new containers
    log_info "Starting containers..."
    docker-compose up -d

    # Wait for health check
    log_info "Waiting for health check..."
    sleep 10

    for i in {1..30}; do
        if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
            log_success "Server is healthy!"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "Health check failed after 30 attempts"
            docker-compose logs --tail=50
            exit 1
        fi
        sleep 2
    done

    # Show status
    log_success "Deployment complete!"
    docker-compose ps
}

# =============================================================================
# SSL Setup with Let's Encrypt
# =============================================================================
setup_ssl() {
    log_info "Setting up SSL certificates..."

    read -p "Enter your domain name (e.g., guardianflow.example.com): " DOMAIN

    if [ -z "$DOMAIN" ]; then
        log_error "Domain name is required"
        exit 1
    fi

    # Stop nginx if running
    docker-compose stop nginx || true

    # Get certificate
    log_info "Obtaining SSL certificate for $DOMAIN..."
    certbot certonly --standalone -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN"

    # Copy certificates to nginx ssl directory
    mkdir -p "$DEPLOY_DIR/nginx/ssl"
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$DEPLOY_DIR/nginx/ssl/"
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$DEPLOY_DIR/nginx/ssl/"

    # Update ssl.conf
    cat > "$DEPLOY_DIR/nginx/ssl.conf" << EOF
ssl_certificate /etc/nginx/ssl/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/privkey.pem;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_session_tickets off;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
EOF

    # Update FRONTEND_URL in .env
    sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|" "$DEPLOY_DIR/.env"
    sed -i "s|PUBLIC_URL=.*|PUBLIC_URL=https://$DOMAIN|" "$DEPLOY_DIR/.env"

    # Setup auto-renewal
    log_info "Setting up SSL auto-renewal..."
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f $DEPLOY_DIR/docker-compose.yml restart nginx") | crontab -

    # Restart services
    docker-compose up -d

    log_success "SSL setup complete for $DOMAIN!"
}

# =============================================================================
# Restart Services
# =============================================================================
restart() {
    log_info "Restarting services..."
    cd "$DEPLOY_DIR"
    docker-compose restart
    log_success "Services restarted!"
}

# =============================================================================
# Show Logs
# =============================================================================
show_logs() {
    cd "$DEPLOY_DIR"
    docker-compose logs -f --tail=100
}

# =============================================================================
# Check Status
# =============================================================================
status() {
    log_info "Checking deployment status..."
    cd "$DEPLOY_DIR"

    echo ""
    echo "=== Container Status ==="
    docker-compose ps

    echo ""
    echo "=== Health Check ==="
    if curl -sf http://localhost:3001/health; then
        echo ""
        log_success "Server is healthy!"
    else
        log_error "Server health check failed!"
    fi

    echo ""
    echo "=== Resource Usage ==="
    docker stats --no-stream
}

# =============================================================================
# Main
# =============================================================================
case "${1:-}" in
    --setup)
        setup
        ;;
    --update)
        update
        ;;
    --ssl)
        setup_ssl
        ;;
    --restart)
        restart
        ;;
    --logs)
        show_logs
        ;;
    --status)
        status
        ;;
    *)
        echo "GuardianFlow Vultr Deployment Script"
        echo ""
        echo "Usage: $0 [OPTION]"
        echo ""
        echo "Options:"
        echo "  --setup    First-time setup (install Docker, configure firewall)"
        echo "  --update   Deploy or update the application"
        echo "  --ssl      Setup SSL certificates with Let's Encrypt"
        echo "  --restart  Restart all services"
        echo "  --logs     Show live logs"
        echo "  --status   Check deployment status"
        echo ""
        echo "First-time deployment:"
        echo "  1. $0 --setup"
        echo "  2. Edit /opt/guardianflow/.env"
        echo "  3. $0 --update"
        echo "  4. $0 --ssl"
        ;;
esac
