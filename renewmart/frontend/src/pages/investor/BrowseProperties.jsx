import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import Input from '../../components/ui/Input';
import { taskAPI } from '../../services/api';

const BrowseProperties = () => {
  console.log('🎬 BrowseProperties component loaded');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    location: 'all',
    size: 'all',
    priceRange: 'all'
  });
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskStatusData, setTaskStatusData] = useState({});
  const [loadingTaskData, setLoadingTaskData] = useState(false);

  // Clear task data for a specific land ID (useful for refreshing)
  const clearTaskData = (landId) => {
    console.log('🔄 Clearing task data for land:', landId);
    setTaskStatusData(prev => {
      const newData = { ...prev };
      delete newData[landId];
      return newData;
    });
  };

  // Force refresh task data for a specific land ID
  const refreshTaskData = async (landId) => {
    console.log('🔄 Force refreshing task data for land:', landId);
    clearTaskData(landId);
    await fetchTaskStatus(landId);
  };

  // Fetch task status data for a specific property from admin review panel
  const fetchTaskStatus = async (landId) => {
    // Check if we already have data for this landId
    if (taskStatusData[landId] && Object.keys(taskStatusData[landId]).length > 0) {
      console.log('🔄 Task data already exists for land:', landId, 'skipping fetch');
      return;
    }
    
    // Prevent multiple simultaneous calls for the same landId
    if (loadingTaskData) {
      console.log('🔄 Already loading task data, skipping duplicate request');
      return;
    }
    
    setLoadingTaskData(true);
    try {
      console.log('🔄 Fetching task status from admin review panel for land:', landId);
      const response = await taskAPI.getTaskStatusByProject(landId);
      console.log('📊 Task status response from admin:', response);
      console.log('📊 Response type:', typeof response);
      console.log('📊 Response keys:', Object.keys(response || {}));
      console.log('📊 Response.tasks:', response?.tasks);
      console.log('📊 Response.tasks length:', response?.tasks?.length);
      
      // Handle different response structures
      let tasks = [];
      if (response && response.tasks && response.tasks.length > 0) {
        tasks = response.tasks;
      } else if (response && Array.isArray(response) && response.length > 0) {
        tasks = response;
      } else if (response && response.data && response.data.length > 0) {
        tasks = response.data;
      }
      
      console.log('📊 Extracted tasks:', tasks);
      console.log('📊 Tasks length:', tasks.length);
      
      if (tasks && tasks.length > 0) {
        console.log('📊 Processing tasks:', tasks);
        // Process tasks to create role-based structure
        const processedData = processTasksForRoles(tasks);
        console.log('📊 Processed data:', processedData);
        setTaskStatusData(prev => ({
          ...prev,
          [landId]: processedData
        }));
      } else {
        console.warn('⚠️ No task data received from admin review panel');
        console.warn('⚠️ Response structure:', response);
        setTaskStatusData(prev => ({
          ...prev,
          [landId]: {}
        }));
      }
    } catch (error) {
      console.error('❌ Error fetching task status from admin review panel:', error);
      setTaskStatusData(prev => ({
        ...prev,
        [landId]: {}
      }));
      // Show error message to user instead of mock data
      alert('Unable to fetch task data from admin review panel. Please try again later.');
    } finally {
      setLoadingTaskData(false);
    }
  };

  // Process tasks to create role-based structure
  const processTasksForRoles = (tasks) => {
    console.log('🔧 Processing tasks for roles:', tasks);
    console.log('🔧 Total tasks to process:', tasks.length);
    
    const roleData = {};
    
    // Define reviewer roles
    const reviewerRoles = [
      { id: 're_sales_advisor', label: 'RE Sales Advisor' },
      { id: 're_analyst', label: 'RE Analyst' },
      { id: 're_governance_lead', label: 'RE Governance Lead' }
    ];
    
    // Initialize role data structure
    reviewerRoles.forEach(role => {
      roleData[role.id] = {
        completed: 0,
        total: 0,
        status: 'pending',
        tasks: []
      };
    });

    // Track processed task IDs to prevent duplicates
    const processedTaskIds = new Set();
    const processedTaskNames = new Set();

    // Process each task
    tasks.forEach((task, index) => {
      console.log(`🔧 Processing task ${index + 1}/${tasks.length}:`, task);
      console.log(`🔧 Task keys:`, Object.keys(task));
      console.log(`🔧 Task assigned_role:`, task.assigned_role);
      console.log(`🔧 Task role:`, task.role);
      console.log(`🔧 Task status:`, task.status);
      console.log(`🔧 Task title:`, task.title);
      console.log(`🔧 Task task_name:`, task.task_name);
      console.log(`🔧 Task subtasks:`, task.subtasks);
      
      const roleId = task.assigned_role || task.role || task.role_id;
      const taskId = task.task_id || task.id;
      const taskName = task.title || task.task_name || task.name || 'Untitled Task';
      
      console.log(`🔧 Resolved roleId:`, roleId);
      console.log(`🔧 Task ID:`, taskId);
      console.log(`🔧 Task Name:`, taskName);
      
      // Check if we've already processed this task ID
      if (taskId && processedTaskIds.has(taskId)) {
        console.warn(`🔧 DUPLICATE TASK ID DETECTED: Task ID ${taskId} already processed, skipping`);
        return;
      }
      
      // Check if we've already processed this task name
      if (processedTaskNames.has(taskName)) {
        console.warn(`🔧 DUPLICATE TASK NAME DETECTED: Task name "${taskName}" already processed, skipping`);
        return;
      }
      
      if (roleId && roleData[roleId]) {
        console.log(`🔧 Adding task to role:`, roleId);
        roleData[roleId].total += 1;
        if (task.status === 'completed') {
          roleData[roleId].completed += 1;
        }
        
        // Add task to role's task list with subtasks
        const taskData = {
          id: taskId,
          name: taskName,
          completed: task.status === 'completed'
        };
        
        // Add subtasks if they exist
        if (task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0) {
          console.log(`🔧 Processing subtasks for task:`, taskName, task.subtasks);
          taskData.subtasks = task.subtasks.map(subtask => ({
            name: subtask.name || subtask.title || subtask.subtask_name || 'Untitled Subtask',
            completed: subtask.status === 'completed' || subtask.completed === true
          }));
          console.log(`🔧 Processed subtasks:`, taskData.subtasks);
        }
        
        // Check for duplicate tasks before adding (by task ID if available, otherwise by name)
        const existingTaskById = taskId ? roleData[roleId].tasks.find(t => t.id === taskId) : null;
        const existingTaskByName = roleData[roleId].tasks.find(t => t.name === taskName);
        
        if (existingTaskById || existingTaskByName) {
          console.warn(`🔧 DUPLICATE TASK DETECTED: "${taskName}" already exists in role ${roleId}`);
          console.warn(`🔧 Existing task by ID:`, existingTaskById);
          console.warn(`🔧 Existing task by name:`, existingTaskByName);
          console.warn(`🔧 New task:`, taskData);
          console.warn(`🔧 Task ID:`, taskId);
          // Don't add duplicate
          return;
        }
        
        roleData[roleId].tasks.push(taskData);
        
        // Mark this task ID and name as processed
        if (taskId) {
          processedTaskIds.add(taskId);
        }
        processedTaskNames.add(taskName);

        // Update role status
        if (task.status === 'completed') {
          roleData[roleId].status = 'completed';
        } else if (task.status === 'in_progress') {
          roleData[roleId].status = 'in_progress';
        }
        
        console.log(`🔧 Updated role data for ${roleId}:`, roleData[roleId]);
        console.log(`🔧 Total tasks in ${roleId}:`, roleData[roleId].tasks.length);
      } else {
        console.warn(`🔧 No matching role found for task:`, task);
        console.warn(`🔧 Available roles:`, Object.keys(roleData));
      }
    });

    console.log('🔧 Final processed role data:', roleData);
    console.log('🔧 Processed task IDs:', Array.from(processedTaskIds));
    console.log('🔧 Processed task names:', Array.from(processedTaskNames));
    
    // Log final counts for each role
    Object.keys(roleData).forEach(roleId => {
      console.log(`🔧 Final count for ${roleId}: ${roleData[roleId].tasks.length} tasks`);
    });
    
    return roleData;
  };


  useEffect(() => {
    // Simulate loading properties data
    const loadProperties = () => {
      setTimeout(() => {
        setProperties([
          {
            id: 1,
            landId: 1, // Add land ID for API calls
            name: 'Green Valley Solar Farm',
            location: 'Texas, USA',
            type: 'Solar',
            size: '150 acres',
            capacity: '50 MW',
            price: '$2.5M',
            roi: '12.5%',
            status: 'Available',
            description: 'Prime solar development site with excellent sun exposure and grid connectivity.',
            features: ['Grid Connected', 'Environmental Cleared', 'Permits Ready'],
            images: ['/api/placeholder/400/300'],
            owner: 'John Smith',
            listedDate: '2024-01-15',
            taskStatus: {
              're_sales_advisor': {
                completed: 8,
                total: 12,
                status: 'in_progress',
                tasks: [
                  { name: 'Market Analysis & Feasibility Study', completed: true },
                  { name: 'Client Relationship Management', completed: true },
                  { name: 'Sales Pipeline Development', completed: true },
                  { name: 'Contract Negotiations', completed: true },
                  { name: 'Lead Generation & Prospecting', completed: true },
                  { name: 'Client Presentations', completed: true },
                  { name: 'Deal Structuring', completed: true },
                  { name: 'Revenue Forecasting', completed: true },
                  { name: 'Customer Retention', completed: false },
                  { name: 'Market Research', completed: false },
                  { name: 'Sales Reporting', completed: false },
                  { name: 'Client Onboarding', completed: false }
                ]
              },
              're_analyst': {
                completed: 5,
                total: 10,
                status: 'in_progress',
                tasks: [
                  { name: 'Financial Modeling & Analysis', completed: true },
                  { name: 'Risk Assessment', completed: true },
                  { name: 'Investment Valuation', completed: true },
                  { name: 'Due Diligence Review', completed: true },
                  { name: 'Performance Metrics Analysis', completed: true },
                  { name: 'Portfolio Optimization', completed: false },
                  { name: 'Market Trend Analysis', completed: false },
                  { name: 'ROI Calculations', completed: false },
                  { name: 'Financial Reporting', completed: false },
                  { name: 'Data Analysis', completed: false }
                ]
              },
              're_governance_lead': {
                completed: 3,
                total: 8,
                status: 'pending',
                tasks: [
                  { name: 'Compliance Review', completed: true },
                  { name: 'Regulatory Documentation', completed: true },
                  { name: 'Legal Framework Assessment', completed: true },
                  { name: 'Governance Policy Implementation', completed: false },
                  { name: 'Audit Preparation', completed: false },
                  { name: 'Stakeholder Communication', completed: false },
                  { name: 'Risk Management Framework', completed: false },
                  { name: 'Compliance Monitoring', completed: false }
                ]
              }
            }
          },
          {
            id: 2,
            landId: 2, // Add land ID for API calls
            name: 'Prairie Wind Development',
            location: 'Oklahoma, USA',
            type: 'Wind',
            size: '200 acres',
            capacity: '75 MW',
            price: '$3.2M',
            roi: '14.2%',
            status: 'Available',
            description: 'Excellent wind resource area with consistent wind patterns and minimal obstacles.',
            features: ['High Wind Speed', 'Transmission Access', 'Local Support'],
            images: ['/api/placeholder/400/300'],
            owner: 'Sarah Johnson',
            listedDate: '2024-01-10',
            taskStatus: {
              're_sales_advisor': {
                completed: 10,
                total: 12,
                status: 'completed'
              },
              're_analyst': {
                completed: 7,
                total: 10,
                status: 'in_progress'
              },
              're_governance_lead': {
                completed: 6,
                total: 8,
                status: 'in_progress'
              }
            }
          },
          {
            id: 3,
            landId: 3, // Add land ID for API calls
            name: 'Desert Solar Complex',
            location: 'Nevada, USA',
            type: 'Solar',
            size: '300 acres',
            capacity: '100 MW',
            price: '$4.8M',
            roi: '15.8%',
            status: 'Under Review',
            description: 'Large-scale solar development opportunity in high-irradiance desert location.',
            features: ['High Irradiance', 'Flat Terrain', 'Water Access'],
            images: ['/api/placeholder/400/300'],
            owner: 'Desert Land Co.',
            listedDate: '2024-01-05'
          },
          {
            id: 4,
            name: 'Coastal Wind Project',
            location: 'California, USA',
            type: 'Wind',
            size: '180 acres',
            capacity: '60 MW',
            price: '$2.8M',
            roi: '11.3%',
            status: 'Available',
            description: 'Coastal wind development site with strong and consistent offshore wind patterns.',
            features: ['Coastal Location', 'Strong Winds', 'Environmental Study Complete'],
            images: ['/api/placeholder/400/300'],
            owner: 'Pacific Energy LLC',
            listedDate: '2024-01-12'
          },
          {
            id: 5,
            name: 'Hybrid Energy Hub',
            location: 'Arizona, USA',
            type: 'Hybrid',
            size: '250 acres',
            capacity: '80 MW',
            price: '$3.5M',
            roi: '13.7%',
            status: 'Available',
            description: 'Unique hybrid solar and wind development opportunity with battery storage potential.',
            features: ['Solar + Wind', 'Storage Ready', 'Grid Interconnection'],
            images: ['/api/placeholder/400/300'],
            owner: 'Southwest Renewables',
            listedDate: '2024-01-08'
          }
        ]);
        setLoading(false);
      }, 1000);
    };

    loadProperties();
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                         property.location.toLowerCase().includes(filters.search.toLowerCase());
    const matchesType = filters.type === 'all' || property.type.toLowerCase() === filters.type;
    const matchesStatus = property.status === 'Available'; // Only show available properties
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleExpressInterest = (propertyId) => {
    // Simulate expressing interest
    alert(`Interest expressed in property ${propertyId}. The landowner will be notified.`);
  };

  const getTypeIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'solar': return 'Sun';
      case 'wind': return 'Wind';
      case 'hybrid': return 'Zap';
      default: return 'MapPin';
    }
  };

  const getTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'solar': return 'text-yellow-600';
      case 'wind': return 'text-blue-600';
      case 'hybrid': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <>
      <Helmet>
        <title>Browse Properties - Renewmart</title>
        <meta name="description" content="Browse available renewable energy development properties" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Header />
        <Sidebar isCollapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
        
        <main className={`pt-16 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-60'
        }`}>
          <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <BreadcrumbNavigation />
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    Browse Properties
                  </h1>
                  <p className="text-muted-foreground">
                    Discover renewable energy development opportunities
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    {filteredProperties.length} properties available
                  </span>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-card border border-border rounded-lg p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input
                  label="Search"
                  placeholder="Search properties..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  iconName="Search"
                />
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Type</label>
                  <select
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Types</option>
                    <option value="solar">Solar</option>
                    <option value="wind">Wind</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Location</label>
                  <select
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Locations</option>
                    <option value="texas">Texas</option>
                    <option value="california">California</option>
                    <option value="nevada">Nevada</option>
                    <option value="oklahoma">Oklahoma</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Price Range</label>
                  <select
                    value={filters.priceRange}
                    onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Prices</option>
                    <option value="under-3m">Under $3M</option>
                    <option value="3m-5m">$3M - $5M</option>
                    <option value="over-5m">Over $5M</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Properties Grid */}
            {loading ? (
              <div className="text-center py-12">
                <Icon name="Loader2" size={32} className="animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading properties...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProperties.map((property) => (
                  <div key={property.id} className="bg-card border border-border rounded-lg shadow-subtle overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Property Image */}
                    <div className="h-48 bg-muted relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon name={getTypeIcon(property.type)} size={48} className={`${getTypeColor(property.type)} opacity-50`} />
                      </div>
                      <div className="absolute top-4 left-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium bg-white/90 ${getTypeColor(property.type)}`}>
                          {property.type}
                        </span>
                      </div>
                      <div className="absolute top-4 right-4">
                        <span className="px-2 py-1 bg-success/90 text-white text-xs font-medium rounded-full">
                          {property.status}
                        </span>
                      </div>
                    </div>

                    {/* Property Details */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-foreground">{property.name}</h3>
                        <div className="text-right">
                          <div className="text-lg font-bold text-foreground">{property.price}</div>
                          <div className="text-sm text-success font-medium">{property.roi} ROI</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-muted-foreground text-sm mb-3">
                        <Icon name="MapPin" size={16} className="mr-1" />
                        {property.location}
                      </div>
                      
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                        {property.description}
                      </p>
                      
                      {/* Property Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-muted-foreground">Size</div>
                          <div className="text-sm font-medium text-foreground">{property.size}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Capacity</div>
                          <div className="text-sm font-medium text-foreground">{property.capacity}</div>
                        </div>
                      </div>
                      
                      {/* Features */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {property.features.slice(0, 3).map((feature, index) => (
                          <span key={index} className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                            {feature}
                          </span>
                        ))}
                      </div>
                      
                      {/* Task Tracking Section */}
                      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-foreground flex items-center">
                            <Icon name="CheckSquare" size={16} className="mr-2 text-primary" />
                            Project Progress
                          </h4>
                          <button
                            onClick={async () => {
                              console.log('👁️ Eye icon clicked for property:', property.name);
                              setSelectedProperty(property);
                              setShowTaskModal(true);
                              // Fetch real task data from API
                              if (property.landId) {
                                await fetchTaskStatus(property.landId);
                              }
                            }}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
                            title="View detailed task status"
                          >
                            <Icon name="Eye" size={16} />
                          </button>
                        </div>
                        <div className="space-y-2">
                          {property.taskStatus && Object.entries(property.taskStatus).map(([role, status]) => (
                            <div key={role} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground capitalize">
                                {role.replace('_', ' ').replace('re ', '')}
                              </span>
                              <div className="flex items-center space-x-2">
                                <span className="text-foreground font-medium">
                                  {status.completed}/{status.total}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                  status.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  status.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {status.status.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          Listed by {property.owner}
                        </div>
                        <Button
                          size="sm"
                          iconName="Heart"
                          onClick={() => handleExpressInterest(property.id)}
                        >
                          Express Interest
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredProperties.length === 0 && !loading && (
              <div className="text-center py-12">
                <Icon name="Search" size={48} className="text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No properties found</h3>
                <p className="text-muted-foreground">Try adjusting your search filters to find more properties.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Task Status Modal */}
      {showTaskModal && selectedProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{selectedProperty.name}</h2>
                  <p className="text-sm text-muted-foreground">Task Status Overview</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => selectedProperty.landId && refreshTaskData(selectedProperty.landId)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Refresh task data"
                  >
                    <Icon name="RefreshCw" size={20} className="text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setShowTaskModal(false)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <Icon name="X" size={20} className="text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Debug Info */}
              {selectedProperty.landId && taskStatusData[selectedProperty.landId] && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Debug Info:</h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Land ID: {selectedProperty.landId}</div>
                    <div>RE Sales Advisor Tasks: {taskStatusData[selectedProperty.landId]?.re_sales_advisor?.tasks?.length || 0}</div>
                    <div>RE Analyst Tasks: {taskStatusData[selectedProperty.landId]?.re_analyst?.tasks?.length || 0}</div>
                    <div>RE Governance Lead Tasks: {taskStatusData[selectedProperty.landId]?.re_governance_lead?.tasks?.length || 0}</div>
                  </div>
                </div>
              )}
              
              {loadingTaskData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3 text-muted-foreground">Loading task data...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    // Use fetched task data if available, otherwise fallback to property data
                    const taskData = selectedProperty.landId && taskStatusData[selectedProperty.landId] 
                      ? taskStatusData[selectedProperty.landId] 
                      : selectedProperty.taskStatus;
                    
                    return taskData && Object.keys(taskData).length > 0 ? Object.entries(taskData).map(([role, status]) => {
                      // Debug: Log the tasks for this role
                      console.log(`🔍 Displaying tasks for role ${role}:`, status.tasks);
                      return (
                  <div key={role} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Icon name="User" size={18} className="text-primary" />
                        <h3 className="text-lg font-semibold text-foreground capitalize">
                          {role.replace('_', ' ').replace('re ', '')}
                        </h3>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        status.status === 'completed' ? 'bg-green-100 text-green-800' :
                        status.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {status.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{status.completed}/{status.total} tasks</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(status.completed / status.total) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Task Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div className="flex items-center space-x-2">
                        <Icon name="CheckCircle" size={16} className="text-green-600" />
                        <span className="text-green-600 font-medium">{status.completed} Completed</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Icon name="Clock" size={16} className="text-orange-600" />
                        <span className="text-orange-600 font-medium">{status.total - status.completed} Remaining</span>
                      </div>
                    </div>

                    {/* Individual Task List */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-foreground mb-3">Task Breakdown</h4>
                      {status.tasks && status.tasks.length > 0 ? (
                        <div className="space-y-3">
                          {status.tasks.map((task, index) => (
                            <div key={index} className="border border-border rounded-lg p-3">
                              {/* Task Name as Heading */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <Icon 
                                    name={task.completed ? "CheckCircle" : "Clock"} 
                                    size={16} 
                                    className={task.completed ? "text-green-600" : "text-orange-600"} 
                                  />
                                  <h5 className="text-sm font-semibold text-foreground">
                                    {task.name}
                                  </h5>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  task.completed ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {task.completed ? 'Completed' : 'Pending'}
                                </span>
                              </div>
                              
                              {/* Subtasks */}
                              {task.subtasks && task.subtasks.length > 0 && (
                                <div className="ml-6 space-y-1">
                                  <h6 className="text-xs font-medium text-muted-foreground mb-1">Subtasks:</h6>
                                  {task.subtasks.map((subtask, subIndex) => (
                                    <div key={subIndex} className="flex items-center justify-between py-1">
                                      <div className="flex items-center space-x-2">
                                        <Icon 
                                          name={subtask.completed ? "Check" : "Circle"} 
                                          size={12} 
                                          className={subtask.completed ? "text-green-500" : "text-muted-foreground"} 
                                        />
                                        <span className={`text-xs ${
                                          subtask.completed ? 'text-green-700 line-through' : 'text-muted-foreground'
                                        }`}>
                                          {subtask.name}
                                        </span>
                                      </div>
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                                        subtask.completed 
                                          ? 'bg-green-100 text-green-700' 
                                          : 'bg-muted text-muted-foreground'
                                      }`}>
                                        {subtask.completed ? 'Done' : 'Pending'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {role === 're_sales_advisor' && (
                            <>
                              <div className="mb-1">• Market Analysis & Feasibility Study</div>
                              <div className="mb-1">• Client Relationship Management</div>
                              <div className="mb-1">• Sales Pipeline Development</div>
                              <div className="mb-1">• Contract Negotiations</div>
                            </>
                          )}
                          {role === 're_analyst' && (
                            <>
                              <div className="mb-1">• Financial Modeling & Analysis</div>
                              <div className="mb-1">• Risk Assessment</div>
                              <div className="mb-1">• Investment Valuation</div>
                              <div className="mb-1">• Due Diligence Review</div>
                            </>
                          )}
                          {role === 're_governance_lead' && (
                            <>
                              <div className="mb-1">• Compliance Review</div>
                              <div className="mb-1">• Regulatory Documentation</div>
                              <div className="mb-1">• Legal Framework Assessment</div>
                              <div className="mb-1">• Governance Policy Implementation</div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                    );
                    }) : (
                      <div className="text-center py-8">
                        <Icon name="AlertCircle" size={48} className="text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No Task Data Available</h3>
                        <p className="text-muted-foreground mb-4">
                          No task data found in the admin review panel for this project.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          This could mean tasks haven't been assigned yet, or the admin review panel hasn't been set up for this project.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Last updated: {new Date().toLocaleDateString()}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowTaskModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BrowseProperties;