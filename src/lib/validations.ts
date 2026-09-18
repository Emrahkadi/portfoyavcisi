// Zod validation şemaları
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
});

export const registerSchema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
  name: z.string().min(2, 'İsim gerekli'),
  organizationName: z.string().min(2, 'Organizasyon adı gerekli').optional(),
});

export const listingSchema = z.object({
  externalId: z.string(),
  source: z.enum(['SAHIBINDEN', 'HEPSIEMLAK', 'MANUAL', 'CSV_IMPORT', 'API_PARTNER', 'OTHER']),
  url: z.string().url().optional(),
  title: z.string().min(3),
  description: z.string().optional(),
  propertyType: z.enum(['APARTMENT', 'HOUSE', 'VILLA', 'OFFICE', 'LAND', 'COMMERCIAL', 'OTHER']),
  rooms: z.string().optional(),
  sizeSqm: z.number().positive(),
  price: z.number().positive(),
  city: z.string().min(2),
  district: z.string().min(2),
  neighborhood: z.string().optional(),
  isOwner: z.boolean().default(false),
  daysOnMarket: z.number().int().nonnegative().default(0),
  contactPhone: z.string().optional(),
  contactName: z.string().optional(),
});

export const messageSchema = z.object({
  leadId: z.string(),
  content: z.string().min(1).max(4096),
  channel: z.enum(['WHATSAPP', 'SMS', 'PHONE', 'EMAIL', 'IN_PERSON']).default('WHATSAPP'),
});

export const appointmentSchema = z.object({
  leadId: z.string(),
  scheduledAt: z.string().datetime(),
  durationMin: z.number().int().positive().default(30),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ListingInput = z.infer<typeof listingSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type AppointmentInput = z.infer<typeof appointmentSchema>;