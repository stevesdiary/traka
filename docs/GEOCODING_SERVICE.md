# Geocoding Service - Enhanced with Redis Caching

## Overview
The Geocoding Service converts addresses to coordinates (and vice versa) using OpenStreetMap's Nominatim API with Redis caching for performance optimization.

## Features

### ✅ Implemented
- **Forward Geocoding** - Address → Coordinates
- **Reverse Geocoding** - Coordinates → Address
- **Redis Caching** - 30-day cache for all results
- **Rate Limiting** - 1 request/second (Nominatim policy)
- **Service Area Validation** - Check if address is in coverage

### 🎯 Performance Improvements
- **Cache Hit Rate**: Expected 80-90% after initial usage
- **Response Time**: 
  - Cache hit: < 10ms
  - Cache miss: 500ms-2s (API call)
- **Cost**: $0 (using free OpenStreetMap)

## How It Works

### 1. Forward Geocoding (Address → Coordinates)

```typescript
const result = await geocodingService.geocodeAddress("123 Main St, Lagos, Nigeria");

// Returns:
{
  latitude: 6.5244,
  longitude: 3.3792,
  city: "Lagos",
  state: "Lagos",
  country: "Nigeria",
  formatted_address: "123 Main Street, Lagos Island, Lagos, Nigeria"
}
```

**Flow:**
1. Generate MD5 hash of address (cache key)
2. Check Redis cache
3. If cache hit → return immediately (< 10ms)
4. If cache miss → call Nominatim API (with rate limiting)
5. Cache result for 30 days
6. Return result

### 2. Reverse Geocoding (Coordinates → Address)

```typescript
const result = await geocodingService.reverseGeocode(6.5244, 3.3792);

// Returns same structure as forward geocoding
```

### 3. Service Area Validation

```typescript
const isValid = await geocodingService.validateServiceArea(
  "123 Main St, Lagos",
  "Lagos",
  "Lagos"
);

// Returns: true/false
```

## Caching Strategy

### Cache Key Generation
```typescript
// Address: "123 Main St, Lagos, Nigeria"
// Normalized: "123 main st, lagos, nigeria"
// MD5 Hash: "a1b2c3d4e5f6..."
// Cache Key: "geocode:a1b2c3d4e5f6..."
```

### Cache Configuration
- **Prefix**: `geocode:`
- **TTL**: 2,592,000 seconds (30 days)
- **Storage**: Redis
- **Size**: ~500 bytes per entry

