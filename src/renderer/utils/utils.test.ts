import { describe, it, expect } from 'vitest';
import { cn, cx } from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('merges tailwind classes properly', () => {
      expect(cn('p-2', 'p-4')).toBe('p-4');
    });

    it('handles conditional classes', () => {
      expect(cn('bg-red-500', true && 'text-white', false && 'p-2')).toBe('bg-red-500 text-white');
    });

    it('handles array of classes', () => {
      expect(cn(['p-2', 'text-white'])).toBe('p-2 text-white');
    });
  });

  describe('cx', () => {
    it('joins classes without tailwind merge conflict resolution', () => {
      expect(cx('p-2', 'p-4')).toBe('p-2 p-4');
    });

    it('handles conditional classes', () => {
      expect(cx('bg-red-500', true && 'text-white', false && 'p-2')).toBe('bg-red-500 text-white');
    });
  });
});
