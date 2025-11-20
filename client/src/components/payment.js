import { useState } from 'react';
import axios from 'axios';
import QRCodePayment from './QRCodePayment';
import API_BASE_URL from '../config/api';

console.log('API Base URL:', API_BASE_URL);

// Helper function to make authenticated API calls
const apiRequest = async (endpoint, method = 'GET', data = null, token = null) => {
  // Ensure endpoint starts with a slash
  const apiEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${API_BASE_URL}${apiEndpoint}`;
  
  console.log(`API Request: ${method} ${fullUrl}`);
  
  const config = {
    method,
    url: fullUrl, // Use the full URL here
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      'X-Requested-With': 'XMLHttpRequest'
    },
    data,
    withCredentials: true,
    timeout: 10000
  };

  console.log(`Making ${method} request to:`, config.url);
  
  try {
    const response = await axios(config);
    console.log('API response:', response.data);
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'Failed to connect to the server';
    
    console.error('API request failed:', {
      url: config.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: errorMessage
    });
    
    throw new Error(errorMessage);
  }
};

export const usePayment = () => {
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  // Function to load Razorpay script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        console.log('Razorpay already loaded');
        return resolve(true);
      }

      console.log('Loading Razorpay script...');
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        console.log('Razorpay script loaded successfully');
        resolve(true);
      };
      script.onerror = () => {
        console.error('Failed to load Razorpay script');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  // Test backend connection
  const testBackendConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/payment/test`);
      const data = await response.json();
      console.log('Backend test response:', data);
      return data.success === true;
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  };

  const initiatePayment = async (amount, bookingData, user) => {
    try {
      setPaymentStatus(null); // Reset previous status
      
      console.log('1. Starting payment process');
      
      // First test backend connection
      console.log('2. Testing backend connection...');
      const isBackendAlive = await testBackendConnection();
      console.log('3. Backend connection test result:', isBackendAlive);
      
      if (!isBackendAlive) {
        throw new Error('Cannot connect to the payment server. Please try again later.');
      }
      
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please log in to make a payment');
      }
      
      console.log('Initiating payment with amount:', amount);
      console.log('Booking data:', bookingData);
      console.log('Using API URL:', API_BASE_URL);
      
      // Load Razorpay script first
      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded) {
        throw new Error('Failed to load payment processor. Please try again.');
      }

      // Create order on the server
      console.log('4. Creating order with amount:', amount);
      const requestData = { 
        amount, 
        receipt: `booking_${Date.now()}`,
        currency: 'INR'
      };
      console.log('5. Sending request to:', `${API_BASE_URL}/payment/create-order`);
      console.log('6. Request data:', requestData);
      
      const orderResponse = await apiRequest(
        '/payment/create-order',
        'POST',
        requestData,
        token
      );
      
      console.log('7. Order response:', orderResponse);

      if (!orderResponse || !orderResponse.success || !orderResponse.order) {
        const errorMsg = orderResponse?.message || 'Failed to create payment order';
        console.error('Order creation failed:', errorMsg, orderResponse);
        throw new Error(errorMsg);
      }
      
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: amount * 100, // Razorpay expects amount in paise
        currency: 'INR',
        name: 'Perundurai Rentals',
        description: 'Property Booking Payment',
        order_id: orderResponse.order.id,
        handler: async function(response) {
          try {
            // Verify payment on the server
            const result = await apiRequest(
              '/payment/verify',
              'POST',
              {
                ...response,
                bookingData
              },
              token
            );
            
            if (result.success) {
              setPaymentStatus({ 
                success: true, 
                message: 'Payment successful! Your booking is confirmed.', 
                data: result.booking 
              });
            } else {
              setPaymentStatus({ 
                success: false, 
                message: result.message || 'Payment verification failed. Please contact support.' 
              });
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            setPaymentStatus({ 
              success: false, 
              message: error.message || 'Error verifying payment. Please check your bookings or contact support.'
            });
          }
        },
        prefill: user ? {
          name: user.name || '',
          email: user.email || '',
          contact: user.phone || ''
        } : {},
        theme: {
          color: '#3399cc'
        },
        modal: {
          ondismiss: () => {
            // Handle payment modal close
            setPaymentStatus({ 
              success: false, 
              message: 'Payment was not completed. Please try again.' 
            });
          }
        }
      };

      // Initialize Razorpay
      try {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function(response) {
          console.error('Payment failed:', response.error);
          setPaymentStatus({
            success: false,
            message: `Payment failed: ${response.error.description || 'Unknown error'}`
          });
        });
        rzp.open();
      } catch (error) {
        console.error('Error initializing Razorpay:', error);
        throw new Error('Failed to initialize payment. Please try again.');
      }
    } catch (error) {
      console.error('Payment error:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      setPaymentStatus({ 
        success: false, 
        message: error.message || 'Payment failed. Please check console for details.' 
      });
    }
  };

  const handleQRPayment = async (paymentData) => {
    try {
      setPaymentStatus({ success: null, message: 'Verifying payment...' });
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please log in to complete the payment');
      }

      const result = await apiRequest(
        '/payment/verify',
        'POST',
        {
          razorpay_payment_id: paymentData.paymentId,
          razorpay_order_id: paymentData.orderId,
          razorpay_signature: paymentData.signature,
          bookingData: paymentData.bookingData
        },
        token
      );

      if (result.success) {
        setPaymentStatus({ 
          success: true, 
          message: 'QR Payment successful! Your booking is confirmed.', 
          data: result.booking 
        });
      } else {
        setPaymentStatus({ 
          success: false, 
          message: result.message || 'QR Payment verification failed. Please contact support.' 
        });
      }
    } catch (error) {
      console.error('QR Payment error:', error);
      setPaymentStatus({ 
        success: false, 
        message: error.message || 'QR Payment failed. Please try again or contact support.'
      });
    }
  };

  const PaymentModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Choose Payment Method</h2>
        
        <div className="space-y-4">
          <button
            onClick={() => {
              // This will be handled by the parent component
              setShowQRScanner(true);
            }}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Scan QR Code
          </button>
          
          <button
            onClick={() => initiatePayment(amount, bookingData, user)}
            className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            Pay with Card/UPI
          </button>
          
          <button
            onClick={() => setShowQRScanner(false)}
            className="w-full border border-gray-300 py-2 px-4 rounded hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return {
    initiatePayment,
    showQRScanner,
    setShowQRScanner,
    paymentStatus,
    PaymentModal,
    handleQRPayment,
    QRCodePayment: (props) => (
      <QRCodePayment 
        {...props} 
        onSuccess={handleQRPayment} 
        onClose={() => setShowQRScanner(false)} 
      />
    )
  };
};

export default usePayment;