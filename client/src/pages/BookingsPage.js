import React from 'react';
import { Calendar, Home, MapPin, CheckCircle, Clock, XCircle } from 'lucide-react';




const BookingCard = ({ booking }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold flex items-center">
            <Home className="w-5 h-5 mr-2 text-blue-600" />
            {booking.propertyId?.title || 'Property'}
          </h3>
          <p className="text-gray-600 mt-1 flex items-center">
            <MapPin className="w-4 h-4 mr-1" />
            {booking.propertyId?.location || 'Location not available'}
          </p>
        </div>
        
      </div>
      
      <div className="mb-4">
        <label className="block text-sm text-gray-500">Total Amount</label>
        <p className="text-xl font-bold text-blue-600">
          ₹{booking.totalPrice?.toLocaleString() || '0'}
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 border-t border-gray-100">
        <div className="text-sm text-gray-500 mb-2 sm:mb-0">
          Booking ID: {booking._id}
        </div>
        <div className="text-sm text-gray-500">
          Booked on: {new Date(booking.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
};

const BookingsPage = ({ bookings }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Calendar className="w-8 h-8 mr-2" />
        My Bookings
      </h1>

      {bookings?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 text-lg">No bookings found</p>
          <p className="text-gray-400 mt-2">Your upcoming bookings will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <BookingCard key={booking._id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingsPage;
