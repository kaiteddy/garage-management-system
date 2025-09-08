import { NextResponse } from "next/server"
import { RestoreSystem } from "@/scripts/restore-system"

export async function POST(request: Request) {
  try {
    const { backupName } = await request.json()
    
    if (!backupName) {
      return NextResponse.json({
        success: false,
        error: "Backup name is required"
      }, { status: 400 })
    }
    
    console.log(`[RESTORE] Starting database restoration from: ${backupName}`)
    
    const restoreSystem = new RestoreSystem({
      verifyBeforeRestore: true,
      createBackupBeforeRestore: true
    })
    
    const result = await restoreSystem.restoreFromBackup(backupName)
    
    return NextResponse.json({
      success: true,
      message: "Database restoration completed successfully!",
      restoration: {
        duration: Math.round(result.duration),
        tables_restored: result.restoredTables,
        tables_skipped: result.skippedTables,
        records_restored: result.recordsRestored,
        errors: result.errors
      }
    })
    
  } catch (error) {
    console.error("[RESTORE] Failed:", error)
    
    return NextResponse.json({
      success: false,
      error: "Database restoration failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const restoreSystem = new RestoreSystem()
    const backups = await restoreSystem.listAvailableBackups()
    
    return NextResponse.json({
      success: true,
      available_backups: backups.map(backup => ({
        name: backup.name,
        created: backup.created.toISOString(),
        size: backup.size
      })),
      count: backups.length,
      message: backups.length > 0 
        ? `Found ${backups.length} backups available for restoration`
        : "No backups available for restoration"
    })
    
  } catch (error) {
    console.error("[RESTORE] List failed:", error)
    
    return NextResponse.json({
      success: false,
      error: "Failed to list available backups",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
