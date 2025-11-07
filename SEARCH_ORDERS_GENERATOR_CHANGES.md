# Search Orders Resource Generator - Required Changes

## Summary

This document outlines the exact changes needed to generate a resource page for the `search_orders` table with correct field type inference.

---

## 1. Command to Run

After making the script changes below, run this command:

```bash
node scripts/generate-resource-page.js search-orders "Search Orders" "id,subject,address,town,postcode,created_at,processed,uprn,matched_address,property_number,property_name,sub_property,street,locality,address_list,from_email,order_id,folder_name,customer_id,customer_order_id,body_text,council,cleaned_subject,folder_path,order_email_sent,file_name,already_created,plan_base64,email1_sent,email2_sent,email3_sent,folder_moved"
```

---

## 2. Script Changes Required

**File:** `scripts/generate-resource-page.js`

**Lines to change:** 76-96

### Current Code (DELETE THIS):

```javascript
// Infer field type from field name
function inferFieldType(fieldName) {
  const lower = fieldName.toLowerCase();
  
  if (lower.includes('date') || lower.includes('time') || lower.includes('_at')) {
    return 'date';
  }
  if (lower.includes('email')) {
    return 'text';
  }
  if (lower.includes('status') || lower.includes('state')) {
    return 'status';
  }
  if (lower.includes('count') || lower.includes('amount') || lower.includes('price')) {
    return 'number';
  }
  if (lower.includes('is_') || lower.includes('has_') || lower.includes('active')) {
    return 'boolean';
  }
  
  return 'text';
}
```

### New Code (REPLACE WITH THIS):

```javascript
// Infer field type from field name
function inferFieldType(fieldName) {
  const lower = fieldName.toLowerCase();
  
  if (lower.includes('date') || lower.includes('time') || lower.includes('_at')) {
    return 'date';
  }
  // Check for boolean patterns BEFORE email check (to avoid treating email fields as boolean)
  if (lower.includes('is_') || lower.includes('has_') || lower.includes('active') || 
      lower === 'processed' || lower.endsWith('_sent') || lower.endsWith('_moved') || 
      lower.startsWith('already_')) {
    return 'boolean';
  }
  if (lower.includes('email')) {
    return 'text';
  }
  if (lower.includes('status') || lower.includes('state')) {
    return 'status';
  }
  if (lower.includes('count') || lower.includes('amount') || lower.includes('price')) {
    return 'number';
  }
  
  return 'text';
}
```

---

## 3. Field Type Mapping for search_orders

| Column Name | Database Data Type | Script Infers As (Before) | Will Infers As (After Change) |
|------------|-------------------|--------------------------|------------------------------|
| `id` | uuid | text | text ✓ |
| `subject` | text | text | text ✓ |
| `address` | text | text | text ✓ |
| `town` | text | text | text ✓ |
| `postcode` | text | text | text ✓ |
| `created_at` | timestamp with time zone | date | date ✓ |
| `processed` | boolean | text ❌ | boolean ✓ |
| `uprn` | text | text | text ✓ |
| `matched_address` | text | text | text ✓ |
| `property_number` | text | text | text ✓ |
| `property_name` | text | text | text ✓ |
| `sub_property` | text | text | text ✓ |
| `street` | text | text | text ✓ |
| `locality` | text | text | text ✓ |
| `address_list` | jsonb | text | text ✓ |
| `from_email` | text | text | text ✓ |
| `order_id` | text | text | text ✓ |
| `folder_name` | text | text | text ✓ |
| `customer_id` | uuid | text | text ✓ |
| `customer_order_id` | text | text | text ✓ |
| `body_text` | text | text | text ✓ |
| `council` | text | text | text ✓ |
| `cleaned_subject` | text | text | text ✓ |
| `folder_path` | text | text | text ✓ |
| `order_email_sent` | boolean | text ❌ | boolean ✓ |
| `file_name` | text | text | text ✓ |
| `already_created` | boolean | text ❌ | boolean ✓ |
| `plan_base64` | text | text | text ✓ |
| `email1_sent` | boolean | text ❌ | boolean ✓ |
| `email2_sent` | boolean | text ❌ | boolean ✓ |
| `email3_sent` | boolean | text ❌ | boolean ✓ |
| `folder_moved` | boolean | text ❌ | boolean ✓ |

---

## 4. What This Change Fixes

### Problem:
Without this change, **7 boolean fields** would be incorrectly inferred as `text`:
- `processed`
- `order_email_sent`
- `email1_sent`
- `email2_sent`
- `email3_sent`
- `already_created`
- `folder_moved`

### Solution:
The updated `inferFieldType` function adds four new boolean detection patterns:

1. **`lower === 'processed'`** → Catches the `processed` field
2. **`lower.endsWith('_sent')`** → Catches all `*_sent` fields:
   - `order_email_sent`
   - `email1_sent`
   - `email2_sent`
   - `email3_sent`
3. **`lower.endsWith('_moved')`** → Catches `folder_moved`
4. **`lower.startsWith('already_')`** → Catches `already_created`

### Important Note:
The boolean check is moved **before** the email check to ensure `from_email` remains correctly inferred as `text` rather than being misidentified as `boolean`.

---

## 5. Verification

After making the changes, verify that:

1. ✅ All 7 boolean fields are correctly identified
2. ✅ `created_at` is identified as `date`
3. ✅ `from_email` remains as `text` (not boolean)
4. ✅ All other text fields remain as `text`
5. ✅ The command runs successfully and generates the resource page

---

## Generated Files

After running the command, the script will create:

- `src/app/(main)/forms/search-orders/page.tsx`
- `src/app/(main)/forms/search-orders/search-orders.config.tsx`

The page will be available at: `/forms/search-orders`

---

## Database Schema Reference

### Primary Key:
- `id` (uuid, primary key, default: `gen_random_uuid()`)

### Boolean Fields:
- `processed` (boolean, NOT NULL, default: `false`)
- `order_email_sent` (boolean, nullable)
- `email1_sent` (boolean, nullable, default: `false`)
- `email2_sent` (boolean, nullable, default: `false`)
- `email3_sent` (boolean, nullable, default: `false`)
- `folder_moved` (boolean, nullable, default: `false`)
- `already_created` (boolean, nullable, default: `false`)

### Date/Time Fields:
- `created_at` (timestamp with time zone, NOT NULL, default: `now()`)

### UUID Fields:
- `id` (primary key)
- `customer_id` (nullable)

### JSONB Fields:
- `address_list` (jsonb, NOT NULL, default: `'[]'::jsonb`)

### Text Fields:
All other 22 fields are text type (some nullable, some not).

---

*Generated on: $(date)*













