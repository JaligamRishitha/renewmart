import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ReactDOMServer from 'react-dom/server';
import * as LucideIcons from 'lucide-react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Component to handle map view updates
const MapViewUpdater = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && (map.getCenter().lat !== center.lat || map.getCenter().lng !== center.lng)) {
      map.setView([center.lat, center.lng], zoom);
    }
  }, [center, zoom, map]);
  
  return null;
};

const MapView = ({ projects, onProjectSelect, selectedProject, projectInterests = {} }) => {
  // Extract valid projects with coordinates
  const validProjects = useMemo(() => {
    return projects?.filter(project => {
      const coords = project?.coordinates;
      if (!coords) return false;
      
      // Support both lat/lng and latitude/longitude formats
      const lat = coords.lat || coords.latitude;
      const lng = coords.lng || coords.longitude;
      
      // Check if coordinates are valid numbers
      if (typeof lat !== 'number' || typeof lng !== 'number') return false;
      if (isNaN(lat) || isNaN(lng)) return false;
      
      // For UK projects, coordinates should be roughly within UK bounds
      return lat >= 45 && lat <= 65 && lng >= -15 && lng <= 5;
    }) || [];
  }, [projects]);

  // London coordinates (default center)
  const LONDON_CENTER = [51.5074, -0.1278];
  const LONDON_ZOOM = 11; // Good zoom level to show Greater London area

  // Calculate map center based on actual project locations
  const calculateMapCenter = useMemo(() => {
    if (validProjects.length === 0) {
      // Default to London center if no projects
      return LONDON_CENTER;
    }

    const validCoords = validProjects.map(project => {
      const coords = project.coordinates;
      return [
        coords.lat || coords.latitude,
        coords.lng || coords.longitude
      ];
    });

    // Calculate center point
    const avgLat = validCoords.reduce((sum, c) => sum + c[0], 0) / validCoords.length;
    const avgLng = validCoords.reduce((sum, c) => sum + c[1], 0) / validCoords.length;

    return [avgLat, avgLng];
  }, [validProjects]);

  // Calculate appropriate zoom level based on spread of projects
  const calculateZoom = useMemo(() => {
    if (validProjects.length === 0) return LONDON_ZOOM;
    if (validProjects.length === 1) return 12;

    const validCoords = validProjects.map(project => {
      const coords = project.coordinates;
      return [
        coords.lat || coords.latitude,
        coords.lng || coords.longitude
      ];
    });

    // Calculate bounding box
    const lats = validCoords.map(c => c[0]);
    const lngs = validCoords.map(c => c[1]);
    const latRange = Math.max(...lats) - Math.min(...lats);
    const lngRange = Math.max(...lngs) - Math.min(...lngs);
    const maxRange = Math.max(latRange, lngRange);

    // Adjust zoom based on range - but ensure minimum zoom for London area
    if (maxRange > 5) return 8;
    if (maxRange > 2) return 9;
    if (maxRange > 1) return 10;
    if (maxRange > 0.5) return 11;
    return 12;
  }, [validProjects]);

  // Initialize with London view
  const [mapCenter, setMapCenter] = useState(LONDON_CENTER);
  const [zoom, setZoom] = useState(LONDON_ZOOM);

  // Update map center and zoom when projects change
  // Only update if there are valid projects, otherwise keep London view
  useEffect(() => {
    if (validProjects.length > 0) {
      setMapCenter(calculateMapCenter);
      setZoom(calculateZoom);
    }
    // If no projects, keep London view (already set as initial state)
  }, [calculateMapCenter, calculateZoom, validProjects.length]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })?.format(price);
  };

  const formatEstimatedRevenue = (revenue) => {
    if (!revenue || revenue === 0) return 'N/A';
    // Revenue is in millions from backend, convert to actual value for compact notation
    // This will format 2.5 (millions) as "£2.5M"
    const actualValue = revenue * 1000000;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
      notation: 'compact',
      compactDisplay: 'short'
    })?.format(actualValue);
  };

  const getProjectTypeIcon = (type) => {
    const iconMap = {
      'Solar': 'Sun',
      'Wind': 'Wind',
      'Hydroelectric': 'Waves',
      'Hydro': 'Waves',
      'hydroelectric': 'Waves',
      'hydro': 'Waves',
      'Biomass': 'Leaf',
      'biomass': 'Leaf',
      'Geothermal': 'Zap',
      'geothermal': 'Zap'
    };
    return iconMap?.[type] || 'Zap';
  };

  const getProjectTypeColor = (type) => {
    const colorMap = {
      'Solar': '#EAB308',
      'solar': '#EAB308',
      'Wind': '#3B82F6',
      'wind': '#3B82F6',
      'Hydroelectric': '#06B6D4',
      'Hydro': '#06B6D4',
      'hydroelectric': '#06B6D4',
      'hydro': '#06B6D4',
      'Biomass': '#10B981',
      'biomass': '#10B981',
      'Geothermal': '#F97316',
      'geothermal': '#F97316'
    };
    return colorMap?.[type] || '#6366F1';
  };

  // Get icon SVG string from Lucide icon name - using the same icon names as the legend
  const getIconSVGString = (iconName) => {
    // Use the same icon lookup as AppIcon component to ensure consistency
    const IconComponent = LucideIcons[iconName];
    if (!IconComponent) {
      // Fallback to Zap icon if icon not found (same as AppIcon fallback logic)
      const FallbackIcon = LucideIcons['Zap'] || LucideIcons['HelpCircle'];
      return ReactDOMServer.renderToString(
        React.createElement(FallbackIcon, { size: 20, color: 'white', strokeWidth: 2 })
      );
    }
    // Render icon with same styling as legend icons (white color, strokeWidth 2)
    return ReactDOMServer.renderToString(
      React.createElement(IconComponent, { size: 20, color: 'white', strokeWidth: 2 })
    );
  };

  // Create custom icon for markers using the exact same icons and colors as the legend
  const createCustomIcon = (projectType) => {
    // Use the same functions as the legend to ensure consistency
    const color = getProjectTypeColor(projectType);
    const iconName = getProjectTypeIcon(projectType); // Same function used in legend
    
    // Get the icon SVG using the same icon name mapping
    const iconSVG = getIconSVGString(iconName);
    
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: ${color};
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s;
        ">
          ${iconSVG}
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 1, 18));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 1, 3));
  };

  const handleResetView = () => {
    if (validProjects.length > 0) {
      setMapCenter(calculateMapCenter);
      setZoom(calculateZoom);
    } else {
      // Reset to London view if no projects
      setMapCenter(LONDON_CENTER);
      setZoom(LONDON_ZOOM);
    }
  };

  const handleMarkerClick = (project) => {
    onProjectSelect(project);
  };

  return (
    <div className="relative h-full bg-muted rounded-lg overflow-hidden">
      {/* Map Container */}
      <div className="w-full h-full relative">
        {validProjects.length > 0 ? (
          <MapContainer
            center={mapCenter}
            zoom={zoom}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
            scrollWheelZoom={true}
            key={`${mapCenter[0]}-${mapCenter[1]}-${zoom}`}
          >
            <MapViewUpdater center={{ lat: mapCenter[0], lng: mapCenter[1] }} zoom={zoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Project Markers */}
            {validProjects.map((project) => {
              const coords = project.coordinates;
              const lat = coords.lat || coords.latitude;
              const lng = coords.lng || coords.longitude;
              const projectType = project.energy_key || project.type || project.energyType || 'Unknown';
              const isSelected = selectedProject && (selectedProject.id === project.id || selectedProject.land_id === project.id);
              const projectName = project.title || project.name || 'Project';
              const projectLocation = project.location_text || project.location || 'Location not specified';
              
              // Calculate estimated revenue if not provided
              // Formula: capacity_mw * price_per_mwh * 8760 hours / 1,000,000 (annual revenue in millions)
              let estimatedRevenue = project.estimatedRevenue || project.estimated_revenue;
              if (!estimatedRevenue || estimatedRevenue === 0) {
                const capacity = project.capacity_mw || project.capacityMW || project.capacity || 0;
                const pricePerMWh = project.price_per_mwh || project.pricePerMWh || project.price || 0;
                if (capacity > 0 && pricePerMWh > 0) {
                  estimatedRevenue = (capacity * pricePerMWh * 8760) / 1000000; // Annual revenue in millions
                }
              }
              
              return (
                <Marker
                  key={project.id || project.land_id}
                  position={[lat, lng]}
                  icon={createCustomIcon(projectType)}
                  eventHandlers={{
                    click: () => handleMarkerClick(project)
                  }}
                >
                  <Tooltip
                    permanent={false}
                    direction="top"
                    offset={[0, -10]}
                    className="custom-tooltip"
                  >
                    <div className="bg-card border border-border rounded-lg shadow-elevation-2 p-3 min-w-[200px] max-w-[250px]">
                      {/* Project Name */}
                      <h4 className="font-heading font-semibold text-sm text-foreground mb-2 line-clamp-1">
                        {projectName}
                      </h4>
                      
                      {/* Project Type */}
                      <div className="flex items-center space-x-2 mb-2">
                        <div
                          className="w-3 h-3 rounded-full border border-white shadow-sm flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: getProjectTypeColor(projectType) }}
                        >
                          <Icon name={getProjectTypeIcon(projectType)} size={8} className="text-white" />
                        </div>
                        <span className="text-xs font-medium text-foreground capitalize">
                          {projectType}
                        </span>
                      </div>
                      
                      {/* Location */}
                      <div className="flex items-start space-x-2 mb-2">
                        <Icon name="MapPin" size={12} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground line-clamp-2">
                          {projectLocation}
                        </span>
                      </div>
                      
                      {/* Estimated Revenue */}
                      <div className="flex items-center space-x-2 pt-2 border-t border-border">
                        <Icon name="PoundSterling" size={12} className="text-muted-foreground flex-shrink-0" />
                        <div className="flex-1">
                          <span className="text-xs text-muted-foreground block">Est. Revenue</span>
                          <span className="text-sm font-semibold text-foreground">
                            {estimatedRevenue && estimatedRevenue > 0
                              ? `${formatEstimatedRevenue(estimatedRevenue)}/year`
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Tooltip>
                  
                  <Popup>
                    <div className="p-2">
                      <h4 className="font-semibold text-sm mb-1">
                        {projectName}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-1">
                        {projectLocation}
                      </p>
                      <p className="text-xs">
                        <span className="font-medium">Type:</span> {projectType}
                      </p>
                      {project.capacity_mw && (
                        <p className="text-xs">
                          <span className="font-medium">Capacity:</span> {project.capacity_mw} MW
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <div className="text-center">
              <Icon name="MapPin" size={48} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                {projects?.length === 0 
                  ? 'No projects to display on map'
                  : 'No projects with valid coordinates to display'}
              </p>
              {projects?.length > 0 && validProjects.length === 0 && (
                <p className="text-muted-foreground text-sm mt-1">
                  Projects need postcodes or coordinates to appear on the map
                </p>
              )}
            </div>
          </div>
        )}

        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2 z-[1000]">
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            className="bg-card shadow-elevation-1"
          >
            <Icon name="Plus" size={16} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            className="bg-card shadow-elevation-1"
          >
            <Icon name="Minus" size={16} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleResetView}
            className="bg-card shadow-elevation-1"
          >
            <Icon name="Home" size={16} />
          </Button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-card border border-border rounded-lg p-3 shadow-elevation-1 max-w-xs z-[1000]">
          <h4 className="font-heading font-medium text-sm text-foreground mb-2">
            Project Types
          </h4>
          <div className="space-y-1">
            {['Solar', 'Wind', 'Hydroelectric', 'Biomass', 'Geothermal']?.map(type => (
              <div key={type} className="flex items-center space-x-2 text-xs">
                <div
                  className="w-4 h-4 rounded-full border border-white shadow-sm flex items-center justify-center"
                  style={{ backgroundColor: getProjectTypeColor(type) }}
                >
                  <Icon name={getProjectTypeIcon(type)} size={10} className="text-white" />
                </div>
                <span className="text-muted-foreground">{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Project Count */}
        <div className="absolute top-4 left-4 bg-card border border-border rounded-lg px-3 py-2 shadow-elevation-1 z-[1000]">
          <div className="flex items-center space-x-2">
            <Icon name="MapPin" size={16} className="text-primary" />
            <span className="text-sm font-medium text-foreground">
              {validProjects.length} {validProjects.length === 1 ? 'Project' : 'Projects'}
              {projects?.length > validProjects.length && (
                <span className="text-muted-foreground text-xs ml-1">
                  ({projects.length - validProjects.length} without location)
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Selected Project Info */}
      {selectedProject && (
        <div className="absolute bottom-4 right-4 bg-card border border-border rounded-lg p-4 shadow-elevation-2 max-w-sm animate-fade-in z-[1000]">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-heading font-semibold text-foreground line-clamp-1">
              {selectedProject?.name || selectedProject?.title}
            </h4>
            <button
              onClick={() => onProjectSelect(null)}
              className="p-1 hover:bg-muted rounded transition-smooth"
            >
              <Icon name="X" size={14} />
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center text-muted-foreground">
              <Icon name="MapPin" size={12} className="mr-1" />
              <span className="line-clamp-1">
                {selectedProject?.location_text || selectedProject?.location || 'Location not specified'}
              </span>
            </div>
            
            {selectedProject?.capacity_mw && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Capacity:</span>
                <span className="font-medium text-foreground">
                  {selectedProject?.capacity_mw?.toLocaleString('en-US')} MW
                </span>
              </div>
            )}
            
            {selectedProject?.price_per_mwh && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-medium text-foreground">
                  {formatPrice(selectedProject?.price_per_mwh)}/MWh
                </span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Type:</span>
              <div className="flex items-center space-x-1">
                <Icon 
                  name={getProjectTypeIcon(selectedProject?.energy_key || selectedProject?.type)} 
                  size={12} 
                />
                <span className="font-medium text-foreground">
                  {selectedProject?.energy_key || selectedProject?.type || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onProjectSelect(selectedProject?.id || selectedProject?.land_id, 'view')}
              className="flex-1"
            >
              View Details
            </Button>
            {projectInterests[selectedProject?.id || selectedProject?.land_id] ? (
              <div className="flex-1 flex items-center justify-center px-3 py-2 rounded-md border border-border bg-muted/50">
                <div className="flex items-center space-x-2">
                  {projectInterests[selectedProject?.id || selectedProject?.land_id].status === 'approved' && (
                    <>
                      <Icon name="CheckCircle" size={14} className="text-green-600" />
                      <span className="text-sm font-medium text-green-600">Approved</span>
                    </>
                  )}
                  {projectInterests[selectedProject?.id || selectedProject?.land_id].status === 'pending' && (
                    <>
                      <Icon name="Clock" size={14} className="text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-600">Pending</span>
                    </>
                  )}
                  {projectInterests[selectedProject?.id || selectedProject?.land_id].status === 'rejected' && (
                    <>
                      <Icon name="XCircle" size={14} className="text-red-600" />
                      <span className="text-sm font-medium text-red-600">Rejected</span>
                    </>
                  )}
                  {!['approved', 'pending', 'rejected'].includes(projectInterests[selectedProject?.id || selectedProject?.land_id]?.status) && (
                    <>
                      <Icon name="Clock" size={14} className="text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">
                        {projectInterests[selectedProject?.id || selectedProject?.land_id]?.status || 'Pending'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => onProjectSelect(selectedProject?.id || selectedProject?.land_id, 'interest')}
                className="flex-1"
              >
                Express Interest
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
