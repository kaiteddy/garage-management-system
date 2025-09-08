#!/bin/bash

echo "🚀 Setting up direct CSV import script..."

# Create data directory if it doesn't exist
DATA_DIR="$HOME/data-exports"
if [ ! -d "$DATA_DIR" ]; then
    echo "📁 Creating data directory: $DATA_DIR"
    mkdir -p "$DATA_DIR"
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd "$(dirname "$0")"
npm install

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy your CSV files to: $DATA_DIR"
echo "2. Set your DATABASE_URL environment variable"
echo "3. Run the import: npm run import"
echo ""
echo "💡 Usage examples:"
echo "   # Import from default directory"
echo "   node direct-import.js"
echo ""
echo "   # Import from custom directory"
echo "   node direct-import.js /path/to/your/csv/files"
echo ""
echo "   # With environment variable"
echo "   DATABASE_URL='your-db-url' node direct-import.js"
echo ""
echo "🔧 Available CSV files to import:"
echo "   - Customers.csv"
echo "   - Vehicles.csv"
echo "   - Documents.csv"
echo "   - LineItems.csv"
echo "   - Document_Extras.csv"
echo "   - Appointments.csv"
echo "   - Receipts.csv"
echo "   - Reminder_Templates.csv"
echo "   - Reminders.csv"
echo "   - Stock.csv"
