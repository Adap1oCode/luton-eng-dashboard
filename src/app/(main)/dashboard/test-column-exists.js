// Test to check if the column exists and what type it is
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testColumnExists() {
  console.log('🔍 Testing if total_available column exists...');
  
  try {
    // Test 1: Check if we can query the table at all
    console.log('\n1. Testing basic table query...');
    const { data: basicData, error: basicError } = await supabase
      .from('inventory')
      .select('item_number, total_available')
      .limit(1);
    
    if (basicError) {
      console.error('❌ Basic table query failed:', basicError);
    } else {
      console.log('✅ Basic table query successful');
      console.log('📋 Sample data:', basicData);
    }
    
    // Test 2: Check if we can filter by total_available
    console.log('\n2. Testing total_available filter...');
    const { data: filterData, error: filterError } = await supabase
      .from('inventory')
      .select('item_number, total_available')
      .eq('total_available', 0)
      .limit(5);
    
    if (filterError) {
      console.error('❌ Filter query failed:', filterError);
    } else {
      console.log('✅ Filter query successful');
      console.log('📋 Filtered data:', filterData);
    }
    
    // Test 3: Check column types
    console.log('\n3. Testing column types...');
    const { data: typeData, error: typeError } = await supabase
      .from('inventory')
      .select('total_available')
      .limit(1);
    
    if (typeError) {
      console.error('❌ Type check failed:', typeError);
    } else {
      console.log('✅ Type check successful');
      console.log('📋 Column type:', typeof typeData[0]?.total_available);
      console.log('📋 Sample value:', typeData[0]?.total_available);
    }
    
  } catch (err) {
    console.error('❌ Test failed with exception:', err);
  }
}

testColumnExists();

