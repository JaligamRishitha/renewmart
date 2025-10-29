@echo off
REM RenewMart Docker Startup Script for Windows

echo 🚀 Starting RenewMart Application with Docker
echo ==============================================

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ docker-compose is not installed. Please install Docker Compose.
    pause
    exit /b 1
)

if "%1"=="dev" goto start_dev
if "%1"=="development" goto start_dev
if "%1"=="prod" goto start_prod
if "%1"=="production" goto start_prod
if "%1"=="stop" goto stop_services
if "%1"=="logs" goto show_logs
if "%1"=="clean" goto clean_up
if "%1"=="health" goto check_health
if "%1"=="help" goto show_usage
if "%1"=="--help" goto show_usage
if "%1"=="-h" goto show_usage
goto show_usage

:start_dev
echo 🔧 Starting development environment...
docker-compose -f docker-compose.dev.yml up -d --build
echo.
echo ✅ Development environment started!
echo.
echo Services:
echo   🌐 Frontend:    http://localhost:5173
echo   🔧 Backend:     http://localhost:8000
echo   🗄️  Database:    localhost:5432
echo   🔴 Redis:       localhost:6379
echo.
echo 📋 Useful commands:
echo   View logs:     docker-compose -f docker-compose.dev.yml logs -f
echo   Stop services: docker-compose -f docker-compose.dev.yml down
echo   Shell access:  docker-compose -f docker-compose.dev.yml exec backend bash
goto end

:start_prod
echo 🏭 Starting production environment...
docker-compose up -d --build
echo.
echo ✅ Production environment started!
echo.
echo Services:
echo   🌐 Frontend:    http://localhost:5173
echo   🔧 Backend:     http://localhost:8000
echo   🌍 Nginx:       http://localhost:80
echo   🗄️  Database:    localhost:5432
echo   🔴 Redis:       localhost:6379
echo.
echo 📋 Useful commands:
echo   View logs:     docker-compose logs -f
echo   Stop services: docker-compose down
echo   Health check:  curl http://localhost:8000/health
goto end

:stop_services
echo 🛑 Stopping all services...
docker-compose down
docker-compose -f docker-compose.dev.yml down
echo ✅ All services stopped!
goto end

:show_logs
echo 📋 Showing logs (Press Ctrl+C to exit)...
docker-compose logs -f
goto end

:clean_up
echo 🧹 Cleaning up Docker resources...
echo This will remove all containers, networks, and volumes.
set /p confirm="Are you sure? (y/N): "
if /i "%confirm%"=="y" (
    docker-compose down -v
    docker-compose -f docker-compose.dev.yml down -v
    docker system prune -f
    echo ✅ Cleanup completed!
) else (
    echo ❌ Cleanup cancelled.
)
goto end

:check_health
echo 🏥 Checking service health...
echo.
docker-compose ps | findstr "Up" >nul
if %errorlevel% equ 0 (
    echo ✅ Services are running
    curl -s http://localhost:8000/health >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Backend is healthy
    ) else (
        echo ❌ Backend health check failed
    )
    curl -s http://localhost:5173 >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Frontend is accessible
    ) else (
        echo ❌ Frontend is not accessible
    )
) else (
    echo ❌ No services are running
    echo Run 'docker-start.bat dev' or 'docker-start.bat prod' to start services
)
goto end

:show_usage
echo Usage: %0 [OPTION]
echo.
echo Options:
echo   dev, development    Start in development mode
echo   prod, production     Start in production mode
echo   stop                Stop all services
echo   logs                Show logs
echo   clean               Clean up everything
echo   health              Check service health
echo   help                Show this help message
echo.
echo Examples:
echo   %0 dev              # Start development environment
echo   %0 prod             # Start production environment
echo   %0 stop             # Stop all services
echo   %0 logs             # Show logs
goto end

:end
pause
