"""
Geocoding utility using UK Postcodes.io API
Converts UK postcodes to latitude/longitude coordinates
"""
import httpx
import logging
from typing import Optional, Dict, Any
import re

logger = logging.getLogger(__name__)

# UK Postcodes.io API base URL
POSTCODES_IO_BASE_URL = "https://api.postcodes.io"


def normalize_postcode(postcode: str) -> str:
    """
    Normalize UK postcode format for API requests.
    Removes spaces and converts to uppercase.
    
    Args:
        postcode: UK postcode string
        
    Returns:
        Normalized postcode string
    """
    if not postcode:
        return ""
    
    # Remove all spaces and convert to uppercase
    normalized = re.sub(r'\s+', '', postcode.strip().upper())
    return normalized


def is_valid_uk_postcode(postcode: str) -> bool:
    """
    Basic validation for UK postcode format.
    
    Args:
        postcode: Postcode string to validate
        
    Returns:
        True if postcode appears to be valid UK format
    """
    if not postcode:
        return False
    
    normalized = normalize_postcode(postcode)
    
    # Basic UK postcode pattern: 1-2 letters, 1-2 digits, optional space, digit, 2 letters
    # Examples: SW1A1AA, M1 1AA, B33 8TH, W1A 0AX
    pattern = r'^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$'
    return bool(re.match(pattern, normalized))


async def geocode_postcode(postcode: str) -> Optional[Dict[str, Any]]:
    """
    Geocode a UK postcode to latitude/longitude using UK Postcodes.io API.
    
    Args:
        postcode: UK postcode string (e.g., "SW1A 1AA", "M1 1AA")
        
    Returns:
        Dictionary with 'lat' and 'lng' keys if successful, None otherwise
        Format: {'lat': float, 'lng': float}
    """
    if not postcode:
        logger.warning("Empty postcode provided for geocoding")
        return None
    
    normalized = normalize_postcode(postcode)
    
    if not is_valid_uk_postcode(normalized):
        logger.warning(f"Invalid UK postcode format: {postcode}")
        return None
    
    try:
        # Make request to UK Postcodes.io API
        url = f"{POSTCODES_IO_BASE_URL}/postcodes/{normalized}"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if result exists
                if data.get("status") == 200 and data.get("result"):
                    result = data["result"]
                    latitude = result.get("latitude")
                    longitude = result.get("longitude")
                    
                    if latitude is not None and longitude is not None:
                        logger.info(f"Successfully geocoded postcode {postcode} to {latitude}, {longitude}")
                        # Return in both formats for compatibility (frontend uses lat/lng, schema validator checks latitude/longitude)
                        return {
                            "lat": float(latitude),
                            "lng": float(longitude),
                            "latitude": float(latitude),
                            "longitude": float(longitude)
                        }
                    else:
                        logger.warning(f"Postcode {postcode} geocoded but missing lat/lng in response")
                        return None
                else:
                    logger.warning(f"Postcode {postcode} not found in UK Postcodes.io: {data.get('error', 'Unknown error')}")
                    return None
            elif response.status_code == 404:
                logger.warning(f"Postcode {postcode} not found (404)")
                return None
            else:
                logger.error(f"UK Postcodes.io API error for {postcode}: {response.status_code} - {response.text}")
                return None
                
    except httpx.TimeoutException:
        logger.error(f"Timeout while geocoding postcode {postcode}")
        return None
    except httpx.RequestError as e:
        logger.error(f"Request error while geocoding postcode {postcode}: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error while geocoding postcode {postcode}: {str(e)}")
        return None


def coordinates_are_valid(coordinates: Optional[Dict[str, Any]]) -> bool:
    """
    Check if coordinates are valid (not None, not empty, and have valid lat/lng values).
    
    Args:
        coordinates: Dictionary with 'lat' and 'lng' keys, or None
        
    Returns:
        True if coordinates are valid, False otherwise
    """
    if not coordinates:
        return False
    
    if not isinstance(coordinates, dict):
        return False
    
    lat = coordinates.get("lat") or coordinates.get("latitude")
    lng = coordinates.get("lng") or coordinates.get("longitude")
    
    if lat is None or lng is None:
        return False
    
    try:
        lat_float = float(lat)
        lng_float = float(lng)
        
        # Check if coordinates are within valid ranges
        if not (-90 <= lat_float <= 90):
            return False
        if not (-180 <= lng_float <= 180):
            return False
        
        # Check if coordinates are not default/empty values (0,0 is valid but might indicate missing data)
        # For UK, coordinates should be roughly: lat ~50-60, lng ~-8 to 2
        # We'll allow 0,0 but log a warning
        if lat_float == 0 and lng_float == 0:
            logger.warning("Coordinates are (0, 0) which might indicate missing data")
            # Still return True as 0,0 is technically valid
        
        return True
    except (ValueError, TypeError):
        return False


async def geocode_if_needed(
    postcode: Optional[str],
    existing_coordinates: Optional[Dict[str, Any]] = None
) -> Optional[Dict[str, Any]]:
    """
    Geocode postcode only if coordinates are missing or invalid.
    
    Args:
        postcode: UK postcode string
        existing_coordinates: Existing coordinates dictionary (if any)
        
    Returns:
        New coordinates if geocoding was needed and successful, None otherwise
    """
    if not postcode:
        return None
    
    # If coordinates are already valid, don't geocode
    if coordinates_are_valid(existing_coordinates):
        logger.debug(f"Coordinates already exist and are valid, skipping geocoding for postcode {postcode}")
        return None
    
    # Geocode the postcode
    return await geocode_postcode(postcode)

