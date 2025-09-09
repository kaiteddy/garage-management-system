"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sun, Moon, Phone, Mail, ExternalLink, FileText, User, Search, ArrowLeft } from "lucide-react"

export default function TestButtonVisibilityPage() {
  const [darkMode, setDarkMode] = useState(false)

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <div className={`min-h-screen p-8 ${darkMode ? 'dark' : ''}`}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Button Visibility Test</h1>
            <p className="text-muted-foreground">Testing button contrast in light and dark modes</p>
          </div>
          <Button onClick={toggleDarkMode} variant="outline" size="lg">
            {darkMode ? <Sun className="h-5 w-5 mr-2" /> : <Moon className="h-5 w-5 mr-2" />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </div>

        {/* Standard UI Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Standard UI Buttons</CardTitle>
            <CardDescription>Using the standard button component variants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button variant="default">Default Button</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="destructive">Destructive Button</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="link">Link Button</Button>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <h4 className="text-md font-medium mb-2 text-yellow-800 dark:text-yellow-200">⚠️ Problematic Buttons (Now Fixed)</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                These buttons previously had poor contrast due to CSS variables. They now have explicit styling for better visibility.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="bg-gray-600 border-gray-600 text-white hover:bg-gray-700 dark:bg-gray-500 dark:border-gray-500 dark:hover:bg-gray-600">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back Button (Fixed)
                </Button>
                <Button className="bg-gray-600 border-gray-600 text-white hover:bg-gray-700 dark:bg-gray-500 dark:border-gray-500 dark:hover:bg-gray-600">
                  Default Fixed Button
                </Button>
                <Button variant="ghost" className="bg-gray-600 border-gray-600 text-white hover:bg-gray-700 dark:bg-gray-500 dark:border-gray-500 dark:hover:bg-gray-600">
                  Ghost Fixed Button
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fixed Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Fixed Action Buttons</CardTitle>
            <CardDescription>Buttons with improved contrast for better visibility</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button
                variant="outline"
                size="sm"
                className="bg-green-600 border-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:border-green-500 dark:hover:bg-green-600"
              >
                <Phone className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-blue-600 border-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:border-blue-500 dark:hover:bg-blue-600"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-green-600 border-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:border-green-500 dark:hover:bg-green-600"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                DVLA
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-blue-600 border-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:border-blue-500 dark:hover:bg-blue-600"
              >
                <FileText className="h-4 w-4 mr-2" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-orange-600 border-orange-600 hover:bg-orange-700 text-white dark:bg-orange-500 dark:border-orange-500 dark:hover:bg-orange-600"
              >
                <User className="h-4 w-4 mr-2" />
                Change Owner
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Status Badges</CardTitle>
            <CardDescription>Badges with improved contrast</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Badge className="bg-red-600 text-white dark:bg-red-500">
                Expired
              </Badge>
              <Badge className="bg-yellow-600 text-white dark:bg-yellow-500">
                Expiring Soon
              </Badge>
              <Badge className="bg-green-600 text-white dark:bg-green-500">
                Valid
              </Badge>
              <Badge className="bg-blue-600 text-white dark:bg-blue-500">
                Processing
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Batch Selection Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Batch Selection Buttons</CardTitle>
            <CardDescription>Buttons for selecting multiple items</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button
                variant="outline"
                size="sm"
                className="bg-blue-600 border-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:border-blue-500 dark:hover:bg-blue-600"
              >
                +10
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-blue-600 border-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:border-blue-500 dark:hover:bg-blue-600"
              >
                +25
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-green-600 border-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:border-green-500 dark:hover:bg-green-600"
              >
                Select Next 50
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Gradient Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Gradient Buttons</CardTitle>
            <CardDescription>Buttons with gradient backgrounds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <button className="h-10 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 border border-blue-600 dark:border-blue-500 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2">
                <User className="w-4 h-4" />
                <span>Change Owner</span>
              </button>
              <button className="h-10 px-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white dark:from-green-500 dark:to-green-600 dark:hover:from-green-600 dark:hover:to-green-700 border border-green-600 dark:border-green-500 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2">
                <Search className="w-4 h-4" />
                <span>New Search</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Text Links */}
        <Card>
          <CardHeader>
            <CardTitle>Text Links</CardTitle>
            <CardDescription>Clickable text with improved contrast</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <button className="text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-semibold text-sm transition-colors cursor-pointer uppercase">
                BF55NMZ
              </button>
              <br />
              <button className="text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-semibold text-sm transition-colors cursor-pointer uppercase">
                43AAX
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Information Boxes */}
        <Card>
          <CardHeader>
            <CardTitle>Information Boxes</CardTitle>
            <CardDescription>Information displays with improved contrast</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-100 dark:bg-blue-800 border border-blue-200 dark:border-blue-600 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-100">
              🔄 This may take a few moments while we fetch the latest data
            </div>
            <div className="text-xs text-blue-800 dark:text-blue-100 p-2 bg-blue-100 dark:bg-blue-800 rounded border border-blue-200 dark:border-blue-600">
              <div className="flex justify-between items-center">
                <span>Estimated cost:</span>
                <span className="font-semibold">£0.20</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
