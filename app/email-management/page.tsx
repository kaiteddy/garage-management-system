import { EmailTestPanel } from "@/components/email/email-test-panel"

export default function EmailManagementPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Email Management</h1>
        <p className="text-muted-foreground mt-2">Manage and test email functionality for your garage system</p>
      </div>

      <EmailTestPanel />
    </div>
  )
}
