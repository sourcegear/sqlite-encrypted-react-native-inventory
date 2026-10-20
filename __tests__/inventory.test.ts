import {validateInventoryItem} from '../src/inventory';
import {describe, expect, it} from '@jest/globals';

describe('inventory validation', () => {
  it('normalizes a valid inventory item', () => {
    expect(
      validateInventoryItem({
        sku: ' tool-42 ',
        name: ' Cordless drill ',
        quantity: 3,
        location: ' Van A ',
      }),
    ).toEqual({
      sku: 'TOOL-42',
      name: 'Cordless drill',
      quantity: 3,
      location: 'Van A',
    });
  });

  it('rejects fractional or negative quantities', () => {
    const item = {sku: 'A', name: 'Item', location: 'Shelf', quantity: -1};
    expect(() => validateInventoryItem(item)).toThrow('whole number');
    expect(() => validateInventoryItem({...item, quantity: 1.5})).toThrow(
      'whole number',
    );
  });
});
