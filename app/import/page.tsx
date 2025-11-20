import { DataUpload } from "@/components/data-upload"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FileUp } from "lucide-react"

export default function ImportPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Data Import Center</h1>
          <p className="mt-2 text-lg text-muted-foreground">Upload your business data to populate the application.</p>
        </div>

        <Alert>
          <FileUp className="h-4 w-4" />
          <AlertTitle>How It Works</AlertTitle>
          <AlertDescription>
            Upload your CSV files below. The application will immediately start using the data you provide. Any existing
            data from the initial setup will be overridden by your uploads.
          </AlertDescription>
        </Alert>

        <DataUpload />
      </div>
    </div>
  )
}
