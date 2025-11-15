import { Page, expect } from '@playwright/test';

export interface TallyCardFormData {
  tally_card_number: string;
  warehouse_id: string;
  item_number: string;
  note?: string;
  is_active?: boolean;
}

export interface StockAdjustmentLocation {
  location: string;
  qty: number;
  reason: string;
}

export interface StockAdjustmentFormData {
  tally_card_number: string;
  locations: StockAdjustmentLocation[];
  note?: string;
}

/**
 * Helper to interact with SearchableSelect component
 */
async function selectSearchableOption(
  page: Page,
  fieldLabel: string,
  searchValue: string,
  searchPlaceholder?: string
): Promise<void> {
  // Find the label for the field
  const label = page.getByLabel(new RegExp(fieldLabel, 'i')).first();
  await label.waitFor({ state: 'visible', timeout: 5000 });
  
  // Find the FormItem container (parent of label) and then the button inside it
  // The SearchableSelect renders as a button, so find button near the label
  const fieldContainer = label.locator('..').first();
  const selectButton = fieldContainer.locator('button[type="button"]').first();
  
  // Click to open dropdown
  await selectButton.click();
  await page.waitForTimeout(300);
  
  // Wait for search input to appear (it's inside the dropdown)
  // The dropdown has a search input with a placeholder
  const searchInputSelector = searchPlaceholder 
    ? `input[placeholder*="${searchPlaceholder}" i]`
    : 'input[type="text"]';
  const searchInput = page.locator(searchInputSelector).first();
  await searchInput.waitFor({ state: 'visible', timeout: 5000 });
  
  // Clear and type to search
  await searchInput.clear();
  await searchInput.fill(searchValue);
  await page.waitForTimeout(500); // Wait for filtering
  
  // Find and click the matching option button
  // Options are rendered as buttons inside the dropdown (which has absolute positioning)
  // Look for buttons that are visible and contain the search value
  // The dropdown container has class "absolute" and contains buttons
  const dropdownContainer = page.locator('div.absolute').filter({ 
    has: searchInput 
  }).first();
  
  // Find option button within the dropdown that matches the search value
  const optionButton = dropdownContainer.locator('button[type="button"]').filter({ 
    hasText: new RegExp(searchValue, 'i') 
  }).first();
  
  await optionButton.waitFor({ state: 'visible', timeout: 5000 });
  await optionButton.click();
  
  // Wait for dropdown to close and form to update
  await page.waitForTimeout(500);
}

/**
 * Fill tally card form
 * Works with SearchableSelect components for warehouse and item number
 */
export async function fillTallyCardForm(page: Page, data: TallyCardFormData): Promise<void> {
  // Tally Card Number
  await page.getByLabel(/tally card number/i).fill(data.tally_card_number);

  // Warehouse (SearchableSelect) - can search by code or name
  await selectSearchableOption(page, 'warehouse', data.warehouse_id, 'warehouse');

  // Item Number (SearchableSelect) - can search by item number or description
  await selectSearchableOption(page, 'item number', data.item_number, 'item number');

  // Note (optional)
  if (data.note) {
    await page.getByLabel(/note/i).fill(data.note);
  }

  // Active checkbox (optional)
  if (data.is_active !== undefined) {
    const checkbox = page.getByLabel(/active/i);
    const isChecked = await checkbox.isChecked();
    if (data.is_active !== isChecked) {
      await checkbox.click();
    }
  }
}

/**
 * Fill stock adjustment form with locations
 */
