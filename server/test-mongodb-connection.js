const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// MongoDB Connection String
// Test with default (test) database first since that's where collections exist
const MONGODB_URI_DEFAULT = process.env.MONGODB_URI || 
  'mongodb+srv://onlytamilan6_db_user:08-Aug-05@cluster0.irjjr71.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  
const MONGODB_URI_WITH_DB = process.env.MONGODB_URI || 
  'mongodb+srv://onlytamilan6_db_user:08-Aug-05@cluster0.irjjr71.mongodb.net/perundurai_rentals?retryWrites=true&w=majority&appName=Cluster0';

// Use the one from server.js
const MONGODB_URI = MONGODB_URI_WITH_DB;

console.log('Testing MongoDB Atlas Connection...');
console.log('Connection String:', MONGODB_URI.replace(/:[^:@]+@/, ':****@')); // Hide password

// Connection options for Mongoose v7
const connectionOptions = {
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
};

// Test connection
async function testConnection() {
  try {
    console.log('\nAttempting to connect...');
    
    await mongoose.connect(MONGODB_URI, connectionOptions);
    
    console.log('✅ SUCCESS: Connected to MongoDB Atlas!');
    console.log('📍 Host:', mongoose.connection.host);
    console.log('📍 Database:', mongoose.connection.name);
    console.log('📍 Ready State:', mongoose.connection.readyState);
    console.log('   (1 = connected, 0 = disconnected)');
    
    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📊 Collections in database:');
    if (collections.length > 0) {
      collections.forEach(collection => {
        console.log(`   - ${collection.name}`);
      });
    } else {
      console.log('   (No collections found - database is empty)');
    }
    
    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Connection closed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR: Failed to connect to MongoDB Atlas');
    console.error('Error details:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('\nPossible issues:');
      console.error('1. Check your internet connection');
      console.error('2. Verify MongoDB Atlas cluster is running');
      console.error('3. Check if your IP address is whitelisted in MongoDB Atlas');
      console.error('4. Verify the connection string is correct');
    } else if (error.name === 'MongoAuthenticationError') {
      console.error('\nAuthentication failed:');
      console.error('1. Check username and password');
      console.error('2. Verify database user has proper permissions');
    }
    
    process.exit(1);
  }
}

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose connection event: connected');
});

mongoose.connection.on('error', (err) => {
  console.error('📡 Mongoose connection event: error', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('📡 Mongoose connection event: disconnected');
});

// Run the test
testConnection();

