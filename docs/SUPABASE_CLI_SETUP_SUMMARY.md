# Supabase CLI Setup - Quick Summary

## One-Time Setup (Takes 5 Minutes)

### 1. Get Token (2 minutes)
1. Go to https://supabase.com/dashboard/account/tokens
2. Generate new token
3. Copy it

### 2. Set Token (1 minute)

**Windows PowerShell:**
```powershell
# Run the setup script
.\scripts\setup-supabase-cli.ps1

# Or manually:
[System.Environment]::SetEnvironmentVariable('SUPABASE_ACCESS_TOKEN', 'your-token-here', 'User')
```

**Mac/Linux:**
```bash
# Run the setup script
./scripts/setup-supabase-cli.sh

# Or manually:
echo 'export SUPABASE_ACCESS_TOKEN="your-token-here"' >> ~/.bashrc
source ~/.bashrc
```

### 3. Link Project (1 minute)
```bash
cd C:\Dev\luton-eng-dashboard
npx supabase link --project-ref zkvtlbguptkugmrhkpjh
```

### 4. Verify (1 minute)
```bash
npx supabase projects list
```

Done! You can now use all Supabase CLI commands.

---

## What This Gives You

✅ Access to all your Supabase projects  
✅ Ability to dump schemas  
✅ Run migrations  
✅ Execute SQL queries  
✅ View tables, indexes, functions, triggers  
✅ Manage your database from CLI  

---

## Next Steps

Once setup is complete, you can:

1. **Extract schema:**
   ```bash
   npx supabase db dump --schema public > schema.sql
   ```

2. **View tables:**
   ```bash
   npx supabase db execute --sql "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
   ```

3. **Check indexes:**
   ```bash
   npx supabase db execute --sql "SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public';"
   ```

---

## ⚠️ Security Warning

**Important:** Supabase CLI tokens have **FULL access** to ALL your projects:
- No permission restrictions
- No read-only mode
- All-or-nothing access

**Protect tokens like production credentials!**

See full security details in: [Shared Library CLI Setup](../../../adaplo-shared/schemas/SUPABASE_CLI_SETUP.md#-important-access-token-limitations)

---

## Troubleshooting

**"Access token not provided"**
→ Run setup script again or set environment variable

**"Project not linked"**
→ Run `npx supabase link --project-ref zkvtlbguptkugmrhkpjh`

**"Invalid token"**
→ Generate new token at https://supabase.com/dashboard/account/tokens

---

## Full Documentation

- [Complete Setup Guide](../../scripts/README-SUPABASE-CLI.md)
- [Shared Library Schema Setup](../../../adaplo-shared/schemas/SUPABASE_CLI_SETUP.md)

