# Docker Setup Commands for Renewmart

## Quick Start Commands

### 1. Build and Start All Containers
```bash
# Build all images (first time or after changes)
docker-compose build

# Start all containers in detached mode
docker-compose up -d

# Build and start in one command
docker-compose up -d --build
```

### 2. View Container Status
```bash
# Check running containers
docker-compose ps

# Check all containers (including stopped)
docker-compose ps -a

# View container logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 3. Stop Containers
```bash
# Stop all containers (keeps data)
docker-compose stop

# Stop and remove containers (keeps volumes/data)
docker-compose down

# Stop and remove everything including volumes (⚠️ deletes data)
docker-compose down -v
```

## Individual Container Commands

### Database Container (PostgreSQL)
```bash
# Start database only
docker-compose up -d postgres

# Access PostgreSQL CLI
docker-compose exec postgres psql -U renewmart_user -d renewmart_db

# Check database health
docker-compose exec postgres pg_isready -U renewmart_user

# Backup database
docker-compose exec postgres pg_dump -U renewmart_user renewmart_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U renewmart_user renewmart_db < backup.sql
```

### Backend Container
```bash
# Start backend only
docker-compose up -d backend

# Access backend container shell
docker-compose exec backend bash

# Run Python commands in backend
docker-compose exec backend python -c "print('Hello from backend')"

# Install new Python package
docker-compose exec backend pip install package-name
docker-compose restart backend

# Run database migrations
docker-compose exec backend python -m alembic upgrade head

# Check backend health
curl http://localhost:8000/health
```

### Frontend Container
```bash
# Start frontend only
docker-compose up -d frontend

# Access frontend container shell
docker-compose exec frontend sh

# Install new npm package
docker-compose exec frontend npm install package-name
docker-compose restart frontend

# Rebuild frontend (after package.json changes)
docker-compose build frontend
docker-compose up -d frontend
```

### Redis Container
```bash
# Start Redis only
docker-compose up -d redis

# Access Redis CLI
docker-compose exec redis redis-cli

# Check Redis health
docker-compose exec redis redis-cli ping
```

## Development Setup

### Using Development Compose File (if exists)
```bash
# Start development environment with hot reload
docker-compose -f docker-compose.dev.yml up -d

# View development logs
docker-compose -f docker-compose.dev.yml logs -f
```

## Complete Setup Workflow

### First Time Setup
```bash
# 1. Navigate to project directory
cd renewmart

# 2. Build all containers
docker-compose build

# 3. Start all services
docker-compose up -d

# 4. Check all containers are running
docker-compose ps

# 5. Wait for database to be ready (about 10-15 seconds)
sleep 15

# 6. Run database migrations (if needed)
docker-compose exec backend python -m alembic upgrade head
# OR run SQL setup script if using direct SQL
docker-compose exec backend python setup_database.py

# 7. Verify services are working
# Backend health check
curl http://localhost:8000/health

# Frontend
curl http://localhost:5173

# Database
docker-compose exec postgres pg_isready -U renewmart_user
```

## Useful Management Commands

### View Logs
```bash
# All services (follow)
docker-compose logs -f

# Last 100 lines of all services
docker-compose logs --tail=100

# Specific service with tail
docker-compose logs -f --tail=50 backend
docker-compose logs -f --tail=50 frontend
docker-compose logs -f --tail=50 postgres
```

### Container Management
```bash
# Restart a specific service
docker-compose restart backend
docker-compose restart frontend
docker-compose restart postgres

# Restart all services
docker-compose restart

# Stop a specific service
docker-compose stop backend

# Start a stopped service
docker-compose start backend

# Rebuild a specific service
docker-compose build backend
docker-compose up -d backend
```

### Clean Up Commands
```bash
# Stop and remove containers
docker-compose down

# Remove containers, networks, and volumes (⚠️ deletes all data)
docker-compose down -v

# Remove specific volume
docker volume rm renewmart_postgres_data

# Remove unused images
docker image prune -a

# Full cleanup (⚠️ removes everything)
docker-compose down -v --rmi all
docker system prune -a --volumes
```

## Access Points

After starting containers, access services at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Backend API Docs**: http://localhost:8000/docs
- **Database**: localhost:5432
- **Redis**: localhost:6379

## Database Connection Info
```
Host: localhost (or postgres from within Docker network)
Port: 5432
Database: renewmart_db
Username: renewmart_user
Password: renewmart_password
```

## Troubleshooting Commands

### Check Container Health
```bash
# Container status
docker-compose ps

# Container resource usage
docker stats

# Inspect container
docker-compose inspect backend
```

### Debug Issues
```bash
# Check if ports are available
netstat -tulpn | grep 8000
netstat -tulpn | grep 5173
netstat -tulpn | grep 5432

# Check container logs for errors
docker-compose logs backend | grep -i error
docker-compose logs frontend | grep -i error

# Check container health
docker inspect renewmart-backend | grep Health -A 10
```

### Reset Everything
```bash
# Stop everything
docker-compose down -v

# Remove all containers
docker container prune -f

# Remove all volumes (⚠️ deletes all data)
docker volume prune -f

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

## Production Deployment Commands

### Build for Production
```bash
# Build optimized images
docker-compose build --no-cache

# Start with production settings
docker-compose up -d

# Scale backend service
docker-compose up -d --scale backend=3
```

### Monitoring
```bash
# Continuous monitoring
watch docker-compose ps

# Resource monitoring
docker stats renewmart-backend renewmart-frontend renewmart-postgres renewmart-redis
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `docker-compose up -d` | Start all containers |
| `docker-compose down` | Stop and remove containers |
| `docker-compose ps` | List container status |
| `docker-compose logs -f` | Follow all logs |
| `docker-compose restart <service>` | Restart a service |
| `docker-compose build` | Build all images |
| `docker-compose exec <service> <command>` | Run command in container |

