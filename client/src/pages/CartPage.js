import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Calendar, CreditCard, Home, CheckCircle } from 'lucide-react';
import RazorpayPayment from '../components/RazorpayPayment';

const CartPage = ({ cart, fetchCart, fetchBookings }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showPayment, setShowPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const navigate = useNavigate();
  
  // Clear success message after 5 seconds
  useEffect(() => {
    if (message.type === 'success') {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const removeFromCart = async (propertyId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/cart/remove/${propertyId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchCart();
        setMessage({ type: 'success', text: 'Item removed from cart' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Error removing item from cart' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentId) => {
    setLoading(true);
    setMessage({ type: 'info', text: 'Processing your booking...' });
    
    try {
      const token = localStorage.getItem('token');
      // Create bookings from cart
      const bookingResponse = await fetch('http://localhost:5000/api/bookings/from-cart', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentId,
          paymentMethod: 'razorpay'
        })
      });

      if (bookingResponse.ok) {
        await fetchCart();
        await fetchBookings();
        setPaymentSuccess(true);
        setMessage({ 
          type: 'success', 
          text: 'Payment successful! Your bookings have been confirmed.' 
        });
        
        // Redirect to bookings page after 3 seconds
        setTimeout(() => {
          navigate('/bookings');
        }, 3000);
      } else {
        const error = await bookingResponse.json();
        throw new Error(error.message || 'Error creating bookings');
      }
    } catch (error) {
      console.error('Booking creation error:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Payment successful but there was an error creating your bookings. Please contact support.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToPayment = () => {
    setShowPayment(true);
  };

  const totalAmount = cart.items?.reduce((sum, item) => sum + item.totalPrice, 0) || 0;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <ShoppingCart className="w-8 h-8 mr-2" />
        Your Cart
      </h1>

      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-700' :
          message.type === 'error' ? 'bg-red-100 text-red-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' && <CheckCircle className="w-5 h-5 mr-2" />}
            {message.text}
          </div>
        </div>
      )}

      {cart.items?.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 mb-4">Your cart is empty</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center mx-auto"
          >
            <Home className="w-5 h-5 mr-2" />
            Browse Properties
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {cart.items.map((item) => (
              <div key={item._id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div className="flex-1 mb-4 md:mb-0">
                    <h3 className="text-xl font-semibold mb-2">{item.propertyId?.title || 'Property'}</h3>
                    <p className="text-gray-600 mb-2">{item.propertyId?.location || 'Location not available'}</p>
                    <div className="flex flex-wrap items-center space-x-4 text-sm text-gray-500 mb-3">
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(item.checkIn).toLocaleDateString()} - {new Date(item.checkOut).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-lg font-semibold text-blue-600">
                      ₹{item.totalPrice?.toLocaleString() || '0'}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.propertyId?._id || item._id)}
                    disabled={loading}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 whitespace-nowrap"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {showPayment ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Complete Your Payment</h3>
              <RazorpayPayment 
                amount={totalAmount}
                onSuccess={handlePaymentSuccess}
                onClose={() => setShowPayment(false)}
                propertyId={cart.items[0]?.propertyId?._id}
              />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xl font-semibold">Order Summary</span>
                <span className="text-2xl font-bold text-blue-600">
                </span>
              </div>
              <div className="space-y-4">
                {cart.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-gray-600">
                    <span>{item.propertyId?.title || `Item ${index + 1}`}</span>
                    <span>₹{item.totalPrice?.toLocaleString() || '0'}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between font-semibold text-lg">
                    <span className="text-blue-600">₹{totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleProceedToPayment}
                disabled={loading || cart.items.length === 0 || paymentSuccess}
                className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                {paymentSuccess ? 'Payment Successful!' : 'Proceed to Payment'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CartPage;
