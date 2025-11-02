#!/usr/bin/env node

// -----------------------------------------------------------------------------
// FILE: scripts/extract-schema-safely.mjs
// PURPOSE: Extract database schema using anon key (READ-ONLY, SAFE)
// USAGE: node scripts/extract-schema-safely.mjs > schema.txt
// -----------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Extracting database schema using anon key (read-only)...\n');

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
  console.log('⚠️  No .env.local file found, using process.env');
  envVars = process.env;
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!anonKey);
  console.error('\n💡 Note: This script uses the anon key, which is SAFE to share.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

// Helper to execute SQL safely
async function execSql(query) {
  const { data, error } = await supabase.rpc('exec_sql', { query });
  if (error) {
    console.error('❌ SQL Error:', error.message);
    return null;
  }
  return data;
}

async function main() {
  console.log('✅ Using anon key for read-only access\n');
  
  // 1. Get all tables
  console.log('📋 Fetching table list...');
  const tablesQuery = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;
  const tables = await execSql(tablesQuery);
  
  if (!tables || tables.length === 0) {
    console.error('❌ No tables found or exec_sql function not available');
    console.error('\n💡 Alternative: Use CLI with access token for full schema dump');
    process.exit(1);
  }
  
  console.log(`✅ Found ${tables.length} tables\n`);
  
  // 2. Get columns for each table
  console.log('📊 Fetching column details...');
  const columnsQuery = `
    SELECT 
      table_name,
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `;
  const columns = await execSql(columnsQuery);
  
  // 3. Get indexes
  console.log('🔍 Fetching indexes...');
  const indexesQuery = `
    SELECT
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `;
  const indexes = await execSql(indexesQuery);
  
  // 4. Get foreign keys
  console.log('🔗 Fetching foreign keys...');
  const fkQuery = `
    SELECT
      tc.table_name,
      tc.constraint_name,
      tc.table_name as foreign_table_name,
      kcu.column_name as foreign_column_name,
      ccu.table_name AS referenced_table_name,
      ccu.column_name AS referenced_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name;
  `;
  const foreignKeys = await execSql(fkQuery);
  
  // Output the schema
  console.log('\n' + '='.repeat(80));
  console.log('DATABASE SCHEMA (EXTRACTED SAFELY WITH ANON KEY)');
  console.log('='.repeat(80) + '\n');
  
  // Group columns by table
  const columnsByTable = {};
  if (columns) {
    for (const col of columns) {
      if (!columnsByTable[col.table_name]) {
        columnsByTable[col.table_name] = [];
      }
      columnsByTable[col.table_name].push(col);
    }
  }
  
  // Group indexes by table
  const indexesByTable = {};
  if (indexes) {
    for (const idx of indexes) {
      if (!indexesByTable[idx.tablename]) {
        indexesByTable[idx.tablename] = [];
      }
      indexesByTable[idx.tablename].push(idx);
    }
  }
  
  // Output each table
  for (const table of tables) {
    const tableName = table.table_name;
    console.log(`\n## Table: ${tableName}`);
    console.log('-'.repeat(80));
    
    if (columnsByTable[tableName]) {
      console.log('\nColumns:');
      for (const col of columnsByTable[tableName]) {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
      }
    }
    
    if (indexesByTable[tableName]) {
      console.log('\nIndexes:');
      for (const idx of indexesByTable[tableName]) {
        console.log(`  - ${idx.indexname}: ${idx.indexdef}`);
      }
    }
  }
  
  if (foreignKeys && foreignKeys.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('FOREIGN KEY CONSTRAINTS');
    console.log('='.repeat(80) + '\n');
    for (const fk of foreignKeys) {
      console.log(`${fk.table_name}.${fk.foreign_column_name} → ${fk.referenced_table_name}.${fk.referenced_column_name}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('Extraction complete! ✅');
  console.log('='.repeat(80));
  console.log('\n💡 This was extracted using the anon key (safe, read-only)');
  console.log('💡 For full schema dump with triggers/functions, use CLI with access token');
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});