### Cache Invalidation
- Automatic expiry after 30 days
- No manual invalidation needed
- Addresses are immutable (coordinates don't change)

## Rate Limiting

### Nominatim Usage Policy
- **Limit**: 1 request per second
- **Implementation**: Automatic delay between requests
- **Enforcement**: Built-in rate limiter

```typescript
// Automatic rate limiting
await this.rateLimit(); // Waits if needed
```

### Handling High Load
- Cache prevents most API calls
- Queue system for concurrent requests
- Graceful degradation if API unavailable

## Performance Metrics

### Expected Usage (1000 packages/day)
- **Total Geocoding Requests**: 2000/day (pickup + delivery)
- **Cache Hit Rate**: 85% (after 1 week)
- **API Calls**: 300/day (15% cache miss)
- **Cost**: $0 (within free tier)

### Cache Statistics
```bash
# Check cache size
redis-cli DBSIZE

# Check specific geocode cache
redis-cli KEYS "geocode:*" | wc -l

# View cache entry
redis-cli GET "geocode:a1b2c3d4e5f6..."
```

## Error Handling

### Scenarios

1. **Address Not Found**
   ```typescript
   throw new Error('Address not found');
   ```

2. **API Rate Limited**
   - Automatic retry with delay
   - Queues requests

3. **Redis Unavailable**
   - Falls back to direct API calls
   - Logs warning
   - Continues operation

4. **API Unavailable**
   - Throws error
   - Package creation fails
   - User notified

## Monitoring

### Key Metrics to Track
- Cache hit rate
- API response times
- Error rates
- Daily API call count

### Logging
```typescript
// Cache hit
✅ Geocoding cache hit: 123 Main St, Lagos

// Cache miss + API call
💾 Geocoding cached: 123 Main St, Lagos

// Error
❌ Geocoding error: Address not found
```

## Cost Analysis

### Current (OpenStreetMap Nominatim)
- **Cost**: $0/month
- **Limit**: 1 req/sec (~86,400/day)
- **Cache**: Reduces to ~300 API calls/day
- **Accuracy**: 70-80%

### Alternative: Google Maps Geocoding
- **Cost**: $5/1000 requests
- **Free Tier**: $200/month (~40,000 requests)
- **Limit**: 50 req/sec
- **Accuracy**: 95%+

### When to Upgrade
Consider upgrading if:
- Cache hit rate < 70%
- API calls > 10,000/day
- Accuracy issues reported
- Need faster response times

## Configuration

### Environment Variables
```env
# Optional: Override default geocoding provider
GEOCODING_PROVIDER=nominatim  # or 'google', 'mapbox'
GOOGLE_MAPS_API_KEY=your-key  # If using Google
```

### Redis Configuration
```typescript
// Cache TTL (30 days)
private CACHE_TTL = 2592000;

// Rate limit (1 second)
private MIN_REQUEST_INTERVAL = 1000;
```

## Testing

### Manual Test
```bash
# Test geocoding with caching
curl -X POST http://localhost:3000/api/packages \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickup_address": "Victoria Island, Lagos",
    "delivery_address": "Lekki, Lagos",
    ...
  }'

# Check logs for cache hits/misses
# First request: Cache miss (API call)
# Second request: Cache hit (< 10ms)
```

### Check Cache
```bash
# Connect to Redis
redis-cli

# Count geocode cache entries
KEYS geocode:* | wc -l

# View specific entry
GET geocode:a1b2c3d4e5f6...

# Check TTL
TTL geocode:a1b2c3d4e5f6...
```

## Troubleshooting

### Issue: High API Call Rate
**Symptom:** Many cache misses  
**Cause:** Addresses not normalized  
**Solution:** Improve address normalization

### Issue: Slow Response Times
**Symptom:** > 2s response time  
**Cause:** Nominatim API slow  
**Solution:** Consider upgrading to paid service

### Issue: Address Not Found
**Symptom:** "Address not found" errors  
**Cause:** Poor address quality  
**Solution:** Improve address validation, add manual coordinates

### Issue: Rate Limit Errors
**Symptom:** 429 errors from Nominatim  
**Cause:** Too many requests  
**Solution:** Check rate limiter, increase cache TTL

## Future Enhancements

### Short-term (Next Sprint)
- [ ] Add cache warming for common addresses
- [ ] Implement batch geocoding
- [ ] Add metrics dashboard
- [ ] Improve error messages

### Medium-term (Next Month)
- [ ] Add Google Maps fallback
- [ ] Implement address autocomplete
- [ ] Add geocoding quality score
- [ ] Optimize cache key generation

### Long-term (Next Quarter)
- [ ] Build address database
- [ ] Implement ML-based address correction
- [ ] Add offline geocoding
- [ ] Multi-provider support

## Best Practices

### For Developers
1. Always use geocoding service (don't call API directly)
2. Handle errors gracefully
3. Log cache hits/misses
4. Monitor API usage

### For Operations
1. Monitor cache hit rate (target: > 80%)
2. Track API call volume
3. Set up alerts for errors
4. Review costs monthly

### For Users
1. Provide complete addresses
2. Include city and state
3. Use standard format
4. Verify on map if possible

## Summary

### ✅ Benefits of Caching
- **Performance**: 50x faster (10ms vs 500ms)
- **Cost**: Reduces API calls by 80-90%
- **Reliability**: Works even if API is slow
- **Scalability**: Handles high load

### 📊 Expected Results
- **Cache Hit Rate**: 85%+ after 1 week
- **API Calls**: Reduced by 85%
- **Response Time**: < 10ms for cached
- **Cost Savings**: $0 (stays in free tier)

### 🎯 Next Steps
1. Deploy enhanced service
2. Monitor cache performance
3. Adjust TTL if needed
4. Evaluate upgrade after 1 month
