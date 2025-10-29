#!/usr/bin/env python3

import sqlite3
import sys

def check_database():
    try:
        conn = sqlite3.connect('renewmart.db')
        cursor = conn.cursor()

        # Check if investor_interests table exists and its structure
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='investor_interests';")
        table_exists = cursor.fetchone()
        print('investor_interests table exists:', table_exists is not None)

        if table_exists:
            cursor.execute('PRAGMA table_info(investor_interests);')
            columns = cursor.fetchall()
            print('Table structure:')
            for col in columns:
                print(f'  {col[1]} {col[2]} {"NOT NULL" if col[3] else "NULL"} {"DEFAULT " + str(col[4]) if col[4] else ""}')

        # Check if there are any records
        cursor.execute('SELECT COUNT(*) FROM investor_interests;')
        count = cursor.fetchone()[0]
        print(f'Number of records in investor_interests: {count}')

        # Check user table structure
        cursor.execute('PRAGMA table_info("user");')
        user_columns = cursor.fetchall()
        print('User table structure:')
        for col in user_columns:
            print(f'  {col[1]} {col[2]} {"NOT NULL" if col[3] else "NULL"} {"DEFAULT " + str(col[4]) if col[4] else ""}')

        # Check if lookup tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='lu_roles';")
        lu_roles_exists = cursor.fetchone()
        print('lu_roles table exists:', lu_roles_exists is not None)

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_roles';")
        user_roles_exists = cursor.fetchone()
        print('user_roles table exists:', user_roles_exists is not None)

        if lu_roles_exists:
            cursor.execute('SELECT role_key, label FROM lu_roles;')
            roles = cursor.fetchall()
            print(f'Available roles: {len(roles)}')
            for role in roles:
                print(f'  {role[0]} - {role[1]}')

        if user_roles_exists:
            cursor.execute('SELECT COUNT(*) FROM user_roles;')
            user_role_count = cursor.fetchone()[0]
            print(f'User role assignments: {user_role_count}')
            
            cursor.execute('SELECT user_id, role_key FROM user_roles LIMIT 5;')
            user_roles = cursor.fetchall()
            print('User role assignments (first 5):')
            for ur in user_roles:
                print(f'  {ur[0]} - {ur[1]}')

        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    check_database()
