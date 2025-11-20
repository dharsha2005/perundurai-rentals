# MongoDB Database Information

## Current Database Configuration

**Database Name:** `perundurai_rentals`

**Location:** Defined in `server/server.js` (line 28)

## Important Notes

### Database Auto-Creation
- The database `perundurai_rentals` **does NOT exist yet** in MongoDB Atlas
- MongoDB Atlas will **automatically create** this database when:
  - Your server connects for the first time AND
  - The first collection is created (e.g., when a user registers)

### When Will It Appear in Atlas?
The database will appear in MongoDB Atlas Data Explorer after:
1. Starting your server (`npm start` or `npm run dev`)
2. Performing an action that creates a collection, such as:
   - User registration (creates `users` collection)
   - Adding a property (creates `properties` collection)
   - Creating a booking (creates `bookings` collection)
   - Adding to cart (creates `carts` collection)

### How to View in MongoDB Atlas

1. **Log in** to https://cloud.mongodb.com/
2. **Navigate to:** Cluster0 → Browse Collections (or Data Explorer)
3. **After running your server**, refresh the page
4. You'll see `perundurai_rentals` database appear in the left sidebar
5. Click on it to see your collections:
   - `users`
   - `properties`
   - `bookings`
   - `carts`

### Current Status
✅ Connection string is correctly configured  
✅ Server is ready to connect  
⏳ Database will be created on first use  

### Testing the Connection
Run `node test-mongodb-connection.js` to verify the connection works.
Run `node find-collections.js` to search for your project data across all databases.

