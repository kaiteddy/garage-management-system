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
        COUNT(DISTINCT v.registration) as vehicle_count
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

  // Enhanced search customers with better matching and ranking
  static async searchCustomers(query: string): Promise<DatabaseCustomer[]> {
    const searchTerm = `%${query.trim()}%`
    const exactTerm = query.trim()

    // Enhanced search with ranking and better matching
    const result = await sql`
      SELECT
        c.*,
        COUNT(DISTINCT v.registration) as vehicle_count,
        MAX(cd.created_at) as last_visit,
        -- Ranking score for better results ordering
        CASE
          -- Exact matches get highest priority
          WHEN c.phone = ${exactTerm} OR c.email = ${exactTerm} THEN 100
          WHEN c.postcode = ${exactTerm} THEN 95
          WHEN CONCAT(c.first_name, ' ', c.last_name) ILIKE ${exactTerm} THEN 90
          -- Starts with matches
          WHEN c.first_name ILIKE ${exactTerm + '%'} OR c.last_name ILIKE ${exactTerm + '%'} THEN 80
          WHEN c.phone ILIKE ${exactTerm + '%'} THEN 75
          WHEN c.email ILIKE ${exactTerm + '%'} THEN 70
          -- Contains matches
          WHEN c.first_name ILIKE ${searchTerm} OR c.last_name ILIKE ${searchTerm} THEN 60
          WHEN c.phone ILIKE ${searchTerm} THEN 50
          WHEN c.email ILIKE ${searchTerm} THEN 45
          WHEN c.city ILIKE ${searchTerm} THEN 40
          WHEN c.postcode ILIKE ${searchTerm} THEN 35
          WHEN c.address_line1 ILIKE ${searchTerm} THEN 30
          ELSE 10
        END as search_rank
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      LEFT JOIN customer_documents cd ON c.id = cd.customer_id
      WHERE
        c.first_name ILIKE ${searchTerm} OR
        c.last_name ILIKE ${searchTerm} OR
        CONCAT(c.first_name, ' ', c.last_name) ILIKE ${searchTerm} OR
        c.email ILIKE ${searchTerm} OR
        c.phone ILIKE ${searchTerm} OR
        c.city ILIKE ${searchTerm} OR
        c.postcode ILIKE ${searchTerm} OR
        c.address_line1 ILIKE ${searchTerm} OR
        -- Also search by phone without spaces/formatting
        REPLACE(REPLACE(c.phone, ' ', ''), '-', '') ILIKE REPLACE(REPLACE(${searchTerm}, ' ', ''), '-', '')
      GROUP BY c.id
      ORDER BY search_rank DESC, c.last_name ASC, c.first_name ASC
      LIMIT 20
    `
    return result as DatabaseCustomer[]
  }
}
