import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, Calendar, User, LogOut, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Header = ({ cartItemsCount }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const baseNavClasses =
    'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-600';

  const navClasses = (path) =>
    `${baseNavClasses} ${isActive(path) ? 'bg-white text-blue-600 shadow-sm' : 'bg-blue-500/40 hover:bg-blue-500/70 text-white'}`;

  const ghostButtonClasses =
    'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white text-blue-600 shadow hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-100';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <Link to="/" className="text-2xl font-bold tracking-tight">
            Perundurai Home Rentals
          </Link>
          
          <nav className="flex flex-wrap items-center gap-3">
            <Link to="/" className={navClasses('/')}>
              <Home className="w-4 h-4" />
              Properties
            </Link>
            
            {user ? (
              <>
                <Link to="/cart" className={`${navClasses('/cart')} relative`}>
                  <ShoppingCart className="w-4 h-4" />
                  Cart
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                      {cartItemsCount}
                    </span>
                  )}
                </Link>

                <Link to="/bookings" className={navClasses('/bookings')}>
                  <Calendar className="w-4 h-4" />
                  My Bookings
                </Link>

                <Link to="/add-property" className={ghostButtonClasses}>
                  <Plus className="w-4 h-4" />
                  List Property
                </Link>
                
                <div className="flex items-center gap-2 bg-blue-500/40 rounded-full pl-3 pr-1 py-1">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <User className="w-4 h-4" />
                    <span>{user.name}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-600 focus:ring-red-200"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <Link
                to="/auth"
                className={`${ghostButtonClasses} bg-white text-blue-600`}
              >
                Login / Register
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
