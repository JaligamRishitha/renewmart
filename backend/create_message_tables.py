#!/usr/bin/env python3
"""
Create message tables in the database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base
from models.messages import Message, MessageThread, MessageReaction
from models.tasks import Task
from models.users import User
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_message_tables():
    """Create message-related tables"""
    try:
        logger.info("Creating message tables...")
        
        # Create all tables (this will only create new ones)
        Base.metadata.create_all(bind=engine)
        
        logger.info("✅ Message tables created successfully!")
        logger.info("Created tables:")
        logger.info("  - messages")
        logger.info("  - message_threads") 
        logger.info("  - message_reactions")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating message tables: {e}")
        return False

def verify_tables():
    """Verify that the tables were created"""
    try:
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        required_tables = ['messages', 'message_threads', 'message_reactions']
        missing_tables = [table for table in required_tables if table not in tables]
        
        if missing_tables:
            logger.error(f"❌ Missing tables: {missing_tables}")
            return False
        
        logger.info("✅ All message tables verified!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error verifying tables: {e}")
        return False

if __name__ == "__main__":
    print("🗄️  Creating Message Tables")
    print("=" * 40)
    
    if create_message_tables():
        if verify_tables():
            print("\n🎉 Message system database setup complete!")
            print("\n📋 Next steps:")
            print("1. Start the backend server")
            print("2. Test the WebSocket connection")
            print("3. Test the frontend messaging components")
        else:
            print("\n❌ Table verification failed")
    else:
        print("\n❌ Failed to create message tables")