export async function fillStockAdjustmentForm(
  page: Page,
  data: StockAdjustmentFormData
): Promise<void> {
  // Tally Card Number (may be read-only or pre-filled)
  const tallyCardInput = page.getByLabel(/tally card/i).first();
  if (await tallyCardInput.isEditable().catch(() => false)) {
    await tallyCardInput.fill(data.tally_card_number);
  } else {
    // If read-only, verify it's pre-filled with the expected value
    const currentValue = await tallyCardInput.inputValue().catch(() => '');
    if (currentValue && currentValue !== data.tally_card_number) {
      console.warn(`Tally card number is read-only and has value "${currentValue}", expected "${data.tally_card_number}"`);
    }
  }

  // Select reason code (required field) - may be SearchableSelect or regular select
  const reasonLabel = page.getByLabel(/reason/i).first();
  await reasonLabel.waitFor({ state: 'visible', timeout: 5000 });
  
  // Try SearchableSelect first (button), then fall back to regular select
  const reasonContainer = reasonLabel.locator('..').first();
  const reasonButton = reasonContainer.locator('button[type="button"]').first();
  const isSearchableSelect = await reasonButton.isVisible().catch(() => false);
  
  if (isSearchableSelect) {
    // Use SearchableSelect helper
    await selectSearchableOption(page, 'reason', data.locations[0]?.reason || 'TRANSFER', 'reason');
  } else {
    // Regular select
    const reasonSelect = reasonLabel.locator('..').locator('select').first();
    await reasonSelect.click();
    await page.getByRole('option', { name: new RegExp(data.locations[0]?.reason || 'TRANSFER', 'i') }).click();
  }

  // Add locations using AddLocationSection
  for (const location of data.locations) {
    await addStockAdjustmentLocation(page, location.location, location.qty, location.reason);
  }

  // Note (optional)
  if (data.note) {
    await page.getByLabel(/note/i).fill(data.note);
  }
}

/**
 * Add a location to multi-location stock adjustment form
 */
export async function addStockAdjustmentLocation(
  page: Page,
  location: string,
  qty: number,
  reason: string
): Promise<void> {
  // Ensure "Add Location" section is expanded
  const addLocationSection = page.locator('h3').filter({ hasText: /add location/i }).first();
  if (await addLocationSection.isVisible().catch(() => false)) {
    // Check if section is collapsed (has chevron down)
    const chevronButton = addLocationSection.locator('..').locator('button').filter({ 
      has: page.locator('svg') 
    }).first();
    const chevronIcon = chevronButton.locator('svg').first();
    if (await chevronIcon.isVisible().catch(() => false)) {
      await chevronButton.click();
      await page.waitForTimeout(300);
    }
  }

  // Fill location in SearchableSelect - find the location field in the Add Location section
  const locationLabel = page.getByLabel(/location/i).filter({ 
    hasNot: page.locator('input[readonly]') // Exclude read-only location fields in the table
  }).first();
  await locationLabel.waitFor({ state: 'visible', timeout: 5000 });
  
  // Find the SearchableSelect button
  const locationContainer = locationLabel.locator('..').first();
  const locationButton = locationContainer.locator('button[type="button"]').first();
  await locationButton.click();
  await page.waitForTimeout(300);
  
  // Wait for search input and type location
  const locationSearchInput = page.locator('input[placeholder*="location" i], input[placeholder*="Search location" i]').first();
  await locationSearchInput.waitFor({ state: 'visible', timeout: 5000 });
  await locationSearchInput.clear();
  await locationSearchInput.fill(location);
  await page.waitForTimeout(500); // Wait for filtering
  
  // Click the matching option
  const locationDropdown = page.locator('div.absolute').filter({ 
    has: locationSearchInput 
  }).first();
  const locationOption = locationDropdown.locator('button[type="button"]').filter({ 
    hasText: new RegExp(location, 'i') 
  }).first();
  await locationOption.waitFor({ state: 'visible', timeout: 5000 });
  await locationOption.click();
  await page.waitForTimeout(300);

  // Fill quantity
  const qtyInput = page.locator('input[type="number"][placeholder*="quantity" i], input[type="number"][placeholder*="-4" i]').first();
  await qtyInput.waitFor({ state: 'visible', timeout: 5000 });
  await qtyInput.fill(qty.toString());

  // Select reason in SearchableSelect (if it's a SearchableSelect)
  const reasonLabel = page.getByLabel(/reason/i).filter({ 
    hasNot: page.locator('select') // Exclude regular selects in the table
  }).first();
  
  if (await reasonLabel.isVisible().catch(() => false)) {
    const reasonContainer = reasonLabel.locator('..').first();
    const reasonButton = reasonContainer.locator('button[type="button"]').first();
    const isSearchableSelect = await reasonButton.isVisible().catch(() => false);
    
    if (isSearchableSelect) {
      await reasonButton.click();
      await page.waitForTimeout(300);
      const reasonSearchInput = page.locator('input[placeholder*="reason" i], input[placeholder*="Search" i]').first();
      await reasonSearchInput.waitFor({ state: 'visible', timeout: 5000 });
      await reasonSearchInput.clear();
      await reasonSearchInput.fill(reason);
      await page.waitForTimeout(500);
      const reasonDropdown = page.locator('div.absolute').filter({ 
        has: reasonSearchInput 
      }).first();
      const reasonOption = reasonDropdown.locator('button[type="button"]').filter({ 
        hasText: new RegExp(reason, 'i') 
      }).first();
      await reasonOption.waitFor({ state: 'visible', timeout: 5000 });
      await reasonOption.click();
      await page.waitForTimeout(300);
    } else {
      // Regular select
      const reasonSelect = reasonContainer.locator('select').first();
      await reasonSelect.click();
      await page.getByRole('option', { name: new RegExp(reason, 'i') }).click();
    }
  }

  // Click "Add Location" button
  const addButton = page.getByRole('button', { name: /add location/i }).first();
  await addButton.waitFor({ state: 'visible', timeout: 5000 });
  await addButton.click();

  // Wait for location to appear in table
  await page.waitForTimeout(1000);
}

