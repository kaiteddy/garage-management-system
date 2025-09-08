import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    // Check total vehicles with MOT expiry dates
    const totalWithMOT = await sql`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
    `;

    // Check vehicles expiring in next 14 days
    const expiringSoon = await sql`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
      AND mot_expiry_date >= CURRENT_DATE
      AND mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days'
    `;

    // Check vehicles expired within last 6 months
    const recentlyExpired = await sql`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
      AND mot_expiry_date >= CURRENT_DATE - INTERVAL '6 months'
      AND mot_expiry_date < CURRENT_DATE
    `;

    // Check vehicles expired (any time)
    const allExpired = await sql`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
      AND mot_expiry_date < CURRENT_DATE
    `;

    // Get sample of vehicles expiring soon
    const sampleExpiringSoon = await sql`
      SELECT registration, make, model, mot_expiry_date,
             mot_expiry_date - CURRENT_DATE as days_until_expiry
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
      AND mot_expiry_date >= CURRENT_DATE
      AND mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days'
      ORDER BY mot_expiry_date ASC
      LIMIT 5
    `;

    // Get sample of recently expired vehicles
    const sampleRecentlyExpired = await sql`
      SELECT registration, make, model, mot_expiry_date,
             CURRENT_DATE - mot_expiry_date as days_since_expired
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
      AND mot_expiry_date >= CURRENT_DATE - INTERVAL '6 months'
      AND mot_expiry_date < CURRENT_DATE
      ORDER BY mot_expiry_date DESC
      LIMIT 5
    `;

    // Check date ranges
    const dateInfo = await sql`
      SELECT
        CURRENT_DATE as today,
        CURRENT_DATE + INTERVAL '14 days' as fourteen_days_from_now,
        CURRENT_DATE - INTERVAL '6 months' as six_months_ago,
        MIN(mot_expiry_date) as earliest_mot_expiry,
        MAX(mot_expiry_date) as latest_mot_expiry
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
    `;

    return NextResponse.json({
      success: true,
      counts: {
        totalWithMOT: parseInt(totalWithMOT[0]?.count || '0'),
        expiringSoon: parseInt(expiringSoon[0]?.count || '0'),
        recentlyExpired: parseInt(recentlyExpired[0]?.count || '0'),
        allExpired: parseInt(allExpired[0]?.count || '0')
      },
      samples: {
        expiringSoon: sampleExpiringSoon,
        recentlyExpired: sampleRecentlyExpired
      },
      dateInfo: dateInfo[0]
    });

  } catch (error) {
    console.error('Debug MOT critical error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Debug failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
