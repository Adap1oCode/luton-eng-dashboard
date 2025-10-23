// Test script to verify the RPC function works correctly
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpcFunction() {
  console.log('🧪 Testing get_inventory_rows RPC function...');
  
  try {
    // Test 1: Get out-of-stock items (total_available = 0)
    console.log('\n1. Testing out-of-stock filter...');
    const { data: outOfStock, error: outOfStockError } = await supabase.rpc('get_inventory_rows', {
      _filter: { column: 'total_available', op: '=', value: '0' },
      _distinct: false,
      _range_from: 0,
      _range_to: 10
    });
    
    if (outOfStockError) {
      console.error('❌ Out-of-stock test failed:', outOfStockError);
    } else {
      console.log(`✅ Out-of-stock test passed: ${outOfStock?.length || 0} items found`);
      if (outOfStock && outOfStock.length > 0) {
        console.log('   Sample item:', {
          item_number: outOfStock[0].item_number,
          total_available: outOfStock[0].total_available,
          warehouse: outOfStock[0].warehouse
        });
      }
    }
    
    // Test 2: Get unique items (distinct)
    console.log('\n2. Testing distinct items...');
    const { data: uniqueItems, error: uniqueError } = await supabase.rpc('get_inventory_rows', {
      _filter: { column: 'item_number', op: 'IS NOT NULL' },
      _distinct: true,
      _range_from: 0,
      _range_to: 10
    });
    
    if (uniqueError) {
      console.error('❌ Unique items test failed:', uniqueError);
    } else {
      console.log(`✅ Unique items test passed: ${uniqueItems?.length || 0} unique items found`);
    }
    
    // Test 3: Get all items (no filter)
    console.log('\n3. Testing all items (no filter)...');
    const { data: allItems, error: allError } = await supabase.rpc('get_inventory_rows', {
      _filter: null,
      _distinct: false,
      _range_from: 0,
      _range_to: 5
    });
    
    if (allError) {
      console.error('❌ All items test failed:', allError);
    } else {
      console.log(`✅ All items test passed: ${allItems?.length || 0} items found`);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

testRpcFunction();
