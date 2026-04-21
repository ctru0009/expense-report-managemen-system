const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatCurrency(amount: number) {
  return currencyFmt.format(amount);
}
