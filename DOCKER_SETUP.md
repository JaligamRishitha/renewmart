# RenewMart Docker Setup Guide

This guide will help you set up and run the RenewMart application using Docker.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose v2.0+
- Git (to clone the repository)

## Quick Start

### 1. Clone and Navigate
```bash
git clone <your-repo-url>
cd renewmart
```

### 2. Development Setup
```bash
# Start all services in development mode
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### 3. Production Setup
```bash
# Start all services in production mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Services Overview

### Backend API (Port 8000)
- **Framework**: FastAPI with Uvicorn
- **Database**: PostgreSQL
- **Cache**: Redis
- **Features**: Auto-reload in development, health checks

### Frontend (Port 5173)
- **Framework**: React with Vite
- **Features**: Hot reload in development, optimized build in production

### Database (Port 5432)
- **Type**: PostgreSQL 15
- **Database**: renewmart_db
- **User**: renewmart_user
- **Password**: renewmart_password

### Redis (Port 6379)
- **Purpose**: Caching and rate limiting
- **Version**: Redis 7

### Nginx (Port 80/443)
- **Purpose**: Reverse proxy and load balancing
- **Features**: Rate limiting, CORS handling, SSL termination

## Environment Variables

### Backend Environment Variables
```bash
DATABASE_URL=postgresql://renewmart_user:renewmart_password@postgres:5432/renewmart_db
REDIS_URL=redis://redis:6379/0
SECRET_KEY=your-secret-key-change-in-production
DEBUG=true
LOG_LEVEL=INFO
ALLOWED_ORIGINS=["http://localhost:3000", "http://localhost:5173"]
```

### Frontend Environment Variables
```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_API_URL=http://backend:8000
NODE_ENV=development
```

## Development Commands

### Start Development Environment
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f backend
docker-compose -f docker-compose.dev.yml logs -f frontend
```

### Execute Commands in Containers
```bash
# Backend shell
docker-compose -f docker-compose.dev.yml exec backend bash

# Frontend shell
docker-compose -f docker-compose.dev.yml exec frontend sh

# Database shell
docker-compose -f docker-compose.dev.yml exec postgres psql -U renewmart_user -d renewmart_db
```

### Database Operations
```bash
# Run migrations
docker-compose -f docker-compose.dev.yml exec backend python -m alembic upgrade head

# Create test data
docker-compose -f docker-compose.dev.yml exec backend python setup_test_data.py

# Reset database
docker-compose -f docker-compose.dev.yml exec postgres psql -U renewmart_user -d renewmart_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

## Production Commands

### Build and Start
```bash
# Build all images
docker-compose build

# Start services
docker-compose up -d

# Scale services
docker-compose up -d --scale backend=3
```

### Health Checks
```bash
# Check service health
docker-compose ps

# Check specific service
curl http://localhost:8000/health
curl http://localhost:5173
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
netstat -tulpn | grep :8000
netstat -tulpn | grep :5173

# Kill the process or change ports in docker-compose.yml
```

#### 2. Database Connection Issues
```bash
# Check database logs
docker-compose logs postgres

# Test database connection
docker-compose exec backend python -c "from database import engine; print(engine.execute('SELECT 1').fetchone())"
```

#### 3. Frontend Build Issues
```bash
# Rebuild frontend
docker-compose build --no-cache frontend

# Check frontend logs
docker-compose logs frontend
```

#### 4. Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER .

# Rebuild with proper permissions
docker-compose build --no-cache
```

### Reset Everything
```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v
docker-compose -f docker-compose.dev.yml down -v

# Remove all images
docker-compose down --rmi all
docker-compose -f docker-compose.dev.yml down --rmi all

# Clean up Docker system
docker system prune -a
```

## Monitoring and Logs

### View Logs
```bash
# Real-time logs
docker-compose logs -f

# Specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Monitor Resources
```bash
# Container stats
docker stats

# Service status
docker-compose ps
```

## Security Considerations

### Production Security
1. **Change default passwords** in docker-compose.yml
2. **Use environment files** for sensitive data
3. **Enable SSL/TLS** with proper certificates
4. **Configure firewall** rules
5. **Regular security updates** of base images

### Environment Files
Create `.env` files for sensitive data:
```bash
# .env.production
POSTGRES_PASSWORD=your-secure-password
SECRET_KEY=your-secure-secret-key
REDIS_PASSWORD=your-redis-password
```

## Backup and Restore

### Database Backup
```bash
# Create backup
docker-compose exec postgres pg_dump -U renewmart_user renewmart_db > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U renewmart_user renewmart_db < backup.sql
```

### Volume Backup
```bash
# Backup volumes
docker run --rm -v renewmart_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .
docker run --rm -v renewmart_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis_backup.tar.gz -C /data .
```

## Performance Optimization

### Production Optimizations
1. **Use multi-stage builds** for smaller images
2. **Enable build cache** for faster builds
3. **Configure resource limits** in docker-compose.yml
4. **Use health checks** for better reliability
5. **Implement proper logging** strategies

### Resource Limits Example
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

## Support

For issues and questions:
1. Check the logs: `docker-compose logs -f`
2. Verify service health: `docker-compose ps`
3. Check resource usage: `docker stats`
4. Review this documentation

## Next Steps

1. **Customize configuration** for your environment
2. **Set up CI/CD** pipeline
3. **Configure monitoring** and alerting
4. **Implement backup** strategies
5. **Set up SSL certificates** for production
