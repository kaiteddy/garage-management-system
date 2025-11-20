import { sql } from "./neon-client"
import type { DatabaseCustomer } from "./neon-client"

export class CustomerService {
  // Create a new customer
  static async createCustomer(customerData: Partial<DatabaseCustomer>): Promise<DatabaseCustomer> {
    const result = await sql`
      INSERT INTO customers (
        account_number, title, forename, surname, company_name,
        house_no, road, locality, town, county, post_code,
        telephone, mobile, email, last_invoice_date, notes
      ) VALUES (
        ${customerData.account_number || null},
        ${customerData.title || null},
        ${customerData.forename || null},
        ${customerData.surname || null},
        ${customerData.company_name || null},
        ${customerData.house_no || null},
        ${customerData.road || null},
        ${customerData.locality || null},
        ${customerData.town || null},
        ${customerData.county || null},
        ${customerData.post_code || null},
        ${customerData.telephone || null},
        ${customerData.mobile || null},
        ${customerData.email || null},
        ${customerData.last_invoice_date || null},
        ${customerData.notes || null}
      )
      RETURNING *
    `
    return result[0] as DatabaseCustomer
  }

  // Get all customers with vehicle counts
  static async getAllCustomers(): Promise<DatabaseCustomer[]> {
    const result = await sql`
      SELECT
        c.*,
        COUNT(v.registration) as vehicle_count
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `
    return result as DatabaseCustomer[]
  }

  // Get customer by ID
  static async getCustomerById(id: string): Promise<DatabaseCustomer | null> {
    const result = await sql`
      SELECT * FROM customers
      WHERE id = ${id}
    `
    return (result[0] as DatabaseCustomer) || null
  }

  // Update customer
  static async updateCustomer(id: string, updates: Partial<DatabaseCustomer>): Promise<DatabaseCustomer> {
    const result = await sql`
      UPDATE customers SET
        account_number = COALESCE(${updates.account_number}, account_number),
        title = COALESCE(${updates.title}, title),
        forename = COALESCE(${updates.forename}, forename),
        surname = COALESCE(${updates.surname}, surname),
        company_name = COALESCE(${updates.company_name}, company_name),
        house_no = COALESCE(${updates.house_no}, house_no),
        road = COALESCE(${updates.road}, road),
        locality = COALESCE(${updates.locality}, locality),
        town = COALESCE(${updates.town}, town),
        county = COALESCE(${updates.county}, county),
        post_code = COALESCE(${updates.post_code}, post_code),
        telephone = COALESCE(${updates.telephone}, telephone),
        mobile = COALESCE(${updates.mobile}, mobile),
        email = COALESCE(${updates.email}, email),
        last_invoice_date = COALESCE(${updates.last_invoice_date}, last_invoice_date),
        notes = COALESCE(${updates.notes}, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `
    return result[0] as DatabaseCustomer
  }

  // Delete customer
  static async deleteCustomer(id: string): Promise<boolean> {
    const result = await sql`
      DELETE FROM customers
      WHERE id = ${id}
    `
    return result.count > 0
  }

  // Search customers with vehicle counts
  static async searchCustomers(query: string): Promise<DatabaseCustomer[]> {
    const searchTerm = `%${query}%`
    const result = await sql`
      SELECT
        c.*,
        COUNT(v.registration) as vehicle_count
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      WHERE
        c.first_name ILIKE ${searchTerm} OR
        c.last_name ILIKE ${searchTerm} OR
        c.email ILIKE ${searchTerm} OR
        c.phone ILIKE ${searchTerm} OR
        c.city ILIKE ${searchTerm} OR
        c.postcode ILIKE ${searchTerm}
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `
    return result as DatabaseCustomer[]
  }
}
