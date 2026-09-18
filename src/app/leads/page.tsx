// Leads sayfası
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TemperatureBadge } from '@/components/TemperatureBadge';
import { formatCurrency, timeAgo } from '@/lib/utils';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';

export default async function LeadsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const leads = await prisma.lead.findMany({
    where: { organizationId: user.organizationId || '' },
    include: {
      listing: true,
      _count: { select: { messages: true, appointments: true } },
    },
    orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leadler</h1>
        <p className="text-muted-foreground">{leads.length} lead</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tüm Leadler</CardTitle>
          <CardDescription>Skor yüksekten düşüğe</CardDescription>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Henüz lead yok.</p>
          ) : (
            <div className="space-y-2">
              {leads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="block p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold">{lead.contactName || 'İsimsiz'}</h3>
                        <TemperatureBadge temperature={lead.temperature} />
                        <Badge variant="outline">{lead.status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {lead.listing.title} • {formatCurrency(lead.listing.price)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        💬 {lead._count.messages} mesaj • 📅 {lead._count.appointments} randevu • 🕐 {timeAgo(lead.updatedAt)}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-bold">{lead.score}</div>
                      <div className="text-xs text-muted-foreground">skor</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}