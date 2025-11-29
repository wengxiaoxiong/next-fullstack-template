import { PrismaClient } from "./generated/prisma";

declare global {
  var prisma: PrismaClient | undefined;
}

const globalForPrisma = (typeof global !== 'undefined' ? global : globalThis) as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma || new PrismaClient();
export const db = prisma; // 添加db导出以匹配chat-store.ts的导入

if (process.env.NODE_ENV !== "production" && typeof global !== 'undefined') {
  globalForPrisma.prisma = prisma;
}