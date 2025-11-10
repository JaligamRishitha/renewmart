import React, { useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "react-hot-toast";
import Routes from "./Routes";
import { AuthProvider } from "./contexts/AuthContext";
import { MarketplaceSettingsProvider } from "./context/MarketplaceSettingsContext";

// Import auth debug utilities in development
if (import.meta.env.DEV) {
  import('./utils/authDebug').then(() => {
    console.log('🔧 Auth debug loaded. Try: authDebug.checkStatus()');
  }).catch(() => {});
}

function App() {
  // Monitor for auth expiration in development
  useEffect(() => {
    if (import.meta.env.DEV) {
      const checkAuthExpiry = () => {
        const token = localStorage.getItem('authToken');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expDate = new Date(payload.exp * 1000);
            if (expDate < new Date()) {
              console.warn('⚠️ Token expired. Please log in again.');
            }
          } catch (e) {
            // Invalid token format
          }
        }
      };
      
      checkAuthExpiry();
      const interval = setInterval(checkAuthExpiry, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <HelmetProvider>
      <AuthProvider>
        <MarketplaceSettingsProvider>
          <Routes />
        </MarketplaceSettingsProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
