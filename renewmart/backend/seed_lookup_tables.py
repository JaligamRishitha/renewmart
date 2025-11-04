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
                
                # Seed lu_status (note: actual table has status_key, status_name, description - not scope)
                print("   Seeding lu_status...")
                conn.execute(text("""
                    INSERT INTO lu_status(status_key, status_name, description) VALUES
                    ('draft', 'Draft', 'Land in draft status'),
                    ('submitted', 'Submitted', 'Land submitted for review'),
                    ('under_review', 'Under Review', 'Land under review'),
                    ('approved', 'Approved', 'Land approved'),
                    ('rejected', 'Rejected', 'Land rejected'),
                    ('investor_ready', 'Investor Ready', 'Land ready for investors'),
                    ('published', 'Published', 'Land published to marketplace'),
                    ('interest_locked', 'Interest Locked', 'Investor interest locked'),
                    ('rtb', 'Ready to Buy', 'Ready to buy'),
                    ('complete', 'Complete', 'Land complete')
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

