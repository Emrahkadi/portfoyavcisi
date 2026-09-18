// Dashboard - Sabah raporu
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScoreBar } from '@/components/ScoreBar';
import { TemperatureBadge } from '@/components/TemperatureBadge';
import { formatCurrency, formatNumber, timeAgo } from '@/lib/utils';
import { TrendingUp, Users, Flame, Home, AlertCircle, Plus } from 'lucide-react';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

async function getDashboardData(organizationId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayListings, highPotential, hotLeads, stats] = await Promise.all([
    prisma.listing.findMany({
      where: { organizationId, createdAt: { gte: today } },
    }),
    prisma.listing.findMany({
      where: { organizationId, aiScore: { gte: 70 } },
      include: { lead: true, districtRef: true },
      orderBy: { aiScore: 'desc' },
      take: 10,
    }),
    prisma.lead.findMany({
      where: {
        organizationId,
        temperature: { in: ['HOT', 'URGENT'] },
        status: { notIn: ['OPT_OUT', 'ARCHIVED', 'LOST'] },
      },
      include: { listing: true },
      orderBy: { score: 'desc' },
      take: 10,
    }),
    {
      totalListings: await prisma.listing.count({ where: { organizationId } }),
      totalLeads: await prisma.lead.count({ where: { organizationId } }),
      hotLeads: await prisma.lead.count({
        where: { organizationId, temperature: { in: ['HOT', 'URGENT'] } },
      }),
      wonLeads: await prisma.lead.count({
        where: { organizationId, status: 'WON' },
      }),
    },
  ]);

  return {
    today: {
      total: todayListings.length,
      owner: todayListings.filter((l) => l.isOwner).length,
      agent: todayListings.filter((l) => !l.isOwner).length,
      highPotential: highPotential.length,
    },
    highPotential,
    hotLeads,
    stats,
  };
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const data = await getDashboardData(user.organizationId || '');
  const isEmpty = data.stats.totalListings === 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sabah Raporu</h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link
          href="/listings/new"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Yeni İlan Ekle
        </Link>
      </div>

      {/* Empty State */}
      {isEmpty && (
        <Card className="border-dashed border-2 bg-slate-50">
          <CardContent className="text-center py-12">
            <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Hoş geldiniz!</h3>
            <p className="text-muted-foreground mb-4">
              Henüz hiç ilanınız yok. İlk ilanınızı ekleyerek başlayın.
            </p>
            <div className="flex gap-2 justify-center">
              <Link
                href="/listings/new"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
              >
                Manuel İlan Ekle
              </Link>
              <a
                href="https://www.sahibinden.com"
                target="_blank"
                rel="noopener noreferrer"
                className="border px-4 py-2 rounded-md hover:bg-slate-100"
              >
                Sahibinden'de Ara
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bugün Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Bugün Yeni İlan</CardDescription>
            <CardTitle className="text-3xl">{data.today.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>👤 Sahibinden: {data.today.owner}</div>
              <div>🏢 Emlakçı: {data.today.agent}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>AI Yüksek Potansiyel</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Flame className="h-6 w-6 text-orange-500" />
              {data.today.highPotential}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Skor ≥ 70 olan ilanlar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Sıcak Leadler</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Users className="h-6 w-6 text-green-500" />
              {data.stats.hotLeads}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Acil + Sıcak</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Kazanılan Portföy</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-blue-500" />
              {data.stats.wonLeads}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Toplam WON</p>
          </CardContent>
        </Card>
      </div>

      {/* Yüksek Potansiyelli İlanlar */}
      {!isEmpty && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Yüksek Potansiyelli İlanlar
            </CardTitle>
            <CardDescription>AI tarafından önerilen, hemen iletişime geçilecek ilanlar</CardDescription>
          </CardHeader>
          <CardContent>
            {data.highPotential.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Henüz yüksek potansiyelli ilan yok. AI skorları hesaplandıkça burada görünecek.
              </p>
            ) : (
              <div className="space-y-3">
                {data.highPotential.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/listings/${listing.id}`}
                    className="block p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{listing.title}</h3>
                          {listing.isOwner ? (
                            <Badge variant="outline">Sahibinden</Badge>
                          ) : (
                            <Badge variant="secondary">Emlakçı</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {listing.rooms} • {listing.sizeSqm} m² • {formatCurrency(listing.price)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {listing.district}/{listing.neighborhood} • {listing.daysOnMarket} gündür yayında
                        </div>
                      </div>
                      <div className="w-32">
                        <ScoreBar score={listing.aiScore || 0} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sıcak Leadler */}
      {!isEmpty && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-500" />
              Sıcak Leadler — Hemen İletişim
            </CardTitle>
            <CardDescription>Bu lead'lere öncelik ver</CardDescription>
          </CardHeader>
          <CardContent>
            {data.hotLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Henüz sıcak lead yok.
              </p>
            ) : (
              <div className="space-y-3">
                {data.hotLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="block p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{lead.contactName || 'İsimsiz'}</h3>
                          <TemperatureBadge temperature={lead.temperature} />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {lead.listing.title} • {formatCurrency(lead.listing.price)}
                        </div>
                        {lead.aiNextAction && (
                          <div className="text-xs text-blue-600 mt-1">
                            💡 {lead.aiNextAction}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
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
      )}
    </div>
  );
}