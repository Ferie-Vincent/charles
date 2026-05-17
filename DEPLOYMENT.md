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

### Option 0: Free Hosting Services

#### Render.com (Recommended)
- **Free tier**: Web services, PostgreSQL
- **Docker Support**: YES - Supports Dockerfile deployment
- **Limitations**: 512MB RAM, 750 hours/month
- **Setup**: Deploy backend (Laravel) + frontend (React) separately using Dockerfiles
- **Database**: Use Render PostgreSQL or connect to PlanetScale (free MySQL)
- **URL**: `https://render.com`

#### Railway.app
- **Free tier**: $5 credit/month, supports multiple services
- **Features**: Docker support, MySQL, PostgreSQL
- **Setup**: Deploy entire stack as multiple services
- **URL**: `https://railway.app`

#### Fly.io
- **Free tier**: 3 VMs with 256MB RAM each
- **Features**: Docker support, global deployment
- **Setup**: Deploy using Docker Compose
- **URL**: `https://fly.io`

#### Replit
- **Free tier**: Always free for basic projects
- **Features**: Full-stack support, MySQL, PostgreSQL
- **Setup**: Import project directly
- **URL**: `https://replit.com`

#### Oracle Cloud Free Tier
- **Free tier**: 2 VMs with 1GB RAM each (always free)
- **Features**: Full VPS control, install Docker
- **Setup**: Deploy Docker Compose stack
- **URL**: `https://oracle.com/cloud/free`

**Recommendation**: Start with **Render.com** for easiest setup, or **Railway.app** for full-stack support.

#### Render.com Setup Guide (Using Docker)

1. **Prepare Backend (Laravel)**
```bash
# In backend directory
composer install --no-dev
cp .env.production.example .env
# Edit .env with production values
php artisan key:generate
php artisan migrate --seed
```

2. **Create Database on Render**
- Go to Render Dashboard → New → PostgreSQL
- Create database (free tier)
- Note connection details

3. **Deploy Backend with Docker**
- Go to Render Dashboard → New → Web Service
- Connect your GitHub repository
- Select `backend` directory as root
- **Runtime**: Docker
- Render will automatically detect and use your `Dockerfile`
- Add environment variables from `.env`
- Use Render PostgreSQL connection string for DB
- **Important**: Update Dockerfile to expose port 80 instead of 9000 for web service

4. **Deploy Frontend with Docker**
- Go to Render Dashboard → New → Web Service
- Connect your GitHub repository
- Select `frontend` directory as root
- **Runtime**: Docker
- Render will automatically detect and use your `Dockerfile`
- Add API URL as environment variable

5. **Alternative: Native Render (No Docker)**
- **Backend**: Use native PHP environment
  - Build: `composer install --no-dev`
  - Start: `php artisan serve --host=0.0.0.0 --port=$PORT`
- **Frontend**: Use native Node environment
  - Build: `npm install && npm run build`
  - Start: Use Static Site deployment

6. **Deploy MinIO (Optional)**
- Use Render Disk or external MinIO service
- Or use AWS S3 free tier instead

#### Railway.app Setup Guide

1. **Create Project**
- Go to Railway.app → New Project
- Deploy from GitHub repository
- Railway will auto-detect services

2. **Add Services**
- Click "New Service" → Add MySQL
- Click "New Service" → Add backend (select Dockerfile)
- Click "New Service" → Add frontend (select Dockerfile)

3. **Configure Environment**
- Railway provides connection strings automatically
- Add remaining environment variables manually

4. **Deploy**
- Railway will build and deploy all services
- Access via generated URLs

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
