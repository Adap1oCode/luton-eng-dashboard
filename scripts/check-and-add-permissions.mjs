#!/usr/bin/env node

// -----------------------------------------------------------------------------
// FILE: scripts/check-and-add-permissions.mjs
// PURPOSE: Check existing permissions and add missing ones
// USAGE: node scripts/check-and-add-permissions.mjs
// -----------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '..', '.env.local');
let envVars = {};

try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (error) {
  console.log('No .env.local file found, using process.env');
  envVars = process.env;
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define the permissions we want to ensure exist
const requiredPermissions = [
  { key: 'menu:forms:stock_adjustments', description: 'Access to Stock Adjustments menu' },
  { key: 'menu:forms:tally_cards', description: 'Access to Tally Cards menu' },
  { key: 'menu:dashboard:inventory', description: 'Access to Inventory dashboard' },
  { key: 'menu:dashboard:purchase_orders', description: 'Access to Purchase Orders dashboard' },
  { key: 'menu:dashboard:requisitions', description: 'Access to Requisitions dashboard' },
  { key: 'resource:tcm_user_tally_card_entries:read', description: 'Read stock adjustments' },
  { key: 'resource:tcm_user_tally_card_entries:create', description: 'Create stock adjustments' },
  { key: 'resource:tcm_user_tally_card_entries:update', description: 'Update stock adjustments' },
  { key: 'resource:tcm_user_tally_card_entries:delete', description: 'Delete stock adjustments' },
  { key: 'resource:tcm_tally_cards:read', description: 'Read tally cards' },
  { key: 'resource:tcm_tally_cards:create', description: 'Create tally cards' },
  { key: 'resource:tcm_tally_cards:update', description: 'Update tally cards' },
  { key: 'resource:tcm_tally_cards:delete', description: 'Delete tally cards' },
  { key: 'admin:impersonate', description: 'Impersonate other users' },
  { key: 'admin:manage_roles', description: 'Manage user roles' },
  { key: 'admin:manage_users', description: 'Manage user accounts' },
];

async function main() {
  console.log('🔍 Checking existing permissions...\n');

  try {
    // Get existing permissions
    const { data: existingPermissions, error: fetchError } = await supabase
      .from('permissions')
      .select('key, description')
      .order('key');

    if (fetchError) {
      console.error('❌ Failed to fetch existing permissions:', fetchError);
      process.exit(1);
    }

    console.log(`📊 Found ${existingPermissions.length} existing permissions:`);
    existingPermissions.forEach(perm => {
      console.log(`   ✓ ${perm.key} - ${perm.description || 'No description'}`);
    });

    // Find missing permissions
    const existingKeys = new Set(existingPermissions.map(p => p.key));
    const missingPermissions = requiredPermissions.filter(perm => !existingKeys.has(perm.key));

    console.log(`\n🔍 Checking for missing permissions...`);
    console.log(`   Required: ${requiredPermissions.length}`);
    console.log(`   Existing: ${existingPermissions.length}`);
    console.log(`   Missing: ${missingPermissions.length}`);

    if (missingPermissions.length === 0) {
      console.log('\n✅ All required permissions already exist!');
      return;
    }

    console.log('\n📝 Missing permissions:');
    missingPermissions.forEach(perm => {
      console.log(`   ❌ ${perm.key} - ${perm.description}`);
    });

    // Add missing permissions
    console.log('\n➕ Adding missing permissions...');
    
    const { data: insertedPermissions, error: insertError } = await supabase
      .from('permissions')
      .insert(missingPermissions)
      .select('key, description');

    if (insertError) {
      console.error('❌ Failed to insert permissions:', insertError);
      process.exit(1);
    }

    console.log(`✅ Successfully added ${insertedPermissions.length} permissions:`);
    insertedPermissions.forEach(perm => {
      console.log(`   ✓ ${perm.key} - ${perm.description}`);
    });

    // Show final summary
    console.log('\n📊 Final summary:');
    console.log(`   Total permissions: ${existingPermissions.length + insertedPermissions.length}`);
    console.log(`   Required permissions: ${requiredPermissions.length}`);
    console.log(`   All required permissions exist: ✅`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

main().catch(console.error);

