#\!/bin/bash

# GA4 Migration Execution Script
# This script runs the complete migration process with proper error handling

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Python
    if \! command -v python3 >/dev/null 2>&1; then
        print_error "Python 3 is not installed"
        exit 1
    fi
    
    # Check PostgreSQL
    if \! command -v psql >/dev/null 2>&1; then
        print_error "PostgreSQL client is not installed"
        exit 1
    fi
    
    # Check if config.py exists
    if [ \! -f "config.py" ]; then
        print_error "config.py not found. Please copy config.example.py to config.py and configure it."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to run migration
run_migration() {
    print_status "Starting data migration..."
    
    # Install requirements
    pip3 install -r requirements.txt
    
    # Run migration script
    python3 ga4_migration_script.py
    
    if [ $? -eq 0 ]; then
        print_success "Migration completed successfully"
    else
        print_error "Migration failed"
        exit 1
    fi
}

# Function to run validation
run_validation() {
    print_status "Running data validation..."
    
    # Run validation script
    python3 ga4_validation_script.py
    
    if [ $? -eq 0 ]; then
        print_success "Validation completed successfully"
    else
        print_error "Validation completed with warnings"
    fi
}

# Main execution
main() {
    echo "========================================"
    echo "GA4 Garage Management System Migration"
    echo "========================================"
    echo ""
    
    check_prerequisites
    
    echo ""
    read -p "Proceed with migration? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_migration
        run_validation
        
        echo ""
        print_success "Migration process completed\!"
        print_status "Check ga4_migration.log and ga4_validation_report.txt for details"
    else
        print_status "Migration cancelled by user"
        exit 0
    fi
}

# Run main function
main "$@"
