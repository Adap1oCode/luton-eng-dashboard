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
 * Fill tally card form
 */
export async function fillTallyCardForm(page: Page, data: TallyCardFormData): Promise<void> {
  // Tally Card Number
  await page.getByLabel(/tally card number/i).fill(data.tally_card_number);

  // Warehouse (select dropdown)
  const warehouseSelect = page.getByLabel(/warehouse/i).or(
    page.locator('select, [role="combobox"]').filter({ hasText: /warehouse/i })
  ).first();
  await warehouseSelect.click();
  await page.getByRole('option', { name: new RegExp(data.warehouse_id, 'i') }).click();

  // Item Number (select dropdown)
  const itemSelect = page.getByLabel(/item number/i).or(
    page.locator('select, [role="combobox"]').filter({ hasText: /item number/i })
  ).first();
  await itemSelect.click();
  await page.getByRole('option', { name: data.item_number }).click();

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
  }

  // Select reason code (required field)
  const reasonSelect = page.getByLabel(/reason/i).first();
  await reasonSelect.click();
  await page.getByRole('option', { name: new RegExp(data.locations[0]?.reason || 'TRANSFER', 'i') }).click();

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

  // Fill location in SearchableSelect
  const locationSelect = page.locator('input[placeholder*="location" i], input[placeholder*="Select location" i]').first();
  await locationSelect.fill(location);
  await page.waitForTimeout(500);
  // Click the option that appears
  const locationOption = page.getByText(location, { exact: false }).first();
  await locationOption.click();

  // Fill quantity
  const qtyInput = page.locator('input[type="number"][placeholder*="quantity" i], input[type="number"][placeholder*="-4" i]').first();
  await qtyInput.fill(qty.toString());

  // Select reason in SearchableSelect
  const reasonSelect = page.locator('input[placeholder*="reason" i], input[placeholder*="Unspecified" i]').first();
  await reasonSelect.fill(reason);
  await page.waitForTimeout(500);
  // Click the option that appears
  const reasonOption = page.getByText(reason, { exact: false }).first();
  await reasonOption.click();

  // Click "Add Location" button
  const addButton = page.getByRole('button', { name: /add location/i }).first();
  await addButton.click();

  // Wait for location to appear in table
  await page.waitForTimeout(500);
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

