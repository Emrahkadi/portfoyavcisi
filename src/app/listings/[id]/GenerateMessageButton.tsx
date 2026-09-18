'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function GenerateMessageButton({ listingId }: { listingId: string }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leads/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json();
      if (data.message) {
        setMessage(data.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button onClick={handleGenerate} disabled={loading} className="w-full">
        {loading ? 'Oluşturuluyor...' : '✨ AI ile Mesaj Oluştur'}
      </Button>
      {message && (
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={8}
          placeholder="Mesaj buraya gelecek..."
        />
      )}
    </div>
  );
}