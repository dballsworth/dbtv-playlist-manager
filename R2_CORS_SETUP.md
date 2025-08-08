# R2 Network Issues Troubleshooting Guide

## Issue Analysis
Based on investigation, the errors are **NOT actually CORS issues** despite the error message. The R2 bucket has correct CORS policy with wildcard `*` origins.

**Real Issues:**
1. **Missing thumbnail files** - The specific thumbnail files may not exist in R2
2. **Network connectivity** - R2 service or specific files are not accessible
3. **File path mismatches** - URLs point to non-existent files

**Error Examples:**
```
Access to fetch at 'https://pub-e191fb2d6e0a4cb691e3258b5d4e85fe.r2.dev/thumbnails/...' 
from origin 'http://localhost:5173' has been blocked by CORS policy
HEAD https://... net::ERR_FAILED
```

## Fix: Configure CORS in Cloudflare Dashboard

### Step 1: Access R2 CORS Settings
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2 Object Storage**
3. Click on your bucket (the one with domain `pub-e191fb2d6e0a4cb691e3258b5d4e85fe.r2.dev`)
4. Go to **Settings** → **CORS Policy**

### Step 2: Add CORS Rules
Add these rules to allow development and production access:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
      "https://your-production-domain.com"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD",
      "POST",
      "PUT",
      "DELETE"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-meta-*"
    ],
    "MaxAgeSeconds": 86400
  }
]
```

### Step 3: For Development Only (Less Secure)
If you need a quick fix for development, you can temporarily use wildcard:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

**⚠️ Warning:** Wildcard origins should not be used in production.

## Alternative: Update Vite Port
If you can't modify R2 CORS settings immediately, run on port 3000:

```bash
npx vite --port 3000
```

## Testing
After configuring CORS:
1. Hard refresh your browser (Cmd/Ctrl + Shift + R)
2. Check browser console - CORS errors should disappear
3. Thumbnails should load from R2 instead of generating client-side

## Diagnosis Steps

### 1. Check if files exist in R2
- Go to Cloudflare R2 dashboard
- Browse your bucket for `/thumbnails/` folder
- Verify the specific files referenced in errors exist

### 2. Test individual file access
```bash
curl -I "https://pub-e191fb2d6e0a4cb691e3258b5d4e85fe.r2.dev/thumbnails/FILENAME"
```

### 3. Common Solutions
- **Upload missing thumbnails** to R2 `/thumbnails/` folder
- **Regenerate thumbnails** if they were accidentally deleted
- **Check file naming** - ensure thumbnail filenames match video metadata

## Current Status - FIXED! 🎉
- ✅ **R2 CORS issue resolved**: Skipping problematic HEAD requests
- ✅ **Thumbnails loading**: R2 thumbnails now load directly via `<img>` tags (bypasses CORS)
- ✅ **Graceful fallback**: If R2 thumbnail fails to load, automatically generates client-side
- ✅ **Better error handling**: Image load errors trigger fallback to local generation  
- ✅ **Video reordering works perfectly**: Drag videos within playlists to reorder
- ✅ **Performance optimized**: Caches generated thumbnails to avoid regeneration
- ✅ **Detailed logging**: Console shows whether thumbnails load from R2 or are generated

## Fix Applied
**Problem**: `fetch()` with `HEAD` method was blocked by CORS, even with correct policy
**Solution**: Skip HEAD check and load R2 thumbnails directly via `<img>` tags
**Result**: Thumbnails load immediately, with automatic fallback if needed