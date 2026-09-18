// Listing detay sayfası
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScoreBar } from '@/components/ScoreBar';
import { TemperatureBadge } from '@/components/TemperatureBadge';
import { formatCurrency, formatNumber, timeAgo } from '@/lib/utils';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { EvaluateButton } from './EvaluateButton';
import { GenerateMessageButton } from './GenerateMessageButton';
import { ListingActions } from './ListingActions';

export default async function ListingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: {
      lead: {
        include: {
          messages: { orderBy: { createdAt: 'desc' }, take: 10 },
          appointments: { orderBy: { scheduledAt: 'desc' }, take: 5 },
        },
      },
      districtRef: true,
    },
  });

  if (!listing || listing.organizationId !== user.organizationId) {
    notFound();
  }

  const analysis = listing.aiAnalysis as any;
  const comparable = analysis?.comparable;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/listings" className="text-sm text-muted-foreground hover:underline">
          ← İlanlara dön
        </Link>
        <ListingActions listingId={listing.id} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sol: İlan Detayları */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{listing.title}</CardTitle>
                  <CardDescription className="mt-2">
                    📍 {listing.city}/{listing.district}/{listing.neighborhood}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {listing.isOwner ? (
                    <Badge variant="outline">Sahibinden</Badge>
                  ) : (
                    <Badge variant="secondary">Emlakçı</Badge>
                  )}
                  <Badge variant="outline">{listing.source}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Fiyat</div>
                  <div className="text-lg font-bold">{formatCurrency(listing.price)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">m² Fiyatı</div>
                  <div className="text-lg font-bold">{formatCurrency(listing.pricePerSqm)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Alan</div>
                  <div className="text-lg font-bold">{listing.sizeSqm} m²</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Oda</div>
                  <div className="text-lg font-bold">{listing.rooms || '-'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <div className="text-xs text-muted-foreground">Piyasa Süresi</div>
                  <div className="font-medium">{listing.daysOnMarket} gün</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Görüntülenme</div>
                  <div className="font-medium">{formatNumber(listing.viewCount)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Kat</div>
                  <div className="font-medium">{listing.floor ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Bina Yaşı</div>
                  <div className="font-medium">{listing.buildingAge ?? '-'}</div>
                </div>
              </div>

              {listing.description && (
                <div className="pt-4 border-t">
                  <div className="text-xs text-muted-foreground mb-1">Açıklama</div>
                  <p className="text-sm">{listing.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Analiz */}
          <Card>
            <CardHeader>
              <CardTitle>🤖 AI Değerlendirmesi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Portföy Potansiyeli</span>
                  <span className="text-sm text-muted-foreground">{Math.round(listing.aiScore || 0)}/100</span>
                </div>
                <ScoreBar score={listing.aiScore || 0} />
              </div>

              {listing.aiReasons && listing.aiReasons.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Neden?</div>
                  <ul className="space-y-1">
                    {listing.aiReasons.map((reason, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-green-500">✓</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis?.nextAction && (
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="text-sm font-medium text-blue-900">📋 Öneri</div>
                  <div className="text-sm text-blue-800">{analysis.nextAction}</div>
                </div>
              )}

              <EvaluateButton listingId={listing.id} />
            </CardContent>
          </Card>

          {/* Emsal Karşılaştırma */}
          {comparable && (
            <Card>
              <CardHeader>
                <CardTitle>📊 Emsal Karşılaştırma</CardTitle>
                <CardDescription>
                  Bölge: {listing.district}/{listing.neighborhood} • {comparable.sampleSize} ilan üzerinden
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Bölge Medyanı</div>
                    <div className="font-bold">{formatCurrency(comparable.medianPricePerSqm)}/m²</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Bu İlan</div>
                    <div className="font-bold">{formatCurrency(comparable.pricePerSqm)}/m²</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Fark</div>
                    <div className={`font-bold ${comparable.diffFromMedian < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {comparable.diffFromMedian > 0 ? '+' : ''}{comparable.diffFromMedian.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="text-sm bg-slate-50 p-3 rounded-md">
                  {comparable.recommendation}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sağ: Lead & Aksiyonlar */}
        <div className="space-y-6">
          {listing.lead && (
            <Card>
              <CardHeader>
                <CardTitle>Lead Bilgisi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sıcaklık</span>
                  <TemperatureBadge temperature={listing.lead.temperature} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Skor</span>
                  <span className="font-bold">{listing.lead.score}/100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Durum</span>
                  <Badge variant="outline">{listing.lead.status}</Badge>
                </div>
                <div className="pt-3 border-t">
                  <div className="text-sm font-medium mb-1">İletişim</div>
                  <div className="text-sm">{listing.lead.contactName || 'İsimsiz'}</div>
                  <div className="text-sm text-muted-foreground">{listing.lead.contactPhone}</div>
                </div>
                <Link
                  href={`/leads/${listing.lead.id}`}
                  className="block w-full text-center bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90"
                >
                  Lead Detayına Git →
                </Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Mesaj Oluştur</CardTitle>
              <CardDescription>AI ile kişiselleştirilmiş ilk temas</CardDescription>
            </CardHeader>
            <CardContent>
              <GenerateMessageButton listingId={listing.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}