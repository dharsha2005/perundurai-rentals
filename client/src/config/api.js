// API Configuration
// This file centralizes all API endpoint configuration

// Get API base URL from environment variable or use default
// For production (Render): https://perundurai-rentals-server1.onrender.com/api
// For local development: http://localhost:5000/api
// Note: In production builds, check window.location to determine if we should use hosted API
const getApiBaseUrl = () => {
  // Helper function to clean environment variable (in case it includes the variable name)
  const cleanEnvVar = (value) => {
    if (!value) return null;
    // If the value contains "=" and starts with the var name, extract just the URL part
    if (value.includes('=') && value.includes('REACT_APP_API_URL')) {
      const parts = value.split('=');
      if (parts.length > 1) {
        // Join everything after the first = (in case URL contains =)
        return parts.slice(1).join('=').trim();
      }
    }
    return value.trim();
  };

  // Always use environment variable if set (highest priority)
  const envApiUrl = cleanEnvVar(process.env.REACT_APP_API_URL);
  if (envApiUrl && envApiUrl.startsWith('http')) {
    return envApiUrl;
  }
  
  // Check if we're running on the hosted frontend domain
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If hosted on Render (production frontend)
    if (hostname.includes('onrender.com') || hostname.includes('perundurai-rentals-3')) {
      return 'https://perundurai-rentals-server1.onrender.com/api';
    }
  }
  
  // For local development or if NODE_ENV is set to production during build
  if (process.env.NODE_ENV === 'production') {
    return 'https://perundurai-rentals-server1.onrender.com/api';
  }
  
  // Default to localhost for development
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

// Log the API URL being used (helpful for debugging)
if (typeof window !== 'undefined') {
  console.log('🌐 API Base URL:', API_BASE_URL);
  console.log('📍 Current Hostname:', window.location.hostname);
}

export default API_BASE_URL;

// Helper function for making API requests
export const apiRequest = async (endpoint, method = 'GET', data = null, token = null) => {
  const url = endpoint.startsWith('/') 
    ? `${API_BASE_URL}${endpoint}` 
    : `${API_BASE_URL}/${endpoint}`;

  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  };

  if (data && method !== 'GET') {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, config);
    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
    }

    return responseData;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

