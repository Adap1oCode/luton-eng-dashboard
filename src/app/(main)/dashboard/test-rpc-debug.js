// Test script to debug the RPC function call
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpcDebug() {
  console.log('🔍 Testing RPC function with exact parameters from network tab...');
  
  // Test with the exact parameters that are failing
  const params = {
    _filter: { column: "total_available", op: "=", value: "0" },
    _distinct: false,
    _range_from: 0,
    _range_to: 999
  };
  
  console.log('📤 Sending parameters:', JSON.stringify(params, null, 2));
  
  try {
    const { data, error } = await supabase.rpc('get_inventory_rows', params);
    
    if (error) {
      console.error('❌ RPC call failed:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ RPC call successful!');
      console.log('📊 Returned', data?.length || 0, 'records');
      if (data && data.length > 0) {
        console.log('📋 Sample record:', {
          item_number: data[0].item_number,
          total_available: data[0].total_available,
          warehouse: data[0].warehouse
        });
      }
    }
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

testRpcDebug();