"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Bot, Copy, Loader2, Plus, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AIDescriptionDialogProps {
  vehicleMake?: string
  vehicleModel?: string
  vehicleYear?: string
  onDescriptionGenerated?: (description: string) => void
}

export function AIDescriptionDialog({
  vehicleMake = "",
  vehicleModel = "",
  vehicleYear = "",
  onDescriptionGenerated,
}: AIDescriptionDialogProps) {
  const [activeTab, setActiveTab] = useState("work")
  const [generating, setGenerating] = useState(false)
  const [generatedDescription, setGeneratedDescription] = useState("")
  const [copied, setCopied] = useState(false)

  // Work Description Form
  const [workType, setWorkType] = useState("repair")
  const [component, setComponent] = useState("")
  const [issue, setIssue] = useState("")
  const [action, setAction] = useState("")

  // Labour Description Form
  const [taskDescription, setTaskDescription] = useState("")
  const [hours, setHours] = useState("1")
  const [minutes, setMinutes] = useState("0")
  const [difficulty, setDifficulty] = useState("routine")
  const [tools, setTools] = useState<string[]>([])
  const [newTool, setNewTool] = useState("")
  const [notes, setNotes] = useState("")

  // Parts Description Form
  const [partName, setPartName] = useState("")
  const [partNumber, setPartNumber] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [condition, setCondition] = useState("new")
  const [replacementReason, setReplacementReason] = useState("wear")

  // Generate description based on active tab
  const generateDescription = () => {
    setGenerating(true)

    // Simulate AI generation with a timeout
    setTimeout(() => {
      let description = ""

      if (activeTab === "work") {
        description = generateWorkDescription()
      } else if (activeTab === "labour") {
        description = generateLabourDescription()
      } else if (activeTab === "parts") {
        description = generatePartsDescription()
      }

      setGeneratedDescription(description)
      setGenerating(false)
    }, 1500)
  }

  // Generate work description
  const generateWorkDescription = () => {
    const vehicleInfo = [vehicleYear, vehicleMake, vehicleModel].filter(Boolean).join(" ")

    const workTypeMap: Record<string, string> = {
      inspection: "Performed inspection of",
      repair: "Completed repair work on",
      replacement: "Replaced",
      service: "Serviced",
      diagnostic: "Performed diagnostic testing on",
      mot: "Conducted MOT test on",
    }

    const workTypeText = workTypeMap[workType] || "Worked on"

    let description = vehicleInfo ? `${vehicleInfo} - ` : ""
    description += `${workTypeText} ${component || "vehicle component"}.`

    if (issue) {
      description += ` Issue: ${issue}.`
    }

    if (action) {
      description += ` Resolution: ${action}.`
    }

    // Add professional closing
    description += " Work completed to manufacturer specifications and tested for proper operation."

    return description
  }

  // Generate labour description
  const generateLabourDescription = () => {
    const timeText =
      hours !== "0" || minutes !== "0"
        ? `${hours !== "0" ? `${hours}h` : ""}${hours !== "0" && minutes !== "0" ? " " : ""}${minutes !== "0" ? `${minutes}m` : ""}`
        : "time"

    const difficultyMap: Record<string, string> = {
      routine: "Routine maintenance",
      moderate: "Moderate complexity work",
      complex: "Complex technical work",
      specialist: "Specialist work requiring advanced training",
    }

    const difficultyText = difficultyMap[difficulty] || "Work"

    let description = `${taskDescription || "Performed automotive work"} - ${timeText} labour time. `
    description += `${difficultyText} requiring specialized knowledge`

    if (tools.length > 0) {
      description += ` and tools. Tools used: ${tools.join(", ")}.`
    } else {
      description += " and appropriate tools."
    }

    if (notes) {
      description += ` Additional notes: ${notes}`
    }

    return description
  }

  // Generate parts description
  const generatePartsDescription = () => {
    const conditionMap: Record<string, string> = {
      new: "New",
      genuine: "Genuine OEM",
      aftermarket: "Aftermarket",
      reconditioned: "Reconditioned",
    }

    const reasonMap: Record<string, string> = {
      wear: "normal wear and tear",
      damage: "damage",
      upgrade: "performance upgrade",
      recall: "manufacturer recall",
      preventive: "preventive maintenance",
    }

    const conditionText = conditionMap[condition] || "New"
    const reasonText = reasonMap[replacementReason] || "maintenance requirements"

    let description = `${quantity}x ${partName || "Part"}`

    if (partNumber) {
      description += ` (Part #: ${partNumber})`
    }

    description += `. Condition: ${conditionText}. `
    description += `Replaced due to ${reasonText}. `

    if (condition === "genuine") {
      description += "Genuine/OEM equivalent parts used where applicable."
    } else if (condition === "aftermarket") {
      description += "Quality aftermarket parts used to provide cost-effective repair."
    }

    return description
  }

  // Copy description to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedDescription)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Use the generated description
  const useDescription = () => {
    if (onDescriptionGenerated) {
      onDescriptionGenerated(generatedDescription)
    }
  }

  // Add a tool to the list
  const addTool = () => {
    if (newTool && !tools.includes(newTool)) {
      setTools([...tools, newTool])
      setNewTool("")
    }
  }

  // Remove a tool from the list
  const removeTool = (tool: string) => {
    setTools(tools.filter((t) => t !== tool))
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Bot className="h-4 w-4" />
          AI Description
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Generate AI Work Description</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="work" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="work">Work Description</TabsTrigger>
            <TabsTrigger value="labour">Labour Description</TabsTrigger>
            <TabsTrigger value="parts">Parts Description</TabsTrigger>
          </TabsList>

          <TabsContent value="work" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="work-type">Work Type</Label>
                <Select value={workType} onValueChange={setWorkType}>
                  <SelectTrigger id="work-type">
                    <SelectValue placeholder="Select work type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="replacement">Replacement</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="diagnostic">Diagnostic</SelectItem>
                    <SelectItem value="mot">MOT Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="component">Component</Label>
                <Input
                  id="component"
                  placeholder="e.g. brake pads, engine oil"
                  value={component}
                  onChange={(e) => setComponent(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue">Issue/Findings (Optional)</Label>
              <Textarea
                id="issue"
                placeholder="Describe the issue found"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Action Taken (Optional)</Label>
              <Textarea
                id="action"
                placeholder="Describe what was done"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="labour" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="task-description">Task Description</Label>
              <Input
                id="task-description"
                placeholder="e.g. Replace front brake pads"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Time Taken</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Hours"
                      min="0"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Minutes"
                      min="0"
                      max="59"
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger id="difficulty">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="complex">Complex</SelectItem>
                    <SelectItem value="specialist">Specialist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tools Used</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tool"
                  value={newTool}
                  onChange={(e) => setNewTool(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addTool()
                    }
                  }}
                />
                <Button type="button" size="icon" onClick={addTool}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                {tools.map((tool) => (
                  <Badge key={tool} variant="secondary" className="flex items-center gap-1">
                    {tool}
                    <button
                      type="button"
                      onClick={() => removeTool(tool)}
                      className="ml-1 rounded-full hover:bg-muted p-0.5"
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove {tool}</span>
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="parts" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="part-name">Part Name</Label>
                <Input
                  id="part-name"
                  placeholder="e.g. Front brake pad set"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="part-number">Part Number (Optional)</Label>
                <Input
                  id="part-number"
                  placeholder="e.g. BP-1234"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger id="condition">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="genuine">Genuine OEM</SelectItem>
                    <SelectItem value="aftermarket">Aftermarket</SelectItem>
                    <SelectItem value="reconditioned">Reconditioned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="replacement-reason">Replacement Reason</Label>
                <Select value={replacementReason} onValueChange={setReplacementReason}>
                  <SelectTrigger id="replacement-reason">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wear">Wear</SelectItem>
                    <SelectItem value="damage">Damage</SelectItem>
                    <SelectItem value="upgrade">Upgrade</SelectItem>
                    <SelectItem value="recall">Recall</SelectItem>
                    <SelectItem value="preventive">Preventive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={generateDescription} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Bot className="mr-2 h-4 w-4" />
                Generate Description
              </>
            )}
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={copyToClipboard} disabled={!generatedDescription || generating}>
              <Copy className="mr-2 h-4 w-4" />
              {copied ? "Copied!" : "Copy"}
            </Button>

            <Button onClick={useDescription} disabled={!generatedDescription || generating}>
              Use Description
            </Button>
          </div>
        </div>

        {generatedDescription && (
          <Card className="mt-4">
            <CardContent className="pt-4">
              <ScrollArea className="h-[100px]">
                <p className="text-sm">{generatedDescription}</p>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  )
}
