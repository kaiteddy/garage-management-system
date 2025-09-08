// GarageManagement Pro - Comprehensive Data Validation Tools
// This script validates data integrity across all CSV files before import

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const sql = neon(process.env.DATABASE_URL);

// CSV parsing utility
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]);
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });
      data.push(row);
    }
  }
  
  return data;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

class DataValidator {
  constructor() {
    this.validationResults = {
      customers: { total: 0, valid: 0, issues: [] },
      vehicles: { total: 0, valid: 0, issues: [] },
      documents: { total: 0, valid: 0, issues: [] },
      lineItems: { total: 0, valid: 0, issues: [] },
      receipts: { total: 0, valid: 0, issues: [] },
      reminders: { total: 0, valid: 0, issues: [] },
      stock: { total: 0, valid: 0, issues: [] },
      appointments: { total: 0, valid: 0, issues: [] },
      relationships: { issues: [] }
    };
  }

  validateCustomers(csvPath) {
    console.log('👥 Validating customers data...');
    
    try {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const customers = parseCSV(csvContent);
      
      this.validationResults.customers.total = customers.length;
      
      const customerIds = new Set();
      const accountNumbers = new Set();
      
      for (const customer of customers) {
        let isValid = true;
        
        // Check required fields
        if (!customer._ID) {
          this.validationResults.customers.issues.push(`Customer missing ID`);
          isValid = false;
        } else if (customerIds.has(customer._ID)) {
          this.validationResults.customers.issues.push(`Duplicate customer ID: ${customer._ID}`);
          isValid = false;
        } else {
          customerIds.add(customer._ID);
        }
        
        // Check account number uniqueness
        if (customer.AccountNumber) {
          if (accountNumbers.has(customer.AccountNumber)) {
            this.validationResults.customers.issues.push(`Duplicate account number: ${customer.AccountNumber}`);
            isValid = false;
          } else {
            accountNumbers.add(customer.AccountNumber);
          }
        }
        
        // Check name fields
        if (!customer.nameForename && !customer.nameSurname && !customer.nameCompany) {
          this.validationResults.customers.issues.push(`Customer ${customer._ID} has no name information`);
          isValid = false;
        }
        
        // Check contact information
        if (!customer.contactEmail && !customer.contactMobile && !customer.contactTelephone) {
          this.validationResults.customers.issues.push(`Customer ${customer._ID} has no contact information`);
          isValid = false;
        }
        
        // Validate email format
        if (customer.contactEmail && customer.contactEmail !== '0' && !this.isValidEmail(customer.contactEmail)) {
          this.validationResults.customers.issues.push(`Customer ${customer._ID} has invalid email: ${customer.contactEmail}`);
          isValid = false;
        }
        
        if (isValid) {
          this.validationResults.customers.valid++;
        }
      }
      
      console.log(`   ✅ Customers validation complete: ${this.validationResults.customers.valid}/${this.validationResults.customers.total} valid`);
      
    } catch (error) {
      this.validationResults.customers.issues.push(`Error reading customers file: ${error.message}`);
      console.log(`   ❌ Error validating customers: ${error.message}`);
    }
  }

  validateVehicles(csvPath) {
    console.log('🚗 Validating vehicles data...');
    
    try {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const vehicles = parseCSV(csvContent);
      
      this.validationResults.vehicles.total = vehicles.length;
      
      const vehicleIds = new Set();
      const registrations = new Set();
      
      for (const vehicle of vehicles) {
        let isValid = true;
        
        // Check required fields
        if (!vehicle._ID) {
          this.validationResults.vehicles.issues.push(`Vehicle missing ID`);
          isValid = false;
        } else if (vehicleIds.has(vehicle._ID)) {
          this.validationResults.vehicles.issues.push(`Duplicate vehicle ID: ${vehicle._ID}`);
          isValid = false;
        } else {
          vehicleIds.add(vehicle._ID);
        }
        
        // Check registration
        if (!vehicle.Registration) {
          this.validationResults.vehicles.issues.push(`Vehicle ${vehicle._ID} missing registration`);
          isValid = false;
        } else {
          const reg = vehicle.Registration.toUpperCase();
          if (registrations.has(reg)) {
            this.validationResults.vehicles.issues.push(`Duplicate registration: ${reg}`);
            isValid = false;
          } else {
            registrations.add(reg);
          }
        }
        
        // Check make and model
        if (!vehicle.Make) {
          this.validationResults.vehicles.issues.push(`Vehicle ${vehicle._ID} missing make`);
          isValid = false;
        }
        
        if (!vehicle.Model) {
          this.validationResults.vehicles.issues.push(`Vehicle ${vehicle._ID} missing model`);
          isValid = false;
        }
        
        // Validate date format
        if (vehicle.DateofReg && !this.isValidDate(vehicle.DateofReg)) {
          this.validationResults.vehicles.issues.push(`Vehicle ${vehicle._ID} has invalid registration date: ${vehicle.DateofReg}`);
          isValid = false;
        }
        
        if (isValid) {
          this.validationResults.vehicles.valid++;
        }
      }
      
      console.log(`   ✅ Vehicles validation complete: ${this.validationResults.vehicles.valid}/${this.validationResults.vehicles.total} valid`);
      
    } catch (error) {
      this.validationResults.vehicles.issues.push(`Error reading vehicles file: ${error.message}`);
      console.log(`   ❌ Error validating vehicles: ${error.message}`);
    }
  }

