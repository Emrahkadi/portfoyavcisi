// Lead detay sayfası
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TemperatureBadge } from '@/components/TemperatureBadge';
import { formatCurrency, formatDateTime, maskPhone } from '@/lib/utils';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SendMessageForm } from './SendMessageForm';
import { LeadActions } from './LeadActions';

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      listing: true,
      messages: { orderBy: { createdAt: 'asc' } },
      appointments: { orderBy: { scheduledAt: 'desc' } },
      notes: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!lead || lead.organizationId !== user.organizationId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/leads" className="text-sm text-muted-foreground hover:underline">
          ← Leadlere dön
        </Link>
        <LeadActions leadId={lead.id} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sol: Mesajlaşma */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mesaj Geçmişi</CardTitle>
              <CardDescription>
                {lead.messages.length} mesaj • WhatsApp üzerinden
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lead.messages.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Henüz mesaj yok.</p>
              ) : (
                <div className="space-y-3">
                  {lead.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg max-w-[80%] ${
                        msg.direction === 'OUTBOUND'
                          ? 'bg-blue-500 text-white ml-auto'
                          : 'bg-slate-100 mr-auto'
                      }`}
                    >
                      <div className="text-sm">{msg.content}</div>
                      <div className={`text-xs mt-1 ${msg.direction === 'OUTBOUND' ? 'text-blue-100' : 'text-slate-500'}`}>
                        {formatDateTime(msg.createdAt)}
                        {msg.aiCategory && (
                          <span className="ml-2">
                            • AI: {msg.aiCategory}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mesaj Gönder</CardTitle>
            </CardHeader>
            <CardContent>
              <SendMessageForm leadId={lead.id} />
            </CardContent>
          </Card>
        </div>

        {/* Sağ: Lead Bilgileri */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lead Özeti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sıcaklık</span>
                <TemperatureBadge temperature={lead.temperature} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Skor</span>
                <span className="font-bold text-lg">{lead.score}/100</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Durum</span>
                <Badge variant="outline">{lead.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Öncelik</span>
                <span>{'⭐'.repeat(lead.priority)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>İletişim</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <div className="text-xs text-muted-foreground">İsim</div>
                <div className="font-medium">{lead.contactName || 'Belirtilmemiş'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Telefon</div>
                <div className="font-medium">{maskPhone(lead.contactPhone)}</div>
              </div>
              {lead.contactEmail && (
                <div>
                  <div className="text-xs text-muted-foreground">E-posta</div>
                  <div className="font-medium">{lead.contactEmail}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>İlan</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/listings/${lead.listing.id}`} className="block hover:underline">
                <div className="font-medium">{lead.listing.title}</div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(lead.listing.price)} • {lead.listing.sizeSqm} m²
                </div>
              </Link>
            </CardContent>
          </Card>

          {lead.aiSummary && (
            <Card>
              <CardHeader>
                <CardTitle>🤖 AI Özeti</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{lead.aiSummary}</p>
                {lead.aiNextAction && (
                  <div className="mt-3 bg-blue-50 p-3 rounded-md">
                    <div className="text-xs font-medium text-blue-900">Öneri</div>
                    <div className="text-sm text-blue-800">{lead.aiNextAction}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}