// Utility fonksiyonları
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Türkçe sayı formatı
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('tr-TR').format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `%${value.toFixed(decimals)}`;
}

// Tarih formatı
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  const intervals: [number, string][] = [
    [31536000, 'yıl'],
    [2592000, 'ay'],
    [86400, 'gün'],
    [3600, 'saat'],
    [60, 'dakika'],
  ];
  for (const [secs, label] of intervals) {
    const interval = Math.floor(seconds / secs);
    if (interval >= 1) {
      return `${interval} ${label} önce`;
    }
  }
  return 'az önce';
}

// Telefon numarası normalizasyonu (Türkiye)
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('90') && cleaned.length === 12) {
    cleaned = '+' + cleaned;
  } else if (cleaned.startsWith('5') && cleaned.length === 10) {
    cleaned = '+90' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+90' + cleaned;
  }
  return cleaned;
}

// Güvenli maskeleme (KVKK)
export function maskPhone(phone: string): string {
  if (phone.length < 7) return phone;
  return phone.slice(0, 4) + '***' + phone.slice(-3);
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const maskedUser = user.slice(0, 2) + '***';
  return `${maskedUser}@${domain}`;
}