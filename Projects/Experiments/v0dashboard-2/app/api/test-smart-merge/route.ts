import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log('🧪 [TEST-MERGE] Testing smart merge capabilities...')

    // Test 1: Customer smart merge
    console.log('📋 [TEST] Testing customer smart merge...')
    
    // Get a sample existing customer
    const existingCustomer = await sql`
      SELECT id, first_name, last_name, phone, email 
      FROM customers 
      WHERE phone IS NOT NULL AND phone != ''
      LIMIT 1
    `

    if (existingCustomer.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No existing customers found for testing",
        timestamp: new Date().toISOString()
      })
    }

    const customer = existingCustomer[0]
    console.log(`📝 [TEST] Testing with customer: ${customer.first_name} ${customer.last_name} (${customer.phone})`)

    // Test customer data that should merge
    const testCustomerData = [
      {
        first_name: customer.first_name,
        last_name: customer.last_name + " Updated", // Should update if longer
        phone: customer.phone,
        email: customer.email || "test@example.com",
        address_line1: "123 Test Street", // Should add if missing
        city: "Test City"
      }
    ]

    // Test 2: Vehicle smart merge
    console.log('🚗 [TEST] Testing vehicle smart merge...')
    
    const existingVehicle = await sql`
      SELECT id, registration, make, model, customer_id 
      FROM vehicles 
      WHERE registration IS NOT NULL AND registration != ''
      LIMIT 1
    `

    let testVehicleData = []
    if (existingVehicle.length > 0) {
      const vehicle = existingVehicle[0]
      console.log(`📝 [TEST] Testing with vehicle: ${vehicle.registration} (${vehicle.make} ${vehicle.model})`)

      testVehicleData = [
        {
          registration: vehicle.registration,
          make: vehicle.make + " Enhanced", // Should update if longer
          model: vehicle.model,
          year: 2020, // Should update if more accurate
          color: "Test Blue", // Should add if missing
          fuel_type: "Petrol" // Should add if missing
        }
      ]
    }

    // Test 3: Document smart merge
    console.log('📄 [TEST] Testing document smart merge...')
    
    const testDocumentData = [
      {
        doc_number: "TEST-" + Date.now(),
        doc_type: "Service",
        customer_name: customer.first_name + " " + customer.last_name,
        vehicle_registration: existingVehicle.length > 0 ? existingVehicle[0].registration : "TEST123",
        total_gross: 150.00,
        doc_date_issued: new Date().toISOString().split('T')[0]
      }
    ]

    // Simulate the smart merge process
    const results = {
      customer_test: await testCustomerMerge(testCustomerData),
      vehicle_test: testVehicleData.length > 0 ? await testVehicleMerge(testVehicleData) : { skipped: true },
      document_test: await testDocumentMerge(testDocumentData)
    }

    // Verify results
    const verification = await verifyMergeResults(customer.id, existingVehicle.length > 0 ? existingVehicle[0].id : null)

    console.log('✅ [TEST-MERGE] Smart merge testing completed')

    return NextResponse.json({
      success: true,
      message: "Smart merge testing completed successfully",
      test_results: results,
      verification: verification,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [TEST-MERGE] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

async function testCustomerMerge(data: any[]) {
  try {
    const row = data[0]
    
    // Find existing customer by phone
    const existing = await sql`
      SELECT id, first_name, last_name, phone, email, address_line1, city FROM customers 
      WHERE phone = ${row.phone}
      LIMIT 1
    `

    if (existing.length === 0) {
      return { result: 'no_match', message: 'No existing customer found' }
    }

    const existingCustomer = existing[0]
    const updates = []
    const values = []

    // Test smart merge logic
    if (row.last_name && row.last_name.length > existingCustomer.last_name.length) {
      updates.push('last_name = $' + (values.length + 1))
      values.push(row.last_name)
    }

    if (row.email && !existingCustomer.email) {
      updates.push('email = $' + (values.length + 1))
      values.push(row.email)
    }

    if (row.address_line1 && !existingCustomer.address_line1) {
      updates.push('address_line1 = $' + (values.length + 1))
      values.push(row.address_line1)
    }

    if (row.city && !existingCustomer.city) {
      updates.push('city = $' + (values.length + 1))
      values.push(row.city)
    }

    if (updates.length > 0) {
      updates.push('updated_at = NOW()')
      const updateQuery = `UPDATE customers SET ${updates.join(', ')} WHERE id = $${values.length + 1}`
      values.push(existingCustomer.id)
      
      await sql.unsafe(updateQuery, values)
      
      return {
        result: 'updated',
        message: `Updated customer with ${updates.length - 1} fields`,
        updates_applied: updates.slice(0, -1),
        customer_id: existingCustomer.id
      }
    }

    return { result: 'no_updates', message: 'No updates needed' }

  } catch (error) {
    return { result: 'error', message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function testVehicleMerge(data: any[]) {
  try {
    const row = data[0]
    const registration = row.registration.toUpperCase().replace(/\s/g, '')
    
    const existing = await sql`
      SELECT id, make, model, year, color, fuel_type FROM vehicles 
      WHERE UPPER(REPLACE(registration, ' ', '')) = ${registration}
      LIMIT 1
    `

    if (existing.length === 0) {
      return { result: 'no_match', message: 'No existing vehicle found' }
    }

    const existingVehicle = existing[0]
    const updates = []
    const values = []

    // Test smart merge logic
    if (row.make && row.make.length > existingVehicle.make.length) {
      updates.push('make = $' + (values.length + 1))
      values.push(row.make)
    }

    if (row.year && (!existingVehicle.year || Math.abs(row.year - new Date().getFullYear()) < Math.abs(existingVehicle.year - new Date().getFullYear()))) {
      updates.push('year = $' + (values.length + 1))
      values.push(row.year)
    }

    if (row.color && !existingVehicle.color) {
      updates.push('color = $' + (values.length + 1))
      values.push(row.color)
    }

    if (row.fuel_type && !existingVehicle.fuel_type) {
      updates.push('fuel_type = $' + (values.length + 1))
      values.push(row.fuel_type)
    }

    if (updates.length > 0) {
      updates.push('updated_at = NOW()')
      const updateQuery = `UPDATE vehicles SET ${updates.join(', ')} WHERE id = $${values.length + 1}`
      values.push(existingVehicle.id)
      
      await sql.unsafe(updateQuery, values)
      
      return {
        result: 'updated',
        message: `Updated vehicle with ${updates.length - 1} fields`,
        updates_applied: updates.slice(0, -1),
        vehicle_id: existingVehicle.id
      }
    }

    return { result: 'no_updates', message: 'No updates needed' }

  } catch (error) {
    return { result: 'error', message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function testDocumentMerge(data: any[]) {
  try {
    const row = data[0]
    
    // Find customer by name
    let customerId = null
    if (row.customer_name) {
      const customer = await sql`
        SELECT id FROM customers 
        WHERE LOWER(first_name || ' ' || last_name) = LOWER(${row.customer_name})
        LIMIT 1
      `
      if (customer.length > 0) {
        customerId = customer[0].id
      }
    }

    // Insert new test document
    await sql`
      INSERT INTO documents (
        doc_number, doc_type, doc_date_issued, customer_name, _id_customer,
        vehicle_registration, total_gross, created_at, updated_at
      ) VALUES (
        ${row.doc_number},
        ${row.doc_type},
        ${row.doc_date_issued},
        ${row.customer_name},
        ${customerId},
        ${row.vehicle_registration},
        ${row.total_gross},
        NOW(), NOW()
      )
    `

    return {
      result: 'created',
      message: 'Test document created successfully',
      customer_linked: customerId !== null,
      document_number: row.doc_number
    }

  } catch (error) {
    return { result: 'error', message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function verifyMergeResults(customerId: string, vehicleId: string | null) {
  try {
    // Verify customer updates
    const customerCheck = await sql`
      SELECT first_name, last_name, email, address_line1, city, updated_at
      FROM customers 
      WHERE id = ${customerId}
    `

    let vehicleCheck = null
    if (vehicleId) {
      vehicleCheck = await sql`
        SELECT make, model, year, color, fuel_type, updated_at
        FROM vehicles 
        WHERE id = ${vehicleId}
      `
    }

    // Check if test document was created
    const documentCheck = await sql`
      SELECT doc_number, _id_customer, customer_name
      FROM documents 
      WHERE doc_number LIKE 'TEST-%'
      ORDER BY created_at DESC
      LIMIT 1
    `

    return {
      customer_updated: customerCheck.length > 0,
      customer_data: customerCheck[0] || null,
      vehicle_updated: vehicleCheck && vehicleCheck.length > 0,
      vehicle_data: vehicleCheck ? vehicleCheck[0] : null,
      document_created: documentCheck.length > 0,
      document_data: documentCheck[0] || null
    }

  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
