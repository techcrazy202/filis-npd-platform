#!/bin/bash
# deploy.sh - Complete deployment script for DigitalOcean

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="filis-npd-platform"
BACKUP_DIR="/opt/backups/filis"
LOG_FILE="/var/log/filis-deploy.log"

echo -e "${BLUE}🚀 Starting Fi-Lis NPD Platform Deployment${NC}"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Docker if not present
install_docker() {
    if ! command_exists docker; then
        log "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        usermod -aG docker $USER
        systemctl start docker
        systemctl enable docker
        log "Docker installed successfully"
    else
        log "Docker already installed"
    fi
}

# Function to install Docker Compose if not present
install_docker_compose() {
    if ! command_exists docker-compose; then
        log "Installing Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        log "Docker Compose installed successfully"
    else
        log "Docker Compose already installed"
    fi
}

# Function to setup firewall
setup_firewall() {
    log "Configuring UFW firewall..."
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    log "Firewall configured successfully"
}

# Function to create necessary directories
create_directories() {
    log "Creating project directories..."
    mkdir -p /opt/$PROJECT_NAME
    mkdir -p $BACKUP_DIR
    mkdir -p /opt/$PROJECT_NAME/logs
    mkdir -p /opt/$PROJECT_NAME/docker/ssl
    mkdir -p /opt/$PROJECT_NAME/docker/init-scripts
    mkdir -p /opt/$PROJECT_NAME/docker/backup-scripts
    log "Directories created successfully"
}

# Function to setup SSL certificates (Let's Encrypt)
setup_ssl() {
    log "Setting up SSL certificates..."
    
    if ! command_exists certbot; then
        apt-get update
        apt-get install -y certbot
    fi

    # Stop nginx if running
    docker-compose down nginx 2>/dev/null || true

    # Generate certificates
    certbot certonly --standalone \
        --email admin@fi-lis.com \
        --agree-tos \
        --no-eff-email \
        -d app.fi-lis.com \
        -d admin.fi-lis.com \
        -d queue.fi-lis.com

    # Copy certificates to docker directory
    cp /etc/letsencrypt/live/app.fi-lis.com/fullchain.pem /opt/$PROJECT_NAME/docker/ssl/
    cp /etc/letsencrypt/live/app.fi-lis.com/privkey.pem /opt/$PROJECT_NAME/docker/ssl/

    # Set up auto-renewal
    echo "0 3 * * * certbot renew --quiet && docker-compose restart nginx" | crontab -

    log "SSL certificates configured successfully"
}

# Function to create database initialization script
create_db_init() {
    log "Creating database initialization script..."
    
    cat > /opt/$PROJECT_NAME/docker/init-scripts/01-init.sql << 'EOF'
-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create database user with proper permissions
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'filis_user') THEN
        CREATE ROLE filis_user LOGIN PASSWORD 'change_this_password';
    END IF;
END
$$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE filis_npd TO filis_user;
GRANT ALL ON SCHEMA public TO filis_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO filis_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO filis_user;
EOF

    log "Database initialization script created"
}

# Function to create backup script
create_backup_script() {
    log "Creating backup script..."
    
    cat > /opt/$PROJECT_NAME/docker/backup-scripts/backup.sh << 'EOF'
#!/bin/bash

# Database backup script
BACKUP_DIR="/backups"
DATE=$(date +"%Y%m%d_%H%M%S")
DB_NAME="filis_npd"
DB_USER="filis_user"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create database backup
pg_dump -h postgres -U $DB_USER -d $DB_NAME > $BACKUP_DIR/filis_npd_backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/filis_npd_backup_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "filis_npd_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: filis_npd_backup_$DATE.sql.gz"
EOF

    chmod +x /opt/$PROJECT_NAME/docker/backup-scripts/backup.sh
    log "Backup script created"
}

