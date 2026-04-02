import { PrismaClient, type Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Prisma log seviyesi - development'ta sadece error ve warn
// Query loglarını kapatmak için PRISMA_QUERY_LOGGING=error ayarla
const prismaLog: Prisma.LogLevel[] = process.env.PRISMA_QUERY_LOGGING === 'query'
    ? ['query', 'error', 'warn']
    : ['error', 'warn'];

export const prisma = globalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? prismaLog : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
