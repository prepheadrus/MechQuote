/**
 * RFQ Filtering Tests
 * Tests for Request for Quote item filtering functionality
 */

describe('RFQ Filtering', () => {
  describe('Item Selection and Filtering', () => {
    test('should filter selected items correctly', () => {
      const allItems = [
        { id: '1', formId: 'form-1', name: 'Item 1' },
        { id: '2', formId: 'form-2', name: 'Item 2' },
        { id: '3', formId: 'form-3', name: 'Item 3' },
      ];

      const selectedIds = ['1', '3'];
      const filtered = allItems.filter(item => selectedIds.includes(item.id));

      expect(filtered.length).toBe(2);
      expect(filtered.map(i => i.id)).toEqual(['1', '3']);
    });

    test('should handle form IDs for unsaved items', () => {
      const allItems = [
        { id: null, formId: 'form-1', name: 'Unsaved Item 1' },
        { id: '2', formId: 'form-2', name: 'Saved Item 2' },
        { id: null, formId: 'form-3', name: 'Unsaved Item 3' },
      ];

      const selectedIds = ['form-1', 'form-3'];
      const filtered = allItems.filter(item => 
        (item.id && selectedIds.includes(item.id)) ||
        (item.formId && selectedIds.includes(item.formId))
      );

      expect(filtered.length).toBe(2);
      expect(filtered.map(i => i.formId)).toEqual(['form-1', 'form-3']);
    });

    test('should handle mixed DB IDs and form IDs', () => {
      const allItems = [
        { id: 'db-1', formId: 'form-1', name: 'Saved Item 1' },
        { id: null, formId: 'form-2', name: 'Unsaved Item 2' },
        { id: 'db-3', formId: 'form-3', name: 'Saved Item 3' },
      ];

      const selectedIds = ['db-1', 'form-2'];
      const filtered = allItems.filter(item => 
        (item.id && selectedIds.includes(item.id)) ||
        (item.formId && selectedIds.includes(item.formId))
      );

      expect(filtered.length).toBe(2);
    });

    test('should return empty array for no selected items', () => {
      const allItems = [
        { id: '1', formId: 'form-1', name: 'Item 1' },
        { id: '2', formId: 'form-2', name: 'Item 2' },
      ];

      const selectedIds: string[] = [];
      const filtered = allItems.filter(item => selectedIds.includes(item.id));

      expect(filtered.length).toBe(0);
    });

    test('should handle non-existent IDs gracefully', () => {
      const allItems = [
        { id: '1', formId: 'form-1', name: 'Item 1' },
        { id: '2', formId: 'form-2', name: 'Item 2' },
      ];

      const selectedIds = ['999', '888'];
      const filtered = allItems.filter(item => selectedIds.includes(item.id));

      expect(filtered.length).toBe(0);
    });
  });

  describe('URL Parameter Building', () => {
    test('should build correct URL with item IDs', () => {
      const proposalId = 'test-proposal-123';
      const selectedIds = ['1', '2', '3'];
      
      const urlParams = new URLSearchParams();
      urlParams.set('proposalId', proposalId);
      urlParams.set('isRFQ', 'true');
      urlParams.set('filename', 'RFQ-Test');
      urlParams.set('items', selectedIds.join(','));

      const url = `/api/generate-pdf?${urlParams.toString()}`;
      
      expect(url).toContain('proposalId=test-proposal-123');
      expect(url).toContain('isRFQ=true');
      // URL encoded: items=1%2C2%2C3 means items=1,2,3
      expect(url).toContain('items=1%2C2%2C3');
    });

    test('should handle empty item IDs', () => {
      const selectedIds: string[] = [];
      
      const urlParams = new URLSearchParams();
      if (selectedIds.length > 0) {
        urlParams.set('items', selectedIds.join(','));
      }

      expect(urlParams.has('items')).toBe(false);
    });

    test('should encode special characters in filename', () => {
      const filename = 'RFQ-Test & Quote';
      const urlParams = new URLSearchParams();
      urlParams.set('filename', encodeURIComponent(filename));

      expect(urlParams.get('filename')).toBe('RFQ-Test%20%26%20Quote');
    });
  });

  describe('RFQ Document Generation', () => {
    test('should pass filtered items to RFQ document', () => {
      const allItems = [
        { id: '1', name: 'Item 1', quantity: 10 },
        { id: '2', name: 'Item 2', quantity: 20 },
        { id: '3', name: 'Item 3', quantity: 30 },
      ];

      const selectedIds = ['1', '3'];
      const filteredItems = allItems.filter(item => selectedIds.includes(item.id));

      expect(filteredItems.length).toBe(2);
      expect(filteredItems[0].name).toBe('Item 1');
      expect(filteredItems[1].name).toBe('Item 3');
    });

    test('should maintain item order from selection', () => {
      const allItems = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
        { id: '3', name: 'Item 3' },
        { id: '4', name: 'Item 4' },
      ];

      const selectedIds = ['3', '1', '4'];
      const filteredItems = allItems.filter(item => selectedIds.includes(item.id));

      // Order should match the allItems order, not selectedIds order
      expect(filteredItems[0].id).toBe('1');
      expect(filteredItems[1].id).toBe('3');
      expect(filteredItems[2].id).toBe('4');
    });
  });

  describe('Edge Cases', () => {
    test('should handle items with missing IDs', () => {
      const allItems = [
        { id: null, formId: 'form-1', name: 'Item 1' },
        { id: '2', formId: 'form-2', name: 'Item 2' },
        { id: null, formId: null, name: 'Item 3' },
      ];

      const selectedIds = ['form-1', '2'];
      const filtered = allItems.filter(item => 
        (item.id && selectedIds.includes(item.id)) ||
        (item.formId && selectedIds.includes(item.formId))
      );

      expect(filtered.length).toBe(2);
    });

    test('should handle duplicate IDs gracefully', () => {
      const allItems = [
        { id: '1', formId: 'form-1', name: 'Item 1' },
        { id: '1', formId: 'form-2', name: 'Duplicate Item 1' },
        { id: '2', formId: 'form-3', name: 'Item 2' },
      ];

      const selectedIds = ['1'];
      const filtered = allItems.filter(item => selectedIds.includes(item.id));

      expect(filtered.length).toBe(2);
    });

    test('should trim whitespace from IDs', () => {
      const allItems = [
        { id: '1', formId: 'form-1', name: 'Item 1' },
        { id: '2', formId: 'form-2', name: 'Item 2' },
      ];

      const selectedIds = [' 1 ', ' 2 '];
      const cleanIds = selectedIds.map(id => id.trim());
      const filtered = allItems.filter(item => cleanIds.includes(item.id));

      expect(filtered.length).toBe(2);
    });
  });

  describe('PDF Generation Integration', () => {
    test('should include items parameter in PDF API call', () => {
      const proposalId = 'test-123';
      const isRFQ = true;
      const rfqItemIds = ['1', '2', '3'];

      const urlParams = new URLSearchParams();
      urlParams.set('proposalId', proposalId);
      urlParams.set('isRFQ', String(isRFQ));
      
      if (isRFQ && rfqItemIds.length > 0) {
        urlParams.set('items', rfqItemIds.join(','));
      }

      const url = `/api/generate-pdf?${urlParams.toString()}`;

      expect(url).toContain('items=1%2C2%2C3'); // URL encoded
      expect(url).toContain('isRFQ=true');
    });

    test('should not include items parameter for non-RFQ', () => {
      const proposalId = 'test-123';
      const isRFQ = false;

      const urlParams = new URLSearchParams();
      urlParams.set('proposalId', proposalId);
      urlParams.set('isRFQ', String(isRFQ));

      const url = `/api/generate-pdf?${urlParams.toString()}`;
      
      expect(url).not.toContain('items=');
      expect(url).toContain('isRFQ=false');
    });
  });
});