  validateDocuments(csvPath) {
    console.log('📄 Validating documents data...');
    
    try {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const documents = parseCSV(csvContent);
      
      this.validationResults.documents.total = documents.length;
      
      const documentIds = new Set();
      const invoiceNumbers = new Set();
      
      for (const doc of documents) {
        let isValid = true;
        
        // Check required fields
        if (!doc._ID) {
          this.validationResults.documents.issues.push(`Document missing ID`);
          isValid = false;
        } else if (documentIds.has(doc._ID)) {
          this.validationResults.documents.issues.push(`Duplicate document ID: ${doc._ID}`);
          isValid = false;
        } else {
          documentIds.add(doc._ID);
        }
        
        // Check document type
        if (!doc.docType) {
          this.validationResults.documents.issues.push(`Document ${doc._ID} missing type`);
          isValid = false;
        } else if (!['SI', 'ES', 'JS', 'CR'].includes(doc.docType)) {
          this.validationResults.documents.issues.push(`Document ${doc._ID} has invalid type: ${doc.docType}`);
          isValid = false;
        }
        
        // Check invoice number uniqueness for invoices
        if (doc.docType === 'SI' && doc.docNumber_Invoice) {
          if (invoiceNumbers.has(doc.docNumber_Invoice)) {
            this.validationResults.documents.issues.push(`Duplicate invoice number: ${doc.docNumber_Invoice}`);
            isValid = false;
          } else {
            invoiceNumbers.add(doc.docNumber_Invoice);
          }
        }
        
        // Validate financial amounts
        if (doc.us_TotalGROSS && isNaN(parseFloat(doc.us_TotalGROSS))) {
          this.validationResults.documents.issues.push(`Document ${doc._ID} has invalid total gross: ${doc.us_TotalGROSS}`);
          isValid = false;
        }
        
        // Check date consistency
        if (doc.docDate_Created && doc.docDate_Issued) {
          const created = new Date(this.parseDate(doc.docDate_Created));
          const issued = new Date(this.parseDate(doc.docDate_Issued));
          if (issued < created) {
            this.validationResults.documents.issues.push(`Document ${doc._ID} issued before created`);
            isValid = false;
          }
        }
        
        if (isValid) {
          this.validationResults.documents.valid++;
        }
      }
      
      console.log(`   ✅ Documents validation complete: ${this.validationResults.documents.valid}/${this.validationResults.documents.total} valid`);
      
    } catch (error) {
      this.validationResults.documents.issues.push(`Error reading documents file: ${error.message}`);
      console.log(`   ❌ Error validating documents: ${error.message}`);
    }
  }

