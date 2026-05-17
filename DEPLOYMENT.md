# Deployment Guide - Chantier Platform

## Prerequisites
- Docker and Docker Compose installed
- Git

## Local Deployment

### 1. Build and Start Services

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 2. Backend Setup

```bash
# Access backend container
docker-compose exec backend bash

# Generate application key
php artisan key:generate

# Run migrations
php artisan migrate --seed

# Clear caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
```

### 3. Access Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **MinIO API**: http://localhost:9000

## Production Deployment

### Option 1: VPS/Cloud Server

1. **Clone repository**
```bash
git clone <your-repo-url>
cd charles
```

2. **Configure environment variables**
```bash
cp backend/.env.production.example backend/.env
# Edit backend/.env with your production values
```

3. **Build and deploy**
```bash
docker-compose up -d --build
docker-compose exec backend php artisan key:generate
docker-compose exec backend php artisan migrate --seed
```

### Option 2: Cloud Platform (AWS/GCP/Azure)

#### AWS ECS/Fargate
- Push Docker images to ECR
- Create ECS task definition with all services
- Configure load balancer for frontend/backend
- Use RDS for MySQL instead of local MySQL container

#### Google Cloud Run
- Containerize each service separately
- Deploy to Cloud Run
- Use Cloud SQL for MySQL
- Configure VPC connectors for service communication

## Environment Variables

### Required Variables
- `APP_KEY`: Generate with `php artisan key:generate`
- `DB_PASSWORD`: Secure database password
- `ANTHROPIC_API_KEY`: For AI features
- `GROQ_API_KEY`: For AI features

### Optional Variables
- `TWILIO_ACCOUNT_SID`: For WhatsApp notifications
- `TWILIO_AUTH_TOKEN`: For WhatsApp notifications
- `AWS_*`: For S3 file storage

## SSL/HTTPS Setup

For production, use a reverse proxy with SSL:

### Nginx Configuration Example
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring

- Check logs: `docker-compose logs -f [service-name]`
- Monitor resource usage: `docker stats`
- Health checks: Configure in docker-compose.yml

## Backup Strategy

### Database Backup
```bash
# Backup
docker-compose exec mysql mysqldump -u root -p chantier_platform > backup.sql

# Restore
docker-compose exec -T mysql mysql -u root -p chantier_platform < backup.sql
```

### Volume Backup
```bash
# Backup volumes
docker run --rm -v chantier_mysql_data:/data -v $(pwd):/backup alpine tar czf /backup/mysql-backup.tar.gz /data
```

## Troubleshooting

### Backend Issues
```bash
# Check PHP errors
docker-compose exec backend php artisan tinker

# Clear all caches
docker-compose exec backend php artisan optimize:clear
```

### Database Connection Issues
```bash
# Verify MySQL is running
docker-compose ps mysql

# Test connection
docker-compose exec backend php artisan db:show
```

### Frontend Build Issues
```bash
# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend
```
