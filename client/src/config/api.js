// API Configuration
// This file centralizes all API endpoint configuration

// Get API base URL from environment variable or use default
// For production (Render): https://perundurai-rentals-server1.onrender.com/api
// For local development: http://localhost:5000/api
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://perundurai-rentals-server1.onrender.com/api'
    : 'http://localhost:5000/api');

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

