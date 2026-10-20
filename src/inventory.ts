export type InventoryItem = {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  location: string;
  updatedAt: string;
};

export type NewInventoryItem = Pick<
  InventoryItem,
  'sku' | 'name' | 'quantity' | 'location'
>;

export function validateInventoryItem(
  item: NewInventoryItem,
): NewInventoryItem {
  const sku = item.sku.trim().toUpperCase();
  const name = item.name.trim();
  const location = item.location.trim();

  if (!sku || !name || !location) {
    throw new Error('Enter a SKU, item name, and storage location.');
  }
  if (!Number.isInteger(item.quantity) || item.quantity < 0) {
    throw new Error(
      'Starting quantity must be a whole number of zero or more.',
    );
  }
  return {...item, sku, name, location};
}
