// Messages sayfası - Tüm mesajlaşmalar
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, maskPhone } from '@/lib/utils';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const messages = await prisma.message.findMany({
    where: {
      lead: { organizationId: user.organizationId || '' },
    },
    include: {
      lead: {
        include: {
          listing: { select: { title: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mesajlar</h1>
        <p className="text-muted-foreground">Son {messages.length} mesaj</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tüm Mesajlar</CardTitle>
          <CardDescription>WhatsApp üzerinden gelen/giden mesajlar</CardDescription>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Henüz mesaj yok.</p>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <Link
                  key={msg.id}
                  href={`/leads/${msg.lead.id}`}
                  className="block p-3 border rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {msg.lead.contactName || maskPhone(msg.lead.contactPhone)}
                        </span>
                        <Badge variant={msg.direction === 'OUTBOUND' ? 'default' : 'secondary'}>
                          {msg.direction === 'OUTBOUND' ? '↗️ Giden' : '↙️ Gelen'}
                        </Badge>
                        {msg.aiCategory && (
                          <Badge variant="outline" className="text-xs">
                            {msg.aiCategory}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">{msg.content}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {msg.lead.listing.title} • {formatDateTime(msg.createdAt)}
                      </div>
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