// Utility to inspect env vars from Server Components or route-handlers.
export function dumpRelevantEnv() {
  return {
    DATABASE_URL: process.env.DATABASE_URL,
    POSTGRES_URL: process.env.POSTGRES_URL,
    POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
    POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING,
    NEON_DATABASE_URL: process.env.NEON_DATABASE_URL,
  }
}
