const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('./utils/emailService');
const dotenv = require('dotenv');
const Razorpay = require('razorpay');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(
  process.env.MONGODB_URI ||
    'mongodb+srv://onlytamilan6_db_user:08-Aug-05@cluster0.irjjr71.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  }
);

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Property Schema
const propertySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  location: { type: String, required: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  bedrooms: { type: Number, required: true },
  bathrooms: { type: Number, required: true },
  area: { type: Number, required: true }, // in sq ft
  amenities: [String],
  images: [String],
  owner: { type: String, required: true },
  ownerPhone: { type: String, required: true },
  available: { type: Boolean, default: true },
  sold: { type: Boolean, default: false },
  soldTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  soldAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const Property = mongoose.model('Property', propertySchema);

// Booking Schema
const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  totalPrice: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model('Booking', bookingSchema);

// Cart Schema
const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    totalPrice: { type: Number, required: true }
  }],
  createdAt: { type: Date, default: Date.now }
});

const Cart = mongoose.model('Cart', cartSchema);

// Create a 2dsphere index for geospatial queries
propertySchema.index({ coordinates: '2dsphere' });

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// AUTH ROUTES

// User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone
    });

    await user.save();

    // Send welcome email
    const emailResult = await sendEmail(
      user.email,
      'Welcome to Perundurai Rentals!',
      `Hello ${user.name},\n\nThank you for registering with Perundurai Rentals!\n\nWe're excited to have you on board. You can now log in to your account and start exploring our properties.\n\nBest regards,\nThe Perundurai Rentals Team`,
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #1E3A8A;">Welcome to Perundurai Rentals!</h1>
        </div>
        <p>Hello ${user.name},</p>
        <p>Thank you for registering with Perundurai Rentals!</p>
        <p>We're excited to have you on board. You can now log in to your account and start exploring our properties.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
             style="display: inline-block; padding: 12px 24px; background-color: #1E3A8A; color: white; 
                    text-decoration: none; border-radius: 6px; font-weight: 500;">
            Log In to Your Account
          </a>
        </div>
        <p>If you have any questions, feel free to reply to this email.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center;">
          <p>Perundurai Rentals - Your Trusted Rental Partner</p>
        </div>
      </div>
      `
    );

    if (!emailResult.success) {
      console.error('Failed to send welcome email:', emailResult.error);
      // Don't fail the registration if email sending fails
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PROPERTY ROUTES

// Get all properties
app.get('/api/properties', async (req, res) => {
  try {
    const includeSold = req.query.includeSold === 'true';
    const query = includeSold ? {} : { available: true };
    const properties = await Property.find(query);
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get properties near Perundurai
app.get('/api/properties/near-perundurai', async (req, res) => {
  try {
    const includeSold = req.query.includeSold === 'true';
    // Perundurai coordinates (latitude, longitude)
    const perunduraiCoords = [
      11.2742,  // latitude
      77.5887   // longitude
    ];

    // Default radius is 10 kilometers (converted to meters)
    const radius = (req.query.radius || 10) * 1000;
    
    const query = {
      'coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: perunduraiCoords
          },
          $maxDistance: radius // in meters
        }
      }
    };

    if (!includeSold) {
      query.available = true;
    }

    const properties = await Property.find(query);

    res.json(properties);
  } catch (error) {
    console.error('Error finding nearby properties:', error);
    res.status(500).json({ message: 'Error finding nearby properties', error: error.message });
  }
});

// Get property by ID
app.get('/api/properties/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    res.json(property);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new property
app.post('/api/properties', verifyToken, async (req, res) => {
  try {
    // Get user ID from token
    const userId = req.user.userId;
    
    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create new property with owner info
    const property = new Property({
      ...req.body,
      owner: user.name,
      ownerPhone: user.phone
    });

    await property.save();
    res.status(201).json(property);
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ 
      message: 'Error creating property', 
      error: error.message 
    });
  }
});

// CART ROUTES

// Get user's cart
app.get('/api/cart', verifyToken, async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.userId }).populate('items.propertyId');
    if (!cart) {
      cart = new Cart({ userId: req.user.userId, items: [] });
      await cart.save();
    }
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add item to cart
app.post('/api/cart/add', verifyToken, async (req, res) => {
  try {
    const { propertyId, checkIn, checkOut, totalPrice } = req.body;

    let cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) {
      cart = new Cart({ userId: req.user.userId, items: [] });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.propertyId.toString() === propertyId
    );

    if (existingItemIndex > -1) {
      // Update existing item
      cart.items[existingItemIndex] = { propertyId, checkIn, checkOut, totalPrice };
    } else {
      // Add new item
      cart.items.push({ propertyId, checkIn, checkOut, totalPrice });
    }

    await cart.save();
    await cart.populate('items.propertyId');
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove item from cart
app.delete('/api/cart/remove/:propertyId', verifyToken, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(
      item => item.propertyId.toString() !== req.params.propertyId
    );

    await cart.save();
    await cart.populate('items.propertyId');
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// BOOKING ROUTES

// Create booking from cart
app.post('/api/bookings/from-cart', verifyToken, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Create bookings for all cart items
    const bookings = [];
    for (const item of cart.items) {
      const booking = new Booking({
        userId: req.user.userId,
        propertyId: item.propertyId,
        checkIn: item.checkIn,
        checkOut: item.checkOut,
        totalPrice: item.totalPrice,
        paymentStatus: 'paid' // Assuming payment is processed
      });
      await booking.save();
      bookings.push(booking);

      // Mark property as sold/unavailable after successful booking
      await Property.findByIdAndUpdate(
        item.propertyId,
        {
          $set: {
            sold: true,
            available: false,
            soldTo: req.user.userId,
            soldAt: new Date()
          }
        }
      );
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    res.json({ message: 'Bookings created successfully', bookings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's bookings
app.get('/api/bookings', verifyToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.userId }).populate('propertyId');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// RAZORPAY ROUTES

// Create Razorpay Order
app.post('/api/payment/create-order', verifyToken, async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    
    if (!amount || amount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required and must be greater than 0'
      });
    }

    const options = {
      amount: Math.round(amount), // amount in the smallest currency unit (paise for INR)
      currency,
      receipt: receipt || `order_${Date.now()}`,
      payment_capture: 1 // auto capture payment
    };

    const order = await razorpay.orders.create(options);
    
    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
});

// Verify Payment
app.post('/api/payment/verify', verifyToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, propertyId } = req.body;
    
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required'
      });
    }
    
    // Skip signature verification for test payments
    const isTestPayment = razorpay_payment_id && razorpay_payment_id.startsWith('test_payment_');
    
    if (isTestPayment) {
      console.log('Processing test payment:', razorpay_payment_id);
    } else {
      // Verify the payment signature for real payments
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
      hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
      const generated_signature = hmac.digest('hex');
      
      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment signature'
        });
      }
    }
    // Update property status to sold
    const updatedProperty = await Property.findByIdAndUpdate(
      propertyId,
      {
        $set: {
          sold: true,
          available: false,
          soldTo: req.userId,
          soldAt: new Date()
        }
      },
      { new: true }
    );

    if (!updatedProperty) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    console.log('Property marked as sold:', updatedProperty._id);
    
    res.json({
      success: true,
      paymentId: razorpay_payment_id,
      property: updatedProperty,
      message: isTestPayment ? 'Test payment processed successfully' : 'Payment verified and property marked as sold'
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: error.message
    });
  }
});

// Initialize sample data
app.post('/api/init-sample-data', async (req, res) => {
  try {
    // Sample properties in Perundurai
    const sampleProperties = [
      {
        title: "Modern 2BHK Apartment",
        description: "Beautiful modern apartment with all amenities near Perundurai bus stand",
        price: 15000,
        location: "Near Bus Stand, Perundurai",
        coordinates: { lat: 11.2750, lng: 77.5800 },
        bedrooms: 2,
        bathrooms: 2,
        area: 1200,
        amenities: ["WiFi", "AC", "Parking", "Security"],
        images: ["https://via.placeholder.com/400x300?text=Modern+Apartment"],
        owner: "Rajesh Kumar",
        ownerPhone: "9876543210"
      },
      {
        title: "Spacious 3BHK House",
        description: "Independent house with garden, perfect for families",
        price: 25000,
        location: "Textile Colony, Perundurai",
        coordinates: { lat: 11.2760, lng: 77.5820 },
        bedrooms: 3,
        bathrooms: 3,
        area: 1800,
        amenities: ["Garden", "Parking", "WiFi", "Security", "Power Backup"],
        images: ["https://via.placeholder.com/400x300?text=Spacious+House"],
        owner: "Priya Devi",
        ownerPhone: "9876543211"
      },
      {
        title: "Budget 1BHK Flat",
        description: "Affordable flat for students and working professionals",
        price: 8000,
        location: "College Road, Perundurai",
        coordinates: { lat: 11.2740, lng: 77.5790 },
        bedrooms: 1,
        bathrooms: 1,
        area: 600,
        amenities: ["WiFi", "Security"],
        images: ["https://via.placeholder.com/400x300?text=Budget+Flat"],
        owner: "Murugan",
        ownerPhone: "9876543212"
      },
      {
        title: "Luxury Villa with Pool",
        description: "Premium villa with swimming pool and modern facilities",
        price: 50000,
        location: "Hill View Area, Perundurai",
        coordinates: { lat: 11.2780, lng: 77.5850 },
        bedrooms: 4,
        bathrooms: 4,
        area: 3000,
        amenities: ["Swimming Pool", "Garden", "AC", "WiFi", "Security", "Gym"],
        images: ["https://via.placeholder.com/400x300?text=Luxury+Villa"],
        owner: "Arun Prakash",
        ownerPhone: "9876543213"
      },
      {
        title: "Compact Studio Suite",
        description: "Fully furnished studio perfect for single professionals close to the bus stand.",
        price: 6500,
        location: "Bus Stand Road, Perundurai",
        coordinates: { lat: 11.2748, lng: 77.5815 },
        bedrooms: 1,
        bathrooms: 1,
        area: 420,
        amenities: ["WiFi", "Furnished", "Security"],
        images: ["https://via.placeholder.com/400x300?text=Studio+Suite"],
        owner: "Deepa Ramesh",
        ownerPhone: "9876543214"
      },
      {
        title: "Duplex Townhouse",
        description: "Airy 3BHK duplex with private terrace and covered parking near textile colony.",
        price: 28000,
        location: "Textile Colony Extension, Perundurai",
        coordinates: { lat: 11.2765, lng: 77.5835 },
        bedrooms: 3,
        bathrooms: 3,
        area: 1900,
        amenities: ["Terrace", "Parking", "Power Backup", "Security"],
        images: ["https://via.placeholder.com/400x300?text=Duplex+Townhouse"],
        owner: "Sanjay Balan",
        ownerPhone: "9876543215"
      },
      {
        title: "Eco Farmstay Cottage",
        description: "Rustic 2BHK cottage nestled inside a 1-acre organic farm with weekend activities.",
        price: 18000,
        location: "Thindal Road, Perundurai",
        coordinates: { lat: 11.2725, lng: 77.5895 },
        bedrooms: 2,
        bathrooms: 2,
        area: 1350,
        amenities: ["Garden", "Pet Friendly", "Solar Power", "Parking"],
        images: ["https://via.placeholder.com/400x300?text=Farmstay+Cottage"],
        owner: "Kalai Selvi",
        ownerPhone: "9876543216"
      },
      {
        title: "Corporate Service Apartment",
        description: "Premium 2BHK service apartment with housekeeping and conference lounge for corporate stays.",
        price: 32000,
        location: "SEZ Link Road, Perundurai",
        coordinates: { lat: 11.2795, lng: 77.5872 },
        bedrooms: 2,
        bathrooms: 2,
        area: 1500,
        amenities: ["Housekeeping", "WiFi", "AC", "Conference Room", "Gym"],
        images: ["https://via.placeholder.com/400x300?text=Service+Apartment"],
        owner: "Lakshmi Narayan",
        ownerPhone: "9876543217"
      }
    ];

    const results = [];
    for (const property of sampleProperties) {
      const result = await Property.findOneAndUpdate(
        { title: property.title },
        { $setOnInsert: property },
        { new: true, upsert: true }
      );
      results.push(result);
    }

    res.json({ 
      message: 'Sample data ensured successfully', 
      insertedOrExisting: results.length 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error initializing sample data', error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
