#!/usr/bin/env python3

import sqlite3

def check_actual_data():
    """Check what's actually in the database"""
    try:
        conn = sqlite3.connect('renewmart.db')
        cursor = conn.cursor()
        
        print("=== CHECKING ACTUAL DATABASE DATA ===")
        
        # Check investor_interests table
        cursor.execute('SELECT COUNT(*) FROM investor_interests;')
        count = cursor.fetchone()[0]
        print(f'Investor interests count: {count}')
        
        if count > 0:
            cursor.execute('SELECT * FROM investor_interests LIMIT 3;')
            interests = cursor.fetchall()
            print('\nInvestor interests data:')
            for i, interest in enumerate(interests, 1):
                print(f'  {i}. {interest}')
        
        # Check users
        cursor.execute('SELECT COUNT(*) FROM "user";')
        user_count = cursor.fetchone()[0]
        print(f'\nUsers count: {user_count}')
        
        if user_count > 0:
            cursor.execute('SELECT user_id, email, first_name, last_name FROM "user" LIMIT 5;')
            users = cursor.fetchall()
            print('\nUsers:')
            for user in users:
                print(f'  {user[0]} - {user[1]} - {user[2]} {user[3]}')
        
        # Check user roles
        cursor.execute('SELECT COUNT(*) FROM user_roles;')
        role_count = cursor.fetchone()[0]
        print(f'\nUser roles count: {role_count}')
        
        if role_count > 0:
            cursor.execute('SELECT user_id, role_key FROM user_roles LIMIT 5;')
            roles = cursor.fetchall()
            print('\nUser roles:')
            for role in roles:
                print(f'  {role[0]} - {role[1]}')
        
        # Check lands
        cursor.execute('SELECT COUNT(*) FROM lands;')
        land_count = cursor.fetchone()[0]
        print(f'\nLands count: {land_count}')
        
        if land_count > 0:
            cursor.execute('SELECT land_id, title, status FROM lands LIMIT 3;')
            lands = cursor.fetchall()
            print('\nLands:')
            for land in lands:
                print(f'  {land[0]} - {land[1]} - {land[2]}')
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_actual_data()