  validateLineItems(csvPath) {
    console.log('📋 Validating line items data...');
    
    try {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const lineItems = parseCSV(csvContent);
      
      this.validationResults.lineItems.total = lineItems.length;
      
      const lineItemIds = new Set();
      
      for (const item of lineItems) {
        let isValid = true;
        
        // Check required fields
        if (!item._ID) {
          this.validationResults.lineItems.issues.push(`Line item missing ID`);
          isValid = false;
        } else if (lineItemIds.has(item._ID)) {
          this.validationResults.lineItems.issues.push(`Duplicate line item ID: ${item._ID}`);
          isValid = false;
        } else {
          lineItemIds.add(item._ID);
        }
        
        // Check document reference
        if (!item._ID_Document) {
          this.validationResults.lineItems.issues.push(`Line item ${item._ID} missing document reference`);
          isValid = false;
        }
        
        // Check quantity
        if (!item.itemQuantity || parseFloat(item.itemQuantity) <= 0) {
          this.validationResults.lineItems.issues.push(`Line item ${item._ID} has invalid quantity: ${item.itemQuantity}`);
          isValid = false;
        }
        
        // Validate financial calculations
        const quantity = parseFloat(item.itemQuantity) || 0;
        const unitPrice = parseFloat(item.itemUnitPrice) || 0;
        const subNet = parseFloat(item.itemSub_Net) || 0;
        
        if (Math.abs((quantity * unitPrice) - subNet) > 0.01) {
          this.validationResults.lineItems.issues.push(`Line item ${item._ID} calculation error: ${quantity} × ${unitPrice} ≠ ${subNet}`);
          isValid = false;
        }
        
        // Check tax calculations
        const taxRate = parseFloat(item.itemTaxRate) || 0;
        const subTax = parseFloat(item.itemSub_Tax) || 0;
        const expectedTax = subNet * (taxRate / 100);
        
        if (Math.abs(expectedTax - subTax) > 0.01) {
          this.validationResults.lineItems.issues.push(`Line item ${item._ID} tax calculation error: ${subNet} × ${taxRate}% ≠ ${subTax}`);
          isValid = false;
        }
        
        if (isValid) {
          this.validationResults.lineItems.valid++;
        }
      }
      
      console.log(`   ✅ Line items validation complete: ${this.validationResults.lineItems.valid}/${this.validationResults.lineItems.total} valid`);
      
    } catch (error) {
      this.validationResults.lineItems.issues.push(`Error reading line items file: ${error.message}`);
      console.log(`   ❌ Error validating line items: ${error.message}`);
    }
  }

  validateReceipts(csvPath) {
    console.log('💰 Validating receipts data...');
    
    try {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const receipts = parseCSV(csvContent);
      
      this.validationResults.receipts.total = receipts.length;
      
      const receiptIds = new Set();
      
      for (const receipt of receipts) {
        let isValid = true;
        
        // Check required fields
        if (!receipt._ID) {
          this.validationResults.receipts.issues.push(`Receipt missing ID`);
          isValid = false;
        } else if (receiptIds.has(receipt._ID)) {
          this.validationResults.receipts.issues.push(`Duplicate receipt ID: ${receipt._ID}`);
          isValid = false;
        } else {
          receiptIds.add(receipt._ID);
        }
        
        // Check amount
        if (!receipt.Amount || parseFloat(receipt.Amount) <= 0) {
          this.validationResults.receipts.issues.push(`Receipt ${receipt._ID} has invalid amount: ${receipt.Amount}`);
          isValid = false;
        }
        
        // Check date
        if (!receipt.Date || !this.isValidDate(receipt.Date)) {
          this.validationResults.receipts.issues.push(`Receipt ${receipt._ID} has invalid date: ${receipt.Date}`);
          isValid = false;
        }
        
        // Check payment method
        if (!receipt.Method) {
          this.validationResults.receipts.issues.push(`Receipt ${receipt._ID} missing payment method`);
          isValid = false;
        }
        
        if (isValid) {
          this.validationResults.receipts.valid++;
        }
      }
      
      console.log(`   ✅ Receipts validation complete: ${this.validationResults.receipts.valid}/${this.validationResults.receipts.total} valid`);
      
    } catch (error) {
      this.validationResults.receipts.issues.push(`Error reading receipts file: ${error.message}`);
      console.log(`   ❌ Error validating receipts: ${error.message}`);
    }
  }

