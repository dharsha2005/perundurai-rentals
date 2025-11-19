import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import PropertyDetails from './pages/PropertyDetails';
import CartPage from './pages/CartPage';
import BookingsPage from './pages/BookingsPage';
import AddPropertyPage from './pages/AddPropertyPage';
import { useAuth } from './context/AuthContext';

const API_BASE_URL = 'http://localhost:5000/api';

function App() {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [cart, setCart] = useState({ items: [] });
  const [bookings, setBookings] = useState([]);
  const { user } = useAuth();

  // Initialize app
  useEffect(() => {
    fetchProperties();
    if (user) {
      fetchCart();
      fetchBookings();
    }
  }, [user]);

  const fetchProperties = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/properties/near-perundurai?includeSold=true`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Fetched properties:', data); // Debug log
      setProperties(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      setProperties([]); // Ensure properties is always an array
    }
  };

  const fetchCart = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/cart`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setCart(data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  const fetchBookings = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header cartItemsCount={cart.items?.length || 0} />
      <main className="container mx-auto px-4 py-8">
        <Routes>
            <Route 
              path="/" 
              element={
                <HomePage 
                  properties={properties} 
                  setSelectedProperty={setSelectedProperty} 
                />
              } 
            />
            <Route 
              path="/auth" 
              element={!user ? <AuthPage /> : <Navigate to="/" />} 
            />
            <Route 
              path="/property/:id" 
              element={
                selectedProperty ? (
                  <PropertyDetails 
                    property={selectedProperty} 
                    fetchCart={fetchCart}
                  />
                ) : (
                  <Navigate to="/" />
                )
              } 
            />
            <Route 
              path="/cart" 
              element={
                user ? (
                  <CartPage 
                    cart={cart} 
                    fetchCart={fetchCart}
                    fetchBookings={fetchBookings}
                  />
                ) : (
                  <Navigate to="/auth" />
                )
              } 
            />
            <Route 
              path="/bookings" 
              element={
                user ? (
                  <BookingsPage bookings={bookings} />
                ) : (
                  <Navigate to="/auth" />
                )
              } 
            />
            <Route 
              path="/add-property" 
              element={
                user ? (
                  <AddPropertyPage />
                ) : (
                  <Navigate to="/auth" />
                )
              } 
            />
        </Routes>
      </main>
    </div>
  );
}

export default App;
