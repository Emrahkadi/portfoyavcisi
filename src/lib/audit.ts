// Audit log helper - KVKK compliance için tüm aksiyonları logla
import { prisma } from './db';

export async function audit(params: {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: params.metadata as any,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (err) {
    // Audit log hatası ana işlemi engellememeli
    console.error('Audit log failed:', err);
  }
}