// Debug script to help you understand the data flow
console.log('🔍 Dashboard Data Flow Debug');
console.log('============================');

console.log('\n📋 Expected Flow:');
console.log('1. User clicks "Out-of-Stock Items" tile');
console.log('2. RPC function get_inventory_rows is called with filter: { column: "total_available", op: "=", value: "0" }');
console.log('3. RPC function returns 883 filtered records');
console.log('4. useDataViewer hook should receive this data and update rpcData state');
console.log('5. DataViewer component should display the 883 filtered records');

console.log('\n🚨 Current Issue:');
console.log('- RPC function works correctly (returns 883 records)');
console.log('- UI still shows all 3,155 records instead of 883');
console.log('- This means the data viewer is not using the RPC data');

console.log('\n🔍 Debug Steps:');
console.log('1. Open browser console');
console.log('2. Navigate to /dashboard/inventory');
console.log('3. Look for these debug messages:');
console.log('   - "🔍 [fetchRecords] Called with:"');
console.log('   - "🔍 [fetchRecords] Result:"');
console.log('   - "🔍 [fetchRecords] Sample data:"');
console.log('4. Click "Out-of-Stock Items" tile');
console.log('5. Look for RPC call in Network tab');
console.log('6. Check if data viewer shows filtered data');

console.log('\n💡 What to Look For:');
console.log('- fetchRecords should be called with the correct filter');
console.log('- The result should show 883 records, not 3,155');
console.log('- If fetchRecords is not called, the issue is in the dashboard system');
console.log('- If fetchRecords is called but returns wrong data, the issue is in getInventoryRows');

console.log('\n🔧 Potential Issues:');
console.log('1. Dashboard system not calling fetchRecords when tile is clicked');
console.log('2. fetchRecords not receiving the correct filter parameters');
console.log('3. getInventoryRows not applying the filter correctly');
console.log('4. Data viewer not using the filtered data from fetchRecords');

console.log('\n✅ Next Steps:');
console.log('1. Check browser console for debug messages');
console.log('2. Verify fetchRecords is called with correct parameters');
console.log('3. Verify the returned data has 883 records');
console.log('4. If data is correct but UI shows wrong count, the issue is in the data viewer component');
