import { redirect } from 'next/navigation'

export default function MaintenanceAdminPage() {
  // Redirect to dashboard - maintenance now runs automatically in background
  redirect('/dashboard')
}

