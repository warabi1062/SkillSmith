import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

function createClient() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  });
  return new PrismaClient({ adapter });
}

if (process.env.NODE_ENV === "production") {
  prisma = createClient();
} else {
  if (!globalThis.__prisma) {
    globalThis.__prisma = createClient();
  }
  prisma = globalThis.__prisma;
}

export { prisma };
