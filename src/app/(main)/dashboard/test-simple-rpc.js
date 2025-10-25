// Simple test to isolate the RPC function issue
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSimpleRpc() {
  console.log('🧪 Testing RPC function with minimal parameters...');
  
  try {
    // Test 1: No filter (should work)
    console.log('\n1. Testing with no filter...');
    const { data: allData, error: allError } = await supabase.rpc('get_inventory_rows', {
      _filter: null,
      _distinct: false,
      _range_from: 0,
      _range_to: 5
    });
    
    if (allError) {
      console.error('❌ No filter test failed:', allError);
    } else {
      console.log('✅ No filter test passed:', allData?.length || 0, 'records');
    }
    
    // Test 2: Simple filter with string value
    console.log('\n2. Testing with string filter...');
    const { data: stringData, error: stringError } = await supabase.rpc('get_inventory_rows', {
      _filter: { column: "warehouse", op: "=", value: "Main" },
      _distinct: false,
      _range_from: 0,
      _range_to: 5
    });
    
    if (stringError) {
      console.error('❌ String filter test failed:', stringError);
    } else {
      console.log('✅ String filter test passed:', stringData?.length || 0, 'records');
    }
    
    // Test 3: Numeric filter (the problematic one)
    console.log('\n3. Testing with numeric filter...');
    const { data: numericData, error: numericError } = await supabase.rpc('get_inventory_rows', {
      _filter: { column: "total_available", op: "=", value: "0" },
      _distinct: false,
      _range_from: 0,
      _range_to: 5
    });
    
    if (numericError) {
      console.error('❌ Numeric filter test failed:', numericError);
      console.error('Error details:', JSON.stringify(numericError, null, 2));
    } else {
      console.log('✅ Numeric filter test passed:', numericData?.length || 0, 'records');
    }
    
  } catch (err) {
    console.error('❌ Test failed with exception:', err);
  }
}

testSimpleRpc();


