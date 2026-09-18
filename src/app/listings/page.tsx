// Listings sayfası - Tüm ilanlar
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScoreBar } from '@/components/ScoreBar';
import { formatCurrency, timeAgo } from '@/lib/utils';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';

export default async function ListingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const listings = await prisma.listing.findMany({
    where: { organizationId: user.organizationId || '' },
    include: { lead: true, districtRef: true },
    orderBy: [{ aiScore: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">İlanlar</h1>
          <p className="text-muted-foreground">{listings.length} ilan listeleniyor</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tüm İlanlar</CardTitle>
          <CardDescription>AI skoru yüksekten düşüğe sıralı</CardDescription>
        </CardHeader>
        <CardContent>
          {listings.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Henüz ilan yok. CSV import veya manuel ekleme yapabilirsiniz.
            </p>
          ) : (
            <div className="space-y-2">
              {listings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="block p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold truncate">{listing.title}</h3>
                        {listing.isOwner ? (
                          <Badge variant="outline">Sahibinden</Badge>
                        ) : (
                          <Badge variant="secondary">Emlakçı</Badge>
                        )}
                        <Badge variant="outline">{listing.source}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {listing.rooms} • {listing.sizeSqm} m² • {formatCurrency(listing.price)} •{' '}
                        {formatCurrency(listing.pricePerSqm)}/m²
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        📍 {listing.district}/{listing.neighborhood} • ⏰ {listing.daysOnMarket} gün • 🕐 {timeAgo(listing.createdAt)}
                      </div>
                    </div>
                    <div className="w-32 flex-shrink-0">
                      <ScoreBar score={listing.aiScore || 0} />
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