export function formatOrderTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    return `${diffInMinutes} min ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hours ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export function formatCurrency(amount: number | string): string {
  const numeric = typeof amount === 'string' ? Number(amount) : amount;
  const value = Number.isFinite(numeric) ? numeric : 0;
  const pretty = value.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `EGP ${pretty}`;
}

function formatDistance(distance: string): string {
  return distance;
}

function formatTime(time: string): string {
  return time;
}

function formatPhoneNumber(phone: string): string {
  // Basic phone number formatting
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
}
