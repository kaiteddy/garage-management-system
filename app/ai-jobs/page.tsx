"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Plus, X, Wand2, Copy, Download, Save, Briefcase } from "lucide-react"
import { generateJobDescription, saveJobDescription } from "@/lib/actions"
import { toast } from "@/hooks/use-toast"

const automotiveJobTemplates = {
  "Senior Automotive Technician": {
    department: "Workshop",
    experience: "Senior (5-10 years)",
    skills: [
      "ASE Certification preferred",
      "Diagnostic equipment proficiency",
      "Engine repair and maintenance",
      "Brake system expertise",
      "Electrical system troubleshooting",
      "Transmission knowledge",
      "Customer service skills",
    ],
    responsibilities: [
      "Perform comprehensive vehicle diagnostics using advanced equipment",
      "Execute complex repairs on engines, transmissions, and electrical systems",
      "Mentor junior technicians and apprentices",
      "Maintain accurate service records and documentation",
      "Ensure all work meets safety and quality standards",
      "Communicate repair needs and recommendations to service advisors",
      "Stay current with automotive technology and manufacturer updates",
    ],
  },
  "Service Advisor": {
    department: "Service Reception",
    experience: "Mid-Level (3-5 years)",
    skills: [
      "Automotive knowledge",
      "Customer service excellence",
      "Sales and upselling abilities",
      "Computer proficiency",
      "Communication skills",
      "Problem-solving abilities",
      "Time management",
    ],
    responsibilities: [
      "Greet customers and assess their vehicle service needs",
      "Prepare detailed service estimates and explain repair procedures",
      "Schedule appointments and manage service workflow",
      "Communicate with technicians regarding repair progress",
      "Handle customer concerns and ensure satisfaction",
      "Process service payments and maintain customer records",
      "Follow up with customers post-service",
    ],
  },
  "Parts Specialist": {
    department: "Parts Department",
    experience: "Junior (1-3 years)",
    skills: [
      "Parts catalog knowledge",
      "Inventory management",
      "Computer systems proficiency",
      "Attention to detail",
      "Customer service",
      "Organizational skills",
      "Basic automotive knowledge",
    ],
    responsibilities: [
      "Maintain accurate parts inventory and stock levels",
      "Process parts orders and manage supplier relationships",
      "Assist customers and technicians with parts identification",
      "Receive and organize incoming parts shipments",
      "Update parts pricing and catalog information",
      "Handle parts returns and warranty claims",
      "Support counter sales and customer inquiries",
    ],
  },
}

