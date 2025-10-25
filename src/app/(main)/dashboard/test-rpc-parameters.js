// Test different RPC function parameters to isolate the issue
console.log('🧪 RPC Function Parameter Tests');
console.log('==============================');

// Test 1: No filter (should work)
console.log('\n1. No filter test:');
const noFilterParams = {
  _filter: null,
  _distinct: false,
  _range_from: 0,
  _range_to: 5
};
console.log('Parameters:', JSON.stringify(noFilterParams, null, 2));
console.log('Expected SQL: SELECT * FROM inventory OFFSET 0 LIMIT 5');

// Test 2: String column filter (should work)
console.log('\n2. String column filter test:');
const stringFilterParams = {
  _filter: { column: "warehouse", op: "=", value: "Main" },
  _distinct: false,
  _range_from: 0,
  _range_to: 5
};
console.log('Parameters:', JSON.stringify(stringFilterParams, null, 2));
console.log('Expected SQL: SELECT * FROM inventory WHERE warehouse = \'Main\' OFFSET 0 LIMIT 5');

// Test 3: Numeric column filter (the problematic one)
console.log('\n3. Numeric column filter test:');
const numericFilterParams = {
  _filter: { column: "total_available", op: "=", value: "0" },
  _distinct: false,
  _range_from: 0,
  _range_to: 5
};
console.log('Parameters:', JSON.stringify(numericFilterParams, null, 2));
console.log('Expected SQL: SELECT * FROM inventory WHERE total_available = \'0\' OFFSET 0 LIMIT 5');

// Test 4: Different numeric value
console.log('\n4. Different numeric value test:');
const differentNumericParams = {
  _filter: { column: "total_available", op: ">", value: "0" },
  _distinct: false,
  _range_from: 0,
  _range_to: 5
};
console.log('Parameters:', JSON.stringify(differentNumericParams, null, 2));
console.log('Expected SQL: SELECT * FROM inventory WHERE total_available > \'0\' OFFSET 0 LIMIT 5');

console.log('\n🔍 Debugging Instructions:');
console.log('1. Open browser console');
console.log('2. Navigate to /dashboard/inventory');
console.log('3. Click "Out-of-Stock Items" tile');
console.log('4. Look for "get_inventory_rows will execute:" message');
console.log('5. Check if the SQL looks correct');
console.log('6. If SQL looks wrong, the issue is in the RPC function');
console.log('7. If SQL looks correct, the issue is elsewhere');

console.log('\n💡 Potential Solutions:');
console.log('1. If column name is wrong, check inventory table schema');
console.log('2. If SQL is malformed, fix the RPC function');
console.log('3. If SQL is correct but fails, check data types');
console.log('4. If all else fails, use a different approach (API calls)');