  validateReminders(csvPath) {
    console.log('⏰ Validating reminders data...');
    
    try {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const reminders = parseCSV(csvContent);
      
      this.validationResults.reminders.total = reminders.length;
      
      const reminderIds = new Set();
      
      for (const reminder of reminders) {
        let isValid = true;
        
        // Check required fields
        if (!reminder._ID) {
          this.validationResults.reminders.issues.push(`Reminder missing ID`);
          isValid = false;
        } else if (reminderIds.has(reminder._ID)) {
          this.validationResults.reminders.issues.push(`Duplicate reminder ID: ${reminder._ID}`);
          isValid = false;
        } else {
          reminderIds.add(reminder._ID);
        }
        
        // Check vehicle reference
        if (!reminder._ID_Vehicle) {
          this.validationResults.reminders.issues.push(`Reminder ${reminder._ID} missing vehicle reference`);
          isValid = false;
        }
        
        // Check due date
        if (!reminder.DueDate || !this.isValidDate(reminder.DueDate)) {
          this.validationResults.reminders.issues.push(`Reminder ${reminder._ID} has invalid due date: ${reminder.DueDate}`);
          isValid = false;
        }
        
        // Check at least one method is selected
        if (reminder.method_Email !== '1' && reminder.method_Print !== '1' && reminder.method_SMS !== '1') {
          this.validationResults.reminders.issues.push(`Reminder ${reminder._ID} has no delivery method selected`);
          isValid = false;
        }
        
        if (isValid) {
          this.validationResults.reminders.valid++;
        }
      }
      
      console.log(`   ✅ Reminders validation complete: ${this.validationResults.reminders.valid}/${this.validationResults.reminders.total} valid`);
      
    } catch (error) {
      this.validationResults.reminders.issues.push(`Error reading reminders file: ${error.message}`);
      console.log(`   ❌ Error validating reminders: ${error.message}`);
    }
  }

  validateStock(csvPath) {
    console.log('📦 Validating stock data...');
    
    try {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const stock = parseCSV(csvContent);
      
      this.validationResults.stock.total = stock.length;
      
      const stockIds = new Set();
      
      for (const item of stock) {
        let isValid = true;
        
        // Check required fields
        if (!item._ID) {
          this.validationResults.stock.issues.push(`Stock item missing ID`);
          isValid = false;
        } else if (stockIds.has(item._ID)) {
          this.validationResults.stock.issues.push(`Duplicate stock ID: ${item._ID}`);
          isValid = false;
        } else {
          stockIds.add(item._ID);
        }
        
        // Check description
        if (!item.itemDescription) {
          this.validationResults.stock.issues.push(`Stock item ${item._ID} missing description`);
          isValid = false;
        }
        
        // Validate quantities
        const qtyInStock = parseInt(item.qtyInStock) || 0;
        const qtyAvailable = parseInt(item.qtyAvailable) || 0;
        
        if (qtyAvailable > qtyInStock) {
          this.validationResults.stock.issues.push(`Stock item ${item._ID} available quantity (${qtyAvailable}) exceeds stock quantity (${qtyInStock})`);
          isValid = false;
        }
        
        if (isValid) {
          this.validationResults.stock.valid++;
        }
      }
      
      console.log(`   ✅ Stock validation complete: ${this.validationResults.stock.valid}/${this.validationResults.stock.total} valid`);
      
    } catch (error) {
      this.validationResults.stock.issues.push(`Error reading stock file: ${error.message}`);
      console.log(`   ❌ Error validating stock: ${error.message}`);
    }
  }

  validateAppointments(csvPath) {
    console.log('📅 Validating appointments data...');
    
    try {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const appointments = parseCSV(csvContent);
      
      this.validationResults.appointments.total = appointments.length;
      
      const appointmentIds = new Set();
      
      for (const appt of appointments) {
        let isValid = true;
        
        // Check required fields
        if (!appt._ID) {
          this.validationResults.appointments.issues.push(`Appointment missing ID`);
          isValid = false;
        } else if (appointmentIds.has(appt._ID)) {
          this.validationResults.appointments.issues.push(`Duplicate appointment ID: ${appt._ID}`);
          isValid = false;
        } else {
          appointmentIds.add(appt._ID);
        }
        
        // Check date consistency
        if (appt.ApptDateStart && appt.ApptDateEnd) {
          const startDate = new Date(this.parseDate(appt.ApptDateStart));
          const endDate = new Date(this.parseDate(appt.ApptDateEnd));
          
          if (endDate < startDate) {
            this.validationResults.appointments.issues.push(`Appointment ${appt._ID} ends before it starts`);
            isValid = false;
          }
        }
        
        if (isValid) {
          this.validationResults.appointments.valid++;
        }
      }
      
      console.log(`   ✅ Appointments validation complete: ${this.validationResults.appointments.valid}/${this.validationResults.appointments.total} valid`);
      
    } catch (error) {
      this.validationResults.appointments.issues.push(`Error reading appointments file: ${error.message}`);
      console.log(`   ❌ Error validating appointments: ${error.message}`);
    }
  }

