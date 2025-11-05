import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';

const MarketplaceTemplateSettings = ({ onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('features'); // 'features', 'design'
  const [saving, setSaving] = useState(false);
  
  // Template state
  const [template, setTemplate] = useState({
    // Features configuration
    showCapacity: true,
    showPrice: true,
    showLocation: true,
    showEnergyType: true,
    showTimeline: true,
    showArea: false,
    showContractTerm: false,
    showDeveloperName: false,
    showInterestCount: true,
    
    // Design settings
    cardStyle: 'modern', // 'modern', 'classic', 'minimal'
    colorScheme: {
      primary: '#3b82f6',
      secondary: '#64748b',
      accent: '#10b981',
      background: '#ffffff'
    },
    layout: 'grid', // 'grid', 'list', 'masonry'
    cardsPerRow: 3,
    showFilters: true,
    showSorting: true
  });

  const handleFeatureToggle = (feature) => {
    setTemplate(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  const handleColorChange = (colorType, value) => {
    setTemplate(prev => ({
      ...prev,
      colorScheme: {
        ...prev.colorScheme,
        [colorType]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Save template to backend API
      // await marketplaceAPI.saveTemplate(template);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      onSave(template);
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Marketplace Template Settings</h2>
            <p className="text-sm text-gray-600 mt-1">Configure how marketplace projects are displayed</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon name="X" className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-200">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'features'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('features')}
          >
            <Icon name="Settings" className="w-4 h-4 inline mr-2" />
            Features
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'design'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('design')}
          >
            <Icon name="Palette" className="w-4 h-4 inline mr-2" />
            Design
          </button>
        </div>

        {/* Tab Content */}
        <div className="mb-6">
          {/* Features Tab */}
          {activeTab === 'features' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Display Features</h3>
              <p className="text-sm text-gray-600 mb-4">Select which features to display on project cards</p>
              
              <div className="space-y-3">
                {[
                  { key: 'showCapacity', label: 'Capacity (MW)' },
                  { key: 'showPrice', label: 'Price per MWh' },
                  { key: 'showLocation', label: 'Location' },
                  { key: 'showEnergyType', label: 'Energy Type' },
                  { key: 'showTimeline', label: 'Timeline' },
                  { key: 'showArea', label: 'Area (Acres)' },
                  { key: 'showContractTerm', label: 'Contract Term' },
                  { key: 'showDeveloperName', label: 'Developer Name' },
                  { key: 'showInterestCount', label: 'Investor Interest Count' }
                ].map(feature => (
                  <label key={feature.key} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template[feature.key]}
                      onChange={() => handleFeatureToggle(feature.key)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">{feature.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Design Tab */}
          {activeTab === 'design' && (
            <div className="space-y-6">
              {/* Card Style */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Style
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {['modern', 'classic', 'minimal'].map(style => (
                    <button
                      key={style}
                      onClick={() => setTemplate(prev => ({ ...prev, cardStyle: style }))}
                      className={`p-4 border-2 rounded-lg text-center transition-colors ${
                        template.cardStyle === style
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-sm font-medium capitalize">{style}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Scheme */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Color Scheme
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(template.colorScheme).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-600 mb-1 capitalize">
                        {key}
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={value}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                          className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={value}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Layout */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Layout
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {['grid', 'list', 'masonry'].map(layout => (
                    <button
                      key={layout}
                      onClick={() => setTemplate(prev => ({ ...prev, layout }))}
                      className={`p-4 border-2 rounded-lg text-center transition-colors ${
                        template.layout === layout
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon name={layout === 'grid' ? 'Grid' : layout === 'list' ? 'List' : 'Layout'} className="w-6 h-6 mx-auto mb-2" />
                      <span className="text-sm font-medium capitalize">{layout}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cards Per Row */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cards Per Row: {template.cardsPerRow}
                </label>
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={template.cardsPerRow}
                  onChange={(e) => setTemplate(prev => ({ ...prev, cardsPerRow: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>

              {/* Other Options */}
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={template.showFilters}
                    onChange={() => setTemplate(prev => ({ ...prev, showFilters: !prev.showFilters }))}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">Show Filters Sidebar</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={template.showSorting}
                    onChange={() => setTemplate(prev => ({ ...prev, showSorting: !prev.showSorting }))}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">Show Sorting Options</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleSave} loading={saving}>
            Save Template
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceTemplateSettings;

