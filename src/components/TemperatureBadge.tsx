// Temperature badge - Lead sıcaklığını görsel olarak göster
import { Badge } from '@/components/ui/badge';
import type { LeadTemp } from '@prisma/client';

const config: Record<LeadTemp, { label: string; emoji: string; variant: any }> = {
  URGENT: { label: 'Acil Lead', emoji: '🔥', variant: 'urgent' },
  HOT: { label: 'Sıcak', emoji: '🟢', variant: 'hot' },
  WARM: { label: 'Takip', emoji: '🟡', variant: 'warning' },
  COLD: { label: 'Kapalı', emoji: '❌', variant: 'secondary' },
};

export function TemperatureBadge({ temperature }: { temperature: LeadTemp }) {
  const c = config[temperature];
  return (
    <Badge variant={c.variant}>
      {c.emoji} {c.label}
    </Badge>
  );
}