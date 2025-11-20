import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// Read and parse customers CSV
const customersPath = path.join(process.cwd(), 'data/customers.csv');
const customersContent = fs.readFileSync(customersPath, 'utf-8');
const customers = parse(customersContent, { columns: true, skip_empty_lines: true });

// Read and parse vehicles CSV
const vehiclesPath = path.join(process.cwd(), 'data/vehicles.csv');
const vehiclesContent = fs.readFileSync(vehiclesPath, 'utf-8');
const vehicles = parse(vehiclesContent, { columns: true, skip_empty_lines: true });

console.log('📋 Customers:');
console.table(customers.map((c: any) => ({
  id: c.id,
  first_name: c.first_name,
  last_name: c.last_name,
  email: c.email
})));

console.log('\n🚗 Vehicles:');
console.table(vehicles.map((v: any) => ({
  registration: v.registration,
  make: v.make,
  model: v.model,
  owner_id: v.owner_id
})));

// Check for vehicles with owner_ids not in customers
const customerIds = new Set(customers.map((c: any) => c.id));
const vehiclesWithInvalidOwners = vehicles.filter((v: any) => v.owner_id && !customerIds.has(v.owner_id));

if (vehiclesWithInvalidOwners.length > 0) {
  console.log('\n⚠️  Vehicles with owner_ids not in customers:');
  console.table(vehiclesWithInvalidOwners.map((v: any) => ({
    registration: v.registration,
    make: v.make,
    model: v.model,
    owner_id: v.owner_id
  })));
} else {
  console.log('\n✅ All vehicles have valid owner_ids');
}
