import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn utility', () => {
  it('merges class names correctly', () => {
    const result = cn('px-4', 'py-2');
    expect(result).toBe('px-4 py-2');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toBe('base-class active-class');
  });

  it('removes falsy values', () => {
    const result = cn('base', false, null, undefined, 'other');
    expect(result).toBe('base other');
  });

  it('merges Tailwind classes correctly', () => {
    // tailwind-merge should dedupe conflicting classes
    const result = cn('px-4', 'px-8');
    expect(result).toBe('px-8');
  });

  it('handles arrays of classes', () => {
    const result = cn(['px-4', 'py-2']);
    expect(result).toBe('px-4 py-2');
  });

  it('handles objects with conditional values', () => {
    const result = cn({
      'base-class': true,
      'active-class': true,
      'disabled-class': false,
    });
    expect(result).toBe('base-class active-class');
  });

  it('handles empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles complex nested conditions', () => {
    const variant: string = 'primary';
    const size: string = 'lg';
    const result = cn(
      'base',
      variant === 'primary' && 'bg-primary',
      variant === 'secondary' && 'bg-secondary',
      size === 'lg' ? 'text-lg' : 'text-sm'
    );
    expect(result).toBe('base bg-primary text-lg');
  });
});
