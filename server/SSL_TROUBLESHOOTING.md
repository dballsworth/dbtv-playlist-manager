# SSL/TLS Connection Troubleshooting for R2

## Quick Fix Steps

### 1. **Test Your R2 Connection**
First, run the connection test to diagnose the issue:

```bash
cd server
npm run test-r2
```

This will test multiple connection methods and provide specific error information.

### 2. **Check Your Configuration**
Verify your `.env` file has the correct format:

```env
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
```

**Common issues:**
- Missing `https://` in the endpoint
- Wrong account ID in the endpoint
- Incorrect credentials (copy-paste errors)

### 3. **Try Temporary SSL Bypass** (Testing Only)
If the SSL error persists, temporarily disable SSL verification:

```bash
# In your terminal, before starting the server:
export NODE_TLS_REJECT_UNAUTHORIZED=0
cd server
npm start
```

**⚠️ WARNING:** This is only for testing! Never use this in production.

### 4. **Update Node.js TLS Settings**
Add this to your `.env` file:

```env
NODE_TLS_REJECT_UNAUTHORIZED=0
```

Or start the server with explicit TLS settings:

```bash
node --tls-cipher-list="ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS" index.js
```

## Common SSL Error Patterns

### Error: `EPROTO 4008FF0802000000:error:0A000410:SSL routines`
**Cause:** TLS version or cipher mismatch
**Solution:**
1. Run `npm run test-r2` to test different configurations
2. Try the temporary SSL bypass above
3. Check if you're behind a corporate firewall

### Error: `certificate verify failed`
**Cause:** Certificate validation issues
**Solution:**
1. Verify the R2 endpoint URL is correct
2. Check your system's root certificates are up to date
3. Try the SSL bypass for testing

### Error: `getaddrinfo ENOTFOUND`
**Cause:** DNS resolution failure
**Solution:**
1. Check your internet connection
2. Verify the R2 endpoint format
3. Try using a different DNS server

## Detailed Troubleshooting

### 1. **Verify R2 Endpoint Format**
Your R2 endpoint should look like:
```
https://1234567890abcdef1234567890abcdef.r2.cloudflarestorage.com
```

**Common mistakes:**
- Missing `https://`
- Using the public R2 URL instead of the API endpoint
- Wrong account ID

### 2. **Test with cURL**
Test the connection outside of Node.js:

```bash
curl -v "https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"
```

This should return a 403 error (which is expected) but should NOT have SSL errors.

### 3. **Check Corporate Firewall**
If you're on a corporate network:
- Your firewall might be intercepting SSL connections
- Try from a different network (mobile hotspot)
- Contact your IT department about Cloudflare R2 access

### 4. **Node.js Version Issues**
Some Node.js versions have TLS compatibility issues:

```bash
node --version
```

If you're using Node.js < 18, consider upgrading:
```bash
# Using nvm
nvm install 20
nvm use 20
```

### 5. **Alternative: Use R2 Custom Domain**
If SSL issues persist, set up a custom domain for your R2 bucket:

1. In Cloudflare dashboard, go to R2 → Your Bucket → Settings
2. Add a custom domain (e.g., `files.yourdomain.com`)
3. Update your endpoint:
   ```env
   R2_ENDPOINT=https://files.yourdomain.com
   ```

## Production Solutions

### 1. **Use Environment-Specific Configuration**
Create different configurations for development and production:

```javascript
// In your server code
const tlsConfig = process.env.NODE_ENV === 'production' 
  ? { rejectUnauthorized: true }  // Strict SSL in production
  : { rejectUnauthorized: false }; // Relaxed for development
```

### 2. **Implement Retry Logic**
Add connection retry with exponential backoff:

```javascript
async function connectWithRetry(command, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await r2Client.send(command);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

### 3. **Use Different TLS Libraries**
If Node.js TLS continues to cause issues, consider:
- Using the AWS CLI as a subprocess
- Implementing a proxy service
- Using a different S3-compatible client

## Support Commands

### Test R2 Connection
```bash
cd server
npm run test-r2
```

### Start Server with Debug Logging
```bash
cd server
DEBUG=* npm start
```

### Check SSL Certificate
```bash
openssl s_client -connect YOUR_ACCOUNT_ID.r2.cloudflarestorage.com:443 -servername YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
```

## Getting Help

If none of these solutions work:

1. **Check the test output**: Run `npm run test-r2` and share the complete output
2. **Verify network setup**: Test from a different network/machine
3. **Contact support**: Include your Node.js version, OS, and exact error messages

## Security Note

Remember to remove any `NODE_TLS_REJECT_UNAUTHORIZED=0` settings before deploying to production. This setting disables SSL certificate verification and makes your application vulnerable to man-in-the-middle attacks.