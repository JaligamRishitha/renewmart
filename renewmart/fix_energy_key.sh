#!/bin/bash
# Quick fix script to add energy_key column to lands table

echo "🔧 Adding energy_key column to lands table..."

# Check if container is running
if ! docker ps | grep -q renewmart-postgres; then
    echo "❌ PostgreSQL container is not running!"
    echo "   Please start it first with: docker-compose up -d postgres_db"
    exit 1
fi

# Add the column
echo "📝 Executing SQL migration..."
docker exec renewmart-postgres psql -U renewmart_user -d renewmart_db -c "ALTER TABLE lands ADD COLUMN IF NOT EXISTS energy_key TEXT;"

if [ $? -eq 0 ]; then
    echo "✅ Column added successfully"
else
    echo "❌ Failed to add column"
    exit 1
fi

# Create index
echo "📝 Creating index..."
docker exec renewmart-postgres psql -U renewmart_user -d renewmart_db -c "CREATE INDEX IF NOT EXISTS idx_lands_energy ON lands(energy_key);"

if [ $? -eq 0 ]; then
    echo "✅ Index created successfully"
else
    echo "⚠️  Failed to create index (may already exist)"
fi

# Verify
echo "🔍 Verifying column exists..."
docker exec renewmart-postgres psql -U renewmart_user -d renewmart_db -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lands' AND column_name = 'energy_key';"

echo ""
echo "✅ Migration completed!"
echo "   You can now create lands with energy_key field."

