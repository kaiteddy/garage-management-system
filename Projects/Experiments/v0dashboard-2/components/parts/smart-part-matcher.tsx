"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Link, AlertTriangle, CheckCircle, Merge } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PartVariation {
  description: string
  usage_count: number
  avg_price: number | string
  min_price: number | string
  max_price: number | string
  suggested_canonical: string
  similarity_score: number
}

interface SmartPartMatcherProps {
  isOpen: boolean
  onClose: () => void
  currentPartName: string
  onPartSelect?: (canonicalName: string, variations: string[]) => void
}

export function SmartPartMatcher({
  isOpen,
  onClose,
  currentPartName,
  onPartSelect
}: SmartPartMatcherProps) {
  const [variations, setVariations] = useState<PartVariation[]>([])
  const [loading, setLoading] = useState(false)
  const [canonicalName, setCanonicalName] = useState("")
  const [selectedVariations, setSelectedVariations] = useState<string[]>([])
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen && currentPartName) {
      findPartVariations()
    }
  }, [isOpen, currentPartName])

  const findPartVariations = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/parts-smart-matcher?part_name=${encodeURIComponent(currentPartName)}`)
      const data = await response.json()

      if (data.success) {
        setVariations(data.data.variations || [])
        setCanonicalName(data.data.suggested_canonical || currentPartName)
        setSelectedVariations([currentPartName])
      }
    } catch (error) {
      console.error('Failed to find part variations:', error)
      toast({
        title: "Error",
        description: "Failed to find part variations",
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
    if (onPartSelect && canonicalName && selectedVariations.length > 0) {
      onPartSelect(canonicalName, selectedVariations)
      toast({
        title: "Parts Merged",
        description: `Merged ${selectedVariations.length} variations under "${canonicalName}"`,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Smart Part Matcher: "{currentPartName}"
          </DialogTitle>
          <div className="text-sm text-gray-600">
            Find and merge similar part names to consolidate pricing history
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Canonical Name Input */}
            <div className="space-y-2">
              <Label htmlFor="canonical-name">Canonical Part Name</Label>
              <Input
                id="canonical-name"
                value={canonicalName}
                onChange={(e) => setCanonicalName(e.target.value)}
                placeholder="Enter the standard name for this part"
                className="font-medium"
              />
              <p className="text-xs text-gray-500">
                This will be the standard name used for all variations
              </p>
            </div>

            {/* Variations Found */}
            {variations.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Similar Parts Found ({variations.length})</h3>
                  <Badge variant="outline">
                    Select variations to merge
                  </Badge>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
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
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{variation.description}</span>
                            <Badge className={getSimilarityColor(variation.similarity_score)}>
                              {getSimilarityLabel(variation.similarity_score)}
                            </Badge>
                            {selectedVariations.includes(variation.description) && (
                              <CheckCircle className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
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
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Merge className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900">Merge Summary</span>
                    </div>
                    <div className="text-sm text-blue-800">
                      <div>Canonical Name: <strong>{canonicalName}</strong></div>
                      <div>Variations to merge: <strong>{selectedVariations.length}</strong></div>
                      <div className="mt-2">
                        <strong>Benefits:</strong>
                        <ul className="list-disc list-inside ml-2">
                          <li>Consolidated pricing history</li>
                          <li>Consistent part naming</li>
                          <li>Better pricing suggestions</li>
                          <li>Reduced confusion</li>
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
                    disabled={selectedVariations.length < 2 || !canonicalName}
                    className="flex items-center gap-2"
                  >
                    <Merge className="h-4 w-4" />
                    Merge {selectedVariations.length} Variations
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-4">No similar parts found</div>
                <Badge variant="outline">This part name appears to be unique</Badge>
              </div>
            )}

            {/* Common Issues Help */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Common Part Name Issues
              </h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div><strong>Spacing:</strong> "OIL FILTER" vs "OIL  FILTER" (extra space)</div>
                <div><strong>Abbreviations:</strong> "BRAKE PAD FRT" vs "FRONT BRAKE PADS"</div>
                <div><strong>Brand Names:</strong> "OIL FILTER (AUDI)" vs "AUDI OIL FILTER"</div>
                <div><strong>Typos:</strong> "IGNITON COIL" vs "IGNITION COIL"</div>
                <div><strong>Case:</strong> "oil cap" vs "OIL CAP"</div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
