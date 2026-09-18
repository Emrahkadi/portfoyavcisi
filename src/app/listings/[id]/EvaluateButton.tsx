'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function EvaluateButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleEvaluate = async () => {
    setLoading(true);
    try {
      await fetch('/api/listings/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleEvaluate} disabled={loading} variant="outline" className="w-full">
      {loading ? 'Değerlendiriliyor...' : '🔄 Yeniden Değerlendir'}
    </Button>
  );
}