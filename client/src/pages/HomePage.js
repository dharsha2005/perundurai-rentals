import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Home, Bath, Maximize, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

const PropertyCard = ({ property, onView, isActive, onHighlight }) => {
  return (
    <div
      className={`group bg-white rounded-2xl border ${
        isActive ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'
      } shadow-sm hover:shadow-lg overflow-hidden transition-all`}
      onMouseEnter={() => onHighlight?.(property)}
      onFocus={() => onHighlight?.(property)}
      tabIndex={0}
    >
      <div className="relative">
        <img
          src={property.images[0] || 'https://via.placeholder.com/400x300?text=No+Image'}
          alt={property.title}
          className={`w-full h-56 object-cover transition ${property.sold ? 'grayscale' : 'group-hover:scale-[1.02]'}`}
        />
        {property.sold && (
          <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold z-10">
            SOLD
          </div>
        )}
        <div className={`absolute top-4 left-4 ${property.sold ? 'bg-gray-600' : 'bg-blue-600'} text-white px-3 py-1 rounded-full text-sm font-semibold shadow`}>
          ₹{property.price.toLocaleString()}/month
        </div>
      </div>
      
      <div className="p-5 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1 text-gray-900">{property.title}</h3>
          <p className="text-gray-600 text-sm line-clamp-2">
          {property.description}
        </p>
        </div>

        <div className="flex items-center text-gray-500 text-sm">
          <MapPin className="w-4 h-4 mr-1" />
          {property.location}
        </div>
        
        <div className="flex justify-between text-sm text-gray-500">
          <span className="flex items-center">
            <Home className="w-4 h-4 mr-1" />
            {property.bedrooms} Beds
          </span>
          <span className="flex items-center">
            <Bath className="w-4 h-4 mr-1" />
            {property.bathrooms} Baths
          </span>
          <span className="flex items-center">
            <Maximize className="w-4 h-4 mr-1" />
            {property.area} sqft
          </span>
        </div>

        <button
          onClick={() => onView(property)}
          disabled={property.sold}
          className={`w-full py-2 rounded-lg font-medium transition-colors ${
            property.sold 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
          }`}
        >
          {property.sold ? 'Sold Out' : 'View Details'}
        </button>
      </div>
    </div>
  );
};

