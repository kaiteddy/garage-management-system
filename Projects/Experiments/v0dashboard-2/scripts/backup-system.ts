#!/usr/bin/env tsx
/**
 * 💾 BACKUP SYSTEM
 * 
 * Simple backup system for the garage management database
 */

import { promises as fs } from 'fs'
import { join } from 'path'

export interface BackupOptions {
  format: 'sql' | 'csv' | 'both'
  compress?: boolean
  maxBackups?: number
}

export interface BackupResult {
  backupPath: string
  size: number
  timestamp: Date
  format: string
}

export class BackupSystem {
  private options: BackupOptions

  constructor(options: BackupOptions) {
    this.options = {
      compress: false,
      maxBackups: 5,
      ...options
    }
  }

  async createBackup(): Promise<BackupResult> {
    const timestamp = new Date()
    const backupDir = join(process.cwd(), 'backups')
    
    // Ensure backup directory exists
    try {
      await fs.mkdir(backupDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    const backupPath = join(backupDir, `backup-${timestamp.toISOString().replace(/[:.]/g, '-')}.sql`)
    
    // Create a simple backup placeholder
    const backupContent = `-- Backup created at ${timestamp.toISOString()}\n-- This is a placeholder backup file\n`
    
    await fs.writeFile(backupPath, backupContent)
    
    const stats = await fs.stat(backupPath)
    
    return {
      backupPath,
      size: stats.size,
      timestamp,
      format: this.options.format
    }
  }

  async listBackups(): Promise<string[]> {
    const backupDir = join(process.cwd(), 'backups')
    
    try {
      const files = await fs.readdir(backupDir)
      return files.filter(file => file.endsWith('.sql') || file.endsWith('.csv'))
    } catch (error) {
      return []
    }
  }

  async deleteOldBackups(): Promise<void> {
    const backups = await this.listBackups()
    const maxBackups = this.options.maxBackups || 5
    
    if (backups.length > maxBackups) {
      const backupDir = join(process.cwd(), 'backups')
      const toDelete = backups.slice(0, backups.length - maxBackups)
      
      for (const backup of toDelete) {
        try {
          await fs.unlink(join(backupDir, backup))
        } catch (error) {
          console.warn(`Failed to delete backup ${backup}:`, error)
        }
      }
    }
  }
}
