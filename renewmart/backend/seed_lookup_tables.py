#!/usr/bin/env python3
"""
Seed lookup tables with required data
"""
from sqlalchemy import create_engine, text
from database import engine
import sys

def seed_lookup_tables():
    """Seed lookup tables with required status values"""
    
    try:
        with engine.connect() as conn:
            trans = conn.begin()
            
            try:
                print("🌱 Seeding lookup tables...")
                
                # Seed lu_status (table has status_key and scope columns)
                print("   Seeding lu_status...")
                conn.execute(text("""
                    INSERT INTO lu_status(status_key, scope) VALUES
                    ('draft', 'land'),
                    ('submitted', 'land'),
                    ('under_review', 'land'),
                    ('approved', 'land'),
                    ('rejected', 'land'),
                    ('investor_ready', 'land'),
                    ('published', 'land'),
                    ('interest_locked', 'land'),
                    ('rtb', 'land'),
                    ('complete', 'land'),
                    ('assigned', 'task'),
                    ('in_progress', 'task'),
                    ('pending', 'task'),
                    ('delayed', 'task'),
                    ('completed', 'task'),
                    ('rejected', 'task'),
                    ('on_hold', 'task'),
                    ('draft', 'section'),
                    ('submitted', 'section'),
                    ('approved', 'section'),
                    ('rejected', 'section')
                    ON CONFLICT (status_key) DO NOTHING
                """))
                
                # Seed lu_energy_type
                print("   Seeding lu_energy_type...")
                conn.execute(text("""
                    INSERT INTO lu_energy_type(energy_key) VALUES
                    ('solar'),('wind'),('hydroelectric'),('biomass'),('geothermal')
                    ON CONFLICT (energy_key) DO NOTHING
                """))
                
                # Verify
                status_count = conn.execute(text("SELECT COUNT(*) FROM lu_status")).scalar()
                energy_count = conn.execute(text("SELECT COUNT(*) FROM lu_energy_type")).scalar()
                
                trans.commit()
                
                print(f"✅ Seeded {status_count} status values")
                print(f"✅ Seeded {energy_count} energy types")
                print("\n✅ Lookup tables seeded successfully!")
                return True
                
            except Exception as e:
                trans.rollback()
                print(f"❌ Error seeding tables: {e}")
                raise
                
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting lookup table seeding...")
    success = seed_lookup_tables()
    sys.exit(0 if success else 1)

