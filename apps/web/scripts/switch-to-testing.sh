#!/bin/bash
# Script to switch to testing-main branch environment
set -e

echo "🔄 Switching to testing-main branch environment..."

# Check if we're in the correct directory
if [ ! -f "testing-environment.env" ]; then
    echo "❌ Error: testing-environment.env not found. Run this from the apps/web directory."
    exit 1
fi

# Backup current .env.local if it exists
if [ -f ".env.local" ]; then
    echo "📋 Backing up current .env.local to .env.local.backup"
    cp .env.local .env.local.backup
fi

# Copy testing configuration
echo "⚙️  Copying testing environment configuration..."
cp testing-environment.env .env.local

echo "✅ Environment switched to testing-main branch!"
echo ""
echo "📝 Next steps:"
echo "   1. Get API keys from: https://supabase.com/dashboard/project/tfomabkrzzojcuiwwztw/settings/api"
echo "   2. Edit .env.local and replace YOUR_ANON_KEY_HERE and YOUR_SERVICE_ROLE_KEY_HERE"
echo "   3. Run 'pnpm dev' to start with testing configuration"
echo ""
echo "🔙 To switch back: cp .env.local.backup .env.local (if backup exists)"