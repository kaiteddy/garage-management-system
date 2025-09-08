import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkCustomerVehicleRelationships() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();

  try {
    console.log('=== CUSTOMER-VEHICLE RELATIONSHIP ANALYSIS ===\n');

    // Check total counts
    const vehicleCount = await client.query('SELECT COUNT(*) as count FROM vehicles');
    const customerCount = await client.query('SELECT COUNT(*) as count FROM customers');
    const vehiclesWithCustomers = await client.query(`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE owner_id IS NOT NULL
    `);
    const vehiclesWithoutCustomers = await client.query(`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE owner_id IS NULL
    `);

    console.log(`Total vehicles: ${vehicleCount.rows[0].count}`);
    console.log(`Total customers: ${customerCount.rows[0].count}`);
    console.log(`Vehicles with customers: ${vehiclesWithCustomers.rows[0].count}`);
    console.log(`Vehicles without customers: ${vehiclesWithoutCustomers.rows[0].count}`);
    console.log(`Connection rate: ${Math.round((vehiclesWithCustomers.rows[0].count / vehicleCount.rows[0].count) * 100)}%\n`);

    // Check sample vehicles without customers
    const orphanVehicles = await client.query(`
      SELECT registration, make, model, owner_id
      FROM vehicles
      WHERE owner_id IS NULL
      LIMIT 10
    `);

    console.log('=== SAMPLE VEHICLES WITHOUT CUSTOMERS ===');
    orphanVehicles.rows.forEach(vehicle => {
      console.log(`${vehicle.registration} - ${vehicle.make} ${vehicle.model} (owner_id: ${vehicle.owner_id})`);
    });

    // Check sample vehicles with customers
    const connectedVehicles = await client.query(`
      SELECT v.registration, v.make, v.model, v.owner_id,
             c.first_name, c.last_name, c.address_line1, c.city, c.postcode
      FROM vehicles v
      JOIN customers c ON v.owner_id = c.id
      LIMIT 10
    `);

    console.log('\n=== SAMPLE VEHICLES WITH CUSTOMERS ===');
    connectedVehicles.rows.forEach(vehicle => {
      const customerName = `${vehicle.first_name || ''} ${vehicle.last_name || ''}`.trim() || 'No name';
      const address = [vehicle.address_line1, vehicle.city, vehicle.postcode].filter(Boolean).join(', ') || 'No address';
      console.log(`${vehicle.registration} - ${vehicle.make} ${vehicle.model}`);
      console.log(`  Customer: ${customerName}`);
      console.log(`  Address: ${address}\n`);
    });

    // Check for customers with missing address data
    const customersWithoutAddress = await client.query(`
      SELECT COUNT(*) as count
      FROM customers
      WHERE address_line1 IS NULL OR address_line1 = '' OR city IS NULL OR city = ''
    `);

    console.log(`=== CUSTOMERS WITH MISSING ADDRESS DATA ===`);
    console.log(`Customers without complete address: ${customersWithoutAddress.rows[0].count}`);

    // Sample customers with missing data
    const sampleIncompleteCustomers = await client.query(`
      SELECT id, first_name, last_name, address_line1, city, postcode
      FROM customers
      WHERE address_line1 IS NULL OR address_line1 = '' OR city IS NULL OR city = ''
      LIMIT 5
    `);

    console.log('\nSample customers with missing address data:');
    sampleIncompleteCustomers.rows.forEach(customer => {
      const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'No name';
      const address = [customer.address_line1, customer.city, customer.postcode].filter(Boolean).join(', ') || 'No address';
      console.log(`ID: ${customer.id} - ${name} - ${address}`);
    });

  } catch (error) {
    console.error('Error checking customer-vehicle relationships:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkCustomerVehicleRelationships().catch(console.error);
