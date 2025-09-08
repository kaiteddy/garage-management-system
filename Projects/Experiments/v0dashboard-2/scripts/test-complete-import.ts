import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

console.log('🔍 Testing complete import setup...')
console.log('Environment check:')
console.log('- NEON_DATABASE_URL:', process.env.NEON_DATABASE_URL ? 'SET' : 'NOT SET')
console.log('- DATA_PATH exists:', fs.existsSync('/Users/adamrutstein/Desktop/GA4 EXPORT'))

// Check CSV files
const dataPath = '/Users/adamrutstein/Desktop/GA4 EXPORT'
if (fs.existsSync(dataPath)) {
  const files = fs.readdirSync(dataPath).filter(f => f.endsWith('.csv'))
  console.log('CSV files found:', files.length)
  files.forEach(file => {
    const filePath = path.join(dataPath, file)
    const stats = fs.statSync(filePath)
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').length - 1
    console.log(`  - ${file}: ${lines} records`)
  })
} else {
  console.log('❌ GA4 EXPORT directory not found')
}

console.log('✅ Test complete')