# Function to create monitoring script
create_monitoring() {
    log "Setting up monitoring..."
    
    cat > /opt/$PROJECT_NAME/monitor.sh << 'EOF'
#!/bin/bash

# Health monitoring script
PROJECT_DIR="/opt/filis-npd-platform"
LOG_FILE="/var/log/filis-monitor.log"

cd $PROJECT_DIR

# Check if all services are running
SERVICES=("postgres" "redis" "backend" "frontend" "nginx")

for service in "${SERVICES[@]}"; do
    if ! docker-compose ps | grep -q "$service.*Up"; then
        echo "[$(date)] WARNING: Service $service is down" >> $LOG_FILE
        # Restart the service
        docker-compose restart $service
        echo "[$(date)] Restarted service: $service" >> $LOG_FILE
    fi
done

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "[$(date)] WARNING: Disk usage is $DISK_USAGE%" >> $LOG_FILE
fi

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
if (( $(echo "$MEMORY_USAGE > 85" | bc -l) )); then
    echo "[$(date)] WARNING: Memory usage is $MEMORY_USAGE%" >> $LOG_FILE
fi

echo "[$(date)] Health check completed" >> $LOG_FILE
EOF

    chmod +x /opt/$PROJECT_NAME/monitor.sh
    
    # Add to crontab (run every 5 minutes)
    echo "*/5 * * * * /opt/$PROJECT_NAME/monitor.sh" | crontab -
    
    log "Monitoring setup completed"
}

# Function to optimize system for production
optimize_system() {
    log "Optimizing system for production..."
    
    # Increase file limits
    cat >> /etc/security/limits.conf << 'EOF'
*               soft    nofile          65536
*               hard    nofile          65536
root            soft    nofile          65536
root            hard    nofile          65536
EOF

    # Optimize kernel parameters
    cat >> /etc/sysctl.conf << 'EOF'
# Network optimizations
net.core.somaxconn = 65536
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65536
net.ipv4.tcp_keepalive_time = 600

# Memory optimizations
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5

# File system optimizations
fs.file-max = 2097152
EOF

    sysctl -p
    log "System optimization completed"
}

# Function to setup log rotation
setup_log_rotation() {
    log "Setting up log rotation..."
    
    cat > /etc/logrotate.d/filis << 'EOF'
/opt/filis-npd-platform/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 root root
}

/var/log/filis-*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF

    log "Log rotation configured"
}

# Main deployment function
main() {
    log "Starting deployment process..."
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}This script must be run as root${NC}"
        exit 1
    fi

    # Update system
    log "Updating system packages..."
    apt-get update && apt-get upgrade -y
    apt-get install -y curl wget git unzip htop tree bc

    # Install Docker and Docker Compose
    install_docker
    install_docker_compose

    # Setup system optimizations
    optimize_system
    setup_firewall
    create_directories
    create_db_init
    create_backup_script
    create_monitoring
    setup_log_rotation

    # Setup SSL certificates
    if [[ "$1" == "--ssl" ]]; then
        setup_ssl
    else
        log "Skipping SSL setup. Run with --ssl flag to configure SSL"
    fi

    # Change to project directory
    cd /opt/$PROJECT_NAME

    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        log "Creating environment file..."
        cat > .env << 'EOF'
# Copy values from .env.production template
DB_PASSWORD=change_this_secure_password
JWT_SECRET=change_this_jwt_secret_256_bit
JWT_REFRESH_SECRET=change_this_refresh_secret_256_bit
ENCRYPTION_KEY=change_this_encryption_key
# Add other required environment variables...
EOF
        echo -e "${YELLOW}⚠️  Please edit /opt/$PROJECT_NAME/.env with your actual configuration values${NC}"
    fi

    log "Deployment setup completed successfully!"
    echo -e "${GREEN}✅ Fi-Lis NPD Platform infrastructure is ready${NC}"
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Edit /opt/$PROJECT_NAME/.env with your configuration"
    echo "2. Place your application code in /opt/$PROJECT_NAME/"
    echo "3. Run: docker-compose up -d"
    echo "4. Monitor logs: docker-compose logs -f"
    
    # Display system info
    echo -e "\n${BLUE}System Information:${NC}"
    echo "Docker version: $(docker --version)"
    echo "Docker Compose version: $(docker-compose --version)"
    echo "Available memory: $(free -h | awk '/^Mem:/ {print $2}')"
    echo "Available disk space: $(df -h / | awk 'NR==2 {print $4}')"
    echo "Project directory: /opt/$PROJECT_NAME"
    echo "Backup directory: $BACKUP_DIR"
    echo "Log file: $LOG_FILE"
}

# Function to show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  --ssl        Setup SSL certificates with Let's Encrypt"
    echo "  --help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0           Deploy without SSL"
    echo "  $0 --ssl     Deploy with SSL certificates"
}

# Function to cleanup (rollback)
cleanup() {
    log "Cleaning up deployment..."
    cd /opt/$PROJECT_NAME
    docker-compose down
    docker system prune -f
    log "Cleanup completed"
}

