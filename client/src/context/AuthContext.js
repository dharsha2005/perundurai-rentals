import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in and validate token
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        // Basic token validation - check if it's a valid JWT format
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          // Decode the payload to check expiration
          const payload = JSON.parse(atob(tokenParts[1]));
          const currentTime = Date.now() / 1000;
          
          // Check if token is expired
          if (payload.exp && payload.exp < currentTime) {
            // Token is expired, clear it
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          } else {
            // Token is valid, set user
            setUser(JSON.parse(userData));
          }
        } else {
          // Invalid token format, clear it
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } catch (error) {
        // Error parsing token, clear it
        console.error('Error validating token:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      console.log('🔐 Attempting login with API:', `${API_BASE_URL}/auth/login`);
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      console.log('📡 Login response status:', response.status, response.statusText);

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        // Try to parse error message
        try {
          const errorData = await response.json();
          console.error('❌ Login error response:', errorData);
          return { success: false, error: errorData.message || `Server error: ${response.status}` };
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
          return { success: false, error: `Server error: ${response.status} ${response.statusText}` };
        }
      }

      const data = await response.json();
      console.log('✅ Login successful:', data);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (error) {
      console.error('❌ Login network error:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      return { 
        success: false, 
        error: error.message.includes('fetch') || error.message.includes('Failed to fetch')
          ? 'Cannot connect to server. Please check your internet connection and try again.'
          : error.message || 'Network error. Please try again.' 
      };
    }
  };

  const register = async (userData) => {
    try {
      console.log('📝 Attempting registration with API:', `${API_BASE_URL}/auth/register`);
      
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      console.log('📡 Register response status:', response.status, response.statusText);

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        // Try to parse error message
        try {
          const errorData = await response.json();
          console.error('❌ Register error response:', errorData);
          return { success: false, error: errorData.message || `Server error: ${response.status}` };
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
          return { success: false, error: `Server error: ${response.status} ${response.statusText}` };
        }
      }

      const data = await response.json();
      console.log('✅ Registration successful:', data);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (error) {
      console.error('❌ Register network error:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      return { 
        success: false, 
        error: error.message.includes('fetch') || error.message.includes('Failed to fetch')
          ? 'Cannot connect to server. Please check your internet connection and try again.'
          : error.message || 'Network error. Please try again.' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthContext;
