import { NextResponse } from "next/server"
import { BackupSystem } from "@/scripts/backup-system"

export async function POST() {
  try {
    console.log("[BACKUP] Starting database backup...")
    
    const backupSystem = new BackupSystem({
      format: 'both',
      compress: true,
      maxBackups: 10
    })
    
    const result = await backupSystem.createBackup()
    
    return NextResponse.json({
      success: true,
      message: "Database backup completed successfully!",
      backup: {
        path: result.backupPath,
        size: result.size,
        duration: Math.round(result.duration),
        tables: result.tables,
        timestamp: result.timestamp
      }
    })
    
  } catch (error) {
    console.error("[BACKUP] Failed:", error)
    
    return NextResponse.json({
      success: false,
      error: "Database backup failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const backupSystem = new BackupSystem()
    const backups = await backupSystem.listBackups()
    
    return NextResponse.json({
      success: true,
      backups: backups.map(backup => ({
        name: backup.name,
        created: backup.created.toISOString(),
        size: backup.size,
        formatted_size: formatBytes(backup.size)
      })),
      count: backups.length
    })
    
  } catch (error) {
    console.error("[BACKUP] List failed:", error)
    
    return NextResponse.json({
      success: false,
      error: "Failed to list backups",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
