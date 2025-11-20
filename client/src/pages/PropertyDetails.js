import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Home, Bath, Maximize, ShoppingCart, Phone, Map } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config/api';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/800x400?text=No+Image';

const normalizeImageSrc = (value) => {
  if (!value) return PLACEHOLDER_IMAGE;
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:image')) {
    return trimmed;
  }
  return `data:image/jpeg;base64,${trimmed}`;
};

// Fix for default marker icons in Leaflet
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const PropertyDetails = ({ fetchCart }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [property, setProperty] = useState(null);
  const [activeImage, setActiveImage] = useState(PLACEHOLDER_IMAGE);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMap, setShowMap] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/properties/${id}`);
        const data = await response.json();
        setProperty(data);
      } catch (error) {
        console.error('Error fetching property:', error);
        setMessage('Error loading property details');
      }
    };

    fetchProperty();
  }, [id]);

  const galleryImages = useMemo(() => {
    if (!property?.images?.length) {
      return [PLACEHOLDER_IMAGE];
    }
    return property.images.map(normalizeImageSrc);
  }, [property]);

  useEffect(() => {
    setActiveImage(galleryImages[0] || PLACEHOLDER_IMAGE);
  }, [galleryImages]);

  const annualPrice = () => {
    if (!property) return 0;
    return Number(property.price || 0) * 12;
  };

  // compute lease/legacy dates:
  // leaseStart: YYYY-MM-01 (use month Jan for starting year by default)
  const leaseStartISO = (year) => {
    if (!year) return null;
    return `${year}-01-01`;
  };

  // checkOut: first day after lease ends; here we assume 1 year lease
  const leaseEndISO = (year) => {
    if (!year) return null;
    const endYear = Number(year) + 1;
    return `${endYear}-01-01`;
  };

  const addToCart = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!selectedYear) {
      setMessage('Please select a starting year');
      return;
    }

    if (!property) {
      setMessage('Property not loaded yet');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      
      // Check if token exists
      if (!token) {
        setMessage('You are not logged in. Please log in to add items to cart.');
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
        return;
      }

      // build payload compatible with new lease-style and legacy checkIn/checkOut
      const monthlyRent = Number(property.price || 0);
      const securityDeposit = property.securityDeposit ? Number(property.securityDeposit) : monthlyRent; // default 1 month

      const payload = {
        propertyId: property._id,
        // new lease fields
        leaseStart: leaseStartISO(selectedYear),             // "2026-01-01"
        leaseDurationYears: 1,                               // currently fixed to 1 year (changeable)
        monthlyRent,
        securityDeposit,
        totalPrice: annualPrice(),

        // legacy/backwards-compatible fields
        checkIn: leaseStartISO(selectedYear),
        checkOut: leaseEndISO(selectedYear)
      };

      const response = await fetch(`${API_BASE_URL}/cart/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Property added to cart successfully!');
        if (typeof fetchCart === 'function') await fetchCart();
        setTimeout(() => setMessage(''), 3000);
      } else {
        // Handle specific error cases
        if (response.status === 401 || response.status === 400) {
          // Token is invalid or expired
          if (data?.message?.toLowerCase().includes('token')) {
            setMessage('Your session has expired. Please log in again.');
            // Clear invalid token and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setTimeout(() => {
              navigate('/auth');
            }, 2000);
            return;
          }
        }
        // show server-provided message if available
        setMessage(data?.message || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      setMessage('An error occurred while adding to cart. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!property) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // In the PropertyDetails component, update the return statement to include the SOLD badge and conditional rendering:

return (
  <div className="max-w-4xl mx-auto p-4">
    <button
      onClick={() => navigate(-1)}
      className="mb-4 text-blue-600 hover:underline flex items-center"
    >
      ← Back to Properties
    </button>

    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="relative">
        <img
          src={activeImage}
          alt={property.title}
          className="w-full h-96 object-cover bg-gray-900"
        />
        {property.sold && (
          <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-full text-lg font-semibold">
            SOLD
          </div>
        )}
        <div className="absolute top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full text-lg font-semibold">
          ₹{Number(property.price || 0).toLocaleString()}/month
        </div>
      </div>

      {galleryImages.length > 1 && (
        <div className="flex flex-wrap gap-3 p-4 border-t border-gray-100 bg-gray-50">
          {galleryImages.map((imgSrc, index) => (
            <button
              key={`${imgSrc}-${index}`}
              onClick={() => setActiveImage(imgSrc)}
              className={`h-20 w-28 rounded-lg overflow-hidden border-2 transition ${
                imgSrc === activeImage ? 'border-blue-500' : 'border-transparent'
              }`}
            >
              <img
                src={imgSrc}
                alt={`Property view ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* ... rest of the component ... */}

      {!property.sold ? (
        <div className="border-t pt-6">
          <h3 className="text-xl font-semibold mb-4">Book This Property (Long-term)</h3>
          
          {message && (
            <div className={`mb-4 p-3 rounded-md ${
              message.toLowerCase().includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {message}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Starting Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Annual Price:</span>
                <span className="font-semibold">₹{annualPrice().toLocaleString()}</span>
              </div>

              <button
                onClick={addToCart}
                disabled={loading || !property}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t pt-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  This property has been sold. Please check out our other available properties.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};

export default PropertyDetails;
