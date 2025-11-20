# Deployment Setup Guide

## Overview
This guide explains how to configure your hosted frontend and backend to work together.

## URLs
- **Frontend**: https://perundurai-rentals-3.onrender.com/
- **Backend**: https://perundurai-rentals-server1.onrender.com/

## Why Can't the Hosted Client Use the Hosted Server?

### The Problem
When your React app is built for production, it's a static bundle. The API URL needs to be determined either:
1. **At build time** (via environment variables during `npm run build`)
2. **At runtime** (by checking the current URL when the app loads)

### The Solution
We've updated the code to automatically detect if you're running on the hosted frontend and use the hosted backend URL.

## Configuration

### Frontend (Render)
The frontend will automatically use the hosted backend when deployed to Render. However, you can optionally set these environment variables in Render:

1. Go to your Render dashboard → Frontend Service → Environment
2. Add these variables (optional):

```env
REACT_APP_API_URL=https://perundurai-rentals-server1.onrender.com/api
REACT_APP_RAZORPAY_KEY_ID=your_razorpay_key
REACT_APP_FRONTEND_URL=https://perundurai-rentals-3.onrender.com
```

### Backend (Render)
1. Go to your Render dashboard → Backend Service → Environment
2. Make sure these variables are set:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
FRONTEND_URL=https://perundurai-rentals-3.onrender.com
PORT=10000
```

## How It Works

### API Detection Logic
The `client/src/config/api.js` file automatically detects which API to use:

1. **First Priority**: `REACT_APP_API_URL` environment variable (if set)
2. **Second Priority**: Checks if running on `onrender.com` domain → uses hosted backend
3. **Third Priority**: If `NODE_ENV === 'production'` → uses hosted backend
4. **Default**: Uses `http://localhost:5000/api` for local development

### CORS Configuration
The backend now explicitly allows requests from:
- `https://perundurai-rentals-3.onrender.com` (your hosted frontend)
- `http://localhost:3000` (local development)

## Testing

### Test Backend Connection
1. Open browser console on your hosted frontend
2. Look for: `🌐 API Base URL: https://perundurai-rentals-server1.onrender.com/api`
3. If you see `http://localhost:5000/api`, the detection isn't working correctly

### Test API Call
Open browser console and run:
```javascript
fetch('https://perundurai-rentals-server1.onrender.com/api/properties')
  .then(r => r.json())
  .then(data => console.log('✅ Backend connected!', data))
  .catch(err => console.error('❌ Backend error:', err));
```

## Common Issues

### Issue: CORS Error
**Symptom**: Browser console shows "CORS policy" error

**Solution**: 
- Make sure backend CORS is configured to allow your frontend domain
- Check that `FRONTEND_URL` environment variable is set on backend

### Issue: API calls going to localhost
**Symptom**: Network tab shows requests to `http://localhost:5000/api`

**Solution**: 
- Check browser console for the API URL being used
- The app should auto-detect when on `onrender.com` domain
- If not, set `REACT_APP_API_URL` environment variable in Render

### Issue: 404 Not Found
**Symptom**: API calls return 404

**Solution**:
- Verify backend URL: `https://perundurai-rentals-server1.onrender.com/api`
- Make sure backend service is running on Render
- Check that API routes start with `/api` (e.g., `/api/properties` not `/properties`)

## After Making Changes

1. **Commit and push** your changes to GitHub
2. **Render will auto-deploy** (if auto-deploy is enabled)
3. **Or manually deploy** from Render dashboard
4. **Test** the hosted frontend after deployment completes

## Debugging

Check browser console for:
- `🌐 API Base URL: [url]` - Shows which API is being used
- Network tab - Shows actual API requests being made
- CORS errors - Indicates backend CORS configuration issue

