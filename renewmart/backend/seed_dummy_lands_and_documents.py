"""
Seed script to insert dummy lands with documents for each landowner in the database.
This script creates approximately 2 projects (lands) per landowner with realistic dummy data
and associated documents.

Usage:
    python seed_dummy_lands_and_documents.py

Note: This script does NOT run automatically. Review and execute manually.
"""

from database import get_db
from sqlalchemy import text
import uuid
import random
from datetime import datetime, timedelta
import json

# Document types that require multiple slots (2 documents)
MULTI_SLOT_DOC_TYPES = ['ownership-documents', 'government-nocs']

# All available document types
DOCUMENT_TYPES = [
    'land-valuation',
    'ownership-documents',  # Requires 2 documents (D1, D2)
    'sale-contracts',
    'topographical-surveys',
    'grid-connectivity',
    'financial-models',
    'zoning-approvals',
    'environmental-impact',
    'government-nocs'  # Requires 2 documents (D1, D2)
]

# Energy types
ENERGY_TYPES = ['solar', 'wind', 'hydroelectric', 'biomass', 'geothermal']

# London locations for all lands
LONDON_LOCATIONS = [
    {"city": "London", "county": "Greater London", "post_code": "SW1A 1AA", "lat": 51.5074, "lng": -0.1278},
    {"city": "London", "county": "Greater London", "post_code": "EC1A 1BB", "lat": 51.5155, "lng": -0.0922},
    {"city": "London", "county": "Greater London", "post_code": "W1K 6TF", "lat": 51.5079, "lng": -0.1426},
    {"city": "London", "county": "Greater London", "post_code": "SE1 9RT", "lat": 51.5045, "lng": -0.0865},
    {"city": "London", "county": "Greater London", "post_code": "NW1 6XE", "lat": 51.5246, "lng": -0.1384},
    {"city": "London", "county": "Greater London", "post_code": "E1 6AN", "lat": 51.5154, "lng": -0.0722},
    {"city": "London", "county": "Greater London", "post_code": "N1 9GU", "lat": 51.5364, "lng": -0.1030},
    {"city": "London", "county": "Greater London", "post_code": "SW7 2AZ", "lat": 51.4994, "lng": -0.1748},
    {"city": "London", "county": "Greater London", "post_code": "WC2H 9LA", "lat": 51.5112, "lng": -0.1269},
    {"city": "London", "county": "Greater London", "post_code": "SE10 9RT", "lat": 51.4826, "lng": -0.0077},
]

# Project statuses
PROJECT_STATUSES = ['draft', 'published', 'under_review']

# Dummy file names by document type
DUMMY_FILE_NAMES = {
    'land-valuation': ['Valuation_Report_2024.pdf', 'Property_Appraisal.pdf', 'Land_Assessment.pdf'],
    'ownership-documents': ['Title_Deed.pdf', 'Property_Ownership_Certificate.pdf', 'Land_Registry_Document.pdf'],
    'sale-contracts': ['Sale_Agreement.pdf', 'Purchase_Contract.pdf', 'Transaction_Document.pdf'],
    'topographical-surveys': ['Topographic_Survey.pdf', 'Land_Survey_Map.pdf', 'Site_Survey_Report.pdf'],
    'grid-connectivity': ['Grid_Connection_Study.pdf', 'Electrical_Feasibility.pdf', 'Power_Grid_Assessment.pdf'],
    'financial-models': ['Financial_Model.xlsx', 'Economic_Analysis.xlsx', 'Revenue_Projection.xlsx'],
    'zoning-approvals': ['Zoning_Permit.pdf', 'Planning_Permission.pdf', 'Land_Use_Approval.pdf'],
    'environmental-impact': ['EIA_Report.pdf', 'Environmental_Assessment.pdf', 'Impact_Study.pdf'],
    'government-nocs': ['NOC_Energy_Department.pdf', 'NOC_Planning_Department.pdf', 'Government_Clearance.pdf'],
}

