from database import get_db
from sqlalchemy import text

db = next(get_db())

# Check admin users
print("Checking for admin users...")
result = db.execute(text("""
    SELECT u.user_id, u.email, u.first_name, u.last_name, array_agg(ur.role_key) as roles
    FROM "user" u
    LEFT JOIN user_roles ur ON u.user_id = ur.user_id
    GROUP BY u.user_id, u.email, u.first_name, u.last_name
    HAVING 'administrator' = ANY(array_agg(ur.role_key))
""")).fetchall()

print(f"\nFound {len(result)} admin users:")
for r in result:
    print(f"  Email: {r.email}, Name: {r.first_name} {r.last_name}, Roles: {r.roles}")

print("\n" + "="*60 + "\n")

# Check submitted projects
print("Checking submitted projects...")
submitted = db.execute(text("""
    SELECT l.land_id, l.title, l.location_text, l.status, l.land_type, l.energy_key,
           u.email as landowner_email, u.first_name, u.last_name
    FROM lands l
    LEFT JOIN "user" u ON l.landowner_id = u.user_id
    WHERE l.status = 'submitted'
    ORDER BY l.created_at DESC
""")).fetchall()

print(f"Found {len(submitted)} submitted projects:\n")
for s in submitted:
    landowner_name = f"{s.first_name or ''} {s.last_name or ''}".strip() or s.landowner_email
    print(f"  Title: {s.title}")
    print(f"  ID: {s.land_id}")
    print(f"  Location: {s.location_text}")
    print(f"  Type: {s.land_type or 'Not specified'}")
    print(f"  Energy: {s.energy_key}")
    print(f"  Landowner: {landowner_name} ({s.landowner_email})")
    print(f"  Status: {s.status}")
    print()

