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
        # Ensure table exists first
        db.execute(text("SELECT create_marketplace_settings_table()"))
        db.commit()
        
        # Query the table directly for the specific setting key
        result = db.execute(
            text("""
                SELECT setting_value 
                FROM marketplace_settings 
                WHERE setting_key = 'marketplace_template'
                LIMIT 1
            """)
        ).fetchone()
        
        if result and result.setting_value:
            # Parse JSON settings - result.setting_value is JSONB, which SQLAlchemy returns as dict
            settings_dict = {}
            if isinstance(result.setting_value, dict):
                settings_dict = result.setting_value
            else:
                # If it's not a dict, try to parse it
                try:
                    if isinstance(result.setting_value, str):
                        settings_dict = json.loads(result.setting_value)
                    else:
                        # Try to convert to dict
                        settings_dict = dict(result.setting_value)
                except (json.JSONDecodeError, TypeError, ValueError) as e:
                    print(f"Error parsing settings value: {e}")
                    # If parsing fails, return defaults
                    return MarketplaceTemplateSettings()
            
            # Create settings object directly from saved data
            # Pydantic will use defaults only for fields that are missing
            try:
                return MarketplaceTemplateSettings(**settings_dict)
            except Exception as e:
                print(f"Error creating settings object: {e}")
                # If creation fails, return defaults
                return MarketplaceTemplateSettings()
        else:
            # Return default settings if nothing found
            return MarketplaceTemplateSettings()
    except Exception as e:
        # Log error for debugging
        print(f"Error loading marketplace settings: {str(e)}")
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
        # Ensure system_settings table exists using stored procedure
        db.execute(text("SELECT create_marketplace_settings_table()"))
        
        # Save settings as JSONB - convert settings dict to JSON string first
        # JSONB expects a JSON string, not a Python dict
        settings_dict = settings.dict()
        settings_json = json.dumps(settings_dict)
        
        db.execute(
            text("""
                SELECT upsert_marketplace_setting(
                    'marketplace_template',
                    CAST(:settings_value AS jsonb)
                )
            """),
            {
                "settings_value": settings_json
            }
        )
        
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