export default function AIJobDescriptionsPage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [generatedDescription, setGeneratedDescription] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [formData, setFormData] = useState({
    title: "",
    department: "",
    experience: "",
    skills: [] as string[],
    responsibilities: [] as string[],
    salary: "",
    location: "",
    employmentType: "Full-time",
  })
  const [newSkill, setNewSkill] = useState("")
  const [newResponsibility, setNewResponsibility] = useState("")

  const departments = [
    "Workshop",
    "Service Reception",
    "Parts Department",
    "Administration",
    "Management",
    "MOT Testing",
    "Bodywork & Paint",
    "Diagnostics",
    "Customer Service",
    "Sales",
  ]

  const experienceLevels = [
    "Entry Level (0-1 years)",
    "Junior (1-3 years)",
    "Mid-Level (3-5 years)",
    "Senior (5-10 years)",
    "Expert (10+ years)",
  ]

  const employmentTypes = ["Full-time", "Part-time", "Contract", "Temporary", "Apprenticeship"]

  const loadTemplate = (templateName: string) => {
    const template = automotiveJobTemplates[templateName as keyof typeof automotiveJobTemplates]
    if (template) {
      setFormData((prev) => ({
        ...prev,
        title: templateName,
        department: template.department,
        experience: template.experience,
        skills: [...template.skills],
        responsibilities: [...template.responsibilities],
      }))
      setSelectedTemplate(templateName)
      toast({
        title: "Template Loaded",
        description: `${templateName} template has been applied.`,
      })
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }))
      setNewSkill("")
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }))
  }

  const addResponsibility = () => {
    if (newResponsibility.trim() && !formData.responsibilities.includes(newResponsibility.trim())) {
      setFormData((prev) => ({
        ...prev,
        responsibilities: [...prev.responsibilities, newResponsibility.trim()],
      }))
      setNewResponsibility("")
    }
  }

  const removeResponsibility = (respToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      responsibilities: prev.responsibilities.filter((resp) => resp !== respToRemove),
    }))
  }

  const handleGenerate = async () => {
    if (!formData.title || !formData.department || !formData.experience) {
      toast({
        title: "Missing Information",
        description: "Please fill in job title, department, and experience level.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    try {
      const result = await generateJobDescription(formData)

      if (result.error) {
        toast({
          title: "Generation Failed",
          description: result.error,
          variant: "destructive",
        })
      } else {
        setGeneratedDescription(result.description || "")
        toast({
          title: "Job Description Generated",
          description: "Your AI-powered job description is ready!",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate job description. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!generatedDescription || !formData.title) {
      toast({
        title: "Nothing to Save",
        description: "Please generate a job description first.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const result = await saveJobDescription({
        title: formData.title,
        department: formData.department,
        description: generatedDescription,
        createdBy: "Service Manager", // In real app, get from auth
      })

      if (result.error) {
        toast({
          title: "Save Failed",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Saved Successfully",
          description: result.message,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save job description.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedDescription)
    toast({
      title: "Copied!",
      description: "Job description copied to clipboard.",
    })
  }

  const downloadAsText = () => {
    const blob = new Blob([generatedDescription], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${formData.title.replace(/\s+/g, "_")}_job_description.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Job Descriptions</h1>
          <p className="text-muted-foreground">
            Generate professional job descriptions for your automotive service positions
          </p>
        </div>
      </div>

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList>
          <TabsTrigger value="create">Create New</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Templates</CardTitle>
              <CardDescription>Quick start with pre-built automotive job templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.keys(automotiveJobTemplates).map((templateName) => (
                  <Card key={templateName} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold">{templateName}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Briefcase className="h-4 w-4" />
                          {automotiveJobTemplates[templateName as keyof typeof automotiveJobTemplates].department}
                        </div>
                        <Button onClick={() => loadTemplate(templateName)} size="sm" className="w-full">
                          Use Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Job Details
                </CardTitle>
                <CardDescription>Fill in the details to generate a professional job description</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Job Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Senior Automotive Technician"
                      value={formData.title}
                      onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select
                      value={formData.department}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, department: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="experience">Experience Level</Label>
                    <Select
                      value={formData.experience}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, experience: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        {experienceLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employmentType">Employment Type</Label>
                    <Select
                      value={formData.employmentType}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, employmentType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {employmentTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location (Optional)</Label>
                    <Input
                      id="location"
                      placeholder="e.g., London, UK"
                      value={formData.location}
                      onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salary">Salary Range (Optional)</Label>
                    <Input
                      id="salary"
                      placeholder="e.g., £25,000 - £35,000"
                      value={formData.salary}
                      onChange={(e) => setFormData((prev) => ({ ...prev, salary: e.target.value }))}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Required Skills</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill..."
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addSkill()}
                    />
                    <Button onClick={addSkill} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                        {skill}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeSkill(skill)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Key Responsibilities</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a responsibility..."
                      value={newResponsibility}
                      onChange={(e) => setNewResponsibility(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addResponsibility()}
                    />
                    <Button onClick={addResponsibility} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {formData.responsibilities.map((resp) => (
                      <div key={resp} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <span className="flex-1 text-sm">{resp}</span>
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeResponsibility(resp)} />
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Job Description
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Generated Description */}
            <Card>
              <CardHeader>
                <CardTitle>Generated Job Description</CardTitle>
                <CardDescription>AI-powered professional job description ready to use</CardDescription>
              </CardHeader>
              <CardContent>
                {generatedDescription ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={copyToClipboard} size="sm" variant="outline">
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button onClick={downloadAsText} size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button onClick={handleSave} size="sm" variant="outline" disabled={isSaving}>
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save
                      </Button>
                    </div>
                    <Textarea
                      value={generatedDescription}
                      onChange={(e) => setGeneratedDescription(e.target.value)}
                      className="min-h-[500px] font-mono text-sm"
                      placeholder="Generated job description will appear here..."
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[500px] text-muted-foreground">
                    <div className="text-center">
                      <Wand2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Fill in the job details and click "Generate" to create your job description</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
