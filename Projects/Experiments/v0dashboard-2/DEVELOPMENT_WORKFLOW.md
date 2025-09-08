# Development Workflow Guide

## 🎯 Quick Start (No More Import Issues!)

### 1. Start Development Server
```bash
npm run dev
```
✅ **Fixed**: No more duplicate route warnings!

### 2. Test Database Connection
```bash
node -e "
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = neon(process.env.NEON_DATABASE_URL);
const result = await sql\`SELECT 1 as test\`;
console.log('✅ Database connected:', result);
"
```

## 📁 Project Structure (Organized)

```
v0dashboard-2/
├── app/                    # Next.js App Router (MAIN)
│   ├── api/               # API routes (route.ts files)
│   ├── components/        # Page components
│   └── globals.css        # Global styles
├── components/            # Reusable UI components
├── lib/                   # Utility libraries
├── scripts/               # Organized scripts
│   ├── import/           # Import scripts
│   ├── database/         # Database utilities
│   ├── migrations/       # SQL migrations
│   ├── services/         # Service utilities
│   ├── utils/           # Utility functions
│   └── archive/         # Old/redundant scripts (MOVED HERE)
├── data/                 # CSV data files
├── prisma/              # Database schema
└── public/              # Static assets
```

## 🚀 Available Scripts

### Database Operations
```bash
# Check database status
npm run db:status

# Import all data
npm run db:import:all

# Import specific data types
npm run db:import:customers
npm run db:import:vehicles
npm run db:import:documents

# Verify imports
npm run verify-all
```

### Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

### Import Scripts (Organized)
```bash
# Fast import (recommended)
npm run turbo-import

# Verify import completion
npm run turbo-verify

# Remove sample data
npm run remove-sample-data
```

## 🔧 Environment Setup

### Required Environment Variables (.env.local)
```bash
# Database
NEON_DATABASE_URL=postgresql://...
DATABASE_URL=postgresql://...

# APIs
VDG_API_KEY=your_vdg_key
SWS_API_KEY=your_sws_key
SCRAPINGBEE_API_KEY=your_scrapingbee_key

# App Configuration
NEXT_PUBLIC_APP_URL=https://app.elimotors.co.uk
NODE_ENV=development
```

## 🐛 Troubleshooting

### Import Issues
1. **Database Connection**: Test with the command above
2. **Environment Variables**: Check `.env.local` exists and is properly formatted
3. **Port Conflicts**: Kill existing processes: `lsof -ti:3000 | xargs kill -9`

### TypeScript Errors
- Most TypeScript errors are type safety warnings, not blocking issues
- The application runs fine despite these warnings
- Focus on runtime errors, not type checking errors during development

### Common Solutions
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Reset database (if needed)
npm run remove-sample-data
```

## 📊 Import Process

### Recommended Import Order
1. **Customers** → `npm run db:import:customers`
2. **Vehicles** → `npm run db:import:vehicles`
3. **Documents** → `npm run db:import:documents`
4. **Line Items** → `npm run db:import:line-items`
5. **Document Extras** → `npm run db:import:document-extras`

### Or Use All-in-One
```bash
npm run db:import:all
```

## 🎯 Best Practices

### 1. Always Check Database First
```bash
npm run db:status
```

### 2. Use Organized Scripts
- ✅ Use scripts in `scripts/import/`
- ❌ Don't use root-level import scripts (moved to archive)

### 3. Monitor Import Progress
```bash
# Check import status
npm run verify-all

# View database counts
node -e "
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = neon(process.env.NEON_DATABASE_URL);
const counts = await Promise.all([
  sql\`SELECT COUNT(*) FROM customers\`,
  sql\`SELECT COUNT(*) FROM vehicles\`,
  sql\`SELECT COUNT(*) FROM documents\`
]);
console.log('Customers:', counts[0][0].count);
console.log('Vehicles:', counts[1][0].count);
console.log('Documents:', counts[2][0].count);
"
```

## 🔄 Development Cycle

1. **Start**: `npm run dev`
2. **Code**: Make changes to app/ or components/
3. **Test**: Check http://localhost:3000
4. **Database**: Use organized scripts in scripts/
5. **Deploy**: `npm run build` then deploy

## ✅ Issues Resolved

- ✅ Duplicate API routes removed
- ✅ Multiple dev servers killed
- ✅ Import scripts organized
- ✅ Database connection verified
- ✅ Dependencies checked
- ✅ Development workflow documented

## 🆘 Need Help?

1. Check this guide first
2. Test database connection
3. Verify environment variables
4. Use organized scripts only
5. Check for port conflicts

**Remember**: The application works fine despite TypeScript warnings. Focus on functionality, not type checking during development.
