export function pretty(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
}

export function shortDate(value?: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function statusTone(status?: string) {
  if (status === 'DONE') return 'green';
  if (status === 'FAILED') return 'red';
  if (status === 'RUNNING') return 'blue';
  return 'muted';
}