/**
 * Edit an existing location in stock adjustment form
 * Uses the inline adjustment feature: click edit, select adjustment type, enter amount
 */
export async function editStockAdjustmentLocation(
  page: Page,
  locationName: string,
  adjustmentType: 'increase' | 'decrease' | 'set',
  amount: number,
  reason?: string
): Promise<void> {
  // Find the row with this location
  const locationRow = page.locator('tr').filter({ hasText: locationName }).first();
  
  // Click edit button (Edit2 icon)
  const editButton = locationRow.locator('button').filter({ 
    has: page.locator('svg') 
  }).first();
  await editButton.click();

  // Wait for adjustment UI to appear
  await page.waitForTimeout(300);

  // Select adjustment type
  const typeSelect = page.locator('select').filter({ hasText: /adjustment type|increase|decrease|set/i }).first();
  await typeSelect.click();
  await page.getByRole('option', { name: new RegExp(adjustmentType === 'increase' ? 'increase' : adjustmentType === 'decrease' ? 'decrease' : 'set exact', 'i') }).click();

  // Enter amount
  const amountInput = page.locator('input[type="number"][placeholder*="amount" i], input[type="number"][id*="adjust-amount"]').first();
  await amountInput.fill(amount.toString());

  // Update reason if provided (using the reason select in the row)
  if (reason) {
    const reasonSelect = locationRow.locator('select').filter({ hasText: /reason/i }).first();
    await reasonSelect.click();
    await page.getByRole('option', { name: new RegExp(reason, 'i') }).click();
  }

  // Click save (Check icon)
  const saveButton = page.locator('button').filter({ 
    has: page.locator('svg') 
  }).filter({ hasText: /save|check/i }).first();
  await saveButton.click();

  // Wait for adjustment to complete
  await page.waitForTimeout(500);
}

/**
 * Delete a location from stock adjustment form
 */
export async function deleteStockAdjustmentLocation(page: Page, locationName: string): Promise<void> {
  // Find the row with this location
  const locationRow = page.locator('tr').filter({ hasText: locationName }).first();
  
  // Find delete button (Trash2 icon) in this row
  const deleteButton = locationRow.locator('button[title*="remove" i], button').filter({ 
    has: page.locator('svg') 
  }).last(); // Last button is usually delete

  await deleteButton.click();
  await page.waitForTimeout(300);
}

/**
 * Submit form and wait for redirect
 */
export async function submitForm(page: Page, expectedRedirect?: string): Promise<void> {
  // Find submit button
  const submitButton = page.getByRole('button', { name: /save|submit|create|update/i }).filter({ 
    hasText: /save|submit|create|update/i 
  }).first();

  await submitButton.click();

  // Wait for navigation
  if (expectedRedirect) {
    await page.waitForURL(new RegExp(expectedRedirect), { timeout: 10000 });
  } else {
    // Wait for any navigation
    await page.waitForLoadState('networkidle');
  }
}

