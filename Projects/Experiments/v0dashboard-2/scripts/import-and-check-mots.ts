import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Interface for customer data
interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postcode: string;
  country: string;
  date_of_birth: string;
  created_at: string;
  updated_at: string;
}

// Interface for vehicle data
interface Vehicle {
  registration: string;
  make: string;
  model: string;
  year: number;
  color: string;
  fuel_type: string;
  engine_size: number;
  vin: string;
  mot_status: string;
  mot_expiry_date: string;
  tax_status: string;
  tax_due_date: string;
  owner_id: string;
}

// Function to import customers
async function importCustomers(filePath: string): Promise<number> {
  console.log(`Importing customers from ${filePath}...`);
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records: Customer[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  let importedCount = 0;
  
  for (const record of records) {
    try {
      const query = `
        INSERT INTO customers (
          id, first_name, last_name, email, phone, 
          address_line1, address_line2, city, postcode, country,
          date_of_birth, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          address_line1 = EXCLUDED.address_line1,
          address_line2 = EXCLUDED.address_line2,
          city = EXCLUDED.city,
          postcode = EXCLUDED.postcode,
          country = EXCLUDED.country,
          date_of_birth = EXCLUDED.date_of_birth,
          updated_at = NOW()
      `;
      
      await pool.query(query, [
        record.id,
        record.first_name,
        record.last_name,
        record.email,
        record.phone,
        record.address_line1,
        record.address_line2 || null,
        record.city,
        record.postcode,
        record.country,
        record.date_of_birth,
        record.created_at || new Date().toISOString(),
        record.updated_at || new Date().toISOString()
      ]);
      
      importedCount++;
    } catch (error) {
      console.error(`Error importing customer ${record.id}:`, error);
    }
  }
  
  console.log(`Imported ${importedCount} customers.`);
  return importedCount;
}

// Function to import vehicles
async function importVehicles(filePath: string): Promise<number> {
  console.log(`Importing vehicles from ${filePath}...`);
  
  // Use readFileSync for simplicity in this script
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, { 
    columns: true, 
    skip_empty_lines: true,
    trim: true
  });
  
  let importedCount = 0;
  
  for (const record of records) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Clean registration - remove spaces and convert to uppercase
      const cleanRegistration = record.registration.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      
      // Parse dates
      const motExpiryDate = record.mot_expiry_date ? new Date(record.mot_expiry_date) : null;
      const taxDueDate = record.tax_due_date ? new Date(record.tax_due_date) : null;
      
      // Check if owner exists if owner_id is provided
      let ownerId = null;
      if (record.owner_id) {
        const ownerResult = await client.query(
          'SELECT id FROM customers WHERE id = $1',
          [record.owner_id]
        );
        
        if (ownerResult.rows.length > 0) {
          ownerId = ownerResult.rows[0].id;
        } else {
          console.warn(`⚠️ Owner with ID ${record.owner_id} not found for vehicle ${cleanRegistration}`);
        }
      }
      
      // Insert or update vehicle
      const result = await client.query(
        `INSERT INTO vehicles (
          registration, make, model, year, color, fuel_type, engine_size, 
          vin, mot_status, mot_expiry_date, tax_status, tax_due_date, owner_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (registration) 
        DO UPDATE SET 
          make = EXCLUDED.make,
          model = EXCLUDED.model,
          year = EXCLUDED.year,
          color = EXCLUDED.color,
          fuel_type = EXCLUDED.fuel_type,
          engine_size = EXCLUDED.engine_size,
          vin = EXCLUDED.vin,
          mot_status = EXCLUDED.mot_status,
          mot_expiry_date = EXCLUDED.mot_expiry_date,
          tax_status = EXCLUDED.tax_status,
          tax_due_date = EXCLUDED.tax_due_date,
          owner_id = EXCLUDED.owner_id,
          updated_at = NOW()
        RETURNING id`,
        [
          cleanRegistration,
          record.make || null,
          record.model || null,
          record.year ? parseInt(String(record.year), 10) : null,
          record.color || null,
          record.fuel_type || null,
          record.engine_size ? parseFloat(String(record.engine_size)) : null,
          record.vin || null,
          record.mot_status || 'Unknown',
          motExpiryDate,
          record.tax_status || null,
          taxDueDate,
          ownerId
        ]
      );
      
      await client.query('COMMIT');
      importedCount++;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Error importing vehicle ${record.registration || 'unknown'}:`, 
        error instanceof Error ? error.message : 'Unknown error');
    } finally {
      client.release();
    }
  }
  
  console.log(`✅ Imported ${importedCount} vehicles.`);
  return importedCount;
}

// Function to send email notification
async function sendMotReminderEmail(vehicle: any, daysUntilExpiry: number): Promise<boolean> {
  const { first_name, last_name, email, registration, make, model, mot_expiry_date } = vehicle;
  
  if (!email) {
    console.log(`   No email address for ${first_name} ${last_name}`);
    return false;
  }
  
  try {
    // In a real application, you would send an actual email here
    // This is a placeholder for the email sending logic
    console.log(`   📧 Sending email to: ${first_name} ${last_name} <${email}>`);
    console.log(`   Subject: 🔔 MOT Reminder: ${make} ${model} (${registration})`);
    
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log(`   ✅ Email sent successfully`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to send email:`, error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// Function to check MOT expiries and send reminders
async function checkMotExpiries(daysBefore = 90): Promise<void> {
  console.log(`Checking for MOTs expiring in the next ${daysBefore} days...`);
  
  // First, update MOT status based on expiry date
  await pool.query(`
    UPDATE vehicles 
    SET mot_status = 'Expired',
        updated_at = NOW()
    WHERE mot_expiry_date < CURRENT_DATE 
    AND (mot_status != 'Expired' OR mot_status IS NULL);
  `);
  
  // Get vehicles with MOTs expiring soon
  const query = `
    SELECT 
      v.id,
      v.registration, 
      v.make, 
      v.model, 
      v.mot_expiry_date,
      v.mot_status,
      v.owner_id,
      c.first_name,
      c.last_name,
      c.email,
      c.phone
    FROM vehicles v
    LEFT JOIN customers c ON v.owner_id::text = c.id::text
    WHERE 
      v.mot_expiry_date IS NOT NULL
      AND (
        (v.mot_status = 'Valid' AND v.mot_expiry_date <= (CURRENT_DATE + INTERVAL '${daysBefore} days'))
        OR v.mot_expiry_date < CURRENT_DATE
      )
    ORDER BY 
      CASE 
        WHEN v.mot_expiry_date < CURRENT_DATE THEN 0
        ELSE 1
      END,
      v.mot_expiry_date ASC
  `;
  
  const result = await pool.query(query);
  
  if (result.rows.length === 0) {
    console.log('No MOTs expiring soon or already expired.');
    return;
  }
  
  const expired = result.rows.filter(v => new Date(v.mot_expiry_date) < new Date());
  const expiringSoon = result.rows.filter(v => new Date(v.mot_expiry_date) >= new Date());
  
  if (expired.length > 0) {
    console.log(`\n=== EXPIRED MOTs (${expired.length} vehicles) ===`);
    for (const vehicle of expired) {
      const expiryDate = new Date(vehicle.mot_expiry_date);
      const daysSinceExpiry = Math.floor((Date.now() - expiryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`\n🚨 EXPIRED: ${vehicle.make} ${vehicle.model} (${vehicle.registration})`);
      console.log(`   Expired: ${expiryDate.toDateString()} (${daysSinceExpiry} days ago)`);
      
      if (vehicle.email) {
        console.log(`   Contact: ${vehicle.first_name} ${vehicle.last_name} <${vehicle.email}>`);
      } else if (vehicle.phone) {
        console.log(`   Contact: ${vehicle.phone}`);
      }
    }
  }
  
  if (expiringSoon.length > 0) {
    console.log(`\n=== MOTs EXPIRING SOON (${expiringSoon.length} vehicles) ===`);
    for (const vehicle of expiringSoon) {
      const expiryDate = new Date(vehicle.mot_expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      console.log(`\n⚠️  ${vehicle.make} ${vehicle.model} (${vehicle.registration})`);
      console.log(`   Expires: ${expiryDate.toDateString()} (in ${daysUntilExpiry} days)`);
      
      if (vehicle.email) {
        console.log(`   Contact: ${vehicle.first_name} ${vehicle.last_name} <${vehicle.email}>`);
      } else if (vehicle.phone) {
        console.log(`   Contact: ${vehicle.phone}`);
      }
    }
  }
  
  // Create reminders for expiring MOTs
  if (expiringSoon.length > 0) {
    console.log(`\n=== CREATING REMINDERS ===`);
    
    for (const vehicle of expiringSoon) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Check if a reminder was already sent today
        const today = new Date().toISOString().split('T')[0];
        
        // Ensure vehicle.id is treated as an integer
        const vehicleId = typeof vehicle.id === 'string' ? parseInt(vehicle.id, 10) : vehicle.id;
        
        // Check for existing reminder using the same client to maintain transaction
        const existingReminder = await client.query(
          'SELECT id FROM mot_reminders WHERE vehicle_id = $1 AND reminder_date = $2',
          [vehicleId, today]
        );
        
        if (existingReminder.rows.length > 0) {
          console.log(`ℹ️  Reminder already sent today for ${vehicle.registration}`);
          continue;
        }
        
        // Insert the new reminder
        const insertResult = await client.query(
          `INSERT INTO mot_reminders (vehicle_id, reminder_date, status)
           VALUES ($1, $2, 'pending')
           RETURNING id`,
          [vehicleId, today]
        );
        
        const reminderId = insertResult.rows[0].id;
        
        // Try to send email
        const emailSent = await sendMotReminderEmail(vehicle, vehicle.days_until_expiry);
        
        // Update reminder status based on email result
        await client.query(
          `UPDATE mot_reminders 
           SET status = $1, 
               sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE NULL END
           WHERE id = $2`,
          [emailSent ? 'sent' : 'failed', reminderId]
        );
        
        await client.query('COMMIT');
        
        console.log(`✅ Created and processed reminder for ${vehicle.registration}`);
      } catch (error: unknown) {
        await client.query('ROLLBACK');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to process reminder for ${vehicle.registration}:`, errorMessage);
      } finally {
        client.release();
      }
    }
  }
}

// Main function
async function main() {
  try {
    // Import customers
    const customersFile = path.join(__dirname, '../data/customers.csv');
    await importCustomers(customersFile);
    
    // Import vehicles
    const vehiclesFile = path.join(__dirname, '../data/vehicles.csv');
    await importVehicles(vehiclesFile);
    
    // Check MOT expiries - scan the next 365 days to see all upcoming expirations
    await checkMotExpiries(365); // Check for MOTs expiring in the next year
    
    console.log('\n✅ Import and MOT check completed successfully!');
  } catch (error) {
    console.error('❌ Error during import:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the main function
main().catch(console.error);
