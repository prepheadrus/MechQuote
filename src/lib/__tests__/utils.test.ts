import { cn } from '../utils';

describe('utils', () => {
  describe('cn()', () => {
    it('should merge basic strings correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('should handle falsy values gracefully', () => {
      expect(cn('class1', null, undefined, false, 0, '', 'class2')).toBe('class1 class2');
    });

    it('should resolve tailwind class conflicts correctly', () => {
      // p-4 should override p-2
      expect(cn('p-2', 'p-4')).toBe('p-4');
      // bg-red-500 should override bg-blue-500
      expect(cn('bg-blue-500', 'bg-red-500')).toBe('bg-red-500');
    });

    it('should work with conditional class objects', () => {
      expect(
        cn('base-class', {
          'conditional-true': true,
          'conditional-false': false,
        })
      ).toBe('base-class conditional-true');
    });

    it('should work with arrays of classes', () => {
      expect(cn(['class1', 'class2'], 'class3')).toBe('class1 class2 class3');
    });

    it('should handle complex combinations', () => {
      expect(
        cn(
          'base-class p-2',
          false && 'not-applied',
          { 'bg-red-500': true, 'text-white': null },
          ['extra-class', 'p-4']
        )
      ).toBe('base-class bg-red-500 extra-class p-4');
    });
  });
});