# Function to update deployment
update() {
    log "Updating Fi-Lis NPD Platform..."
    cd /opt/$PROJECT_NAME
    
    # Pull latest images
    docker-compose pull
    
    # Restart services with zero downtime
    docker-compose up -d --force-recreate --remove-orphans
    
    # Clean up old images
    docker image prune -f
    
    log "Update completed successfully"
}

# Function to show status
status() {
    echo -e "${BLUE}Fi-Lis NPD Platform Status${NC}"
    echo "=========================="
    
    cd /opt/$PROJECT_NAME
    
    # Check if docker-compose.yml exists
    if [ ! -f docker-compose.yml ]; then
        echo -e "${RED}❌ docker-compose.yml not found${NC}"
        exit 1
    fi
    
    # Show service status
    echo -e "\n${BLUE}Services Status:${NC}"
    docker-compose ps
    
    # Show resource usage
    echo -e "\n${BLUE}Resource Usage:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
    
    # Show disk usage
    echo -e "\n${BLUE}Disk Usage:${NC}"
    df -h /
    
    # Show recent logs
    echo -e "\n${BLUE}Recent Logs (last 10 lines):${NC}"
    tail -n 10 $LOG_FILE
}

# Function to backup system
backup() {
    log "Starting manual backup..."
    
    BACKUP_DATE=$(date +"%Y%m%d_%H%M%S")
    MANUAL_BACKUP_DIR="$BACKUP_DIR/manual_$BACKUP_DATE"
    
    mkdir -p $MANUAL_BACKUP_DIR
    
    cd /opt/$PROJECT_NAME
    
    # Backup database
    docker-compose exec -T postgres pg_dump -U filis_user filis_npd > $MANUAL_BACKUP_DIR/database.sql
    
    # Backup configuration files
    cp .env $MANUAL_BACKUP_DIR/
    cp docker-compose.yml $MANUAL_BACKUP_DIR/
    
    # Backup uploaded files
    if [ -d "backend/uploads" ]; then
        tar -czf $MANUAL_BACKUP_DIR/uploads.tar.gz backend/uploads/
    fi
    
    # Create backup archive
    cd $BACKUP_DIR
    tar -czf "filis_manual_backup_$BACKUP_DATE.tar.gz" "manual_$BACKUP_DATE/"
    rm -rf "manual_$BACKUP_DATE/"
    
    log "Manual backup completed: filis_manual_backup_$BACKUP_DATE.tar.gz"
    echo -e "${GREEN}✅ Backup saved to: $BACKUP_DIR/filis_manual_backup_$BACKUP_DATE.tar.gz${NC}"
}

# Function to restore from backup
restore() {
    if [ -z "$1" ]; then
        echo -e "${RED}Error: Please provide backup file path${NC}"
        echo "Usage: $0 restore /path/to/backup.tar.gz"
        exit 1
    fi
    
    BACKUP_FILE="$1"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
        exit 1
    fi
    
    log "Starting restore from: $BACKUP_FILE"
    
    # Stop services
    cd /opt/$PROJECT_NAME
    docker-compose down
    
    # Extract backup
    RESTORE_DIR="/tmp/filis_restore_$(date +%s)"
    mkdir -p $RESTORE_DIR
    tar -xzf "$BACKUP_FILE" -C $RESTORE_DIR
    
    # Restore configuration
    if [ -f "$RESTORE_DIR/.env" ]; then
        cp "$RESTORE_DIR/.env" /opt/$PROJECT_NAME/
    fi
    
    # Start services
    docker-compose up -d postgres redis
    sleep 10
    
    # Restore database
    if [ -f "$RESTORE_DIR/database.sql" ]; then
        docker-compose exec -T postgres psql -U filis_user -d filis_npd < "$RESTORE_DIR/database.sql"
    fi
    
    # Restore uploads
    if [ -f "$RESTORE_DIR/uploads.tar.gz" ]; then
        cd /opt/$PROJECT_NAME
        tar -xzf "$RESTORE_DIR/uploads.tar.gz"
    fi
    
    # Start all services
    docker-compose up -d
    
    # Cleanup
    rm -rf $RESTORE_DIR
    
    log "Restore completed successfully"
    echo -e "${GREEN}✅ System restored from backup${NC}"
}

# Handle command line arguments
case "$1" in
    "")
        main
        ;;
    --ssl)
        main --ssl
        ;;
    --help)
        usage
        ;;
    status)
        status
        ;;
    update)
        update
        ;;
    cleanup)
        cleanup
        ;;
    backup)
        backup
        ;;
    restore)
        restore "$2"
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        usage
        exit 1
        ;;
esac
    