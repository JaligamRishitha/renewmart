@echo off
echo Creating renewmart folder structure for Docker containers...

REM Create main renewmart folder structure
if not exist "renewmart" mkdir renewmart
if not exist "renewmart\data" mkdir renewmart\data
if not exist "renewmart\data\postgres" mkdir renewmart\data\postgres
if not exist "renewmart\data\redis" mkdir renewmart\data\redis
if not exist "renewmart\data\postgres-dev" mkdir renewmart\data\postgres-dev
if not exist "renewmart\data\redis-dev" mkdir renewmart\data\redis-dev
if not exist "renewmart\uploads" mkdir renewmart\uploads
if not exist "renewmart\logs" mkdir renewmart\logs
if not exist "renewmart\uploads-dev" mkdir renewmart\uploads-dev
if not exist "renewmart\logs-dev" mkdir renewmart\logs-dev

echo.
echo Folder structure created successfully!
echo.
echo Created directories:
echo   - renewmart\data\postgres (PostgreSQL data)
echo   - renewmart\data\redis (Redis data)
echo   - renewmart\data\postgres-dev (PostgreSQL dev data)
echo   - renewmart\data\redis-dev (Redis dev data)
echo   - renewmart\uploads (Backend uploads)
echo   - renewmart\logs (Backend logs)
echo   - renewmart\uploads-dev (Backend dev uploads)
echo   - renewmart\logs-dev (Backend dev logs)
echo.
pause

