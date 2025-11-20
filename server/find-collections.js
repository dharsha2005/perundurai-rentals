const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const baseUri = 'mongodb+srv://onlytamilan6_db_user:08-Aug-05@cluster0.irjjr71.mongodb.net/';
const connectionOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

async function searchAllDatabases() {
  try {
    console.log('🔍 Searching all databases for project collections...\n');
    
    // Connect to admin to list all databases
    const adminUri = baseUri + 'admin?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(adminUri, connectionOptions);
    
    const adminDb = mongoose.connection.db.admin();
    const { databases } = await adminDb.listDatabases();
    
    console.log('Checking databases for: users, properties, bookings, carts collections\n');
    console.log('═'.repeat(70));
    
    const targetCollections = ['users', 'properties', 'bookings', 'carts'];
    let foundDatabase = null;
    
    for (const dbInfo of databases) {
      // Skip system databases
      if (['admin', 'local', 'config'].includes(dbInfo.name)) {
        continue;
      }
      
      try {
        const dbUri = baseUri + dbInfo.name + '?retryWrites=true&w=majority&appName=Cluster0';
        await mongoose.connection.close();
        await mongoose.connect(dbUri, connectionOptions);
        
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        // Check if any target collections exist
        const matchingCollections = targetCollections.filter(c => collectionNames.includes(c));
        
        if (matchingCollections.length > 0 || collections.length > 0) {
          console.log(`\n📁 Database: ${dbInfo.name}`);
          console.log(`   Size: ${(dbInfo.sizeOnDisk / 1024 / 1024).toFixed(2)} MB`);
          
          if (collections.length > 0) {
            console.log(`   Collections (${collections.length}):`);
            for (const collection of collections) {
              const count = await mongoose.connection.db.collection(collection.name).countDocuments();
              const isTarget = targetCollections.includes(collection.name);
              const marker = isTarget ? '✅' : '  ';
              console.log(`   ${marker} ${collection.name} (${count} documents)`);
            }
            
            // Check if all target collections exist
            const allFound = targetCollections.every(c => collectionNames.includes(c));
            if (allFound) {
              foundDatabase = dbInfo.name;
              console.log(`   ⭐ THIS DATABASE HAS ALL PROJECT COLLECTIONS!`);
            } else if (matchingCollections.length > 0) {
              console.log(`   ⚠️  This database has some project collections`);
            }
          } else {
            console.log(`   Collections: (empty)`);
          }
        }
      } catch (err) {
        // Skip if can't access
        continue;
      }
    }
    
    console.log('\n' + '═'.repeat(70));
    
    if (foundDatabase) {
      console.log(`\n✅ Found your project database: "${foundDatabase}"`);
      console.log(`\n💡 You should update your connection string to use: "${foundDatabase}"`);
    } else {
      console.log(`\n⚠️  No database found with all project collections (users, properties, bookings, carts)`);
      console.log(`\n💡 The database "perundurai_rentals" will be created automatically when you run your server`);
      console.log(`   and create the first collection.`);
    }
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

searchAllDatabases();

