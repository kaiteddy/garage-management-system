import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

type VehicleRecord = {
  id: string;
  registration: string;
  make: string;
  model: string;
  year: number;
  fuel_type: string;
  engine_size: string;
  color: string;
  mot_status: string;
  tax_status: string;
  mot_expiry_date: string;
  customer_id: string;
};

type DocumentRecord = {
  id: string;
  vehicle_id: string;
  document_type: string;
  issue_date: string;
  expiry_date: string;
  notes: string;
};

class DatabaseImporter {
  private pool: Pool;

  constructor() {
    // Configure the database connection
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }

  async initializeDatabase() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Enable UUID extension
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      
      // Drop existing tables if they exist (will be recreated with correct schema)
      await client.query('DROP TABLE IF EXISTS documents CASCADE');
      await client.query('DROP TABLE IF EXISTS vehicles CASCADE');
      
      // Create vehicles table with all required columns
      await client.query(`
        CREATE TABLE vehicles (
          id TEXT PRIMARY KEY,
          registration TEXT NOT NULL,
          make TEXT,
          model TEXT,
          year INTEGER,
          color TEXT,
          fuel_type TEXT,
          engine_size TEXT,
          mot_status TEXT,
          mot_expiry_date DATE,
          tax_status TEXT,
          tax_due_date DATE,
          owner_id TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create documents table with all required columns
      await client.query(`
        CREATE TABLE documents (
          id TEXT PRIMARY KEY,
          title TEXT,
          description TEXT,
          file_path TEXT NOT NULL,
          uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create indexes
      await client.query('CREATE INDEX idx_vehicles_registration ON vehicles(registration)');
      await client.query('CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at)');
      
      await client.query('COMMIT');
      console.log('Database initialized successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error initializing database:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async importVehicles(filePath: string) {
    console.log(`Importing vehicles from ${filePath}...`);
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      let imported = 0;
      let skipped = 0;
      
      for (const record of records) {
        try {
          // Skip if registration is missing
          if (!record.registration) {
            console.log(`Skipping record - missing registration:`, record);
            skipped++;
            continue;
          }

          // Prepare vehicle data - map CSV fields to database columns
          const vehicle = {
            id: record.id || record.registration, // Use registration as ID if ID not provided
            registration: record.registration,
            make: record.make || null,
            model: record.model || null,
            year: record.year ? parseInt(record.year, 10) : null,
            color: record.color || null,
            fuel_type: record.fuel_type || null,
            engine_size: record.engine_size || null,
            mot_status: record.mot_status || null,
            mot_expiry_date: record.mot_expiry_date || null,
            tax_status: record.tax_status || null,
            tax_due_date: record.tax_due_date || null,
            owner_id: record.owner_id || null
          };

          // First, try to get the vehicle by registration
          const existingVehicle = await client.query(
            'SELECT id FROM vehicles WHERE registration = $1',
            [vehicle.registration]
          );

          if (existingVehicle.rows.length > 0) {
            // Update existing vehicle
            await client.query(
              `UPDATE vehicles SET
                make = COALESCE($1, make),
                model = COALESCE($2, model),
                year = COALESCE($3, year),
                color = COALESCE($4, color),
                fuel_type = COALESCE($5, fuel_type),
                engine_size = COALESCE($6, engine_size),
                mot_status = COALESCE($7, mot_status),
                mot_expiry_date = COALESCE($8::date, mot_expiry_date),
                tax_status = COALESCE($9, tax_status),
                tax_due_date = COALESCE($10::date, tax_due_date),
                owner_id = COALESCE($11, owner_id),
                updated_at = NOW()
              WHERE registration = $12`,
              [
                vehicle.make, vehicle.model, vehicle.year, vehicle.color,
                vehicle.fuel_type, vehicle.engine_size, vehicle.mot_status,
                vehicle.mot_expiry_date, vehicle.tax_status, vehicle.tax_due_date,
                vehicle.owner_id, vehicle.registration
              ]
            );
          } else {
            // Insert new vehicle
            await client.query(
              `INSERT INTO vehicles (
                id, registration, make, model, year, color, fuel_type,
                engine_size, mot_status, mot_expiry_date, tax_status, tax_due_date, owner_id
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
              [
                vehicle.id, vehicle.registration, vehicle.make, vehicle.model, vehicle.year,
                vehicle.color, vehicle.fuel_type, vehicle.engine_size, vehicle.mot_status,
                vehicle.mot_expiry_date, vehicle.tax_status, vehicle.tax_due_date, vehicle.owner_id
              ]
            );
          }

          imported++;
          
          // Log progress
          if (imported % 100 === 0) {
            console.log(`Imported ${imported} vehicles...`);
          }
          
        } catch (error) {
          console.error(`Error importing vehicle ${record.registration || 'unknown'}:`, error);
          skipped++;
        }
      }
      
      await client.query('COMMIT');
      console.log(`\nVehicle import complete!`);
      console.log(`Successfully imported/updated: ${imported}`);
      console.log(`Skipped: ${skipped}`);
      
      return { imported, skipped };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error during vehicle import:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async importDocuments(filePath: string) {
    console.log(`\nImporting documents from ${filePath}...`);
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      let imported = 0;
      let skipped = 0;
      
      for (const record of records) {
        try {
          // Skip if required fields are missing
          if (!record.file_path) {
            console.log(`Skipping document - missing file path:`, record);
            skipped++;
            continue;
          }

          // Prepare document data - map CSV fields to database columns
          const document = {
            id: record.id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: record.title || null,
            description: record.description || null,
            file_path: record.file_path,
            uploaded_at: record.uploaded_at ? new Date(record.uploaded_at) : new Date()
          };

          // Check if document already exists by file path
          const existingDoc = await client.query(
            'SELECT id FROM documents WHERE file_path = $1',
            [document.file_path]
          );

          if (existingDoc.rows.length > 0) {
            // Update existing document
            await client.query(
              `UPDATE documents SET
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                updated_at = NOW()
              WHERE file_path = $3`,
              [
                document.title,
                document.description,
                document.file_path
              ]
            );
          } else {
            // Insert new document
            await client.query(
              `INSERT INTO documents (
                id, title, description, file_path, uploaded_at
              ) VALUES ($1, $2, $3, $4, $5)`,
              [
                document.id,
                document.title,
                document.description,
                document.file_path,
                document.uploaded_at
              ]
            );
          }

          imported++;
          
          // Log progress
          if (imported % 10 === 0) {
            console.log(`Imported ${imported} documents...`);
          }
          
        } catch (error) {
          console.error(`Error importing document:`, error);
          skipped++;
        }
      }
      
      await client.query('COMMIT');
      console.log(`\nDocument import complete!`);
      console.log(`Successfully imported/updated: ${imported}`);
      console.log(`Skipped: ${skipped}`);
      
      return { imported, skipped };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error during document import:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

// Main function
async function main() {
  // Get file paths from command line arguments
  const args = process.argv.slice(2);
  const vehiclesFile = args[0];
  const documentsFile = args[1];

  if (!vehiclesFile) {
    console.error('Please provide the path to the vehicles CSV file');
    process.exit(1);
  }

  if (!fs.existsSync(vehiclesFile)) {
    console.error(`Vehicles file not found: ${vehiclesFile}`);
    process.exit(1);
  }

  const importer = new DatabaseImporter();
  
  try {
    console.log('Initializing database...');
    await importer.initializeDatabase();
    
    // Import vehicles
    await importer.importVehicles(vehiclesFile);
    
    // Import documents if file is provided
    if (documentsFile) {
      if (!fs.existsSync(documentsFile)) {
        console.error(`Documents file not found: ${documentsFile}`);
      } else {
        await importer.importDocuments(documentsFile);
      }
    }
    
    console.log('\nImport process completed successfully!');
    
  } catch (error) {
    console.error('Error during import process:', error);
    process.exit(1);
  } finally {
    await importer.close();
  }
}

// Run the import
main().catch(console.error);
