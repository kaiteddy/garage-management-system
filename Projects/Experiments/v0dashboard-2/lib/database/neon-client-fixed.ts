import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

// FIXED VERSION - Use direct Neon URL for neon client (not Prisma Accelerate URL)
const dbUrl = "postgres://neondb_owner:npg_WRqMTuEo65tQ@ep-snowy-truth-abtxy4yd-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require"

console.log(`[NEON-CLIENT-FIXED] Using database URL: ${dbUrl.replace(/:[^:]*@/, ":***@")}`)

let sql: NeonQueryFunction<false, false>

try {
  sql = neon(dbUrl, {
    disableWarningInBrowsers: true,
  })

  console.log("[NEON-CLIENT-FIXED] Database client created successfully")
} catch (error) {
  console.error("[NEON-CLIENT-FIXED] Failed to create database client:", error)
  throw error
}

export { sql }
