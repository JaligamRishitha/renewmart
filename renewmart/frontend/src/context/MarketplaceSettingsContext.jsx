import React, { createContext, useContext, useState, useEffect } from 'react';
import { marketplaceSettingsAPI } from '../services/api';
import toast from 'react-hot-toast';

const MarketplaceSettingsContext = createContext();

export const useMarketplaceSettings = () => {
  const context = useContext(MarketplaceSettingsContext);
  if (!context) {
    throw new Error('useMarketplaceSettings must be used within MarketplaceSettingsProvider');
  }
  return context;
};

export const MarketplaceSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
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
    cardStyle: 'modern',
    colorScheme: {
      primary: '#3b82f6',
      secondary: '#64748b',
      accent: '#10b981',
      background: '#ffffff'
    },
    layout: 'grid',
    cardsPerRow: 3,
    showFilters: true,
    showSorting: true
  });
  
  const [loading, setLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await marketplaceSettingsAPI.getSettings();
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading marketplace settings:', error);
      // Use defaults if loading fails
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await marketplaceSettingsAPI.saveSettings(newSettings);
      setSettings(newSettings);
      toast.success('Marketplace settings saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving marketplace settings:', error);
      toast.error('Failed to save marketplace settings');
      return false;
    }
  };

  const value = {
    settings,
    loading,
    saveSettings,
    loadSettings
  };

  return (
    <MarketplaceSettingsContext.Provider value={value}>
      {children}
    </MarketplaceSettingsContext.Provider>
  );
};