const HomePage = ({ properties, setSelectedProperty }) => {
  const navigate = useNavigate();
  const [selectedProperty, setSelectedPropertyLocal] = useState(null);
  const [mapCenter, setMapCenter] = useState([11.2742, 77.5887]); // Perundurai coordinates
  // Show sold properties by default so sold listings display the SOLD badge
  const [showSoldProperties, setShowSoldProperties] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    minPrice: '',
    maxPrice: '',
    minBedrooms: '',
    sortBy: 'recent'
  });

  // Filter properties based on sold status
  const availableProperties = properties.filter(property => !property.sold);
  const soldProperties = properties.filter(property => property.sold);
  
  // Determine which properties to display before filters
  const baseProperties = showSoldProperties ? properties : availableProperties;

  const filteredProperties = useMemo(() => {
    return baseProperties
      .filter((property) => {
        const searchText = filters.search.trim().toLowerCase();
        if (!searchText) return true;
        return (
          property.title?.toLowerCase().includes(searchText) ||
          property.location?.toLowerCase().includes(searchText) ||
          property.description?.toLowerCase().includes(searchText)
        );
      })
      .filter((property) => {
        if (!filters.minPrice) return true;
        return property.price >= Number(filters.minPrice);
      })
      .filter((property) => {
        if (!filters.maxPrice) return true;
        return property.price <= Number(filters.maxPrice);
      })
      .filter((property) => {
        if (!filters.minBedrooms) return true;
        return property.bedrooms >= Number(filters.minBedrooms);
      })
      .sort((a, b) => {
        switch (filters.sortBy) {
          case 'priceLowHigh':
            return a.price - b.price;
          case 'priceHighLow':
            return b.price - a.price;
          case 'areaHighLow':
            return b.area - a.area;
          case 'bedsHighLow':
            return b.bedrooms - a.bedrooms;
          case 'recent':
          default:
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }
      });
  }, [baseProperties, filters]);

  const displayProperties = filteredProperties;

  const visiblePropertiesForMap = displayProperties.length > 0 ? displayProperties : baseProperties;

  const stats = useMemo(() => {
    const total = properties.length;
    const available = availableProperties.length;
    const averagePrice = available > 0
      ? Math.round(
          availableProperties.reduce((sum, property) => sum + property.price, 0) / available
        )
      : 0;
    const premiumCount = properties.filter((property) => property.price >= 30000).length;
    return {
      total,
      available,
      averagePrice,
      premiumCount
    };
  }, [properties, availableProperties]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      minPrice: '',
      maxPrice: '',
      minBedrooms: '',
      sortBy: 'recent'
    });
  };

  const selectProperty = (property) => {
    if (!property) return;
    setSelectedProperty?.(property);
    setSelectedPropertyLocal(property);
    if (property.coordinates) {
      setMapCenter([property.coordinates.lat, property.coordinates.lng]);
    }
  };

  const viewProperty = (property) => {
    selectProperty(property);
    navigate(`/property/${property._id}`);
  };

  useEffect(() => {
    const sourceList = filteredProperties.length > 0 ? filteredProperties : baseProperties;
    if (sourceList.length === 0) return;
    const currentlyVisible = selectedProperty && sourceList.some(p => p._id === selectedProperty._id);
    if (!currentlyVisible) {
      selectProperty(sourceList[0]);
    }
  }, [filteredProperties, baseProperties, selectedProperty]);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-700 to-blue-600 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_rgba(255,255,255,0))]" />
        <div className="relative z-10 grid gap-10 lg:grid-cols-2 px-8 py-12">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-sm font-medium">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              Trusted Perundurai Rentals Marketplace
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              Find your next home in Perundurai with full confidence.
            </h1>
            <p className="text-lg text-blue-100">
              Browse verified rentals, explore them on an interactive map, and book securely with instant updates when homes are snapped up.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => document.getElementById('filters')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="inline-flex items-center gap-2 rounded-full bg-white text-blue-700 font-semibold px-6 py-3 shadow-lg hover:translate-y-0.5 transition"
              >
                Browse Properties
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowSoldProperties(false)}
                className="inline-flex items-center gap-2 rounded-full bg-blue-500/40 text-white px-6 py-3 border border-white/30 hover:bg-blue-500/60 transition"
              >
                Show Available Now
              </button>
            </div>
            <div className="flex flex-wrap gap-6 pt-4">
              <div>
                <p className="text-3xl font-bold">{stats.available}</p>
                <p className="text-sm text-blue-200 uppercase tracking-wide">Available homes</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-blue-200 uppercase tracking-wide">Total listings</p>
              </div>
              <div>
                <p className="text-3xl font-bold">₹{stats.averagePrice.toLocaleString()}</p>
                <p className="text-sm text-blue-200 uppercase tracking-wide">Avg rent</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-white/20 to-transparent blur-3xl opacity-30" />
            <div className="relative bg-white/10 backdrop-blur rounded-3xl border border-white/20 p-6 shadow-2xl space-y-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-10 h-10 text-green-300" />
                <div>
                  <p className="text-sm text-blue-100">Verified & protected</p>
                  <p className="text-xl font-semibold">Smart availability guard</p>
                </div>
              </div>
              <ul className="space-y-4 text-sm text-blue-100">
                <li className="flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-300 mt-1.5" />
                  Real-time SOLD badge and disabled booking once payments clear.
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-300 mt-1.5" />
                  Map + list stay in sync so you always know which home you’re viewing.
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-300 mt-1.5" />
                  Razorpay checkout with booking automation for a seamless flow.
                </li>
              </ul>
              <div className="rounded-2xl bg-white/10 border border-white/20 p-4">
                <p className="text-sm text-blue-100">Premium inventory</p>
                <p className="text-3xl font-bold">{stats.premiumCount}</p>
                <p className="text-sm text-blue-200">Homes ₹30k+/month near tech & education hubs</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="filters" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-3xl font-bold">
            {showSoldProperties ? 'All Properties' : 'Available Properties in Perundurai'}
          </h2>
          {soldProperties.length > 0 && (
            <button
              onClick={() => setShowSoldProperties(!showSoldProperties)}
              className="text-blue-600 hover:underline text-sm font-semibold"
            >
              {showSoldProperties 
                ? 'Show only available properties' 
                : `Show sold properties (${soldProperties.length})`}
            </button>
          )}
        </div>
        
        <p className="text-gray-600">
          Discover comfortable and affordable rental properties in Perundurai. 
          From budget apartments to luxury villas, find your ideal home today.
        </p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:space-x-4 space-y-4 lg:space-y-0">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Keywords, location, owner..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Min Price (₹)</label>
              <input
                type="number"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Max Price (₹)</label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                placeholder="60000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Min Bedrooms</label>
              <input
                type="number"
                value={filters.minBedrooms}
                onChange={(e) => handleFilterChange('minBedrooms', e.target.value)}
                placeholder="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="recent">Newest first</option>
                <option value="priceLowHigh">Price: Low to High</option>
                <option value="priceHighLow">Price: High to Low</option>
                <option value="areaHighLow">Area: High to Low</option>
                <option value="bedsHighLow">Bedrooms: High to Low</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="text-sm text-gray-500">
              Showing {displayProperties.length} of {baseProperties.length} matching properties
            </div>
            <button
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:underline ml-auto"
            >
              Reset filters
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.7fr,1fr]">
        <div className="relative rounded-2xl border border-blue-100 shadow-lg overflow-hidden">
          <div className="absolute z-10 top-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-full text-sm font-medium text-blue-700 shadow">
            {visiblePropertiesForMap.length} listings on map
          </div>
          <MapContainer 
            center={mapCenter} 
            zoom={14} 
            style={{ height: '420px', width: '100%' }}
            scrollWheelZoom={false}
            className="rounded-2xl"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {visiblePropertiesForMap.map((property) => (
              <Marker 
                key={property._id} 
                position={[property.coordinates?.lat || 0, property.coordinates?.lng || 0]}
                icon={defaultIcon}
                eventHandlers={{
                  click: () => selectProperty(property),
                }}
              >
                <Popup>
                  <div className="space-y-1">
                    <h4 className="font-semibold">{property.title}</h4>
                    <p className="text-sm">₹{property.price.toLocaleString()}/month</p>
                    <button
                      onClick={() => { if (!property.sold) viewProperty(property); }}
                      disabled={property.sold}
                      className={`mt-2 text-sm ${property.sold ? 'text-gray-500 cursor-not-allowed' : 'text-blue-600 hover:underline'}`}
                    >
                      {property.sold ? 'Sold' : 'View Details'}
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-5">
          {selectedProperty ? (
            <>
              <div className="relative">
                <img
                  src={selectedProperty.images?.[0] || 'https://via.placeholder.com/600x320?text=Property'}
                  alt={selectedProperty.title}
                  className="w-full h-48 object-cover rounded-xl"
                />
                {selectedProperty.sold && (
                  <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    SOLD
                  </div>
                )}
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur text-blue-700 font-semibold px-3 py-1 rounded-full">
                  ₹{selectedProperty.price.toLocaleString()}/month
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">{selectedProperty.title}</h3>
                <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                  <MapPin className="w-4 h-4" /> {selectedProperty.location}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg border border-gray-100 p-3">
                  <p className="text-gray-500 text-xs uppercase">Bedrooms</p>
                  <p className="text-lg font-semibold">{selectedProperty.bedrooms}</p>
                </div>
                <div className="rounded-lg border border-gray-100 p-3">
                  <p className="text-gray-500 text-xs uppercase">Bathrooms</p>
                  <p className="text-lg font-semibold">{selectedProperty.bathrooms}</p>
                </div>
                <div className="rounded-lg border border-gray-100 p-3">
                  <p className="text-gray-500 text-xs uppercase">Area</p>
                  <p className="text-lg font-semibold">{selectedProperty.area} sqft</p>
                </div>
                <div className="rounded-lg border border-gray-100 p-3">
                  <p className="text-gray-500 text-xs uppercase">Status</p>
                  <p className={`text-lg font-semibold ${selectedProperty.sold ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedProperty.sold ? 'Sold' : 'Available'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => viewProperty(selectedProperty)}
                disabled={selectedProperty.sold}
                className={`w-full py-3 rounded-lg font-semibold transition ${
                  selectedProperty.sold
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow'
                }`}
              >
                {selectedProperty.sold ? 'This property is booked' : 'View full details'}
              </button>
            </>
          ) : (
            <div className="text-center text-gray-500">
              Select a property from the list or tap a pin on the map to preview the details here.
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold text-gray-900">Featured Properties</h3>
            <p className="text-gray-500 text-sm">
              Showing {displayProperties.length} curated options
            </p>
          </div>
          {!showSoldProperties && soldProperties.length > 0 && (
            <button
              onClick={() => setShowSoldProperties(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              Include sold properties ({soldProperties.length})
            </button>
          )}
        </div>

        {displayProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {displayProperties.map((property) => (
              <PropertyCard
                key={property._id}
                property={property}
                onView={viewProperty}
                isActive={selectedProperty?._id === property._id}
                onHighlight={selectProperty}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
            <p className="text-gray-500 mb-3">
              {showSoldProperties 
                ? 'No matching properties found. Adjust your filters.'
                : 'No available properties match your filters. Try widening the search or including sold listings.'}
            </p>
            {!showSoldProperties && soldProperties.length > 0 && (
              <button
                onClick={() => setShowSoldProperties(true)}
                className="text-blue-600 hover:underline text-sm"
              >
                View sold properties ({soldProperties.length})
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
