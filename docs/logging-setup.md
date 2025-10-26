# Logging Configuration Guide

## Overview

This application supports multiple logging backends:
- **Console logging** (default) - logs to stdout
- **Grafana Loki** - for centralized log aggregation
- **Logtail** - alternative cloud logging service

## Quick Fix for Current Error

The error you're seeing occurs because `LOKI_URL` contains placeholder values like `<tenant>` and `<region>`. 

### Immediate Fix (Choose One):

1. **Disable Loki logging completely:**
   ```bash
   # Add to your .env.local file
   LOG_ENABLE_LOKI=false
   ```

2. **Remove the invalid LOKI_URL:**
   ```bash
   # Comment out or remove LOKI_URL from your environment
   # LOKI_URL=https://<tenant>.logs.<region>.grafana.net/loki/api/v1/push
   ```

3. **Set up proper Loki configuration:**
   ```bash
   # Add to your .env.local file
   LOG_ENABLE_LOKI=true
   LOKI_URL=https://your-actual-tenant.logs.your-actual-region.grafana.net/loki/api/v1/push
   LOKI_USER=your-loki-username
   LOKI_PASS=your-loki-password
   ```

## Setup Scripts

Use the provided scripts to manage logging configuration:

```bash
# Check current logging configuration
npm run check:logging

# Create .env.local with logging configuration template
npm run setup:logging
```

## Environment Variables

### Required for Loki
- `LOG_ENABLE_LOKI=true` - Enable Loki transport
- `LOKI_URL` - Valid Loki endpoint URL
- `LOKI_USER` - Loki username
- `LOKI_PASS` - Loki password

### Required for Logtail
- `LOG_ENABLE_LOGTAIL=true` - Enable Logtail transport
- `LOGTAIL_URL` - Logtail endpoint URL
- `LOGTAIL_TOKEN` - Logtail authentication token

### Optional
- `LOG_LEVEL` - Log level (debug, info, warn, error) - defaults to "info"

## Configuration Validation

The logging system now includes validation that:
- Checks for placeholder values in URLs (like `<tenant>` or `<region>`)
- Only enables transports when all required values are present and valid
- Gracefully disables invalid transports with warning messages

## Best Practices

1. **Development**: Use console logging only (`LOG_ENABLE_LOKI=false`)
2. **Production**: Set up proper Loki or Logtail with valid credentials
3. **Testing**: Use the setup scripts to verify configuration
4. **Security**: Never commit real credentials to version control

## Troubleshooting

### Error: "Invalid LOKI_URL"
- Check that `LOKI_URL` doesn't contain placeholder values
- Ensure the URL is a valid HTTP/HTTPS endpoint
- Verify all required Loki credentials are set

### Error: "Invalid LOGTAIL_URL"
- Check that `LOGTAIL_URL` doesn't contain placeholder values
- Ensure the URL is a valid HTTP/HTTPS endpoint
- Verify the Logtail token is valid

### Logs not appearing in external service
- Check that the transport is enabled (`LOG_ENABLE_LOKI=true` or `LOG_ENABLE_LOGTAIL=true`)
- Verify network connectivity to the logging service
- Check authentication credentials
- Review the application logs for transport-specific error messages