  validateRelationships() {
    console.log('🔗 Validating data relationships...');
    
    try {
      // Load all data for relationship validation
      const customers = parseCSV(fs.readFileSync('/home/ubuntu/upload/Customers.csv', 'utf8'));
      const vehicles = parseCSV(fs.readFileSync('/home/ubuntu/upload/Vehicles.csv', 'utf8'));
      const documents = parseCSV(fs.readFileSync('/home/ubuntu/upload/Documents.csv', 'utf8'));
      const lineItems = parseCSV(fs.readFileSync('/home/ubuntu/upload/LineItems.csv', 'utf8'));
      const receipts = parseCSV(fs.readFileSync('/home/ubuntu/upload/Receipts.csv', 'utf8'));
      const reminders = parseCSV(fs.readFileSync('/home/ubuntu/upload/Reminders.csv', 'utf8'));
      
      // Create lookup sets
      const customerIds = new Set(customers.map(c => c._ID));
      const vehicleIds = new Set(vehicles.map(v => v._ID));
      const documentIds = new Set(documents.map(d => d._ID));
      
      // Validate vehicle-customer relationships
      let vehiclesWithoutCustomers = 0;
      for (const vehicle of vehicles) {
        if (vehicle._ID_Customer && !customerIds.has(vehicle._ID_Customer)) {
          this.validationResults.relationships.issues.push(`Vehicle ${vehicle._ID} references non-existent customer ${vehicle._ID_Customer}`);
          vehiclesWithoutCustomers++;
        }
      }
      
      // Validate document-customer relationships
      let documentsWithoutCustomers = 0;
      for (const doc of documents) {
        if (doc._ID_Customer && !customerIds.has(doc._ID_Customer)) {
          this.validationResults.relationships.issues.push(`Document ${doc._ID} references non-existent customer ${doc._ID_Customer}`);
          documentsWithoutCustomers++;
        }
      }
      
      // Validate document-vehicle relationships
      let documentsWithoutVehicles = 0;
      for (const doc of documents) {
        if (doc._ID_Vehicle && !vehicleIds.has(doc._ID_Vehicle)) {
          this.validationResults.relationships.issues.push(`Document ${doc._ID} references non-existent vehicle ${doc._ID_Vehicle}`);
          documentsWithoutVehicles++;
        }
      }
      
      // Validate line item-document relationships
      let lineItemsWithoutDocuments = 0;
      for (const item of lineItems) {
        if (item._ID_Document && !documentIds.has(item._ID_Document)) {
          this.validationResults.relationships.issues.push(`Line item ${item._ID} references non-existent document ${item._ID_Document}`);
          lineItemsWithoutDocuments++;
        }
      }
      
      // Validate receipt-document relationships
      let receiptsWithoutDocuments = 0;
      for (const receipt of receipts) {
        if (receipt._ID_Document && !documentIds.has(receipt._ID_Document)) {
          this.validationResults.relationships.issues.push(`Receipt ${receipt._ID} references non-existent document ${receipt._ID_Document}`);
          receiptsWithoutDocuments++;
        }
      }
      
      // Validate reminder-vehicle relationships
      let remindersWithoutVehicles = 0;
      for (const reminder of reminders) {
        if (reminder._ID_Vehicle && !vehicleIds.has(reminder._ID_Vehicle)) {
          this.validationResults.relationships.issues.push(`Reminder ${reminder._ID} references non-existent vehicle ${reminder._ID_Vehicle}`);
          remindersWithoutVehicles++;
        }
      }
      
      console.log(`   ✅ Relationship validation complete:`);
      console.log(`      Vehicles without customers: ${vehiclesWithoutCustomers}`);
      console.log(`      Documents without customers: ${documentsWithoutCustomers}`);
      console.log(`      Documents without vehicles: ${documentsWithoutVehicles}`);
      console.log(`      Line items without documents: ${lineItemsWithoutDocuments}`);
      console.log(`      Receipts without documents: ${receiptsWithoutDocuments}`);
      console.log(`      Reminders without vehicles: ${remindersWithoutVehicles}`);
      
    } catch (error) {
      this.validationResults.relationships.issues.push(`Error validating relationships: ${error.message}`);
      console.log(`   ❌ Error validating relationships: ${error.message}`);
    }
  }

