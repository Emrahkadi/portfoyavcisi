'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, MoreVertical } from 'lucide-react';

export function LeadActions({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Bu lead\'i silmek istediğinize emin misiniz? Mesajlar ve randevular da silinecek.')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/leads');
        router.refresh();
      } else {
        alert('Silme başarısız');
      }
    } catch (err) {
      alert('Hata: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowMenu(!showMenu)}
        disabled={loading}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-1 bg-white border rounded-md shadow-lg z-50 min-w-[160px]">
          <button
            onClick={() => {
              setShowMenu(false);
              alert('Düzenleme özelliği yakında eklenecek');
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Düzenle
          </button>
          <button
            onClick={() => {
              setShowMenu(false);
              handleDelete();
            }}
            disabled={loading}
            className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {loading ? 'Siliniyor...' : 'Sil'}
          </button>
        </div>
      )}
    </div>
  );
}