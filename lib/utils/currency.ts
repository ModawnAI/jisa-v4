const formatter = new Intl.NumberFormat('ko-KR');

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0원';
  return `${formatter.format(Math.round(value))}원`;
}

export function parseCurrency(value: string): number {
  if (!value) return 0;
  return parseInt(value.replace(/[^0-9-]/g, ''), 10) || 0;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  return formatter.format(value);
}
