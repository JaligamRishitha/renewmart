"""
Create test land data for dashboard testing
"""
from database import get_db
from sqlalchemy import text
import uuid

def create_test_lands():
    """Create test land data"""
    db = next(get_db())
    
    try:
        # Get the first user (should be the one you're logged in as)
        user_result = db.execute(text("""
            SELECT user_id, email FROM "user" LIMIT 1
        """)).fetchone()
        
        if not user_result:
            print("[FAIL] No users found in database!")
            print("Please create a user account first through registration.")
            return False
        
        user_id = user_result.user_id
        user_email = user_result.email
        
        print(f"Creating test lands for user: {user_email} ({user_id})")
        
        # Test lands to create
        test_lands = [
            {
                "title": "Sunrise Solar Farm",
                "location_text": "Austin, Texas",
                "energy_key": "solar",
                "capacity_mw": 25.5,
                "price_per_mwh": 45.75,
                "area_acres": 150.0,
                "timeline_text": "12-18 months",
                "status": "draft"
            },
            {
                "title": "Prairie Wind Project",
                "location_text": "Oklahoma City, Oklahoma",
                "energy_key": "wind",
                "capacity_mw": 45.0,
                "price_per_mwh": 50.25,
                "area_acres": 200.0,
                "timeline_text": "18-24 months",
                "status": "draft"
            },
            {
                "title": "Green Valley Hydro",
                "location_text": "Denver, Colorado",
                "energy_key": "hydroelectric",
                "capacity_mw": 12.8,
                "price_per_mwh": 48.00,
                "area_acres": 75.0,
                "timeline_text": "24-36 months",
                "status": "submitted"
            }
        ]
        
        lands_created = 0
        
        for land_data in test_lands:
            land_id = str(uuid.uuid4())
            
            insert_query = text("""
                INSERT INTO lands (
                    land_id, landowner_id, title, location_text, 
                    energy_key, capacity_mw, price_per_mwh, area_acres,
                    timeline_text, status, coordinates
                ) VALUES (
                    :land_id, :landowner_id, :title, :location_text,
                    :energy_key, :capacity_mw, :price_per_mwh, :area_acres,
                    :timeline_text, :status, :coordinates
                )
            """)
            
            db.execute(insert_query, {
                "land_id": land_id,
                "landowner_id": str(user_id),
                "title": land_data["title"],
                "location_text": land_data["location_text"],
                "energy_key": land_data["energy_key"],
                "capacity_mw": land_data["capacity_mw"],
                "price_per_mwh": land_data["price_per_mwh"],
                "area_acres": land_data["area_acres"],
                "timeline_text": land_data["timeline_text"],
                "status": land_data["status"],
                "coordinates": '{"lat": 30.2672, "lng": -97.7431}'
            })
            
            lands_created += 1
            print(f"[OK] Created: {land_data['title']} ({land_data['status']})")
        
        db.commit()
        
        print(f"\n[SUCCESS] Created {lands_created} test lands!")
        print(f"\nNow test the endpoints:")
        print(f"  GET http://localhost:8000/api/lands/dashboard/summary")
        print(f"  GET http://localhost:8000/api/lands/dashboard/projects")
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"[FAIL] Error creating test lands: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = create_test_lands()
    exit(0 if success else 1)

