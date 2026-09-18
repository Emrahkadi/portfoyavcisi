// WhatsApp Webhook - Meta Cloud API'den gelen mesajları al
// GET: Webhook doğrulama
// POST: Gelen mesajları işle

import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/services/whatsapp';
import { conversationAnalyzer } from '@/services/conversation-analyzer';
import { prisma } from '@/lib/db';

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // WhatsApp'tan gelen webhook'u işle
    await whatsappService.handleIncomingMessage(body);

    // Gelen mesajları analiz et
    const messages = body.entry?.[0]?.changes?.[0]?.value?.messages || [];
    for (const msg of messages) {
      const from = msg.from;
      const messageBody = msg.text?.body || '';

      // Bu numaraya ait lead'i bul
      const lead = await prisma.lead.findFirst({
        where: { contactPhone: { contains: from.replace(/\D/g, '').slice(-10) } },
      });

      if (lead) {
        // Son gelen mesajı bul ve analiz et
        const lastMessage = await prisma.message.findFirst({
          where: { leadId: lead.id, direction: 'INBOUND' },
          orderBy: { createdAt: 'desc' },
        });

        if (lastMessage) {
          await conversationAnalyzer.processIncomingMessage(lastMessage.id);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}