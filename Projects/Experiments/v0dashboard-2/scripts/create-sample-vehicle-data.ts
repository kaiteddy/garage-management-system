import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function createSampleVehicleData() {
  const client = await pool.connect()
  
  try {
    console.log('🚀 Creating sample vehicle data for demonstration...')
    
    // Sample technical specifications
    const technicalSpecs = {
      make: "VOLKSWAGEN",
      model: "GOLF",
      derivative: "SE TDI BLUEMOTION TECHNOLOGY",
      year: 2014,
      fuelType: "DIESEL",
      colour: "BLACK",
      source: "VDG",
      imageUrl: "https://vehicleimages.ukvehicledata.co.uk/s3/95B34DF231C26B5D271C831DD725FD994D613146920E86F6384F08C8C0657BC1B20BC1181CD5E4B8AD45CB8818ED1CB2BFEBE5DBD7C38108B09D1FECCA7609A40F88C4CCC3E59BEF0D371334EA925EC0165A889AD4C1CB175CFBD70B17DC64DC",
      specifications: [
        { name: "Engine Capacity", value: "1598cc" },
        { name: "Power", value: "105 BHP" },
        { name: "Torque", value: "250 Nm" },
        { name: "Fuel Economy Combined", value: "74.3 MPG" },
        { name: "CO2 Emissions", value: "99 g/km" },
        { name: "Euro Status", value: "Euro 5" },
        { name: "Top Speed", value: "118 mph" },
        { name: "0-62 mph", value: "10.5 seconds" },
        { name: "Transmission", value: "5-speed Manual" },
        { name: "Drive Type", value: "Front Wheel Drive" },
        { name: "Body Style", value: "5-door Hatchback" },
        { name: "Doors", value: "5" },
        { name: "Seats", value: "5" },
        { name: "Insurance Group", value: "13E" },
        { name: "Kerb Weight", value: "1320 kg" },
        { name: "Gross Weight", value: "1880 kg" },
        { name: "Boot Capacity", value: "380 litres" }
      ]
    }
    
    // Sample service data
    const serviceData = {
      oilSpecifications: {
        engineOil: {
          type: "5W-30",
          specification: "VW 504.00/507.00",
          capacity: "4.3 litres",
          brand: "Castrol EDGE Professional"
        },
        gearboxOil: {
          type: "75W-90",
          specification: "API GL-4",
          capacity: "2.0 litres"
        }
      },
      airConditioning: {
        refrigerant: "R134a",
        capacity: "475g",
        compressorOil: "PAG 46",
        oilCapacity: "135ml"
      },
      serviceIntervals: {
        oilChange: "12 months / 10,000 miles",
        inspection: "24 months / 20,000 miles",
        timing: "120,000 miles / 10 years"
      },
      repairTimes: {
        oilChange: "0.5 hours",
        brakeDiscs: "1.2 hours",
        clutch: "4.5 hours",
        timing: "6.8 hours"
      }
    }
    
    // Sample factory options
    const factoryOptions = [
      "Air Conditioning",
      "Electric Windows (Front & Rear)",
      "Central Locking",
      "Power Steering",
      "ABS",
      "Electronic Stability Programme (ESP)",
      "Driver & Passenger Airbags",
      "Side Airbags",
      "Curtain Airbags",
      "CD/Radio",
      "Bluetooth Connectivity",
      "Cruise Control",
      "Alloy Wheels (16 inch)",
      "Fog Lights",
      "Roof Rails"
    ]
    
    // Sample MOT history
    const motHistory = [
      {
        testDate: "2024-10-03",
        testResult: "PASS",
        expiryDate: "2025-10-03",
        odometerValue: 89542,
        odometerUnit: "mi",
        motTestNumber: "123456789012",
        rfrAndComments: [
          { type: "ADVISORY", text: "Front brake disc worn, pitted or scored, but not seriously weakened" },
          { type: "ADVISORY", text: "Rear tyre worn close to legal limit" }
        ]
      },
      {
        testDate: "2023-10-05",
        testResult: "PASS",
        expiryDate: "2024-10-03",
        odometerValue: 76234,
        odometerUnit: "mi",
        motTestNumber: "123456789011",
        rfrAndComments: []
      },
      {
        testDate: "2022-10-07",
        testResult: "FAIL",
        expiryDate: "2023-10-05",
        odometerValue: 63891,
        odometerUnit: "mi",
        motTestNumber: "123456789010",
        rfrAndComments: [
          { type: "FAIL", text: "Headlamp aim too low" },
          { type: "FAIL", text: "Front brake disc excessively pitted" },
          { type: "ADVISORY", text: "Oil leak" }
        ]
      }
    ]
    
    // Update the vehicle record
    await client.query(`
      UPDATE vehicles SET
        make = $2,
        model = $3,
        year = $4,
        fuel_type = $5,
        derivative = $6,
        color = $7,
        engine_capacity_cc = $8,
        power_bhp = $9,
        torque_nm = $10,
        fuel_economy_combined_mpg = $11,
        co2_emissions = $12,
        euro_status = $13,
        body_style = $14,
        doors = $15,
        transmission = $16,
        image_url = $17,
        technical_specs = $18,
        service_data = $19,
        factory_options = $20,
        data_sources = $21,
        last_data_update = NOW(),
        data_completeness_score = $22
      WHERE registration = $1
    `, [
      'LN64XFG',
      'VOLKSWAGEN',
      'GOLF',
      2014,
      'DIESEL',
      'SE TDI BLUEMOTION TECHNOLOGY',
      'BLACK',
      1598, // engine_capacity_cc
      105,  // power_bhp
      250,  // torque_nm
      74.3, // fuel_economy_combined_mpg
      99,   // co2_emissions
      'Euro 5', // euro_status
      '5-door Hatchback', // body_style
      5,    // doors
      '5-speed Manual', // transmission
      technicalSpecs.imageUrl,
      JSON.stringify(technicalSpecs),
      JSON.stringify(serviceData),
      JSON.stringify(factoryOptions),
      JSON.stringify(['DVLA', 'VDG', 'SWS']),
      95    // data_completeness_score
    ])
    
    // Insert MOT history
    for (const mot of motHistory) {
      await client.query(`
        INSERT INTO mot_history (
          registration, test_date, test_result, expiry_date,
          odometer_value, odometer_unit, mot_test_number, rfr_and_comments
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (registration, test_date) DO UPDATE SET
          test_result = $3,
          expiry_date = $4,
          odometer_value = $5,
          odometer_unit = $6,
          mot_test_number = $7,
          rfr_and_comments = $8
      `, [
        'LN64XFG',
        mot.testDate,
        mot.testResult,
        mot.expiryDate,
        mot.odometerValue,
        mot.odometerUnit,
        mot.motTestNumber,
        JSON.stringify(mot.rfrAndComments)
      ])
    }
    
    // Log some API usage for cost tracking
    await client.query(`
      INSERT INTO api_usage_log (
        registration, api_provider, api_package, cost_amount,
        response_status, data_retrieved, cached_hit
      ) VALUES 
        ('LN64XFG', 'VDG', 'VehicleDetailsWithImage', 0.14, 'success', true, false),
        ('LN64XFG', 'SWS', 'TechData', 0.48, 'success', true, false),
        ('LN64XFG', 'DVLA', 'OpenData', 0.00, 'success', true, false)
    `)
    
    console.log('✅ Sample vehicle data created successfully!')
    console.log('🎯 Vehicle: LN64XFG - 2014 Volkswagen Golf SE TDI')
    console.log('📊 Data completeness: 95%')
    console.log('💰 Total API cost: £0.62')
    console.log('🔧 Technical specs: Complete with 17 specifications')
    console.log('🛢️ Service data: Oil specs, A/C data, repair times')
    console.log('🏭 Factory options: 15 standard features')
    console.log('🛡️ MOT history: 3 tests with detailed results')
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run the script
createSampleVehicleData().catch(console.error)
