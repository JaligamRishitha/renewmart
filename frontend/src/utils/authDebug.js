/**
 * Authentication Debug Utilities
 * Use these in browser console to debug auth issues
 */

export const authDebug = {
  /**
   * Check current authentication status
   */
  checkStatus() {
    console.log('=== AUTH STATUS ===');
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    console.log('Token exists:', !!token);
    console.log('User exists:', !!user);
    
    if (token) {
      console.log('Token preview:', token.substring(0, 30) + '...');
      this.checkTokenExpiry(token);
    }
    
    if (user && user !== 'undefined') {
      try {
        const userData = JSON.parse(user);
        console.log('User:', {
          email: userData.email,
          roles: userData.roles,
          isVerified: userData.is_verified,
          isActive: userData.is_active
        });
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    console.log('==================');
  },

  /**
   * Check if JWT token is expired
   */
  checkTokenExpiry(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expDate = new Date(payload.exp * 1000);
      const now = new Date();
      const minutesRemaining = Math.round((expDate - now) / 1000 / 60);
      
      console.log('Token issued for:', payload.sub);
      console.log('Token expires:', expDate.toLocaleString());
      console.log('Is expired:', expDate < now);
      
      if (expDate > now) {
        console.log(`✓ Token valid for ${minutesRemaining} more minutes`);
      } else {
        console.log(`✗ Token expired ${Math.abs(minutesRemaining)} minutes ago`);
        console.log('→ You need to log in again');
      }
      
      return expDate > now;
    } catch (e) {
      console.error('Error checking token expiry:', e);
      return false;
    }
  },

  /**
   * Test if API authentication works
   */
  async testAuth() {
    console.log('=== TESTING AUTH ===');
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      console.error('✗ No token found');
      return false;
    }
    
    try {
      const response = await fetch('http://localhost:8000/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✓ Authentication working');
        console.log('User:', data);
        return true;
      } else {
        console.error('✗ Authentication failed');
        console.error('Status:', response.status);
        const error = await response.json();
        console.error('Error:', error);
        return false;
      }
    } catch (error) {
      console.error('✗ Request failed:', error);
      return false;
    }
  },

  /**
   * Clear all auth data and force re-login
   */
  clearAuth() {
    console.log('Clearing authentication data...');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    console.log('✓ Auth data cleared');
    console.log('→ Reload page and log in again');
  },

  /**
   * Export auth data for debugging
   */
  exportAuthData() {
    return {
      token: localStorage.getItem('authToken'),
      user: localStorage.getItem('user'),
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Check if user has specific role
   */
  checkRole(role) {
    const user = localStorage.getItem('user');
    if (!user || user === 'undefined') {
      console.log('✗ No user data found');
      return false;
    }
    
    try {
      const userData = JSON.parse(user);
      const hasRole = userData.roles?.includes(role);
      console.log(`Role "${role}":`, hasRole ? '✓ Yes' : '✗ No');
      console.log('User roles:', userData.roles);
      return hasRole;
    } catch (e) {
      console.error('Error checking role:', e);
      return false;
    }
  },

  /**
   * Monitor auth status continuously
   */
  startMonitoring(intervalMinutes = 5) {
    console.log(`Starting auth monitoring (checking every ${intervalMinutes} minutes)...`);
    
    const intervalId = setInterval(() => {
      const token = localStorage.getItem('authToken');
      if (token) {
        const isValid = this.checkTokenExpiry(token);
        if (!isValid) {
          console.warn('⚠️ TOKEN EXPIRED - Please log in again');
          alert('Your session has expired. Please log in again.');
          window.location.href = '/login';
        }
      } else {
        console.warn('⚠️ NO TOKEN FOUND');
      }
    }, intervalMinutes * 60 * 1000);
    
    console.log('Monitoring started. Call stopMonitoring() to stop.');
    window.authMonitorInterval = intervalId;
    
    return intervalId;
  },

  /**
   * Stop auth monitoring
   */
  stopMonitoring() {
    if (window.authMonitorInterval) {
      clearInterval(window.authMonitorInterval);
      console.log('✓ Monitoring stopped');
      delete window.authMonitorInterval;
    } else {
      console.log('No monitoring active');
    }
  }
};

// Make available globally in development
if (import.meta.env.DEV) {
  window.authDebug = authDebug;
  console.log('💡 Auth debug utilities available via window.authDebug');
  console.log('Try: authDebug.checkStatus()');
}

export default authDebug;

