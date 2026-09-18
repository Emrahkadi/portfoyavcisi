// Yeni İlan Ekleme Sayfası
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NewListingForm } from './NewListingForm';
import Link from 'next/link';

export default function NewListingPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          ← Dashboard'a dön
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yeni İlan Ekle</CardTitle>
          <CardDescription>
            İlan bilgilerini girin. AI otomatik olarak değerlendirme yapacak ve mesaj hazırlayacak.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewListingForm />
        </CardContent>
      </Card>
    </div>
  );
}