/**
 * To run this script:
 *
 * 1. Make sure you have Node.js installed.
 * 2. Run `npm install papaparse` in your terminal.
 * 3. Run `node scripts/analyze-full-database.js` in your terminal.
 */
import Papa from "papaparse"

const files = {
  customers: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Customers-eUUHu8JFYyOG2fewMSzhBxg9ZGZM1A.csv",
  vehicles: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Vehicles-wyWc3AVTjwFx4YN9p0tpVRI61q5f8Y.csv",
  appointments:
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Appointments-3Fix7BjluIw75WfAwMQVcBpzY2oNla.csv",
  reminders: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Reminders-CQ8P8BRUTQekn1KbkViJZblEBAtxx9.csv",
}

async function fetchAndParse(url) {
  const response = await fetch(url)
  const csvText = await response.text()
  return Papa.parse(csvText, { header: true, skipEmptyLines: true }).data
}

async function analyze() {
  console.log("🚀 Starting database analysis...")

  const [customers, vehicles, appointments, reminders] = await Promise.all([
    fetchAndParse(files.customers),
    fetchAndParse(files.vehicles),
    fetchAndParse(files.appointments),
    fetchAndParse(files.reminders),
  ])

  console.log(`\n📊 Loaded Data:`)
  console.log(`  - ${customers.length} Customers`)
  console.log(`  - ${vehicles.length} Vehicles`)
  console.log(`  - ${appointments.length} Appointments`)
  console.log(`  - ${reminders.length} Reminders`)

  // Create maps for quick lookups
  const customerMap = new Map(customers.map((c) => [c._ID, c]))
  const vehicleMap = new Map(vehicles.map((v) => [v._ID, v]))

  // --- Analysis ---
  let vehiclesWithCustomers = 0
  let vehiclesWithoutCustomers = 0
  for (const vehicle of vehicles) {
    if (customerMap.has(vehicle._ID_Customer)) {
      vehiclesWithCustomers++
    } else {
      vehiclesWithoutCustomers++
    }
  }

  let appointmentsWithVehicles = 0
  let appointmentsWithoutVehicles = 0
  for (const appt of appointments) {
    if (vehicleMap.has(appt._ID_Vehicle)) {
      appointmentsWithVehicles++
    } else {
      appointmentsWithoutVehicles++
    }
  }

  let remindersWithVehicles = 0
  let remindersWithoutVehicles = 0
  for (const reminder of reminders) {
    if (vehicleMap.has(reminder._ID_Vehicle)) {
      remindersWithVehicles++
    } else {
      remindersWithoutVehicles++
    }
  }

  console.log("\n🔗 Linkage Analysis:")
  console.log(
    `  - Vehicles: ${vehiclesWithCustomers} linked to customers, ${vehiclesWithoutCustomers} have missing customer links.`,
  )
  console.log(
    `  - Appointments: ${appointmentsWithVehicles} linked to vehicles, ${appointmentsWithoutVehicles} have missing vehicle links.`,
  )
  console.log(
    `  - Reminders: ${remindersWithVehicles} linked to vehicles, ${remindersWithoutVehicles} have missing vehicle links.`,
  )

  // --- Sample Data ---
  console.log("\n🔍 Sample Connected Record:")
  const sampleVehicle = vehicles.find((v) => customerMap.has(v._ID_Customer))
  if (sampleVehicle) {
    const sampleCustomer = customerMap.get(sampleVehicle._ID_Customer)
    const sampleAppointments = appointments.filter((a) => a._ID_Vehicle === sampleVehicle._ID)
    const sampleReminders = reminders.filter((r) => r._ID_Vehicle === sampleVehicle._ID)

    console.log(`  - Vehicle: ${sampleVehicle.Make} ${sampleVehicle.Model} (${sampleVehicle.Registration})`)
    console.log(`  - Owner: ${sampleCustomer.nameTitle} ${sampleCustomer.nameForename} ${sampleCustomer.nameSurname}`)
    console.log(`  - Appointments Found: ${sampleAppointments.length}`)
    if (sampleAppointments.length > 0) {
      console.log(
        `    - Next Appt: ${sampleAppointments[0].ApptDateStart} for "${sampleAppointments[0].ApptDescEntry.replace(/\s+/g, " ")}"`,
      )
    }
    console.log(`  - Reminders Found: ${sampleReminders.length}`)
    if (sampleReminders.length > 0) {
      console.log(`    - Next Reminder Due: ${sampleReminders[0].DueDate}`)
    }
  } else {
    console.log("  - No sample vehicle with a valid customer link found.")
  }

  console.log("\n✅ Analysis complete.")
}

analyze().catch(console.error)
