const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// MongoDB Connection String - connect without specifying database to list all
const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://onlytamilan6_db_user:08-Aug-05@cluster0.irjjr71.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const connectionOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

async function listDatabases() {
  try {
    console.log('Connecting to MongoDB Atlas...\n');
    
    // Connect without specifying a database
    await mongoose.connect(MONGODB_URI, connectionOptions);
    
    console.log('✅ Connected to MongoDB Atlas!\n');
    
    // Get admin database to list all databases
    const adminDb = mongoose.connection.db.admin();
    const { databases } = await adminDb.listDatabases();
    
    console.log('📊 All Databases in Cluster:');
    console.log('─'.repeat(60));
    
    for (const dbInfo of databases) {
      console.log(`\n📁 Database: ${dbInfo.name}`);
      console.log(`   Size: ${(dbInfo.sizeOnDisk / 1024 / 1024).toFixed(2)} MB`);
      
      // Connect to this database to list collections
      const db = mongoose.connection.client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();
      
      if (collections.length > 0) {
        console.log(`   Collections (${collections.length}):`);
        collections.forEach(collection => {
          console.log(`      - ${collection.name}`);
        });
      } else {
        console.log(`   Collections: (empty)`);
      }
    }
    
    console.log('\n' + '─'.repeat(60));
    console.log(`\n📍 Currently connected to: ${mongoose.connection.name}`);
    
    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

listDatabases();

