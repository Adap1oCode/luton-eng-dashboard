# Supabase CLI Setup Script for Windows PowerShell
# Run this once to configure Supabase CLI access for your project

Write-Host "🚀 Supabase CLI Setup" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if token is already set
Write-Host "📋 Checking for existing access token..." -ForegroundColor Yellow
if ($env:SUPABASE_ACCESS_TOKEN) {
    Write-Host "✅ Access token already set" -ForegroundColor Green
    Write-Host "Current token starts with: $($env:SUPABASE_ACCESS_TOKEN.Substring(0, 10))..."
} else {
    Write-Host "⚠️  No access token found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please follow these steps:" -ForegroundColor Cyan
    Write-Host "1. Go to: https://supabase.com/dashboard/account/tokens"
    Write-Host "2. Generate a new token"
    Write-Host "3. Copy the token"
    Write-Host ""
    
    $token = Read-Host "Paste your access token here"
    
    if ($token) {
        # Set for current session
        $env:SUPABASE_ACCESS_TOKEN = $token
        
        # Set permanently
        [System.Environment]::SetEnvironmentVariable('SUPABASE_ACCESS_TOKEN', $token, 'User')
        
        Write-Host ""
        Write-Host "✅ Token saved for current session and permanently" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ No token provided. Exiting." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🔗 Linking to Luton Engineering Dashboard project..." -ForegroundColor Yellow

# Step 2: Link to project
$projectRef = "zkvtlbguptkugmrhkpjh"
$linkResult = npx supabase link --project-ref $projectRef 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Successfully linked to project: $projectRef" -ForegroundColor Green
} else {
    Write-Host "⚠️  Link result:" -ForegroundColor Yellow
    Write-Host $linkResult
}

Write-Host ""
Write-Host "🧪 Testing CLI access..." -ForegroundColor Yellow

# Step 3: Test access
$testResult = npx supabase projects list 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ CLI access working correctly" -ForegroundColor Green
    Write-Host $testResult
} else {
    Write-Host "❌ CLI test failed. Error:" -ForegroundColor Red
    Write-Host $testResult
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Extract database schema:"
Write-Host "   npx supabase db dump --schema public > schema.sql"
Write-Host ""
Write-Host "2. View all tables:"
Write-Host "   npx supabase db execute --sql `"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`""
Write-Host ""
Write-Host "3. Check indexes:"
Write-Host "   npx supabase db execute --sql `"SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;`""





