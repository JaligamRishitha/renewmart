#!/bin/bash

echo "Creating renewmart folder structure for Docker containers..."

# Create main renewmart folder structure
mkdir -p renewmart/data/postgres
mkdir -p renewmart/data/redis
mkdir -p renewmart/data/postgres-dev
mkdir -p renewmart/data/redis-dev
mkdir -p renewmart/uploads
mkdir -p renewmart/logs
mkdir -p renewmart/uploads-dev
mkdir -p renewmart/logs-dev

echo ""
echo "Folder structure created successfully!"
echo ""
echo "Created directories:"
echo "  - renewmart/data/postgres (PostgreSQL data)"
echo "  - renewmart/data/redis (Redis data)"
echo "  - renewmart/data/postgres-dev (PostgreSQL dev data)"
echo "  - renewmart/data/redis-dev (Redis dev data)"
echo "  - renewmart/uploads (Backend uploads)"
echo "  - renewmart/logs (Backend logs)"
echo "  - renewmart/uploads-dev (Backend dev uploads)"
echo "  - renewmart/logs-dev (Backend dev logs)"
echo ""

