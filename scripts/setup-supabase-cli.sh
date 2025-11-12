#!/bin/bash
# Supabase CLI Setup Script
# Run this once to configure Supabase CLI access for your project

echo "🚀 Supabase CLI Setup"
echo ""

# Step 1: Check if token is already set
echo "📋 Checking for existing access token..."
if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "✅ Access token already set"
    echo "Current token starts with: ${SUPABASE_ACCESS_TOKEN:0:10}..."
else
    echo "⚠️  No access token found"
    echo ""
    echo "Please follow these steps:"
    echo "1. Go to: https://supabase.com/dashboard/account/tokens"
    echo "2. Generate a new token"
    echo "3. Copy the token"
    echo ""
    
    read -p "Paste your access token here: " token
    
    if [ -n "$token" ]; then
        # Set for current session
        export SUPABASE_ACCESS_TOKEN="$token"
        
        # Add to shell profile
        SHELL_RC="$HOME/.bashrc"
        if [ -n "$ZSH_VERSION" ]; then
            SHELL_RC="$HOME/.zshrc"
        fi
        
        if ! grep -q "SUPABASE_ACCESS_TOKEN" "$SHELL_RC"; then
            echo "" >> "$SHELL_RC"
            echo "export SUPABASE_ACCESS_TOKEN='$token'" >> "$SHELL_RC"
            echo "✅ Token saved to $SHELL_RC"
        fi
        
        echo ""
        echo "✅ Token saved for current session and permanently"
    else
        echo ""
        echo "❌ No token provided. Exiting."
        exit 1
    fi
fi

echo ""
echo "🔗 Linking to Luton Engineering Dashboard project..."

# Step 2: Link to project
PROJECT_REF="zkvtlbguptkugmrhkpjh"
npx supabase link --project-ref "$PROJECT_REF"

if [ $? -eq 0 ]; then
    echo "✅ Successfully linked to project: $PROJECT_REF"
else
    echo "⚠️  Link may have failed or project already linked"
fi

echo ""
echo "🧪 Testing CLI access..."

# Step 3: Test access
npx supabase projects list

if [ $? -eq 0 ]; then
    echo "✅ CLI access working correctly"
else
    echo "❌ CLI test failed"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Extract database schema:"
echo "   npx supabase db dump --schema public > schema.sql"
echo ""
echo "2. View all tables:"
echo "   npx supabase db execute --sql \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';\""
echo ""
echo "3. Check indexes:"
echo "   npx supabase db execute --sql \"SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;\""





