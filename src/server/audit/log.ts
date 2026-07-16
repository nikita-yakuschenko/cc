import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

type Tx = Prisma.TransactionClient | typeof prisma;

export async function writeAuditLog(
  input: {
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Prisma.InputJsonValue;
  },
  client: Tx = prisma,
) {
  await client.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata,
    },
  });
}
