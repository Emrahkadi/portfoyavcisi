'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function NewListingForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    propertyType: 'APARTMENT',
    rooms: '',
    sizeSqm: '',
    price: '',
    city: 'İstanbul',
    district: '',
    neighborhood: '',
    isOwner: true,
    daysOnMarket: '0',
    contactName: '',
    contactPhone: '',
    url: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalId: `manual-${Date.now()}`,
          source: 'MANUAL',
          ...formData,
          sizeSqm: parseFloat(formData.sizeSqm),
          price: parseFloat(formData.price),
          daysOnMarket: parseInt(formData.daysOnMarket),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Eklenemedi');
      }

      router.push(`/listings/${data.listing.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">İlan Başlığı *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          placeholder="örn: Yenişehir'de 2+1 Satılık Daire"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="propertyType">Tip</Label>
          <select
            id="propertyType"
            value={formData.propertyType}
            onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
            className="w-full h-10 px-3 border rounded-md"
          >
            <option value="APARTMENT">Daire</option>
            <option value="HOUSE">Müstakil Ev</option>
            <option value="VILLA">Villa</option>
            <option value="OFFICE">Ofis</option>
            <option value="LAND">Arsa</option>
            <option value="COMMERCIAL">Ticari</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rooms">Oda Sayısı</Label>
          <Input
            id="rooms"
            value={formData.rooms}
            onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
            placeholder="2+1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sizeSqm">Alan (m²) *</Label>
          <Input
            id="sizeSqm"
            type="number"
            value={formData.sizeSqm}
            onChange={(e) => setFormData({ ...formData, sizeSqm: e.target.value })}
            required
            placeholder="105"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Fiyat (TL) *</Label>
          <Input
            id="price"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            required
            placeholder="5000000"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">Şehir *</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="district">İlçe *</Label>
          <Input
            id="district"
            value={formData.district}
            onChange={(e) => setFormData({ ...formData, district: e.target.value })}
            required
            placeholder="Pendik"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="neighborhood">Mahalle</Label>
          <Input
            id="neighborhood"
            value={formData.neighborhood}
            onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
            placeholder="Yenişehir"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contactName">İlan Sahibi Adı</Label>
          <Input
            id="contactName"
            value={formData.contactName}
            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
            placeholder="Ahmet Yılmaz"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPhone">Telefon</Label>
          <Input
            id="contactPhone"
            value={formData.contactPhone}
            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
            placeholder="+905551234567"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="daysOnMarket">Piyasa Süresi (gün)</Label>
          <Input
            id="daysOnMarket"
            type="number"
            value={formData.daysOnMarket}
            onChange={(e) => setFormData({ ...formData, daysOnMarket: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="isOwner">İlan Sahibi</Label>
          <select
            id="isOwner"
            value={formData.isOwner ? 'true' : 'false'}
            onChange={(e) => setFormData({ ...formData, isOwner: e.target.value === 'true' })}
            className="w-full h-10 px-3 border rounded-md"
          >
            <option value="true">Sahibinden</option>
            <option value="false">Emlakçı</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Açıklama</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          placeholder="İlan açıklaması..."
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Ekleniyor...' : 'İlan Ekle'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          İptal
        </Button>
      </div>
    </form>
  );
}