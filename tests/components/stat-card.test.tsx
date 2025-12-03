import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Mock Phosphor icons before importing the component
vi.mock('@phosphor-icons/react/dist/ssr', () => ({
  TrendUp: ({ className }: { className?: string }) =>
    React.createElement('span', { 'data-testid': 'trend-up', className }),
  TrendDown: ({ className }: { className?: string }) =>
    React.createElement('span', { 'data-testid': 'trend-down', className }),
}));

// Import component after mocks
import { StatCard } from '@/components/admin/stat-card';

describe('StatCard', () => {
  it('exports the StatCard component', () => {
    expect(StatCard).toBeDefined();
    expect(typeof StatCard).toBe('function');
  });

  it('renders without crashing', () => {
    const { container } = render(
      <StatCard title="Test" value={100} />
    );
    expect(container).toBeDefined();
  });

  it('accepts all expected props', () => {
    // Type check - this test passes if TypeScript compilation succeeds
    const props = {
      title: '총 직원',
      value: 100,
      description: '전월 대비',
      icon: React.createElement('span', null, 'icon'),
      trend: { value: 15, isPositive: true },
      className: 'custom-class',
    };

    expect(() => render(<StatCard {...props} />)).not.toThrow();
  });

  it('accepts string values', () => {
    expect(() =>
      render(<StatCard title="처리율" value="95.5%" />)
    ).not.toThrow();
  });

  it('accepts number values', () => {
    expect(() =>
      render(<StatCard title="문서 수" value={42} />)
    ).not.toThrow();
  });

  it('renders with positive trend', () => {
    expect(() =>
      render(
        <StatCard
          title="매출"
          value="₩1,000,000"
          trend={{ value: 15, isPositive: true }}
        />
      )
    ).not.toThrow();
  });

  it('renders with negative trend', () => {
    expect(() =>
      render(
        <StatCard
          title="비용"
          value="₩500,000"
          trend={{ value: 10, isPositive: false }}
        />
      )
    ).not.toThrow();
  });
});
