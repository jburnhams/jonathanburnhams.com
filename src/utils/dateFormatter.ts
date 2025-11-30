export function formatDate(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // Usually build timestamps are 24h, but user didn't specify. en-GB default is often 24h.
  }).format(date);
}
