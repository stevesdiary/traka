# Service Area Jurisdiction & Waitlist Feature

## Overview
This feature ensures that TRAKA only accepts deliveries within cities where services have been launched. Users attempting to create deliveries outside coverage areas are added to a waitlist and notified when services become available.

## Features

### 1. Service Area Management
- Define cities where TRAKA operates
- Set coverage radius for each city (default: 20km)
- Enable/disable service areas dynamically
- Cache active cities in Redis for performance

### 2. Jurisdiction Validation
- Check pickup and delivery locations against service areas
- Validate coordinates using Haversine distance formula
- Reject package creation if either location is out of coverage
- Clear error messages for frontend handling

### 3. Waitlist System
- Capture interested users outside coverage
- Store: name, email, location, coordinates
- Send welcome email to waitlist users
- Prevent duplicate entries
- Admin dashboard for waitlist analytics

### 4. Launch Notifications
- Bulk notify waitlist when launching in new city
- Track notification status
- Personalized launch emails

## API Endpoints

### Public Endpoints

#### Get Active Cities
```http
GET /api/service-areas/cities
```

**Response:**
```json
{
  "success": true,
  "cities": [
    {
      "id": "uuid",
      "city": "Lagos",
      "state": "Lagos",
      "country": "Nigeria",
      "latitude": 6.5244,
      "longitude": 3.3792,
      "radius_km": 25
    }
  ]
}
```

#### Check Coverage
```http
GET /api/service-areas/check?latitude=6.5244&longitude=3.3792
```

**Response (Covered):**
```json
{
  "success": true,
  "covered": true,
  "city": "Lagos",
  "message": "Service available in Lagos"
}
```

**Response (Not Covered):**
```json
{
  "success": true,
  "covered": false,
  "message": "Service not available in this area"
}
```

#### Add to Waitlist
```http
POST /api/waitlist
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "location": "Enugu, Nigeria",
  "city": "Enugu",
  "latitude": 6.4403,
  "longitude": 7.4914
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully added to waitlist",
  "entry": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "location": "Enugu, Nigeria",
    "notified": false
  }
}
```

### Admin Endpoints (Requires Authentication)

#### Add Service Area
```http
POST /api/service-areas
Authorization: Bearer <token>
Content-Type: application/json

{
  "city": "Kano",
  "state": "Kano",
  "country": "Nigeria",
  "latitude": 12.0022,
  "longitude": 8.5919,
  "radius_km": 15
}
```

#### Get Waitlist
```http
GET /api/waitlist?page=1&limit=50
Authorization: Bearer <token>
```

#### Get Waitlist by City
```http
GET /api/waitlist/by-city
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "Enugu": 45,
    "Kano": 32,
    "Benin": 28
  }
}
```

#### Notify Waitlist
```http
POST /api/waitlist/notify
Authorization: Bearer <token>
Content-Type: application/json

{
  "city": "Enugu"
}
```

## Package Creation Integration

### Updated Package Creation Endpoint
```http
POST /api/packages
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipient_name": "Jane Doe",
  "recipient_phone": "+2348012345678",
  "pickup_address": "123 Main St, Lagos",
  "delivery_address": "456 Oak Ave, Lagos",
  "pickup_latitude": 6.5244,
  "pickup_longitude": 3.3792,
  "delivery_latitude": 6.4281,
  "delivery_longitude": 3.4219,
  "description": "Documents",
  "package_size": "SMALL",
  "delivery_speed": "STANDARD"
}
```

### Error Responses

**Pickup Out of Coverage:**
```json
{
  "success": false,
  "message": "PICKUP_OUT_OF_COVERAGE: Pickup location is outside our service area"
}
```

**Delivery Out of Coverage:**
```json
{
  "success": false,
  "message": "DELIVERY_OUT_OF_COVERAGE: Delivery location is outside our service area"
}
```

## Frontend Implementation Guide

### 1. Check Coverage Before Package Creation

