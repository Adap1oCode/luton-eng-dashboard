# Supabase CLI Setup & Migration Guide

## One-Time Setup

### Option 1: Interactive Setup with Script (Recommended)

**Windows PowerShell:**
```powershell
.\scripts\setup-supabase-cli.ps1
```

**Mac/Linux:**
```bash
./scripts/setup-supabase-cli.sh
```

This will:
1. Prompt you for your Supabase access token
2. Save it to your shell profile
3. Link to your project
4. Show you how to run migrations

### Option 2: Manual Setup

1. **Get Access Token:**
   - Go to: https://supabase.com/dashboard/account/tokens
   - Generate new token
   - Copy it

2. **Set Environment Variable:**
   ```bash
   export SUPABASE_ACCESS_TOKEN='your-token-here'
   echo "export SUPABASE_ACCESS_TOKEN='your-token-here'" >> ~/.bashrc
   ```

3. **Link to Project:**
   ```bash
   cd /workspace
   supabase link --project-ref zkvtlbguptkugmrhkpjh
   ```

4. **Verify:**
   ```bash
   supabase projects list
   ```

---

## Running Migrations

### Execute Current Migration (user_saved_views)
```bash
cd /workspace
supabase db execute -f scripts/add-user-saved-views.sql
```

### Execute Any Migration File
```bash
supabase db execute -f scripts/your-migration.sql
```

### Execute SQL Directly
```bash
supabase db execute --sql "SELECT * FROM user_saved_views LIMIT 5;"
```

### View Migration Status
```bash
supabase migration list
```

---

## Common Commands

### Database Operations
```bash
# Execute SQL file
supabase db execute -f path/to/file.sql

# Execute SQL string
supabase db execute --sql "CREATE TABLE..."

# Dump database schema
supabase db dump --schema public

# Reset database (CAUTION!)
supabase db reset
```

### Project Management
```bash
# List all projects
supabase projects list

# Show current project
supabase projects show

# Unlink project
supabase unlink
```

### Functions & Edge Functions
```bash
# List functions
supabase functions list

# Deploy function
supabase functions deploy function-name
```

---

## Troubleshooting

### "Access token not provided"
```bash
# Check if token is set
echo $SUPABASE_ACCESS_TOKEN

# If empty, set it:
export SUPABASE_ACCESS_TOKEN='your-token-here'
```

### "Project not linked"
```bash
# Re-link project
cd /workspace
supabase link --project-ref zkvtlbguptkugmrhkpjh
```

### "Database password required"
```bash
# Link with password
supabase link --project-ref zkvtlbguptkugmrhkpjh --password 'your-db-password'
```

### "Cannot parse .env.local"
```bash
# Execute from a different directory
cd /tmp
supabase link --project-ref zkvtlbguptkugmrhkpjh
cd /workspace
supabase db execute -f scripts/your-migration.sql
```

---

## Project Details

- **Project Ref:** `zkvtlbguptkugmrhkpjh`
- **Dashboard:** https://supabase.com/dashboard/project/zkvtlbguptkugmrhkpjh
- **SQL Editor:** https://supabase.com/dashboard/project/zkvtlbguptkugmrhkpjh/sql/new

---

## Alternative Methods

### Option 1: Use Anon Key (Read-Only, Safe!)
For extracting schema without powerful tokens:

```bash
node scripts/extract-schema-safely.mjs > schema.txt
```

**Benefits:**
- ✅ Uses public anon key (safe to share)
- ✅ No access token needed
- ✅ Read-only operations only
- ✅ Perfect for viewing schema without risk

### Option 2: Dashboard Execution

If CLI issues persist, use the Supabase Dashboard:

1. Go to SQL Editor: https://supabase.com/dashboard/project/zkvtlbguptkugmrhkpjh/sql/new
2. Copy SQL from: `scripts/add-user-saved-views.sql`
3. Paste and click **Run**

---

## Security Notes

- **Never commit** your access token to git
- Access tokens are stored in: `~/.bashrc` or `~/.zshrc`
- Tokens can be revoked at: https://supabase.com/dashboard/account/tokens
- Use different tokens for different environments (dev/staging/prod)

---

## Next Steps After Setup

Once CLI is configured, run the migration:

```bash
cd /workspace
supabase db execute -f scripts/add-user-saved-views.sql
```

Then test the feature:
1. Visit: http://localhost:3000/forms/stock-adjustments
2. Apply filters → columns stay stable ✓
3. Click "Save View" → create custom view ✓
4. Reload page → view persists ✓
