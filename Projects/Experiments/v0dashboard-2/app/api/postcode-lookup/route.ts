import { NextRequest, NextResponse } from "next/server"

interface PostcodeApiResponse {
  status: number
  result?: {
    postcode: string
    quality: number
    eastings: number
    northings: number
    country: string
    nhs_ha: string
    longitude: number
    latitude: number
    european_electoral_region: string
    primary_care_trust: string
    region: string
    lsoa: string
    msoa: string
    incode: string
    outcode: string
    parliamentary_constituency: string
    admin_district: string
    parish: string
    admin_county: string
    admin_ward: string
    ced: string
    ccg: string
    nuts: string
    codes: {
      admin_district: string
      admin_county: string
      admin_ward: string
      parish: string
      parliamentary_constituency: string
      ccg: string
      ccg_id: string
      ced: string
      nuts: string
      lsoa: string
      msoa: string
      lau2: string
    }
  }
  error?: string
}

interface AddressApiResponse {
  status: number
  result?: Array<{
    postcode: string
    line_1: string
    line_2: string
    line_3: string
    post_town: string
    county: string
    district: string
    ward: string
    country: string
    building_number: string
    building_name: string
    sub_building_name: string
    sub_building_number: string
    thoroughfare: string
    dependent_thoroughfare: string
    double_dependent_locality: string
    dependent_locality: string
    po_box: string
    udprn: number
    umprn: string
    delivery_point_suffix: string
    organisation_name: string
  }>
  error?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postcode = searchParams.get('postcode')
    const addresses = searchParams.get('addresses') === 'true'

    if (!postcode) {
      return NextResponse.json({ error: "Postcode is required" }, { status: 400 })
    }

    // Clean the postcode
    const cleanPostcode = postcode.trim().toUpperCase().replace(/\s+/g, ' ')

    console.log(`🔍 POSTCODE LOOKUP: Looking up ${cleanPostcode}`)

    if (addresses) {
      // Note: postcodes.io doesn't provide specific addresses, only postcode info
      // Return basic postcode info formatted as if it were an address lookup
      const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPostcode)}`)
      const data: PostcodeApiResponse = await response.json()

      if (data.status !== 200 || !data.result) {
        return NextResponse.json({
          error: "Postcode not found",
          postcode: cleanPostcode
        }, { status: 404 })
      }

      const result = data.result

      // Return basic area information that can be used to pre-fill address fields
      return NextResponse.json({
        success: true,
        postcode: cleanPostcode,
        town: result.admin_district,
        county: result.admin_county,
        region: result.region,
        country: result.country,
        // Note: No specific addresses available from this API
        addresses: [],
        count: 0,
        message: "Postcode found. Please enter house number and street name manually."
      })
    } else {
      // Get basic postcode information
      const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPostcode)}`)
      const data: PostcodeApiResponse = await response.json()

      if (data.status !== 200 || !data.result) {
        return NextResponse.json({
          error: "Postcode not found",
          postcode: cleanPostcode
        }, { status: 404 })
      }

      const result = data.result
      return NextResponse.json({
        success: true,
        postcode: cleanPostcode,
        town: result.admin_district,
        county: result.admin_county,
        region: result.region,
        country: result.country,
        coordinates: {
          latitude: result.latitude,
          longitude: result.longitude
        }
      })
    }
  } catch (error) {
    console.error('Postcode lookup error:', error)
    return NextResponse.json({
      error: "Failed to lookup postcode",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
