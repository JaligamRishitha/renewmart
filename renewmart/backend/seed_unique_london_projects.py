"""
Seed script to insert unique lands with documents for each landowner in the database.
This script creates 2 unique projects per landowner with realistic dummy data,
unique project names, and varied London addresses.

Usage:
    python seed_unique_london_projects.py

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

# Unique London locations with street addresses
LONDON_LOCATIONS = [
    {
        "street": "Thames Riverside Park",
        "city": "London",
        "county": "Greater London",
        "post_code": "SW1A 1AA",
        "lat": 51.5074,
        "lng": -0.1278,
        "full_address": "Thames Riverside Park, Westminster, London, SW1A 1AA"
    },
    {
        "street": "Greenwich Peninsula",
        "city": "London",
        "county": "Greater London",
        "post_code": "SE10 9RT",
        "lat": 51.4826,
        "lng": -0.0077,
        "full_address": "Greenwich Peninsula, Greenwich, London, SE10 9RT"
    },
    {
        "street": "Canary Wharf Business District",
        "city": "London",
        "county": "Greater London",
        "post_code": "E14 5AB",
        "lat": 51.5045,
        "lng": -0.0195,
        "full_address": "Canary Wharf Business District, Tower Hamlets, London, E14 5AB"
    },
    {
        "street": "King's Cross Regeneration Area",
        "city": "London",
        "county": "Greater London",
        "post_code": "N1 9GU",
        "lat": 51.5364,
        "lng": -0.1030,
        "full_address": "King's Cross Regeneration Area, Camden, London, N1 9GU"
    },
    {
        "street": "Olympic Park East",
        "city": "London",
        "county": "Greater London",
        "post_code": "E20 2ST",
        "lat": 51.5433,
        "lng": -0.0165,
        "full_address": "Olympic Park East, Stratford, London, E20 2ST"
    },
    {
        "street": "Battersea Power Station Site",
        "city": "London",
        "county": "Greater London",
        "post_code": "SW11 4AL",
        "lat": 51.4819,
        "lng": -0.1444,
        "full_address": "Battersea Power Station Site, Wandsworth, London, SW11 4AL"
    },
    {
        "street": "Hackney Marshes",
        "city": "London",
        "county": "Greater London",
        "post_code": "E9 5PF",
        "lat": 51.5567,
        "lng": -0.0244,
        "full_address": "Hackney Marshes, Hackney, London, E9 5PF"
    },
    {
        "street": "Richmond Riverside",
        "city": "London",
        "county": "Greater London",
        "post_code": "TW9 1AA",
        "lat": 51.4613,
        "lng": -0.3037,
        "full_address": "Richmond Riverside, Richmond upon Thames, London, TW9 1AA"
    },
    {
        "street": "Wembley Stadium Area",
        "city": "London",
        "county": "Greater London",
        "post_code": "HA9 0WS",
        "lat": 51.5560,
        "lng": -0.2795,
        "full_address": "Wembley Stadium Area, Brent, London, HA9 0WS"
    },
    {
        "street": "Docklands Light Railway Corridor",
        "city": "London",
        "county": "Greater London",
        "post_code": "E16 1AL",
        "lat": 51.5079,
        "lng": 0.0081,
        "full_address": "Docklands Light Railway Corridor, Newham, London, E16 1AL"
    },
    {
        "street": "Crystal Palace Park",
        "city": "London",
        "county": "Greater London",
        "post_code": "SE19 2GA",
        "lat": 51.4175,
        "lng": -0.0706,
        "full_address": "Crystal Palace Park, Bromley, London, SE19 2GA"
    },
    {
        "street": "Hampstead Heath Extension",
        "city": "London",
        "county": "Greater London",
        "post_code": "NW3 7ST",
        "lat": 51.5634,
        "lng": -0.1657,
        "full_address": "Hampstead Heath Extension, Camden, London, NW3 7ST"
    },
    {
        "street": "Lee Valley Regional Park",
        "city": "London",
        "county": "Greater London",
        "post_code": "N9 0AR",
        "lat": 51.6250,
        "lng": -0.0167,
        "full_address": "Lee Valley Regional Park, Enfield, London, N9 0AR"
    },
    {
        "street": "Thamesmead Waterfront",
        "city": "London",
        "county": "Greater London",
        "post_code": "SE28 8BF",
        "lat": 51.5000,
        "lng": 0.0833,
        "full_address": "Thamesmead Waterfront, Greenwich, London, SE28 8BF"
    },
    {
        "street": "Croydon Business District",
        "city": "London",
        "county": "Greater London",
        "post_code": "CR0 1AA",
        "lat": 51.3762,
        "lng": -0.0982,
        "full_address": "Croydon Business District, Croydon, London, CR0 1AA"
    },
    {
        "street": "Woolwich Arsenal Riverside",
        "city": "London",
        "county": "Greater London",
        "post_code": "SE18 6HQ",
        "lat": 51.4925,
        "lng": 0.0644,
        "full_address": "Woolwich Arsenal Riverside, Greenwich, London, SE18 6HQ"
    },
    {
        "street": "Barking Riverside Development",
        "city": "London",
        "county": "Greater London",
        "post_code": "IG11 0FU",
        "lat": 51.5233,
        "lng": 0.1139,
        "full_address": "Barking Riverside Development, Barking and Dagenham, London, IG11 0FU"
    },
    {
        "street": "Meridian Business Park",
        "city": "London",
        "county": "Greater London",
        "post_code": "SE10 0AX",
        "lat": 51.4800,
        "lng": 0.0000,
        "full_address": "Meridian Business Park, Greenwich, London, SE10 0AX"
    },
    {
        "street": "Stratford International Quarter",
        "city": "London",
        "county": "Greater London",
        "post_code": "E15 1XJ",
        "lat": 51.5442,
        "lng": -0.0015,
        "full_address": "Stratford International Quarter, Newham, London, E15 1XJ"
    },
    {
        "street": "Royal Docks Enterprise Zone",
        "city": "London",
        "county": "Greater London",
        "post_code": "E16 2QD",
        "lat": 51.5078,
        "lng": 0.0250,
        "full_address": "Royal Docks Enterprise Zone, Newham, London, E16 2QD"
    }
]

# Unique project name templates by energy type
PROJECT_NAME_TEMPLATES = {
    'solar': [
        "Sunshine Energy Farm",
        "Solar Harvest Park",
        "Thames Solar Array",
        "Greenwich Solar Farm",
        "London Sun Power Station",
        "Riverside Solar Park",
        "Metro Solar Energy Hub",
        "Capital Solar Farm",
        "Urban Solar Array",
        "Thames Valley Solar Park"
    ],
    'wind': [
        "London Wind Energy Park",
        "Thames Wind Farm",
        "Capital Wind Power Station",
        "Greenwich Wind Energy Hub",
        "Metropolitan Wind Farm",
        "Riverside Wind Park",
        "Urban Wind Energy Array",
        "London Breeze Power Station",
        "Thames Valley Wind Farm",
        "City Wind Energy Park"
    ],
    'hydroelectric': [
        "Thames Hydro Power Station",
        "London Hydro Energy Hub",
        "Riverside Hydroelectric Plant",
        "Capital Hydro Power",
        "Thames Valley Hydro Station",
        "Metro Hydro Energy Farm",
        "Greenwich Hydroelectric Hub",
        "Urban Hydro Power Plant",
        "London Water Energy Station",
        "Thames Flow Power Hub"
    ],
    'biomass': [
        "London Biomass Energy Plant",
        "Greenwich Biomass Power Station",
        "Thames Biomass Energy Hub",
        "Capital Biomass Farm",
        "Urban Biomass Power Plant",
        "Metro Biomass Energy Station",
        "Riverside Biomass Hub",
        "London Green Energy Plant",
        "Thames Valley Biomass Station",
        "City Biomass Power Hub"
    ],
    'geothermal': [
        "London Geothermal Energy Station",
        "Thames Geothermal Power Plant",
        "Capital Geothermal Hub",
        "Greenwich Geothermal Station",
        "Metro Geothermal Energy Plant",
        "Urban Geothermal Power Hub",
        "Riverside Geothermal Station",
        "London Earth Energy Plant",
        "Thames Valley Geothermal Hub",
        "City Geothermal Power Station"
    ]
}

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

def generate_unique_project_name(energy_type, used_names):
    """Generate a unique project name for the given energy type"""
    templates = PROJECT_NAME_TEMPLATES[energy_type]
    available_names = [name for name in templates if name not in used_names]
    
    if not available_names:
        # If all names are used, add a suffix to make it unique
        base_name = random.choice(templates)
        counter = 1
        new_name = f"{base_name} {counter}"
        while new_name in used_names:
            counter += 1
            new_name = f"{base_name} {counter}"
        return new_name
    
    return random.choice(available_names)

def seed_unique_london_projects():
    """Main function to seed unique London projects and documents"""
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
        used_project_names = set()  # Track used project names to ensure uniqueness
        used_locations = []  # Track used locations to ensure variety
        
        for idx, landowner in enumerate(landowners, 1):
            landowner_id = landowner.user_id
            landowner_name = f"{landowner.first_name} {landowner.last_name}".strip() or landowner.email
            
            print(f"\n[{idx}/{len(landowners)}] Processing landowner: {landowner_name} ({landowner.email})")
            
            # Create 2 lands for this landowner
            for land_num in range(1, 3):
                # Select unique London location (avoid duplicates within same landowner)
                available_locations = [loc for loc in LONDON_LOCATIONS if loc not in used_locations[-2:]]
                if not available_locations:
                    available_locations = LONDON_LOCATIONS
                
                location = random.choice(available_locations)
                used_locations.append(location)
                
                # Select energy type
                energy_type = random.choice(ENERGY_TYPES)
                status = random.choice(PROJECT_STATUSES)
                
                # Generate unique project name
                project_name = generate_unique_project_name(energy_type, used_project_names)
                used_project_names.add(project_name)
                
                # Generate realistic project data
                capacity_mw = round(random.uniform(10.0, 100.0), 2)
                price_per_mwh = round(random.uniform(15.0, 60.0), 2)
                area_acres = round(random.uniform(50.0, 500.0), 2)
                contract_years = random.choice([15, 20, 25, 30])
                
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
                project_description = f"A {energy_type} renewable energy project located at {location['full_address']}. " \
                                     f"This project aims to generate {capacity_mw} MW of clean energy, " \
                                     f"contributing to London's sustainable energy goals."
                
                db.execute(insert_land_query, {
                    "land_id": land_id,
                    "landowner_id": str(landowner_id),
                    "title": project_name,
                    "location_text": location['full_address'],
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
                print(f"  ✓ Created land: {project_name} ({status})")
                print(f"    Location: {location['full_address']}")
                
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
    print("UNIQUE LONDON PROJECTS SEEDER")
    print("=" * 80)
    print("\nThis script will:")
    print("  • Find all landowners in the database")
    print("  • Create 2 unique projects (lands) for each landowner")
    print("  • Use unique project names (not generic patterns)")
    print("  • All projects will be in London with varied addresses")
    print("  • Create 4-6 documents per project with realistic dummy data")
    print("  • Handle multi-slot document types (Ownership Documents, Government NOCs)")
    print("\n⚠️  WARNING: This will insert data into your database!")
    print("=" * 80)
    print("\n[INFO] Executing seed script...")
    print("=" * 80)
    
    success = seed_unique_london_projects()
    exit(0 if success else 1)

