// Landing page
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Brain, MessageSquare, Shield, TrendingUp, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}
      <header className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          Leadseak
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-2">
          Gayrimenkul Lead Avcısı & CRM Platformu
        </p>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Sahibinden'e bağımlı olmayan, modüler lead intelligence & CRM sistemi.
          Emsal motoru, AI değerlendirme, WhatsApp entegrasyonu — hepsi bir arada.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/register">Ücretsiz Dene</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Giriş Yap</Link>
          </Button>
        </div>
      </header>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Sistem Bileşenleri</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Building2 className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Pluggable Data Sources</CardTitle>
              <CardDescription>
                Manuel, CSV veya resmi API. Sahibinden'in ToS'una %100 uyumlu.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Emsal Motoru</CardTitle>
              <CardDescription>
                Bölge medyanı, fiyat karşılaştırma, fırsat tespiti.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Brain className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>AI Değerlendirme</CardTitle>
              <CardDescription>
                Her ilan için potansiyel skoru ve neden analizi.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Lead Scoring</CardTitle>
              <CardDescription>
                🔥 Acil, 🟢 Sıcak, 🟡 Takip, ❌ Kapalı — otomatik sıcaklık.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <MessageSquare className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>WhatsApp Business API</CardTitle>
              <CardDescription>
                Meta Cloud API ile resmi entegrasyon. Template + serbest mesaj.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>KVKK & Compliance</CardTitle>
              <CardDescription>
                Onay yönetimi, audit log, veri saklama politikası.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Compliance Notice */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="text-amber-900">⚖️ Yasal Uyumluluk</CardTitle>
          </CardHeader>
          <CardContent className="text-amber-900 space-y-2">
            <p>
              Bu sistem Sahibinden.com, Hepsiemlak vb. portallardan <strong>otomatik veri çekmez</strong>.
            </p>
            <p>
              Tüm veri kaynakları yasal yöntemlerle çalışır: kullanıcının kendi eklediği ilanlar,
              CSV import veya portal'ın yazılı izin verdiği resmi API.
            </p>
            <p>
              WhatsApp iletişimi Meta'nın onaylı Business API'si üzerinden yapılır.
              KVKK ve elektronik ticari ileti düzenlemelerine uyumlu çalışır.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 Leadseak. Lead Seek - Müşteri Adayı Ara.</p>
      </footer>
    </div>
  );
}