# Dummy MIME types
MIME_TYPES = {
    'pdf': 'application/pdf',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'jpg': 'image/jpeg',
    'png': 'image/png',
}

def get_mime_type(filename):
    """Get MIME type based on file extension"""
    ext = filename.split('.')[-1].lower()
    return MIME_TYPES.get(ext, 'application/octet-stream')

def generate_dummy_file_data(size_kb=100):
    """Generate dummy binary data for a file"""
    # Generate random bytes (simulating file content)
    return bytes(random.randint(0, 255) for _ in range(size_kb * 1024))

def seed_dummy_lands_and_documents():
    """Main function to seed dummy lands and documents"""
    db = next(get_db())
    
    try:
        # Get all landowners from the database
        landowners_query = text("""
            SELECT DISTINCT u.user_id, u.email, u.first_name, u.last_name
            FROM "user" u
            JOIN user_roles ur ON u.user_id = ur.user_id
            WHERE ur.role_key = 'landowner'
            AND u.is_active = true
            ORDER BY u.email
        """)
        
        landowners = db.execute(landowners_query).fetchall()
        
        if not landowners:
            print("[WARNING] No landowners found in database!")
            print("Please ensure you have landowners with the 'landowner' role.")
            return False
        
        print(f"[INFO] Found {len(landowners)} landowners in database")
        print("=" * 80)
        
        total_lands_created = 0
        total_documents_created = 0
        
        for idx, landowner in enumerate(landowners, 1):
            landowner_id = landowner.user_id
            landowner_name = f"{landowner.first_name} {landowner.last_name}".strip() or landowner.email
            
            print(f"\n[{idx}/{len(landowners)}] Processing landowner: {landowner_name} ({landowner.email})")
            
            # Create 2 lands for this landowner
            for land_num in range(1, 3):
                # Select random London location and energy type
                location = random.choice(LONDON_LOCATIONS)
                energy_type = random.choice(ENERGY_TYPES)
                status = random.choice(PROJECT_STATUSES)
                
                # Generate realistic project data
                capacity_mw = round(random.uniform(10.0, 100.0), 2)
                price_per_mwh = round(random.uniform(15.0, 60.0), 2)
                area_acres = round(random.uniform(50.0, 500.0), 2)
                contract_years = random.choice([15, 20, 25, 30])
                
                # Generate project title
                energy_names = {
                    'solar': 'Solar',
                    'wind': 'Wind',
                    'hydroelectric': 'Hydro',
                    'biomass': 'Biomass',
                    'geothermal': 'Geothermal'
                }
                project_title = f"{location['city']} {energy_names[energy_type]} Project {land_num}"
                
                # Create land
                land_id = str(uuid.uuid4())
                coordinates = json.dumps({"lat": location['lat'], "lng": location['lng']})
                
                # Set published_at if status is published
                published_at = None
                if status == 'published':
                    published_at = datetime.now() - timedelta(days=random.randint(1, 90))
                
                insert_land_query = text("""
                    INSERT INTO lands (
                        land_id, landowner_id, title, location_text, post_code,
                        coordinates, area_acres, land_type, status, energy_key,
                        capacity_mw, price_per_mwh, timeline_text, contract_term_years,
                        project_description, published_at, created_at, updated_at
                    ) VALUES (
                        :land_id, :landowner_id, :title, :location_text, :post_code,
                        CAST(:coordinates AS jsonb), :area_acres, :land_type, :status, :energy_key,
                        :capacity_mw, :price_per_mwh, :timeline_text, :contract_term_years,
                        :project_description, :published_at, NOW(), NOW()
                    )
                """)
                
                timeline_text = f"{random.randint(6, 36)}-months"
                project_description = f"A {energy_type} renewable energy project located in {location['city']}, {location['county']}. " \
                                     f"This project aims to generate {capacity_mw} MW of clean energy."
                
                db.execute(insert_land_query, {
                    "land_id": land_id,
                    "landowner_id": str(landowner_id),
                    "title": project_title,
                    "location_text": f"{location['city']}, {location['county']}",
                    "post_code": location['post_code'],
                    "coordinates": coordinates,
                    "area_acres": area_acres,
                    "land_type": "Agricultural",
                    "status": status,
                    "energy_key": energy_type,
                    "capacity_mw": capacity_mw,
                    "price_per_mwh": price_per_mwh,
                    "timeline_text": timeline_text,
                    "contract_term_years": contract_years,
                    "project_description": project_description,
                    "published_at": published_at
                })
                
                total_lands_created += 1
                print(f"  ✓ Created land: {project_title} ({status})")
                
                # Create documents for this land
                # Select 4-6 random document types per land
                selected_doc_types = random.sample(DOCUMENT_TYPES, k=random.randint(4, 6))
                documents_for_land = 0
                
                for doc_type in selected_doc_types:
                    # For multi-slot types, create 2 documents
                    if doc_type in MULTI_SLOT_DOC_TYPES:
                        num_docs = 2
                        slots = ['D1', 'D2']
                    else:
                        num_docs = 1
                        slots = ['D1']
                    
                    for slot_idx in range(num_docs):
                        doc_slot = slots[slot_idx] if slot_idx < len(slots) else 'D1'
                        
                        # Select random file name for this document type
                        filename = random.choice(DUMMY_FILE_NAMES[doc_type])
                        file_size = random.randint(50, 500) * 1024  # 50KB to 500KB
                        dummy_data = generate_dummy_file_data(size_kb=file_size // 1024)
                        mime_type = get_mime_type(filename)
                        
                        document_id = str(uuid.uuid4())
                        
                        insert_doc_query = text("""
                            INSERT INTO documents (
                                document_id, land_id, document_type, file_name,
                                file_data, file_size, uploaded_by, mime_type,
                                is_draft, status, version_number, is_latest_version,
                                version_status, doc_slot, created_at
                            ) VALUES (
                                :document_id, :land_id, :document_type, :file_name,
                                :file_data, :file_size, :uploaded_by, :mime_type,
                                :is_draft, :status, :version_number, :is_latest_version,
                                :version_status, :doc_slot, NOW()
                            )
                        """)
                        
                        db.execute(insert_doc_query, {
                            "document_id": document_id,
                            "land_id": land_id,
                            "document_type": doc_type,
                            "file_name": filename,
                            "file_data": dummy_data,
                            "file_size": file_size,
                            "uploaded_by": str(landowner_id),
                            "mime_type": mime_type,
                            "is_draft": False,
                            "status": "pending",
                            "version_number": 1,
                            "is_latest_version": True,
                            "version_status": "active",
                            "doc_slot": doc_slot
                        })
                        
                        documents_for_land += 1
                        total_documents_created += 1
                
                print(f"    → Created {documents_for_land} documents for this land")
        
        # Commit all changes
        db.commit()
        
        print("\n" + "=" * 80)
        print(f"[SUCCESS] Seeding completed!")
        print(f"  • Total lands created: {total_lands_created}")
        print(f"  • Total documents created: {total_documents_created}")
        print(f"  • Average documents per land: {total_documents_created / total_lands_created:.1f}")
        print("=" * 80)
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Failed to seed dummy data: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 80)
    print("DUMMY LANDS AND DOCUMENTS SEEDER")
    print("=" * 80)
    print("\nThis script will:")
    print("  • Find all landowners in the database")
    print("  • Create 2 projects (lands) for each landowner")
    print("  • Create 4-6 documents per project with realistic dummy data")
    print("  • Handle multi-slot document types (Ownership Documents, Government NOCs)")
    print("\n⚠️  WARNING: This will insert data into your database!")
    print("=" * 80)
    
    # Uncomment the line below to actually run the seeding
    #success = seed_dummy_lands_and_documents()
    # exit(0 if success else 1)
    
    print("\n[INFO] Executing seed script...")
    print("=" * 80)
    
    success = seed_dummy_lands_and_documents()
    exit(0 if success else 1)

