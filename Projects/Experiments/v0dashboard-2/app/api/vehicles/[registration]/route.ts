import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { lookupVehicle } from '@/lib/dvla-api';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ registration: string }> }
) {
  try {
    const { registration: rawRegistration } = await params;
    const registration = decodeURIComponent(rawRegistration);
    const cleanReg = registration.toUpperCase().replace(/\s/g, '');

    // Check for fix parameter
    const url = new URL(request.url)
    const fixMode = url.searchParams.get('fix')

    // Fix LN64XFG if requested
    if (fixMode === 'true' && cleanReg === 'LN64XFG') {
      await sql`
        UPDATE vehicles
        SET
          customer_id = 'OOTOSBT1OWYUHR1B81UY',
          owner_id = 'OOTOSBT1OWYUHR1B81UY',
          updated_at = NOW()
        WHERE UPPER(REPLACE(registration, ' ', '')) = 'LN64XFG'
      `

      await sql`
        UPDATE customers
        SET
          first_name = 'Adam',
          last_name = 'Rutstein',
          phone = '07843275372',
          email = 'adamrutstein@me.com',
          updated_at = NOW()
        WHERE id = 'OOTOSBT1OWYUHR1B81UY'
      `
    }

    // Get vehicle details with customer information
    // Try both with and without spaces to handle different formats
    const vehicleResult = await sql`
      SELECT
        v.*,
        c.id as customer_id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        c.address_line1,
        c.address_line2,
        c.city,
        c.postcode,
        c.country
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE v.registration = ${cleanReg}
      OR v.registration = ${registration}
      OR REPLACE(v.registration, ' ', '') = ${cleanReg}
    `;

    if (vehicleResult.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vehicle not found',
          registration: cleanReg
        },
        { status: 404 }
      );
    }

    const vehicleData = vehicleResult[0];

    // Format the response
    const vehicle = {
      registration: vehicleData.registration,
      make: vehicleData.make,
      model: vehicleData.model,
      year: vehicleData.year,
      color: vehicleData.color,
      fuelType: vehicleData.fuel_type,
      engineSize: vehicleData.engine_size,
      vin: vehicleData.vin,
      motStatus: vehicleData.mot_status,
      motExpiryDate: vehicleData.mot_expiry_date,
      taxStatus: vehicleData.tax_status,
      taxDueDate: vehicleData.tax_due_date,
      vehicleAge: vehicleData.vehicle_age,
      sornStatus: vehicleData.sorn_status,
      yearOfManufacture: vehicleData.year_of_manufacture,
      createdAt: vehicleData.created_at,
      updatedAt: vehicleData.updated_at,
      customer: vehicleData.customer_id ? {
        id: vehicleData.customer_id,
        firstName: vehicleData.first_name,
        lastName: vehicleData.last_name,
        phone: vehicleData.phone,
        email: vehicleData.email,
        addressLine1: vehicleData.address_line1,
        addressLine2: vehicleData.address_line2,
        city: vehicleData.city,
        postcode: vehicleData.postcode,
        country: vehicleData.country
      } : null,
      serviceHistory: [], // TODO: Implement when service history table is available
      motHistory: [] // Will be populated below
    } as any;

    // Ensure MOT and Tax status are always present by fetching from DVLA if missing
    const needsMotOrTax = !vehicle.motStatus || !vehicle.taxStatus || (!vehicle.motExpiryDate && !vehicle.taxDueDate);
    if (needsMotOrTax) {
      try {
        const dvla = await lookupVehicle(cleanReg);
        if (dvla) {
          // Update DB with any newly found fields
          await sql`
            UPDATE vehicles
            SET
              mot_status = ${dvla.motStatus},
              mot_expiry_date = ${dvla.motExpiryDate},
              tax_status = ${dvla.taxStatus},
              tax_due_date = ${dvla.taxDueDate},
              updated_at = NOW()
            WHERE registration = ${cleanReg}
            OR registration = ${registration}
            OR REPLACE(registration, ' ', '') = ${cleanReg}
          `;

          // Reflect in response object
          vehicle.motStatus = vehicle.motStatus || dvla.motStatus;
          vehicle.motExpiryDate = vehicle.motExpiryDate || (dvla.motExpiryDate as any);
          vehicle.taxStatus = vehicle.taxStatus || dvla.taxStatus;
          vehicle.taxDueDate = vehicle.taxDueDate || (dvla.taxDueDate as any);
        }
      } catch (e) {
        console.warn('[API]/vehicles/[registration] DVLA lookup failed, continuing with existing data', e);
      }
    }

    // Get MOT history from mot_history table
    try {
      const motHistoryResult = await sql`
        SELECT
          test_date,
          expiry_date,
          test_result,
          odometer_value,
          odometer_unit,
          mot_test_number,
          defects,
          advisories,
          created_at
        FROM mot_history
        WHERE UPPER(REPLACE(vehicle_registration, ' ', '')) = ${cleanReg}
        ORDER BY test_date DESC
        LIMIT 10
      `;

      vehicle.motHistory = motHistoryResult.map(record => {
        try {
          let defects = [];
          let advisories = [];

          try {
            defects = Array.isArray(record.defects) ? record.defects : (record.defects ? JSON.parse(record.defects) : []);
          } catch (e) {
            defects = [];
          }

          try {
            advisories = Array.isArray(record.advisories) ? record.advisories : (record.advisories ? JSON.parse(record.advisories) : []);
          } catch (e) {
            advisories = [];
          }

          return {
            testDate: record.test_date ? record.test_date.toISOString() : null,
            expiryDate: record.expiry_date ? record.expiry_date.toISOString() : null,
            result: record.test_result,
            mileage: record.odometer_value || 0,
            mileageUnit: record.odometer_unit || 'mi',
            testNumber: record.mot_test_number || 'Unknown',
            defects,
            advisories,
            recordedAt: record.created_at ? record.created_at.toISOString() : null
          };
        } catch (error) {
          console.log('Error mapping MOT record:', error);
          return null;
        }
      }).filter(Boolean);

      console.log(`Found ${vehicle.motHistory.length} MOT history records for ${registration}`);
    } catch (error) {
      console.log('MOT history not available:', error);
      vehicle.motHistory = [];
    }

    // Get service history from customer_documents table
    try {

      const serviceHistory = await sql`
        SELECT
          cd.id,
          cd.document_number,
          cd.document_date as date,
          cd.document_type as type,
          cd.total_gross as amount,
          cd.total_net,
          cd.total_tax,
          cd.status,
          de.labour_description,
          de.doc_notes
        FROM customer_documents cd
        LEFT JOIN document_extras de ON cd.id = de.document_id
        WHERE cd.vehicle_registration = ${registration}
        OR cd.vehicle_registration = ${cleanReg}
        OR REPLACE(cd.vehicle_registration, ' ', '') = ${cleanReg}
        ORDER BY cd.document_date DESC
        LIMIT 50
      `;


      if (serviceHistory.length > 0) {
        vehicle.serviceHistory = serviceHistory.map(service => ({
          id: service.id,
          date: service.date,
          type: service.type === 'SI' ? 'Service Invoice' : service.type,
          description: service.labour_description || service.doc_notes || `Document #${service.document_number}`,
          amount: parseFloat(service.amount) || 0,
          mileage: 0, // Mileage not available in current data
          documentNumber: service.document_number,
          status: service.status
        }));

      } else {

        vehicle.serviceHistory = null;
      }
    } catch (error) {
      console.log('Service history not available for', registration, ':', error);
    }

    // Get detailed line items for documents
    try {
      if (vehicle.serviceHistory && vehicle.serviceHistory.length > 0) {
        const documentIds = vehicle.serviceHistory.map(s => s.id);
        const lineItems = await sql.query(`
          SELECT
            document_id,
            description,
            quantity,
            unit_price,
            total_price,
            item_type
          FROM document_line_items
          WHERE document_id = ANY($1)
          AND description IS NOT NULL
          ORDER BY document_id
        `, [documentIds.map(id => id.toString())]);

        // Group line items by document
        const lineItemsByDoc = lineItems.reduce((acc, item) => {
          if (!acc[item.document_id]) acc[item.document_id] = [];
          acc[item.document_id].push(item);
          return acc;
        }, {});

        // Add line items to service history
        vehicle.serviceHistory = vehicle.serviceHistory.map(service => ({
          ...service,
          lineItems: lineItemsByDoc[service.id.toString()] || []
        }));
      }
    } catch (error) {
      console.log('Line items not available:', error);
    }



    return NextResponse.json({
      success: true,
      vehicle,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching vehicle details:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch vehicle details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
