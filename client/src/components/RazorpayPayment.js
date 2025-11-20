import { useState, useEffect } from 'react';
import API_BASE_URL from '../config/api';

export default function RazorpayPayment({ amount, onSuccess, onClose, propertyId }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Load Razorpay script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: 'Invalid payment amount' });
      return;
    }

    setLoading(true);
    setMessage({ type: 'info', text: 'Creating payment order...' });

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setMessage({ type: 'error', text: 'Failed to load payment service. Please try again.' });
        setLoading(false);
        return;
      }

      // Create order on backend
      const orderResponse = await fetch(`${API_BASE_URL}/payment/create-order`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          amount: Math.round(amount * 100), // Convert to paise for Razorpay
          currency: 'INR',
          receipt: `rcpt_${Date.now()}`
        })
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        console.error('Order creation failed:', orderData);
        throw new Error(orderData.message || 'Failed to create payment order');
      }

      if (!orderData.success || !orderData.order) {
        console.error('Invalid order data:', orderData);
        throw new Error('Invalid response from payment service');
      }

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID, // Make sure this is in your .env file
        amount: orderData.order.amount,
        currency: orderData.order.currency || 'INR',
        name: 'Perundurai Rentals',
        description: 'Payment for property booking',
        order_id: orderData.order.id,
        notes: {
          booking: 'Property booking payment'
        },
        handler: async function (response) {
          if (!response.razorpay_payment_id) {
            setMessage({ type: 'error', text: 'Payment ID not received' });
            return;
          }

          try {
            setMessage({ type: 'info', text: 'Verifying your payment...' });
            
            // Verify payment on backend
            const verifyResponse = await fetch(`${API_BASE_URL}/payment/verify`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                propertyId: propertyId
              })
            });

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok) {
              console.error('Verification failed:', verifyData);
              throw new Error(verifyData.message || 'Payment verification failed');
            }

            if (verifyData.success) {
              setMessage({ 
                type: 'success', 
                text: 'Payment successful! Your booking is confirmed.'
              });
              onSuccess && onSuccess(verifyData.paymentId);
            } else {
              throw new Error(verifyData.message || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Payment processing error:', error);
            setMessage({ 
              type: 'error', 
              text: error.message || 'Error processing payment. Please contact support.' 
            });
            
            // Close the payment modal on error
            onClose && onClose();
          }
          setLoading(false);
        },
        prefill: {
          name: localStorage.getItem('userName') || 'Customer',
          email: localStorage.getItem('userEmail') || 'customer@example.com',
          contact: localStorage.getItem('userPhone') || '9999999999'
        },
        theme: {
          color: '#1E3A8A' // Your brand color
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            setMessage({ type: 'info', text: 'Payment cancelled' });
            onClose && onClose();
          }
        }
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();

    } catch (error) {
      console.error('Payment error:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Payment failed. Please try again.' 
      });
      setLoading(false);
    }
  };

  // Simulate successful payment for test mode
  const simulateSuccessfulPayment = async () => {
    setLoading(true);
    setMessage({ type: 'info', text: 'Processing test payment...' });
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Call the success handler with a test payment ID
      onSuccess && onSuccess('test_payment_' + Date.now());
      
      setMessage({ 
        type: 'success', 
        text: 'Test payment successful! Your booking is confirmed.'
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Test payment failed. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h3>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">Total Amount:</span>
          <span className="font-semibold text-lg">₹{amount?.toLocaleString()}</span>
        </div>
        <p className="text-sm text-gray-500">Secure payment via Razorpay</p>
        
        {/* Test mode indicator */}
        <div className="mt-2 p-2 bg-yellow-100 text-yellow-800 text-xs rounded">
          <p className="font-semibold">Test Mode</p>
          <p>Use this button to simulate a successful payment:</p>
          <button
            onClick={simulateSuccessfulPayment}
            disabled={loading}
            className="mt-2 px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Simulate Successful Payment'}
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-100 text-green-700' :
          message.type === 'error' ? 'bg-red-100 text-red-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {message.text}
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={loading || !amount}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </>
        ) : (
          `Pay ₹${amount?.toLocaleString() || '0'}`
        )}
      </button>

      <div className="mt-4 flex items-center justify-center space-x-2">
        <img 
          src="https://cdn.razorpay.com/static/assets/logo/payment.svg" 
          alt="Razorpay" 
          className="h-5" 
        />
        <span className="text-xs text-gray-500">Secure Payments</span>
      </div>
    </div>
  );
}
