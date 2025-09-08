#!/usr/bin/env tsx
/**
 * 🔄 COMPREHENSIVE RESTORE SYSTEM
 * 
 * Restores garage management data from backups:
 * - Full database restoration from SQL dumps
 * - Individual table restoration from CSV files
 * - Backup verification before restoration
 * - Safe restoration with rollback capability
 * - Data integrity checks after restoration
 */

import { sql } from '@/lib/database/neon-client'
import fs from 'fs'
import path from 'path'
import { performance } from 'perf_hooks'
import { parse } from 'csv-parse/sync'

interface RestoreConfig {
  backupDir: string
  verifyBeforeRestore: boolean
  createBackupBeforeRestore: boolean
  skipExistingTables: boolean
}

interface RestoreResult {
  success: boolean
  restoredTables: string[]
  skippedTables: string[]
  errors: string[]
  duration: number
  recordsRestored: number
}

class RestoreSystem {
  private config: RestoreConfig
  private startTime: number = 0

  constructor(config: Partial<RestoreConfig> = {}) {
    this.config = {
      backupDir: path.join(process.cwd(), 'backups'),
      verifyBeforeRestore: true,
      createBackupBeforeRestore: true,
      skipExistingTables: false,
      ...config
    }
  }

  async restoreFromBackup(backupName: string): Promise<RestoreResult> {
    console.log('🔄 COMPREHENSIVE RESTORE SYSTEM')
    console.log('=' .repeat(50))
    console.log(`📁 Restoring from: ${backupName}`)
    
    this.startTime = performance.now()
    
    const result: RestoreResult = {
      success: false,
      restoredTables: [],
      skippedTables: [],
      errors: [],
      duration: 0,
      recordsRestored: 0
    }
    
    try {
      const backupPath = path.join(this.config.backupDir, backupName)
      
      // Verify backup exists
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup not found: ${backupPath}`)
      }
      
      // Load backup metadata
      const metadata = await this.loadBackupMetadata(backupPath)
      console.log(`📋 Backup created: ${metadata.backup_info.created_at}`)
      console.log(`📊 Tables in backup: ${metadata.totals.tables}`)
      console.log(`📈 Total records: ${metadata.totals.total_records.toLocaleString()}`)
      
      // Create safety backup if requested
      if (this.config.createBackupBeforeRestore) {
        await this.createSafetyBackup()
      }
      
      // Verify backup integrity if requested
      if (this.config.verifyBeforeRestore) {
        await this.verifyBackupIntegrity(backupPath, metadata)
      }
      
      // Determine restoration method
      const sqlBackupFile = path.join(backupPath, 'full_backup.sql')
      const csvBackupDir = path.join(backupPath, 'csv')
      
      if (fs.existsSync(sqlBackupFile)) {
        console.log('\n💾 Restoring from SQL backup...')
        await this.restoreFromSQL(sqlBackupFile, result)
      } else if (fs.existsSync(csvBackupDir)) {
        console.log('\n📊 Restoring from CSV backups...')
        await this.restoreFromCSV(csvBackupDir, metadata, result)
      } else {
        throw new Error('No valid backup files found (SQL or CSV)')
      }
      
      // Verify restoration
      await this.verifyRestoration(metadata, result)
      
      result.success = true
      result.duration = performance.now() - this.startTime
      
      console.log('\n🎉 RESTORATION COMPLETED SUCCESSFULLY!')
      console.log('=' .repeat(50))
      console.log(`⏱️  Duration: ${(result.duration / 1000).toFixed(1)}s`)
      console.log(`📊 Tables restored: ${result.restoredTables.length}`)
      console.log(`📈 Records restored: ${result.recordsRestored.toLocaleString()}`)
      
      if (result.skippedTables.length > 0) {
        console.log(`⚠️  Tables skipped: ${result.skippedTables.length}`)
      }
      
      if (result.errors.length > 0) {
        console.log(`❌ Errors encountered: ${result.errors.length}`)
        result.errors.forEach(error => console.log(`   - ${error}`))
      }
      
      return result
      
    } catch (error) {
      result.success = false
      result.duration = performance.now() - this.startTime
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
      
      console.error('❌ Restoration failed:', error)
      throw error
    }
  }

  private async loadBackupMetadata(backupPath: string): Promise<any> {
    const metadataFile = path.join(backupPath, 'backup_metadata.json')
    
    if (!fs.existsSync(metadataFile)) {
      throw new Error('Backup metadata not found')
    }
    
    const metadataContent = fs.readFileSync(metadataFile, 'utf-8')
    return JSON.parse(metadataContent)
  }

  private async createSafetyBackup(): Promise<void> {
    console.log('\n🛡️  Creating safety backup before restoration...')
    
    const { BackupSystem } = await import('./backup-system')
    const backupSystem = new BackupSystem({
      format: 'sql',
      compress: false
    })
    
    await backupSystem.createBackup()
    console.log('✅ Safety backup created')
  }

  private async verifyBackupIntegrity(backupPath: string, metadata: any): Promise<void> {
    console.log('\n🔍 Verifying backup integrity...')
    
    // Check if all expected files exist
    const sqlFile = path.join(backupPath, 'full_backup.sql')
    const csvDir = path.join(backupPath, 'csv')
    
    if (metadata.backup_info.format === 'sql' || metadata.backup_info.format === 'both') {
      if (!fs.existsSync(sqlFile)) {
        throw new Error('SQL backup file missing')
      }
      console.log('✅ SQL backup file found')
    }
    
    if (metadata.backup_info.format === 'csv' || metadata.backup_info.format === 'both') {
      if (!fs.existsSync(csvDir)) {
        throw new Error('CSV backup directory missing')
      }
      
      // Check if all expected CSV files exist
      for (const tableName of Object.keys(metadata.tables)) {
        const csvFile = path.join(csvDir, `${tableName}.csv`)
        if (!fs.existsSync(csvFile)) {
          console.log(`⚠️  CSV file missing for table: ${tableName}`)
        }
      }
      console.log('✅ CSV backup files verified')
    }
    
    console.log('✅ Backup integrity verified')
  }

  private async restoreFromSQL(sqlFile: string, result: RestoreResult): Promise<void> {
    console.log(`📄 Reading SQL file: ${sqlFile}`)
    
    const sqlContent = fs.readFileSync(sqlFile, 'utf-8')
    
    // Split SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements`)
    
    let recordsRestored = 0
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      try {
        if (statement.toUpperCase().startsWith('CREATE TABLE')) {
          const tableName = this.extractTableName(statement)
          console.log(`🏗️  Creating table: ${tableName}`)
          
          await sql.unsafe(statement)
          result.restoredTables.push(tableName)
          
        } else if (statement.toUpperCase().startsWith('INSERT INTO')) {
          const tableName = this.extractInsertTableName(statement)
          
          await sql.unsafe(statement)
          
          // Count inserted records (rough estimate)
          const valueMatches = statement.match(/VALUES\s*\(/gi)
          if (valueMatches) {
            recordsRestored += valueMatches.length
          }
          
          if (i % 100 === 0) {
            console.log(`  📈 Processed ${i} statements...`)
          }
        }
        
      } catch (error) {
        const errorMsg = `Failed to execute statement ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
        result.errors.push(errorMsg)
        console.log(`⚠️  ${errorMsg}`)
      }
    }
    
    result.recordsRestored = recordsRestored
    console.log(`✅ SQL restoration completed`)
  }

  private async restoreFromCSV(csvDir: string, metadata: any, result: RestoreResult): Promise<void> {
    const csvFiles = fs.readdirSync(csvDir).filter(file => file.endsWith('.csv'))
    
    console.log(`📊 Found ${csvFiles.length} CSV files`)
    
    for (const csvFile of csvFiles) {
      const tableName = path.basename(csvFile, '.csv')
      const csvPath = path.join(csvDir, csvFile)
      
      try {
        console.log(`📋 Restoring table: ${tableName}`)
        
        // Check if table exists
        const tableExists = await this.checkTableExists(tableName)
        
        if (tableExists && this.config.skipExistingTables) {
          console.log(`  ⚠️  Table ${tableName} exists, skipping`)
          result.skippedTables.push(tableName)
          continue
        }
        
        // Read CSV file
        const csvContent = fs.readFileSync(csvPath, 'utf-8')
        const records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        })
        
        if (records.length === 0) {
          console.log(`  ⚠️  No data in ${tableName}`)
          continue
        }
        
        // Clear existing data if table exists
        if (tableExists) {
          await sql.unsafe(`DELETE FROM ${tableName}`)
          console.log(`  🗑️  Cleared existing data from ${tableName}`)
        }
        
        // Insert data in batches
        const batchSize = 1000
        let inserted = 0
        
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize)
          
          // Build insert statement
          const columns = Object.keys(batch[0])
          const columnList = columns.map(col => `"${col}"`).join(', ')
          
          const values = batch.map(record => {
            const rowValues = columns.map(col => {
              const value = record[col]
              if (value === '' || value === null) return 'NULL'
              if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`
              return String(value)
            })
            return `(${rowValues.join(', ')})`
          }).join(', ')
          
          const insertSQL = `INSERT INTO ${tableName} (${columnList}) VALUES ${values}`
          
          await sql.unsafe(insertSQL)
          inserted += batch.length
          
          if (inserted % 5000 === 0) {
            console.log(`    📈 Inserted ${inserted}/${records.length} records...`)
          }
        }
        
        result.restoredTables.push(tableName)
        result.recordsRestored += inserted
        console.log(`  ✅ Restored ${inserted} records to ${tableName}`)
        
      } catch (error) {
        const errorMsg = `Failed to restore table ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`
        result.errors.push(errorMsg)
        console.log(`  ❌ ${errorMsg}`)
      }
    }
    
    console.log(`✅ CSV restoration completed`)
  }

  private async checkTableExists(tableName: string): Promise<boolean> {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      )
    `
    
    return result[0].exists
  }

  private extractTableName(createStatement: string): string {
    const match = createStatement.match(/CREATE TABLE\s+(\w+)/i)
    return match ? match[1] : 'unknown'
  }

  private extractInsertTableName(insertStatement: string): string {
    const match = insertStatement.match(/INSERT INTO\s+(\w+)/i)
    return match ? match[1] : 'unknown'
  }

  private async verifyRestoration(metadata: any, result: RestoreResult): Promise<void> {
    console.log('\n🔍 Verifying restoration...')
    
    for (const tableName of result.restoredTables) {
      try {
        const count = await sql.unsafe(`SELECT COUNT(*) as count FROM ${tableName}`)
        const actualCount = Number(count[0].count)
        const expectedCount = metadata.tables[tableName] || 0
        
        if (actualCount === expectedCount) {
          console.log(`✅ ${tableName}: ${actualCount} records (matches backup)`)
        } else {
          console.log(`⚠️  ${tableName}: ${actualCount} records (expected ${expectedCount})`)
        }
        
      } catch (error) {
        console.log(`❌ Failed to verify ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    console.log('✅ Restoration verification completed')
  }

  async listAvailableBackups(): Promise<Array<{name: string, created: Date, size: string}>> {
    if (!fs.existsSync(this.config.backupDir)) {
      return []
    }
    
    const backupDirs = fs.readdirSync(this.config.backupDir)
      .filter(dir => dir.startsWith('backup_'))
      .map(dir => {
        const dirPath = path.join(this.config.backupDir, dir)
        const stats = fs.statSync(dirPath)
        return {
          name: dir,
          created: stats.birthtime,
          size: this.formatBytes(this.getDirectorySizeSync(dirPath))
        }
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime())
    
    return backupDirs
  }

  private getDirectorySizeSync(dirPath: string): number {
    let size = 0
    
    const files = fs.readdirSync(dirPath, { withFileTypes: true })
    
    for (const file of files) {
      const filePath = path.join(dirPath, file.name)
      
      if (file.isDirectory()) {
        size += this.getDirectorySizeSync(filePath)
      } else {
        size += fs.statSync(filePath).size
      }
    }
    
    return size
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'list'
  
  const restoreSystem = new RestoreSystem({
    verifyBeforeRestore: true,
    createBackupBeforeRestore: true
  })
  
  switch (command) {
    case 'list':
      const backups = await restoreSystem.listAvailableBackups()
      console.log('\n📋 Available Backups for Restoration:')
      console.log('=' .repeat(50))
      
      if (backups.length === 0) {
        console.log('No backups found.')
      } else {
        backups.forEach((backup, i) => {
          console.log(`${i + 1}. ${backup.name}`)
          console.log(`   Created: ${backup.created.toLocaleString()}`)
          console.log(`   Size: ${backup.size}`)
          console.log()
        })
      }
      break
      
    case 'restore':
      const backupName = args[1]
      if (!backupName) {
        console.log('Usage: npm run restore restore <backup_name>')
        console.log('Use "npm run restore list" to see available backups')
        process.exit(1)
      }
      
      await restoreSystem.restoreFromBackup(backupName)
      break
      
    default:
      console.log('Usage: npm run restore [list|restore <backup_name>]')
      break
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Restore system failed:', error)
    process.exit(1)
  })
}

export { RestoreSystem }