```javascript
// Check if location is covered
async function checkCoverage(latitude, longitude) {
  const response = await fetch(
    `/api/service-areas/check?latitude=${latitude}&longitude=${longitude}`
  );
  const data = await response.json();
  return data.covered;
}

// Validate both locations
async function validateLocations(pickup, delivery) {
  const pickupCovered = await checkCoverage(pickup.lat, pickup.lng);
  const deliveryCovered = await checkCoverage(delivery.lat, delivery.lng);
  
  if (!pickupCovered) {
    return { valid: false, reason: 'pickup', location: pickup };
  }
  
  if (!deliveryCovered) {
    return { valid: false, reason: 'delivery', location: delivery };
  }
  
  return { valid: true };
}
```

### 2. Show Waitlist Modal

```javascript
async function showWaitlistModal(location, reason) {
  const modal = `
    <div class="modal">
      <h2>Service Not Available</h2>
      <p>We're not currently operating in this area.</p>
      <p>Join our waitlist to be notified when we launch!</p>
      <form id="waitlist-form">
        <input type="text" name="name" placeholder="Your Name" required />
        <input type="email" name="email" placeholder="Your Email" required />
        <input type="hidden" name="location" value="${location.address}" />
        <input type="hidden" name="latitude" value="${location.lat}" />
        <input type="hidden" name="longitude" value="${location.lng}" />
        <button type="submit">Join Waitlist</button>
      </form>
    </div>
  `;
  
  // Handle form submission
  document.getElementById('waitlist-form').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(formData))
    });
    
    alert('Thank you! We\'ll notify you when we launch in your area.');
  };
}
```

### 3. Complete Flow

```javascript
async function createPackage(packageData) {
  // 1. Validate locations
  const validation = await validateLocations(
    packageData.pickup,
    packageData.delivery
  );
  
  if (!validation.valid) {
    // Show waitlist modal
    await showWaitlistModal(validation.location, validation.reason);
    return;
  }
  
  // 2. Proceed with package creation
  const response = await fetch('/api/packages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(packageData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    
    // Handle coverage errors
    if (error.message.includes('OUT_OF_COVERAGE')) {
      const reason = error.message.includes('PICKUP') ? 'pickup' : 'delivery';
      await showWaitlistModal(packageData[reason], reason);
      return;
    }
    
    throw new Error(error.message);
  }
  
  return await response.json();
}
```

## Database Schema

### service_areas Table
```sql
CREATE TABLE service_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city VARCHAR(255) NOT NULL UNIQUE,
  state VARCHAR(255) NOT NULL,
  country VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  radius_km DECIMAL(5, 2) NOT NULL DEFAULT 20,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### waitlist Table
```sql
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  city VARCHAR(255),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Setup Instructions

### 1. Run Database Migrations
```bash
npm run build
node dist/index.js
```

### 2. Seed Initial Service Areas
```bash
npx ts-node scripts/seed-service-areas.ts
```

### 3. Configure Environment Variables
```env
# Email notifications
BREVO_API_KEY=your-brevo-api-key
SMTP_FROM=noreply@traka.com

# Frontend URL for launch emails
APP_URL=https://traka.com
```

## Admin Dashboard Features

### Waitlist Analytics
- Total waitlist count
- Breakdown by city
- Growth trends
- Top requested cities

### Launch Planning
- View cities with highest demand
- Notify waitlist when launching
- Track notification success rate

## Email Templates

### Waitlist Welcome Email
```
Subject: Welcome to TRAKA Waitlist

Hi [Name],

Thank you for your interest in using TRAKA for deliveries in [Location].

We're not currently operating in your area, but we've added you to our waitlist. 
We'll notify you as soon as we launch services in your location!

Best regards,
TRAKA Team
```

### Launch Notification Email
```
Subject: 🎉 TRAKA is Now Available in [City]!

Hi [Name],

Great news! We've officially launched TRAKA delivery services in [City].

You can now enjoy fast, reliable deliveries in your area. Start sending packages today!

[Get Started Button]

Best regards,
TRAKA Team
```

## Performance Considerations

- Service areas cached in Redis (1 hour TTL)
- Haversine distance calculation is O(1)
- Waitlist queries indexed on email and location
- Bulk notifications processed asynchronously

## Future Enhancements

1. **Polygon Coverage**: Support complex city boundaries instead of circular radius
2. **Partial Coverage**: Allow deliveries within specific zones of a city
3. **Waitlist Incentives**: Offer discounts to early waitlist users
4. **Demand Heatmap**: Visualize waitlist density on map
5. **Auto-Launch Triggers**: Launch when waitlist reaches threshold
