#!/bin/bash

# RenewMart Docker Startup Script

set -e

echo "🚀 Starting RenewMart Application with Docker"
echo "=============================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install Docker Compose."
    exit 1
fi

# Function to display usage
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  dev, development    Start in development mode"
    echo "  prod, production     Start in production mode"
    echo "  stop                 Stop all services"
    echo "  logs                 Show logs"
    echo "  clean                Clean up everything"
    echo "  help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev              # Start development environment"
    echo "  $0 prod             # Start production environment"
    echo "  $0 stop             # Stop all services"
    echo "  $0 logs             # Show logs"
}

# Function to start development environment
start_dev() {
    echo "🔧 Starting development environment..."
    docker-compose -f docker-compose.dev.yml up -d --build
    
    echo ""
    echo "✅ Development environment started!"
    echo ""
    echo "Services:"
    echo "  🌐 Frontend:    http://localhost:5173"
    echo "  🔧 Backend:     http://localhost:8000"
    echo "  🗄️  Database:    localhost:5432"
    echo "  🔴 Redis:       localhost:6379"
    echo ""
    echo "📋 Useful commands:"
    echo "  View logs:     docker-compose -f docker-compose.dev.yml logs -f"
    echo "  Stop services: docker-compose -f docker-compose.dev.yml down"
    echo "  Shell access:  docker-compose -f docker-compose.dev.yml exec backend bash"
}

# Function to start production environment
start_prod() {
    echo "🏭 Starting production environment..."
    docker-compose up -d --build
    
    echo ""
    echo "✅ Production environment started!"
    echo ""
    echo "Services:"
    echo "  🌐 Frontend:    http://localhost:5173"
    echo "  🔧 Backend:     http://localhost:8000"
    echo "  🌍 Nginx:       http://localhost:80"
    echo "  🗄️  Database:    localhost:5432"
    echo "  🔴 Redis:       localhost:6379"
    echo ""
    echo "📋 Useful commands:"
    echo "  View logs:     docker-compose logs -f"
    echo "  Stop services: docker-compose down"
    echo "  Health check:  curl http://localhost:8000/health"
}

# Function to stop services
stop_services() {
    echo "🛑 Stopping all services..."
    docker-compose down
    docker-compose -f docker-compose.dev.yml down
    echo "✅ All services stopped!"
}

# Function to show logs
show_logs() {
    echo "📋 Showing logs (Press Ctrl+C to exit)..."
    docker-compose logs -f
}

# Function to clean up
clean_up() {
    echo "🧹 Cleaning up Docker resources..."
    echo "This will remove all containers, networks, and volumes."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down -v
        docker-compose -f docker-compose.dev.yml down -v
        docker system prune -f
        echo "✅ Cleanup completed!"
    else
        echo "❌ Cleanup cancelled."
    fi
}

# Function to check service health
check_health() {
    echo "🏥 Checking service health..."
    echo ""
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        echo "✅ Services are running"
        
        # Check backend health
        if curl -s http://localhost:8000/health > /dev/null; then
            echo "✅ Backend is healthy"
        else
            echo "❌ Backend health check failed"
        fi
        
        # Check frontend
        if curl -s http://localhost:5173 > /dev/null; then
            echo "✅ Frontend is accessible"
        else
            echo "❌ Frontend is not accessible"
        fi
        
        # Check database
        if docker-compose exec -T postgres pg_isready -U renewmart_user -d renewmart_db > /dev/null 2>&1; then
            echo "✅ Database is ready"
        else
            echo "❌ Database is not ready"
        fi
        
        # Check Redis
        if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
            echo "✅ Redis is ready"
        else
            echo "❌ Redis is not ready"
        fi
    else
        echo "❌ No services are running"
        echo "Run '$0 dev' or '$0 prod' to start services"
    fi
}

# Main script logic
case "${1:-help}" in
    "dev"|"development")
        start_dev
        ;;
    "prod"|"production")
        start_prod
        ;;
    "stop")
        stop_services
        ;;
    "logs")
        show_logs
        ;;
    "clean")
        clean_up
        ;;
    "health")
        check_health
        ;;
    "help"|"--help"|"-h")
        show_usage
        ;;
    *)
        echo "❌ Unknown option: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac
