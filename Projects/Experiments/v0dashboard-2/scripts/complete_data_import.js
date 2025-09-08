// GarageManagement Pro - Complete Data Import Script with LineItems
// This script imports ALL CSV data including the detailed line items

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const sql = neon(process.env.DATABASE_URL);

// CSV parsing utility (same as before)
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

// Data transformation utilities
function cleanPhoneNumber(phone) {
  if (!phone) return null;
  return phone.replace(/[^\d+\s-]/g, '').trim();
}

function parseDate(dateStr) {
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

function cleanCurrency(amount) {
  if (!amount || amount === '') return 0;
  return parseFloat(amount.toString().replace(/[£$,]/g, '')) || 0;
}

function cleanInteger(value) {
  if (!value || value === '') return null;
  const parsed = parseInt(value);
  return isNaN(parsed) ? null : parsed;
}

class CompleteDataImporter {
  constructor() {
    this.stats = {
      customers: { imported: 0, errors: 0 },
      vehicles: { imported: 0, errors: 0 },
      documents: { imported: 0, errors: 0 },
      lineItems: { imported: 0, errors: 0 },
      receipts: { imported: 0, errors: 0 },
      reminders: { imported: 0, errors: 0 },
      stock: { imported: 0, errors: 0 },
      appointments: { imported: 0, errors: 0 }
    };
  }

  async createTables() {
    console.log('🏗️  Creating complete database schema...');

    try {
      // Create customers table
      await sql`
        CREATE TABLE IF NOT EXISTS customers (
          id VARCHAR(255) PRIMARY KEY,
          account_number VARCHAR(50),
          name_title VARCHAR(10),
          name_forename VARCHAR(100),
          name_surname VARCHAR(100),
          name_company VARCHAR(255),
          contact_email VARCHAR(255),
          contact_mobile VARCHAR(50),
          contact_telephone VARCHAR(50),
          address_house_no VARCHAR(20),
          address_road VARCHAR(255),
          address_town VARCHAR(100),
          address_county VARCHAR(100),
          address_postcode VARCHAR(20),
          address_locality VARCHAR(100),
          classification VARCHAR(100),
          account_status INTEGER DEFAULT 0,
          account_credit_limit DECIMAL(10,2),
          account_credit_terms INTEGER,
          regular_customer BOOLEAN DEFAULT false,
          reminders_allowed BOOLEAN DEFAULT true,
          how_found_us VARCHAR(255),
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create vehicles table
      await sql`
        CREATE TABLE IF NOT EXISTS vehicles (
          id VARCHAR(255) PRIMARY KEY,
          customer_id VARCHAR(255) REFERENCES customers(id),
          registration VARCHAR(20) NOT NULL,
          make VARCHAR(100),
          model VARCHAR(255),
          colour VARCHAR(50),
          date_of_reg DATE,
          date_of_manufacture DATE,
          engine_cc INTEGER,
          engine_code VARCHAR(50),
          engine_no VARCHAR(100),
          fuel_type VARCHAR(50),
          vin VARCHAR(100),
          vehicle_type VARCHAR(100),
          body_style VARCHAR(100),
          transmission VARCHAR(50),
          key_code VARCHAR(50),
          radio_code VARCHAR(50),
          paint_code VARCHAR(10),
          notes TEXT,
          notes_reminders TEXT,
          last_invoice_date DATE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create comprehensive documents table
      await sql`
        CREATE TABLE IF NOT EXISTS documents (
          id VARCHAR(255) PRIMARY KEY,
          customer_id VARCHAR(255) REFERENCES customers(id),
          vehicle_id VARCHAR(255) REFERENCES vehicles(id),
          appointment_id VARCHAR(255),

          -- Document identification
          doc_type VARCHAR(20), -- SI (Sales Invoice), ES (Estimate), JS (Jobsheet), CR (Credit)
          doc_status VARCHAR(50),
          doc_user_status VARCHAR(50),
          doc_number_invoice VARCHAR(50),
          doc_number_estimate VARCHAR(50),
          doc_number_jobsheet VARCHAR(50),
          doc_number_credit VARCHAR(50),
          doc_order_ref VARCHAR(100),
          doc_department VARCHAR(100),

          -- Dates
          doc_date_created DATE,
          doc_date_issued DATE,
          doc_date_due_by DATE,
          doc_date_paid DATE,
          doc_date_printed DATE,
          doc_date_reconciled DATE,
          doc_date_exported DATE,

          -- Customer details (snapshot at time of document)
          cust_account_number VARCHAR(50),
          cust_name_title VARCHAR(10),
          cust_name_forename VARCHAR(100),
          cust_name_surname VARCHAR(100),
          cust_name_company VARCHAR(255),
          cust_cont_mobile VARCHAR(50),
          cust_cont_telephone VARCHAR(50),
          cust_address_house_no VARCHAR(20),
          cust_address_road VARCHAR(255),
          cust_address_town VARCHAR(100),
          cust_address_county VARCHAR(100),
          cust_address_postcode VARCHAR(20),

          -- Vehicle details (snapshot)
          veh_registration VARCHAR(20),
          veh_make VARCHAR(100),
          veh_model VARCHAR(255),
          veh_mileage INTEGER,

          -- Financial totals
          total_gross DECIMAL(10,2) DEFAULT 0,
          total_net DECIMAL(10,2) DEFAULT 0,
          total_tax DECIMAL(10,2) DEFAULT 0,
          total_receipts DECIMAL(10,2) DEFAULT 0,
          balance DECIMAL(10,2) DEFAULT 0,

          -- Labour totals
          labour_gross DECIMAL(10,2) DEFAULT 0,
          labour_net DECIMAL(10,2) DEFAULT 0,
          labour_tax DECIMAL(10,2) DEFAULT 0,
          labour_qty DECIMAL(8,2) DEFAULT 0,

          -- Parts totals
          parts_gross DECIMAL(10,2) DEFAULT 0,
          parts_net DECIMAL(10,2) DEFAULT 0,
          parts_tax DECIMAL(10,2) DEFAULT 0,

          -- MOT details
          mot_class VARCHAR(50),
          mot_type VARCHAR(50),
          mot_status VARCHAR(50),
          mot_cost DECIMAL(10,2) DEFAULT 0,
          mot_price DECIMAL(10,2) DEFAULT 0,
          mot_outsourced BOOLEAN DEFAULT false,

          -- Discounts and surcharges
          discount_global_invoice DECIMAL(5,2) DEFAULT 0,
          discount_global_labour DECIMAL(5,2) DEFAULT 0,
          discount_global_parts DECIMAL(5,2) DEFAULT 0,
          surcharge_percentage DECIMAL(5,2) DEFAULT 0,

          -- Status flags
          status_paid BOOLEAN DEFAULT false,
          status_printed BOOLEAN DEFAULT false,
          status_emailed BOOLEAN DEFAULT false,
          status_exported BOOLEAN DEFAULT false,
          status_reconciled BOOLEAN DEFAULT false,
          status_cashed_up BOOLEAN DEFAULT false,

          -- Staff assignments
          staff_technician VARCHAR(255),
          staff_mot_tester VARCHAR(255),
          staff_sales_person VARCHAR(255),
          staff_qc_technician VARCHAR(255),
          staff_road_tester VARCHAR(255),

          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create comprehensive line items table
      await sql`
        CREATE TABLE IF NOT EXISTS line_items (
          id VARCHAR(255) PRIMARY KEY,
          document_id VARCHAR(255) REFERENCES documents(id),
          stock_id VARCHAR(255),
          supplier_id VARCHAR(255),
          transaction_id VARCHAR(255),

          -- Item details
          item_description TEXT,
          item_part_number VARCHAR(100),
          item_supplier VARCHAR(255),
          item_supplier_invoice VARCHAR(100),
          item_supplier_purchase_date DATE,
          item_type INTEGER, -- 1=Labour, 2=Parts, etc.

          -- Quantities
          item_quantity DECIMAL(10,3),
          item_qty_from_stock DECIMAL(10,3),
          item_qty_from_orders DECIMAL(10,3),

          -- Pricing
          item_unit_cost DECIMAL(10,2),
          item_unit_price DECIMAL(10,2),

          -- Financial calculations
          item_sub_gross DECIMAL(10,2),
          item_sub_net DECIMAL(10,2),
          item_sub_tax DECIMAL(10,2),
          item_cost_sub_gross DECIMAL(10,2),
          item_cost_sub_net DECIMAL(10,2),
          item_cost_sub_tax DECIMAL(10,2),

          -- Tax details
          item_tax_code VARCHAR(10),
          item_tax_rate DECIMAL(5,2),
          item_tax_inclusive BOOLEAN DEFAULT false,
          item_cost_tax_code VARCHAR(10),
          item_cost_tax_rate DECIMAL(5,2),

          -- Discounts
          item_discount DECIMAL(5,2) DEFAULT 0,
          item_discount_global DECIMAL(5,2) DEFAULT 0,
          item_discount_total DECIMAL(5,2) DEFAULT 0,
          item_discount_amount_gross DECIMAL(10,2) DEFAULT 0,
          item_discount_amount_net DECIMAL(10,2) DEFAULT 0,

          -- Overrides
          override_gross DECIMAL(10,2),
          override_net DECIMAL(10,2),
          override_tax DECIMAL(10,2),

          -- Warranty and service
          item_guarantee VARCHAR(255),
          item_guarantee_notes TEXT,
          item_advisor_status VARCHAR(50),

          -- Tyre specific fields
          item_tyre_classification VARCHAR(50),
          item_tyre_fuel_economy VARCHAR(10),
          item_tyre_noise_level VARCHAR(10),
          item_tyre_noise_level_rating VARCHAR(10),
          item_tyre_noise_level_limit VARCHAR(10),
          item_tyre_nominal_width VARCHAR(10),
          item_tyre_wet_grip VARCHAR(10),

          -- System fields
          item_nominal_code VARCHAR(20),
          technician VARCHAR(255),
          doc_date_created DATE,

          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create receipts table
      await sql`
        CREATE TABLE IF NOT EXISTS receipts (
          id VARCHAR(255) PRIMARY KEY,
          document_id VARCHAR(255) REFERENCES documents(id),
          amount DECIMAL(10,2),
          date DATE,
          description TEXT,
          method VARCHAR(50),
          reconciled BOOLEAN DEFAULT false,
          reconciled_date DATE,
          reconciled_ref VARCHAR(100),
          sage_exported BOOLEAN DEFAULT false,
          sage_exported_date DATE,
          surcharge_applied BOOLEAN DEFAULT false,
          surcharge_gross DECIMAL(10,2),
          surcharge_net DECIMAL(10,2),
          surcharge_tax DECIMAL(10,2),
          total_receipt DECIMAL(10,2),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create reminders table
      await sql`
        CREATE TABLE IF NOT EXISTS reminders (
          id VARCHAR(255) PRIMARY KEY,
          template_id VARCHAR(255),
          vehicle_id VARCHAR(255) REFERENCES vehicles(id),
          due_date DATE,
          method_email BOOLEAN DEFAULT false,
          method_print BOOLEAN DEFAULT false,
          method_sms BOOLEAN DEFAULT false,
          actioned_email BOOLEAN DEFAULT false,
          actioned_print BOOLEAN DEFAULT false,
          actioned_sms BOOLEAN DEFAULT false,
          actioned_date_email DATE,
          actioned_date_print DATE,
          actioned_date_sms DATE,
          reschedule INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create stock table
      await sql`
        CREATE TABLE IF NOT EXISTS stock (
          id VARCHAR(255) PRIMARY KEY,
          supplier_id VARCHAR(255),
          item_description TEXT,
          item_category VARCHAR(100),
          item_category2 VARCHAR(100),
          item_part_number VARCHAR(100),
          item_manufacturer VARCHAR(100),
          item_supplier VARCHAR(100),
          item_cost_net DECIMAL(10,2),
          item_price_retail_net DECIMAL(10,2),
          item_price_trade_net DECIMAL(10,2),
          item_tax_code VARCHAR(10),
          item_markup_retail DECIMAL(5,2),
          item_markup_trade DECIMAL(5,2),
          qty_in_stock INTEGER DEFAULT 0,
          qty_available INTEGER DEFAULT 0,
          qty_on_order INTEGER DEFAULT 0,
          qty_physically_available INTEGER DEFAULT 0,
          low_stock_level INTEGER DEFAULT 0,
          item_location VARCHAR(100),
          item_notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create appointments table
      await sql`
        CREATE TABLE IF NOT EXISTS appointments (
          id VARCHAR(255) PRIMARY KEY,
          customer_id VARCHAR(255) REFERENCES customers(id),
          vehicle_id VARCHAR(255) REFERENCES vehicles(id),
          document_id VARCHAR(255) REFERENCES documents(id),
          appt_date_start DATE,
          appt_date_end DATE,
          appt_time_start TIME,
          appt_time_end TIME,
          appt_description TEXT,
          appt_duration VARCHAR(50),
          appt_resource VARCHAR(100),
          appt_type VARCHAR(50),
          cust_account_number VARCHAR(50),
          veh_registration VARCHAR(20),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create comprehensive indexes
      await sql`CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles(customer_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON documents(customer_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_documents_vehicle_id ON documents(vehicle_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_documents_date_created ON documents(doc_date_created)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_line_items_document_id ON line_items(document_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_line_items_stock_id ON line_items(stock_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_receipts_document_id ON receipts(document_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_reminders_vehicle_id ON reminders(vehicle_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_appointments_vehicle_id ON appointments(vehicle_id)`;

      console.log('✅ Complete database schema created successfully');

    } catch (error) {
      console.error('❌ Error creating tables:', error.message);
      throw error;
    }
  }

  // Import methods for customers, vehicles, documents (same as before)
  async importCustomers(csvPath) {
    console.log('👥 Importing customers...');

    try {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const customers = parseCSV(csvContent);

      console.log(`   Found ${customers.length} customers to import`);

      for (const customer of customers) {
        try {
          await sql`
            INSERT INTO customers (
              id, account_number, name_title, name_forename, name_surname, name_company,
              contact_email, contact_mobile, contact_telephone,
              address_house_no, address_road, address_town, address_county, address_postcode, address_locality,
              classification, account_status, account_credit_limit, account_credit_terms,
              regular_customer, reminders_allowed, how_found_us, notes
            ) VALUES (
              ${customer._ID},
              ${customer.AccountNumber},
              ${customer.nameTitle},
              ${customer.nameForename},
              ${customer.nameSurname},
              ${customer.nameCompany},
              ${customer.contactEmail},
              ${cleanPhoneNumber(customer.contactMobile)},
              ${cleanPhoneNumber(customer.contactTelephone)},
              ${customer.addressHouseNo},
              ${customer.addressRoad},
              ${customer.addressTown},
              ${customer.addressCounty},
              ${customer.addressPostCode},
              ${customer.addressLocality},
              ${customer.classification},
              ${parseInt(customer.AccountStatus) || 0},
              ${cleanCurrency(customer.AccountCreditLimit)},
              ${parseInt(customer.AccountCreditTerms) || 30},
              ${customer.regularCustomer === '1'},
              ${customer.remindersAllowed === '1'},
              ${customer.HowFoundUs},
              ${customer.Notes}
            )
            ON CONFLICT (id) DO UPDATE SET
              updated_at = NOW()
          `;

          this.stats.customers.imported++;

          if (this.stats.customers.imported % 1000 === 0) {
            console.log(`   Imported ${this.stats.customers.imported} customers...`);
          }

        } catch (error) {
          this.stats.customers.errors++;
          if (this.stats.customers.errors < 5) {
            console.log(`   ⚠️  Error importing customer ${customer._ID}: ${error.message}`);
          }
        }
      }

      console.log(`✅ Customers import complete: ${this.stats.customers.imported} imported, ${this.stats.customers.errors} errors`);

    } catch (error) {
      console.error('❌ Error importing customers:', error.message);
      throw error;
    }
  }

  async importVehicles(csvPath) {
    console.log('🚗 Importing vehicles...');

    try {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const vehicles = parseCSV(csvContent);

      console.log(`   Found ${vehicles.length} vehicles to import`);

      for (const vehicle of vehicles) {
        try {
          await sql`
            INSERT INTO vehicles (
              id, customer_id, registration, make, model, colour,
              date_of_reg, date_of_manufacture, engine_cc, engine_code, engine_no,
              fuel_type, vin, vehicle_type, body_style, transmission,
              key_code, radio_code, paint_code, notes, notes_reminders,
              last_invoice_date
            ) VALUES (
              ${vehicle._ID},
              ${vehicle._ID_Customer},
              ${vehicle.Registration?.toUpperCase()},
              ${vehicle.Make},
              ${vehicle.Model},
              ${vehicle.Colour},
              ${parseDate(vehicle.DateofReg)},
              ${parseDate(vehicle.DateofManufacture)},
              ${parseInt(vehicle.EngineCC) || null},
              ${vehicle.EngineCode},
              ${vehicle.EngineNo},
              ${vehicle.FuelType},
              ${vehicle.VIN},
              ${vehicle.VehicleType},
              ${vehicle.BodyStyle},
              ${vehicle.Transmission},
              ${vehicle.KeyCode},
              ${vehicle.RadioCode},
              ${vehicle.Paintcode},
              ${vehicle.Notes},
              ${vehicle.Notes_Reminders},
              ${parseDate(vehicle.status_LastInvoiceDate)}
            )
            ON CONFLICT (id) DO UPDATE SET
              updated_at = NOW()
          `;

          this.stats.vehicles.imported++;

          if (this.stats.vehicles.imported % 1000 === 0) {
            console.log(`   Imported ${this.stats.vehicles.imported} vehicles...`);
          }

        } catch (error) {
          this.stats.vehicles.errors++;
          if (this.stats.vehicles.errors < 5) {
            console.log(`   ⚠️  Error importing vehicle ${vehicle._ID}: ${error.message}`);
          }
        }
      }

      console.log(`✅ Vehicles import complete: ${this.stats.vehicles.imported} imported, ${this.stats.vehicles.errors} errors`);

    } catch (error) {
      console.error('❌ Error importing vehicles:', error.message);
      throw error;
    }
  }

  async importDocuments(csvPath) {
    console.log('📄 Importing documents (invoices, estimates, jobsheets)...');

    try {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const documents = parseCSV(csvContent);

      console.log(`   Found ${documents.length} documents to import`);

      for (const doc of documents) {
        try {
          await sql`
            INSERT INTO documents (
              id, customer_id, vehicle_id, appointment_id,
              doc_type, doc_status, doc_user_status,
              doc_number_invoice, doc_number_estimate, doc_number_jobsheet, doc_number_credit,
              doc_order_ref, doc_department,
              doc_date_created, doc_date_issued, doc_date_due_by, doc_date_paid,
              doc_date_printed, doc_date_reconciled, doc_date_exported,
              cust_account_number, cust_name_title, cust_name_forename, cust_name_surname, cust_name_company,
              cust_cont_mobile, cust_cont_telephone,
              cust_address_house_no, cust_address_road, cust_address_town, cust_address_county, cust_address_postcode,
              veh_registration, veh_make, veh_model, veh_mileage,
              total_gross, total_net, total_tax, total_receipts, balance,
              labour_gross, labour_net, labour_tax, labour_qty,
              parts_gross, parts_net, parts_tax,
              mot_class, mot_type, mot_status, mot_cost, mot_price, mot_outsourced,
              discount_global_invoice, discount_global_labour, discount_global_parts, surcharge_percentage,
              status_paid, status_printed, status_emailed, status_exported, status_reconciled, status_cashed_up,
              staff_technician, staff_mot_tester, staff_sales_person, staff_qc_technician, staff_road_tester
            ) VALUES (
              ${doc._ID},
              ${doc._ID_Customer || null},
              ${doc._ID_Vehicle || null},
              ${doc._ID_Appointment || null},
              ${doc.docType},
              ${doc.docStatus},
              ${doc.docUserStatus},
              ${doc.docNumber_Invoice},
              ${doc.docNumber_Estimate},
              ${doc.docNumber_Jobsheet},
              ${doc.docNumber_Credit},
              ${doc.docOrderRef},
              ${doc.docDepartment},
              ${parseDate(doc.docDate_Created)},
              ${parseDate(doc.docDate_Issued)},
              ${parseDate(doc.docDate_DueBy)},
              ${parseDate(doc.docDate_Paid)},
              ${parseDate(doc.docDate_Printed)},
              ${parseDate(doc.docDate_Reconciled)},
              ${parseDate(doc.docDate_Exported)},
              ${doc.custAccountNumber},
              ${doc.custName_Title},
              ${doc.custName_Forename},
              ${doc.custName_Surname},
              ${doc.custName_Company},
              ${cleanPhoneNumber(doc.custCont_Mobile)},
              ${cleanPhoneNumber(doc.custCont_Telephone)},
              ${doc.custAddress_HouseNo},
              ${doc.custAddress_Road},
              ${doc.custAddress_Town},
              ${doc.custAddress_County},
              ${doc.custAddress_PostCode},
              ${doc.vehRegistration?.toUpperCase()},
              ${doc.vehMake},
              ${doc.vehModel},
              ${cleanInteger(doc.vehMileage)},
              ${cleanCurrency(doc.us_TotalGROSS)},
              ${cleanCurrency(doc.us_TotalNET)},
              ${cleanCurrency(doc.us_TotalTAX)},
              ${cleanCurrency(doc.us_TotalReceipts)},
              ${cleanCurrency(doc.us_Balance)},
              ${cleanCurrency(doc.us_SubTotal_LabourGROSS)},
              ${cleanCurrency(doc.us_SubTotal_LabourNET)},
              ${cleanCurrency(doc.us_SubTotal_LabourTAX)},
              ${parseFloat(doc.us_LabourQty) || 0},
              ${cleanCurrency(doc.us_SubTotal_PartsGROSS)},
              ${cleanCurrency(doc.us_SubTotal_PartsNET)},
              ${cleanCurrency(doc.us_SubTotal_PartsTAX)},
              ${doc.motClass},
              ${doc.motType},
              ${doc.motStatus},
              ${cleanCurrency(doc.motCost)},
              ${cleanCurrency(doc.motPrice)},
              ${doc.motOutsourced === '1'},
              ${parseFloat(doc.discountGlobal_Invoice) || 0},
              ${parseFloat(doc.discountGlobal_Labour) || 0},
              ${parseFloat(doc.discountGlobal_Parts) || 0},
              ${parseFloat(doc.surchargePercentage) || 0},
              ${doc.docStatus_Paid === '1'},
              ${doc.docStatus_Printed === '1'},
              ${doc.docStatus_Emailed === '1'},
              ${doc.docStatus_Exported === '1'},
              ${doc.docStatus_Reconciled === '1'},
              ${doc.docStatus_CashedUp === '1'},
              ${doc.staffTechnician},
              ${doc.staffMOTTester},
              ${doc.staffSalesPerson},
              ${doc.staffQCTechnician},
              ${doc.staffRoadTester}
            )
            ON CONFLICT (id) DO UPDATE SET
              updated_at = NOW()
          `;

          this.stats.documents.imported++;

          if (this.stats.documents.imported % 5000 === 0) {
            console.log(`   Imported ${this.stats.documents.imported} documents...`);
          }

        } catch (error) {
          this.stats.documents.errors++;
          if (this.stats.documents.errors < 10) {
            console.log(`   ⚠️  Error importing document ${doc._ID}: ${error.message}`);
          }
        }
      }

      console.log(`✅ Documents import complete: ${this.stats.documents.imported} imported, ${this.stats.documents.errors} errors`);

    } catch (error) {
      console.error('❌ Error importing documents:', error.message);
      throw error;
    }
  }

  async importLineItems(csvPath) {
    console.log('📋 Importing line items (detailed invoice/estimate breakdown)...');

    try {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const lineItems = parseCSV(csvContent);

      console.log(`   Found ${lineItems.length} line items to import`);

      for (const item of lineItems) {
        try {
          await sql`
            INSERT INTO line_items (
              id, document_id, stock_id, supplier_id, transaction_id,
              item_description, item_part_number, item_supplier, item_supplier_invoice, item_supplier_purchase_date,
              item_type, item_quantity, item_qty_from_stock, item_qty_from_orders,
              item_unit_cost, item_unit_price,
              item_sub_gross, item_sub_net, item_sub_tax,
              item_cost_sub_gross, item_cost_sub_net, item_cost_sub_tax,
              item_tax_code, item_tax_rate, item_tax_inclusive,
              item_cost_tax_code, item_cost_tax_rate,
              item_discount, item_discount_global, item_discount_total,
              item_discount_amount_gross, item_discount_amount_net,
              override_gross, override_net, override_tax,
              item_guarantee, item_guarantee_notes, item_advisor_status,
              item_tyre_classification, item_tyre_fuel_economy, item_tyre_noise_level,
              item_tyre_noise_level_rating, item_tyre_noise_level_limit,
              item_tyre_nominal_width, item_tyre_wet_grip,
              item_nominal_code, technician, doc_date_created
            ) VALUES (
              ${item._ID},
              ${item._ID_Document},
              ${item._ID_Stock || null},
              ${item._ID_Supplier || null},
              ${item._ID_Transaction || null},
              ${item.itemDescription},
              ${item.itemPartNumber},
              ${item.itemSupplier},
              ${item.itemSupplier_Invoice},
              ${parseDate(item.itemSupplier_PurchaseDate)},
              ${cleanInteger(item.itemType)},
              ${parseFloat(item.itemQuantity) || 0},
              ${parseFloat(item.sys_itemQtyfromStock) || 0},
              ${parseFloat(item.sys_itemQtyfromOrders) || 0},
              ${cleanCurrency(item.itemUnitCost)},
              ${cleanCurrency(item.itemUnitPrice)},
              ${cleanCurrency(item.itemSub_Gross)},
              ${cleanCurrency(item.itemSub_Net)},
              ${cleanCurrency(item.itemSub_Tax)},
              ${cleanCurrency(item.itemCostSub_Gross)},
              ${cleanCurrency(item.itemCostSub_Net)},
              ${cleanCurrency(item.itemCostSub_Tax)},
              ${item.itemTaxCode},
              ${parseFloat(item.itemTaxRate) || 0},
              ${item.itemTaxInclusive === '1'},
              ${item.itemCostTaxCode},
              ${parseFloat(item.itemCostTaxRate) || 0},
              ${parseFloat(item.itemDiscount) || 0},
              ${parseFloat(item.itemDiscount_Global) || 0},
              ${parseFloat(item.itemDiscount_Total) || 0},
              ${cleanCurrency(item.sys_itemDiscountAmount_Gross)},
              ${cleanCurrency(item.sys_itemDiscountAmount_Net)},
              ${cleanCurrency(item.Override_GROSS)},
              ${cleanCurrency(item.Override_NET)},
              ${cleanCurrency(item.Override_TAX)},
              ${item.itemGuarantee},
              ${item.itemGuarantee_Notes},
              ${item.itemAdvisorStatus},
              ${item.itemTyre_Classification},
              ${item.itemTyre_FuelEconomy},
              ${item.itemTyre_NoiseLevel},
              ${item.itemTyre_NoiseLevel_Rating},
              ${item.itemTyre_NoiseLevelLimit},
              ${item.itemTyre_NominalWidth},
              ${item.itemTyre_WetGrip},
              ${item.itemNominalCode},
              ${item.technician},
              ${parseDate(item.sys_docDate_Created)}
            )
            ON CONFLICT (id) DO UPDATE SET
              updated_at = NOW()
          `;

          this.stats.lineItems.imported++;

          if (this.stats.lineItems.imported % 10000 === 0) {
            console.log(`   Imported ${this.stats.lineItems.imported} line items...`);
          }

        } catch (error) {
          this.stats.lineItems.errors++;
          if (this.stats.lineItems.errors < 10) {
            console.log(`   ⚠️  Error importing line item ${item._ID}: ${error.message}`);
          }
        }
      }

      console.log(`✅ Line items import complete: ${this.stats.lineItems.imported} imported, ${this.stats.lineItems.errors} errors`);

    } catch (error) {
      console.error('❌ Error importing line items:', error.message);
      throw error;
    }
  }

  // Import methods for receipts, reminders, stock, appointments (same as before but abbreviated for space)
  async importReceipts(csvPath) {
    console.log('💰 Importing receipts...');

    try {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const receipts = parseCSV(csvContent);

      console.log(`   Found ${receipts.length} receipts to import`);

      for (const receipt of receipts) {
        try {
          await sql`
            INSERT INTO receipts (
              id, document_id, amount, date, description, method,
              reconciled, reconciled_date, reconciled_ref,
              sage_exported, sage_exported_date,
              surcharge_applied, surcharge_gross, surcharge_net, surcharge_tax,
              total_receipt
            ) VALUES (
              ${receipt._ID}, ${receipt._ID_Document}, ${cleanCurrency(receipt.Amount)},
              ${parseDate(receipt.Date)}, ${receipt.Description}, ${receipt.Method},
              ${receipt.Reconciled === '1'}, ${parseDate(receipt.Reconciled_Date)}, ${receipt.Reconciled_Ref},
              ${receipt.sageExported === '1'}, ${parseDate(receipt.sageExported_date)},
              ${receipt.SurchargeApplied === '1'}, ${cleanCurrency(receipt.SurchargeGROSS)},
              ${cleanCurrency(receipt.SurchargeNET)}, ${cleanCurrency(receipt.SurchargeTAX)},
              ${cleanCurrency(receipt.TotalReceipt)}
            )
            ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
          `;

          this.stats.receipts.imported++;

          if (this.stats.receipts.imported % 5000 === 0) {
            console.log(`   Imported ${this.stats.receipts.imported} receipts...`);
          }

        } catch (error) {
          this.stats.receipts.errors++;
        }
      }

      console.log(`✅ Receipts import complete: ${this.stats.receipts.imported} imported, ${this.stats.receipts.errors} errors`);

    } catch (error) {
      console.error('❌ Error importing receipts:', error.message);
      throw error;
    }
  }

  async importReminders(csvPath) {
    console.log('⏰ Importing reminders...');

    try {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const reminders = parseCSV(csvContent);

      console.log(`   Found ${reminders.length} reminders to import`);

      for (const reminder of reminders) {
        try {
          await sql`
            INSERT INTO reminders (
              id, template_id, vehicle_id, due_date,
              method_email, method_print, method_sms,
              actioned_email, actioned_print, actioned_sms,
              actioned_date_email, actioned_date_print, actioned_date_sms,
              reschedule
            ) VALUES (
              ${reminder._ID}, ${reminder._ID_Template}, ${reminder._ID_Vehicle}, ${parseDate(reminder.DueDate)},
              ${reminder.method_Email === '1'}, ${reminder.method_Print === '1'}, ${reminder.method_SMS === '1'},
              ${reminder.actioned_Email === '1'}, ${reminder.actioned_Print === '1'}, ${reminder.actioned_SMS === '1'},
              ${parseDate(reminder.actionedDate_Email)}, ${parseDate(reminder.actionedDate_Print)}, ${parseDate(reminder.actionedDate_SMS)},
              ${parseInt(reminder.Reschedule) || 0}
            )
            ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
          `;

          this.stats.reminders.imported++;

          if (this.stats.reminders.imported % 2000 === 0) {
            console.log(`   Imported ${this.stats.reminders.imported} reminders...`);
          }

        } catch (error) {
          this.stats.reminders.errors++;
        }
      }

      console.log(`✅ Reminders import complete: ${this.stats.reminders.imported} imported, ${this.stats.reminders.errors} errors`);

    } catch (error) {
      console.error('❌ Error importing reminders:', error.message);
      throw error;
    }
  }

  async importStock(csvPath) {
    console.log('📦 Importing stock...');

    try {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const stock = parseCSV(csvContent);

      console.log(`   Found ${stock.length} stock items to import`);

      for (const item of stock) {
        try {
          await sql`
            INSERT INTO stock (
              id, supplier_id, item_description, item_category, item_category2,
              item_part_number, item_manufacturer, item_supplier,
              item_cost_net, item_price_retail_net, item_price_trade_net,
              item_tax_code, item_markup_retail, item_markup_trade,
              qty_in_stock, qty_available, qty_on_order, qty_physically_available,
              low_stock_level, item_location, item_notes
            ) VALUES (
              ${item._ID}, ${item._ID_Supplier}, ${item.itemDescription}, ${item.itemCategory}, ${item.itemCategory2},
              ${item.itemPartNumber}, ${item.itemManufacturer}, ${item.itemSupplier},
              ${cleanCurrency(item.itemCostNET)}, ${cleanCurrency(item.itemPriceRetailNET)}, ${cleanCurrency(item.itemPriceTradeNET)},
              ${item.itemTaxCode}, ${parseFloat(item.itemMarkupRetail) || null}, ${parseFloat(item.itemMarkupTrade) || null},
              ${parseInt(item.qtyInStock) || 0}, ${parseInt(item.qtyAvailable) || 0}, ${parseInt(item.qtyOnOrder) || 0}, ${parseInt(item.qtyPhysicallyAvailable) || 0},
              ${parseInt(item.itemLowStockLevel) || 0}, ${item.itemLocation}, ${item.itemNotes}
            )
            ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
          `;

          this.stats.stock.imported++;

        } catch (error) {
          this.stats.stock.errors++;
        }
      }

      console.log(`✅ Stock import complete: ${this.stats.stock.imported} imported, ${this.stats.stock.errors} errors`);

    } catch (error) {
      console.error('❌ Error importing stock:', error.message);
      throw error;
    }
  }

  async importAppointments(csvPath) {
    console.log('📅 Importing appointments...');

    try {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const appointments = parseCSV(csvContent);

      console.log(`   Found ${appointments.length} appointments to import`);

      for (const appt of appointments) {
        try {
          await sql`
            INSERT INTO appointments (
              id, customer_id, vehicle_id, document_id,
              appt_date_start, appt_date_end,
              appt_description, appt_duration, appt_resource, appt_type,
              cust_account_number, veh_registration
            ) VALUES (
              ${appt._ID}, ${appt._ID_Customer}, ${appt._ID_Vehicle}, ${appt._ID_Document},
              ${parseDate(appt.ApptDateStart)}, ${parseDate(appt.ApptDateEnd)},
              ${appt.ApptDescEntry}, ${appt.ApptDuration}, ${appt.ApptResource}, ${appt.ApptType},
              ${appt.custAccountNumber}, ${appt.vehRegistration}
            )
            ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
          `;

          this.stats.appointments.imported++;

        } catch (error) {
          this.stats.appointments.errors++;
        }
      }

      console.log(`✅ Appointments import complete: ${this.stats.appointments.imported} imported, ${this.stats.appointments.errors} errors`);

    } catch (error) {
      console.error('❌ Error importing appointments:', error.message);
      throw error;
    }
  }

  async generateFinalReport() {
    console.log('📊 Generating comprehensive final report...');

    const totalImported = Object.values(this.stats).reduce((sum, stat) => sum + stat.imported, 0);
    const totalErrors = Object.values(this.stats).reduce((sum, stat) => sum + stat.errors, 0);

    console.log('');
    console.log('🎉 COMPLETE GARAGEMANAGEMENT PRO DATA IMPORT - FINAL REPORT');
    console.log('===========================================================');
    console.log(`📊 Total Records Imported: ${totalImported.toLocaleString()}`);
    console.log(`⚠️  Total Errors: ${totalErrors.toLocaleString()}`);
    console.log('');
    console.log('📋 Complete Breakdown by Table:');
    console.log(`   👥 Customers:    ${this.stats.customers.imported.toLocaleString()} imported, ${this.stats.customers.errors} errors`);
    console.log(`   🚗 Vehicles:     ${this.stats.vehicles.imported.toLocaleString()} imported, ${this.stats.vehicles.errors} errors`);
    console.log(`   📄 Documents:    ${this.stats.documents.imported.toLocaleString()} imported, ${this.stats.documents.errors} errors`);
    console.log(`   📋 Line Items:   ${this.stats.lineItems.imported.toLocaleString()} imported, ${this.stats.lineItems.errors} errors`);
    console.log(`   💰 Receipts:     ${this.stats.receipts.imported.toLocaleString()} imported, ${this.stats.receipts.errors} errors`);
    console.log(`   ⏰ Reminders:    ${this.stats.reminders.imported.toLocaleString()} imported, ${this.stats.reminders.errors} errors`);
    console.log(`   📦 Stock:        ${this.stats.stock.imported.toLocaleString()} imported, ${this.stats.stock.errors} errors`);
    console.log(`   📅 Appointments: ${this.stats.appointments.imported.toLocaleString()} imported, ${this.stats.appointments.errors} errors`);
    console.log('');

    // Comprehensive business analytics
    try {
      const analytics = await sql`
        SELECT
          (SELECT COUNT(*) FROM customers) as total_customers,
          (SELECT COUNT(*) FROM vehicles) as total_vehicles,
          (SELECT COUNT(*) FROM documents) as total_documents,
          (SELECT COUNT(*) FROM line_items) as total_line_items,
          (SELECT COUNT(*) FROM receipts) as total_receipts,
          (SELECT COUNT(*) FROM reminders) as total_reminders,
          (SELECT COUNT(*) FROM stock) as total_stock,
          (SELECT COUNT(*) FROM appointments) as total_appointments,

          -- Business metrics
          (SELECT SUM(total_gross) FROM documents WHERE doc_type = 'SI' AND status_paid = true) as total_revenue,
          (SELECT COUNT(*) FROM documents WHERE doc_type = 'SI') as total_invoices,
          (SELECT COUNT(*) FROM documents WHERE doc_type = 'ES') as total_estimates,
          (SELECT COUNT(*) FROM documents WHERE doc_type = 'JS') as total_jobsheets,
          (SELECT COUNT(*) FROM documents WHERE mot_status = 'Pass') as mot_passes,
          (SELECT COUNT(*) FROM documents WHERE mot_status = 'Fail') as mot_fails,

          -- Data relationships
          (SELECT COUNT(*) FROM vehicles WHERE customer_id IS NOT NULL) as vehicles_with_customers,
          (SELECT COUNT(*) FROM documents WHERE customer_id IS NOT NULL) as documents_with_customers,
          (SELECT COUNT(*) FROM documents WHERE vehicle_id IS NOT NULL) as documents_with_vehicles,
          (SELECT COUNT(*) FROM line_items WHERE document_id IS NOT NULL) as line_items_with_documents,
          (SELECT COUNT(*) FROM receipts WHERE document_id IS NOT NULL) as receipts_with_documents,
          (SELECT COUNT(*) FROM reminders WHERE vehicle_id IS NOT NULL) as reminders_with_vehicles,

          -- Financial summary
          (SELECT SUM(labour_gross) FROM documents WHERE doc_type = 'SI') as total_labour_revenue,
          (SELECT SUM(parts_gross) FROM documents WHERE doc_type = 'SI') as total_parts_revenue,
          (SELECT SUM(amount) FROM receipts) as total_payments_received,
          (SELECT COUNT(DISTINCT customer_id) FROM documents WHERE doc_date_created >= CURRENT_DATE - INTERVAL '12 months') as active_customers_12m
      `;

      const stats = analytics[0];

      console.log('🔗 Data Relationship Verification:');
      console.log(`   Vehicles linked to customers: ${stats.vehicles_with_customers}/${stats.total_vehicles} (${Math.round(stats.vehicles_with_customers/stats.total_vehicles*100)}%)`);
      console.log(`   Documents linked to customers: ${stats.documents_with_customers}/${stats.total_documents} (${Math.round(stats.documents_with_customers/stats.total_documents*100)}%)`);
      console.log(`   Documents linked to vehicles: ${stats.documents_with_vehicles}/${stats.total_documents} (${Math.round(stats.documents_with_vehicles/stats.total_documents*100)}%)`);
      console.log(`   Line items linked to documents: ${stats.line_items_with_documents}/${stats.total_line_items} (${Math.round(stats.line_items_with_documents/stats.total_line_items*100)}%)`);
      console.log(`   Receipts linked to documents: ${stats.receipts_with_documents}/${stats.total_receipts} (${Math.round(stats.receipts_with_documents/stats.total_receipts*100)}%)`);
      console.log(`   Reminders linked to vehicles: ${stats.reminders_with_vehicles}/${stats.total_reminders} (${Math.round(stats.reminders_with_vehicles/stats.total_reminders*100)}%)`);
      console.log('');

      console.log('💼 Complete Business Analytics:');
      console.log(`   Total Revenue (Paid Invoices): £${(stats.total_revenue || 0).toLocaleString()}`);
      console.log(`   Labour Revenue: £${(stats.total_labour_revenue || 0).toLocaleString()}`);
      console.log(`   Parts Revenue: £${(stats.total_parts_revenue || 0).toLocaleString()}`);
      console.log(`   Total Payments Received: £${(stats.total_payments_received || 0).toLocaleString()}`);
      console.log(`   Total Invoices: ${stats.total_invoices.toLocaleString()}`);
      console.log(`   Total Estimates: ${stats.total_estimates.toLocaleString()}`);
      console.log(`   Total Jobsheets: ${stats.total_jobsheets.toLocaleString()}`);
      console.log(`   MOT Tests - Pass: ${stats.mot_passes.toLocaleString()}, Fail: ${stats.mot_fails.toLocaleString()}`);
      console.log(`   Active Customers (12 months): ${stats.active_customers_12m.toLocaleString()}`);
      console.log('');

      console.log('✅ YOUR GARAGEMANAGEMENT PRO DATABASE IS NOW COMPLETE!');
      console.log('');
      console.log('🚀 What you now have:');
      console.log('   • Complete customer database with full contact details');
      console.log('   • Comprehensive vehicle records with DVLA data and history');
      console.log('   • Full invoice/estimate/jobsheet system with detailed breakdowns');
      console.log('   • Complete line-by-line breakdown of all services and parts');
      console.log('   • Comprehensive payment and receipt tracking');
      console.log('   • MOT reminder system with complete history');
      console.log('   • Stock management system with pricing and availability');
      console.log('   • Appointment booking and scheduling records');
      console.log('');
      console.log('💡 Your platform is now ready for:');
      console.log('   1. Full business operations');
      console.log('   2. Financial reporting and analytics');
      console.log('   3. Customer relationship management');
      console.log('   4. Inventory management');
      console.log('   5. MOT and service reminders');
      console.log('   6. Detailed invoicing and estimates');
      console.log('');
      console.log('🔧 Next steps:');
      console.log('   1. Test all application features with the imported data');
      console.log('   2. Verify business processes are working correctly');
      console.log('   3. Set up automated database backups');
      console.log('   4. Configure user access and permissions');
      console.log('   5. Train staff on the system');

    } catch (error) {
      console.log('⚠️  Could not generate business analytics:', error.message);
    }
  }
}

// Main import function
async function runCompleteImport() {
  console.log('🚀 GarageManagement Pro - Complete Data Import with LineItems');
  console.log('=============================================================');
  console.log('');

  const importer = new CompleteDataImporter();

  try {
    // Step 1: Create complete database schema
    await importer.createTables();
    console.log('');

    // Step 2: Import data in dependency order
    await importer.importCustomers('/Users/adamrutstein/Desktop/GA4 Export/Customers.csv');
    await importer.importVehicles('/Users/adamrutstein/Desktop/GA4 Export/Vehicles.csv');
    await importer.importDocuments('/Users/adamrutstein/Desktop/GA4 Export/Documents.csv');
    await importer.importLineItems('/Users/adamrutstein/Desktop/GA4 Export/LineItems.csv');
    await importer.importStock('/Users/adamrutstein/Desktop/GA4 Export/Stock.csv');
    await importer.importReceipts('/Users/adamrutstein/Desktop/GA4 Export/Receipts.csv');
    await importer.importReminders('/Users/adamrutstein/Desktop/GA4 Export/Reminders.csv');
    await importer.importAppointments('/Users/adamrutstein/Desktop/GA4 Export/Appointments.csv');

    // Step 3: Generate comprehensive final report
    await importer.generateFinalReport();

  } catch (error) {
    console.error('💥 Import failed:', error.message);
    console.error('   Check your database connection and CSV file paths');
    process.exit(1);
  }
}

// Run the complete import
if (require.main === module) {
  runCompleteImport().catch(console.error);
}

module.exports = { CompleteDataImporter, runCompleteImport };

