// WhatsApp Business API (Meta Cloud API) entegrasyonu
// Resmi API kullanır - ToS uyumlu
// Template mesajlar ve serbest metin destekler

import { prisma } from '@/lib/db';
import { MessageChannel, MessageDirection } from '@prisma/client';

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const API_VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}`;

export interface SendMessageParams {
  to: string; // E.164 format: +905551234567
  message: string;
  leadId: string;
  userId?: string;
}

export interface SendTemplateParams {
  to: string;
  templateName: string;
  languageCode?: string;
  parameters?: string[];
  leadId: string;
  userId?: string;
}

export class WhatsAppService {
  private enabled: boolean;

  constructor() {
    this.enabled = !!(PHONE_NUMBER_ID && ACCESS_TOKEN);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Serbest metin mesajı gönder
   * NOT: WhatsApp Business API'de 24 saatlik "conversation window" dışında
   * sadece onaylı template mesajlar gönderilebilir.
   */
  async sendMessage(params: SendMessageParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.enabled) {
      return { success: false, error: 'WhatsApp API yapılandırılmamış' };
    }

    try {
      const response = await fetch(`${BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: params.to.replace(/\D/g, ''),
          type: 'text',
          text: { body: params.message },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Mesajı DB'ye kaydet (başarısız)
        await this.logMessage({
          leadId: params.leadId,
          userId: params.userId,
          direction: MessageDirection.OUTBOUND,
          content: params.message,
          failedAt: new Date(),
          failureReason: data.error?.message || 'Unknown error',
        });
        return { success: false, error: data.error?.message || 'Send failed' };
      }

      const messageId = data.messages?.[0]?.id;

      // Mesajı DB'ye kaydet
      await this.logMessage({
        leadId: params.leadId,
        userId: params.userId,
        direction: MessageDirection.OUTBOUND,
        content: params.message,
        externalId: messageId,
      });

      return { success: true, messageId };
    } catch (err) {
      const error = (err as Error).message;
      await this.logMessage({
        leadId: params.leadId,
        userId: params.userId,
        direction: MessageDirection.OUTBOUND,
        content: params.message,
        failedAt: new Date(),
        failureReason: error,
      });
      return { success: false, error };
    }
  }

  /**
   * Onaylı template mesajı gönder
   * 24 saat kuralından etkilenmez
   */
  async sendTemplate(params: SendTemplateParams) {
    if (!this.enabled) {
      return { success: false, error: 'WhatsApp API yapılandırılmamış' };
    }

    try {
      const response = await fetch(`${BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: params.to.replace(/\D/g, ''),
          type: 'template',
          template: {
            name: params.templateName,
            language: { code: params.languageCode || 'tr' },
            components: params.parameters
              ? [
                  {
                    type: 'body',
                    parameters: params.parameters.map((text) => ({ type: 'text', text })),
                  },
                ]
              : undefined,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error?.message };
      }

      const messageId = data.messages?.[0]?.id;

      await this.logMessage({
        leadId: params.leadId,
        userId: params.userId,
        direction: MessageDirection.OUTBOUND,
        content: `[Template: ${params.templateName}] ${params.parameters?.join(', ') || ''}`,
        externalId: messageId,
      });

      return { success: true, messageId };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Mesajı DB'ye logla
   */
  private async logMessage(params: {
    leadId: string;
    userId?: string;
    direction: MessageDirection;
    content: string;
    externalId?: string;
    deliveredAt?: Date;
    readAt?: Date;
    failedAt?: Date;
    failureReason?: string;
  }) {
    await prisma.message.create({
      data: {
        leadId: params.leadId,
        userId: params.userId,
        direction: params.direction,
        channel: MessageChannel.WHATSAPP,
        content: params.content,
        externalId: params.externalId,
        deliveredAt: params.deliveredAt,
        readAt: params.readAt,
        failedAt: params.failedAt,
        failureReason: params.failureReason,
      },
    });
  }

  /**
   * Webhook'tan gelen mesajı işle
   */
  async handleIncomingMessage(webhookData: any) {
    const entry = webhookData.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) return;

    for (const msg of messages) {
      const from = msg.from; // Gönderen numara
      const messageBody = msg.text?.body || '';
      const messageId = msg.id;
      const timestamp = new Date(parseInt(msg.timestamp) * 1000);

      // Bu numaraya ait lead'i bul
      const lead = await prisma.lead.findFirst({
        where: { contactPhone: { contains: from.replace(/\D/g, '').slice(-10) } },
      });

      if (!lead) {
        console.warn(`Incoming message from unknown number: ${from}`);
        continue;
      }

      // Mesajı kaydet
      await prisma.message.create({
        data: {
          leadId: lead.id,
          direction: MessageDirection.INBOUND,
          channel: MessageChannel.WHATSAPP,
          content: messageBody,
          externalId: messageId,
          deliveredAt: timestamp,
        },
      });

      // Lead'in son iletişim zamanını güncelle
      await prisma.lead.update({
        where: { id: lead.id },
        data: { lastContactAt: timestamp },
      });

      // AI ile kategorize et (async, blocking olmamalı)
      // Bu kısım conversation analyzer tarafından yapılacak
    }
  }
}

export const whatsappService = new WhatsAppService();