  generateValidationReport() {
    console.log('');
    console.log('📊 COMPREHENSIVE DATA VALIDATION REPORT');
    console.log('=======================================');
    console.log('');
    
    const totalRecords = Object.values(this.validationResults).reduce((sum, result) => {
      return sum + (result.total || 0);
    }, 0);
    
    const totalValid = Object.values(this.validationResults).reduce((sum, result) => {
      return sum + (result.valid || 0);
    }, 0);
    
    const totalIssues = Object.values(this.validationResults).reduce((sum, result) => {
      return sum + (result.issues ? result.issues.length : 0);
    }, 0);
    
    console.log(`📈 Overall Statistics:`);
    console.log(`   Total Records: ${totalRecords.toLocaleString()}`);
    console.log(`   Valid Records: ${totalValid.toLocaleString()}`);
    console.log(`   Total Issues: ${totalIssues.toLocaleString()}`);
    console.log(`   Data Quality: ${Math.round((totalValid / totalRecords) * 100)}%`);
    console.log('');
    
    console.log('📋 Validation Results by Table:');
    
    Object.entries(this.validationResults).forEach(([table, results]) => {
      if (results.total > 0) {
        const quality = Math.round((results.valid / results.total) * 100);
        const status = quality >= 95 ? '✅' : quality >= 80 ? '⚠️' : '❌';
        
        console.log(`   ${status} ${table.toUpperCase()}: ${results.valid.toLocaleString()}/${results.total.toLocaleString()} valid (${quality}%)`);
        
        if (results.issues.length > 0) {
          console.log(`      Issues found: ${results.issues.length}`);
          // Show first 3 issues as examples
          results.issues.slice(0, 3).forEach(issue => {
            console.log(`        - ${issue}`);
          });
          if (results.issues.length > 3) {
            console.log(`        ... and ${results.issues.length - 3} more issues`);
          }
        }
      }
    });
    
    console.log('');
    
    if (totalIssues === 0) {
      console.log('🎉 EXCELLENT! No data quality issues found.');
      console.log('✅ Your data is ready for import.');
    } else if (totalIssues < 100) {
      console.log('👍 GOOD! Minor data quality issues found.');
      console.log('💡 Consider reviewing the issues above, but data can be imported.');
    } else {
      console.log('⚠️  ATTENTION! Significant data quality issues found.');
      console.log('💡 Recommend reviewing and fixing critical issues before import.');
    }
    
    console.log('');
    console.log('📝 Recommendations:');
    console.log('   1. Review and fix any critical relationship issues');
    console.log('   2. Verify duplicate records are intentional');
    console.log('   3. Check financial calculation errors');
    console.log('   4. Validate date formats and ranges');
    console.log('   5. Ensure required fields are populated');
    
    return {
      totalRecords,
      totalValid,
      totalIssues,
      quality: Math.round((totalValid / totalRecords) * 100),
      readyForImport: totalIssues < 100
    };
  }

  // Utility functions
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidDate(dateStr) {
    if (!dateStr || dateStr === '' || dateStr === '01/01/2000') return false;
    
    const parts = dateStr.split('/');
    if (parts.length !== 3) return false;
    
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    
    return year > 1900 && year < 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31;
  }

  parseDate(dateStr) {
    if (!dateStr || dateStr === '' || dateStr === '01/01/2000') return null;
    
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      
      if (year > 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      }
    }
    
    return null;
  }
}

// Main validation function
async function runValidation() {
  console.log('🔍 GarageManagement Pro - Comprehensive Data Validation');
  console.log('======================================================');
  console.log('');
  
  const validator = new DataValidator();
  
  try {
    // Validate each data file
    validator.validateCustomers('/home/ubuntu/upload/Customers.csv');
    validator.validateVehicles('/home/ubuntu/upload/Vehicles.csv');
    validator.validateDocuments('/home/ubuntu/upload/Documents.csv');
    validator.validateLineItems('/home/ubuntu/upload/LineItems.csv');
    validator.validateReceipts('/home/ubuntu/upload/Receipts.csv');
    validator.validateReminders('/home/ubuntu/upload/Reminders.csv');
    validator.validateStock('/home/ubuntu/upload/Stock.csv');
    validator.validateAppointments('/home/ubuntu/upload/Appointments.csv');
    
    // Validate relationships between files
    validator.validateRelationships();
    
    // Generate comprehensive report
    const report = validator.generateValidationReport();
    
    return report;
    
  } catch (error) {
    console.error('💥 Validation failed:', error.message);
    process.exit(1);
  }
}

// Run validation
if (require.main === module) {
  runValidation().catch(console.error);
}

module.exports = { DataValidator, runValidation };

