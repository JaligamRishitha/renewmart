import React, { useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import Routes from "./Routes";
import { AuthProvider } from "./contexts/AuthContext";

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
        <Routes />
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
