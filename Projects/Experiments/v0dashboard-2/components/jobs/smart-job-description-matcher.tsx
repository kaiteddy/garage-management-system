"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, Wrench, AlertTriangle, CheckCircle, Merge, Car, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface JobDescriptionVariation {
  description: string
  usage_count: number
  avg_price: number | string
  min_price: number | string
  max_price: number | string
  suggested_canonical: string
  similarity_score: number
  job_category: string
  work_type: string
}

interface SmartJobDescriptionMatcherProps {
  isOpen: boolean
  onClose: () => void
  currentJobDescription: string
  onJobSelect?: (canonicalDescription: string, variations: string[], category: string, workType: string) => void
}

export function SmartJobDescriptionMatcher({
  isOpen,
  onClose,
  currentJobDescription,
  onJobSelect
}: SmartJobDescriptionMatcherProps) {
  const [variations, setVariations] = useState<JobDescriptionVariation[]>([])
  const [loading, setLoading] = useState(false)
  const [canonicalDescription, setCanonicalDescription] = useState("")
  const [selectedVariations, setSelectedVariations] = useState<string[]>([])
  const [jobCategory, setJobCategory] = useState("")
  const [workType, setWorkType] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen && currentJobDescription) {
      findJobDescriptionVariations()
    }
  }, [isOpen, currentJobDescription])

  const findJobDescriptionVariations = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/jobs-smart-matcher?job_description=${encodeURIComponent(currentJobDescription)}`)
      const data = await response.json()

      if (data.success) {
        setVariations(data.data.variations || [])
        setCanonicalDescription(data.data.suggested_canonical || currentJobDescription)
        setJobCategory(data.data.suggested_category || "")
        setWorkType(data.data.suggested_work_type || "")
        setSelectedVariations([currentJobDescription])
      }
    } catch (error) {
      console.error('Failed to find job description variations:', error)
      toast({
        title: "Error",
        description: "Failed to find job description variations",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleVariation = (description: string) => {
    setSelectedVariations(prev => 
      prev.includes(description)
        ? prev.filter(v => v !== description)
        : [...prev, description]
    )
  }

  const handleMerge = () => {
    if (onJobSelect && canonicalDescription && selectedVariations.length > 0) {
      onJobSelect(canonicalDescription, selectedVariations, jobCategory, workType)
      toast({
        title: "Job Descriptions Merged",
        description: `Merged ${selectedVariations.length} variations under "${canonicalDescription}"`,
        duration: 3000,
      })
      onClose()
    }
  }

  const getSimilarityColor = (score: number) => {
    if (score >= 0.8) return "bg-green-100 text-green-800"
    if (score >= 0.6) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const getSimilarityLabel = (score: number) => {
    if (score >= 0.8) return "High Match"
    if (score >= 0.6) return "Possible Match"
    return "Low Match"
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'mechanical': return <Settings className="h-4 w-4" />
      case 'bodywork': return <Car className="h-4 w-4" />
      case 'electrical': return <Settings className="h-4 w-4" />
      case 'service': return <Wrench className="h-4 w-4" />
      default: return <Wrench className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'mechanical': return "bg-blue-100 text-blue-800"
      case 'bodywork': return "bg-orange-100 text-orange-800"
      case 'electrical': return "bg-purple-100 text-purple-800"
      case 'service': return "bg-green-100 text-green-800"
      case 'diagnostic': return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Smart Job Description Matcher
          </DialogTitle>
          <div className="text-sm text-gray-600">
            Find and merge similar job descriptions to understand work patterns and improve pricing
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Job Description */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium mb-2">Current Job Description:</h3>
              <div className="font-mono text-sm bg-white p-2 rounded border">
                "{currentJobDescription}"
              </div>
            </div>

            {/* Canonical Description Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="canonical-description">Standard Job Description</Label>
                <Textarea
                  id="canonical-description"
                  value={canonicalDescription}
                  onChange={(e) => setCanonicalDescription(e.target.value)}
                  placeholder="Enter the standard description for this type of work"
                  className="font-medium"
                  rows={3}
                />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="job-category">Job Category</Label>
                  <Input
                    id="job-category"
                    value={jobCategory}
                    onChange={(e) => setJobCategory(e.target.value)}
                    placeholder="e.g., Mechanical, Bodywork, Electrical"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work-type">Work Type</Label>
                  <Input
                    id="work-type"
                    value={workType}
                    onChange={(e) => setWorkType(e.target.value)}
                    placeholder="e.g., Repair, Service, Diagnostic, Replace"
                  />
                </div>
              </div>
            </div>

            {/* Variations Found */}
            {variations.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Similar Job Descriptions Found ({variations.length})</h3>
                  <Badge variant="outline">
                    Select variations to merge
                  </Badge>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {variations.map((variation, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        selectedVariations.includes(variation.description)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleVariation(variation.description)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium font-mono text-sm">{variation.description}</span>
                            {selectedVariations.includes(variation.description) && (
                              <CheckCircle className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getSimilarityColor(variation.similarity_score)}>
                              {getSimilarityLabel(variation.similarity_score)}
                            </Badge>
                            {variation.job_category && (
                              <Badge className={getCategoryColor(variation.job_category)}>
                                {getCategoryIcon(variation.job_category)}
                                {variation.job_category}
                              </Badge>
                            )}
                            {variation.work_type && (
                              <Badge variant="outline">
                                {variation.work_type}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-600">
                            Used {variation.usage_count} times |
                            Avg: £{parseFloat(variation.avg_price || 0).toFixed(2)} |
                            Range: £{parseFloat(variation.min_price || 0).toFixed(2)}-£{parseFloat(variation.max_price || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Merge Summary */}
                {selectedVariations.length > 1 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Merge className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-900">Merge Summary</span>
                    </div>
                    <div className="text-sm text-green-800">
                      <div>Standard Description: <strong>{canonicalDescription}</strong></div>
                      <div>Category: <strong>{jobCategory}</strong> | Work Type: <strong>{workType}</strong></div>
                      <div>Variations to merge: <strong>{selectedVariations.length}</strong></div>
                      <div className="mt-2">
                        <strong>Benefits:</strong>
                        <ul className="list-disc list-inside ml-2">
                          <li>Understand work patterns and frequency</li>
                          <li>Accurate job pricing based on complete history</li>
                          <li>Better service recommendations</li>
                          <li>Professional job descriptions</li>
                          <li>Warranty and service tracking</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleMerge}
                    disabled={selectedVariations.length < 2 || !canonicalDescription}
                    className="flex items-center gap-2"
                  >
                    <Merge className="h-4 w-4" />
                    Merge {selectedVariations.length} Variations
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-4">No similar job descriptions found</div>
                <Badge variant="outline">This job description appears to be unique</Badge>
              </div>
            )}

            {/* Common Issues Help */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Common Job Description Issues
              </h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div><strong>Case Issues:</strong> "MECHANICAL LABOUR" vs "Mechanical labour"</div>
                <div><strong>Spacing:</strong> "BODY SHOP LABOUR" vs "BODYSHOP LABOUR"</div>
                <div><strong>Typos:</strong> "MECHANICAL LABOUR1" vs "MECHANICAL LABOUR"</div>
                <div><strong>Extra Details:</strong> "MECHANICAL LABOUR  MIRROR" vs "MECHANICAL LABOUR"</div>
                <div><strong>Abbreviations:</strong> "MECH LABOUR" vs "MECHANICAL LABOUR"</div>
                <div><strong>Inconsistent Terms:</strong> "BODY LABOUR" vs "BODY SHOP LABOUR"</div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
