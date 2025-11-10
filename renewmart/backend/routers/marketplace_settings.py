"""
Marketplace Template Settings API
Allows admins to configure how project cards are displayed in marketplace
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Any, Optional
from pydantic import BaseModel
import json

from database import get_db
from auth import get_current_user, require_admin

router = APIRouter(prefix="/marketplace-settings", tags=["marketplace-settings"])


class MarketplaceTemplateSettings(BaseModel):
    """Marketplace template settings schema"""
    # Features configuration
    showCapacity: bool = True
    showPrice: bool = True
    showLocation: bool = True
    showEnergyType: bool = True
    showTimeline: bool = True
    showArea: bool = False
    showContractTerm: bool = False
    showDeveloperName: bool = False
    showInterestCount: bool = True
    
    # Design settings
    cardStyle: str = 'modern'  # 'modern', 'classic', 'minimal'
    colorScheme: Dict[str, str] = {
        'primary': '#3b82f6',
        'secondary': '#64748b',
        'accent': '#10b981',
        'background': '#ffffff'
    }
    layout: str = 'grid'  # 'grid', 'list', 'masonry'
    cardsPerRow: int = 3
    showFilters: bool = True
    showSorting: bool = True


@router.get("", response_model=MarketplaceTemplateSettings)
async def get_marketplace_settings(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current marketplace template settings"""
    try:
        # Check if settings exist in database
        query = text("""
            SELECT settings_value
            FROM system_settings
            WHERE settings_key = 'marketplace_template'
            LIMIT 1
        """)
        result = db.execute(query).fetchone()
        
        if result and result.settings_value:
            # Parse JSON settings
            settings = json.loads(result.settings_value)
            return MarketplaceTemplateSettings(**settings)
        else:
            # Return default settings
            return MarketplaceTemplateSettings()
    except Exception as e:
        # If table doesn't exist or error, return defaults
        return MarketplaceTemplateSettings()


@router.post("", response_model=Dict[str, Any])
async def save_marketplace_settings(
    settings: MarketplaceTemplateSettings,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Save marketplace template settings (admin only)"""
    
    try:
        # Ensure system_settings table exists
        create_table_query = text("""
            CREATE TABLE IF NOT EXISTS system_settings (
                settings_key VARCHAR(255) PRIMARY KEY,
                settings_value TEXT NOT NULL,
                updated_by UUID,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        db.execute(create_table_query)
        
        # Save settings as JSON
        settings_json = json.dumps(settings.dict())
        
        # Insert or update settings
        upsert_query = text("""
            INSERT INTO system_settings (settings_key, settings_value, updated_by, updated_at)
            VALUES ('marketplace_template', :settings_value, :updated_by, CURRENT_TIMESTAMP)
            ON CONFLICT (settings_key) 
            DO UPDATE SET 
                settings_value = :settings_value,
                updated_by = :updated_by,
                updated_at = CURRENT_TIMESTAMP
        """)
        
        db.execute(upsert_query, {
            "settings_value": settings_json,
            "updated_by": str(current_user.get('user_id'))
        })
        
        db.commit()
        
        return {
            "success": True,
            "message": "Marketplace settings saved successfully",
            "settings": settings.dict()
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save marketplace settings: {str(e)}"
        )

