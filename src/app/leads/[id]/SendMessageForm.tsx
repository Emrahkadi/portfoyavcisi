'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function SendMessageForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleSend = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/leads/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, message }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        setMessage('');
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        placeholder="Mesajınızı yazın..."
      />
      <Button onClick={handleSend} disabled={loading || !message.trim()} className="w-full">
        {loading ? 'Gönderiliyor...' : '📤 WhatsApp ile Gönder'}
      </Button>
      {result && (
        <div
          className={`text-sm p-3 rounded-md ${
            result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {result.success ? '✅ Mesaj gönderildi' : `❌ Hata: ${result.error}`}
        </div>
      )}
    </div>
  );
}