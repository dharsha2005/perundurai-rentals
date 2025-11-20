const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const connectionOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

async function checkDatabase(dbName) {
  try {
    const baseUri = 'mongodb+srv://onlytamilan6_db_user:08-Aug-05@cluster0.irjjr71.mongodb.net/';
    const mongoUri = `${baseUri}${dbName}?retryWrites=true&w=majority&appName=Cluster0`;
    
    console.log(`\nChecking database: "${dbName}"`);
    console.log('─'.repeat(60));
    
    await mongoose.connect(mongoUri, connectionOptions);
    
    console.log(`✅ Connected to database: ${mongoose.connection.name}`);
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    if (collections.length > 0) {
      console.log(`\n📊 Collections found (${collections.length}):`);
      for (const collection of collections) {
        const count = await mongoose.connection.db.collection(collection.name).countDocuments();
        console.log(`   - ${collection.name} (${count} documents)`);
      }
    } else {
      console.log('\n📊 Collections: (empty database)');
    }
    
    await mongoose.connection.close();
    console.log(`✅ Connection closed\n`);
    
  } catch (error) {
    if (error.message.includes('Authentication failed')) {
      console.log(`⚠️  Could not connect to "${dbName}" - authentication or database doesn't exist`);
    } else {
      console.log(`❌ Error: ${error.message}`);
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

async function main() {
  console.log('🔍 Checking Project Databases...\n');
  
  // Check common database names
  const databasesToCheck = ['test', 'perundurai_rentals', 'perundurai'];
  
  for (const dbName of databasesToCheck) {
    await checkDatabase(dbName);
    // Small delay between connections
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  process.exit(0);
}

main();

