"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, User, Car, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface WorkshopSlot {
  id: string
  time: string
  jobNumber?: string
  customerName?: string
  vehicleReg?: string
  description?: string
  duration: number
  status: "available" | "booked" | "in-progress" | "completed"
  priority?: "low" | "medium" | "high"
}

export default function WorkshopPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [workshopSlots, setWorkshopSlots] = useState<WorkshopSlot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWorkshopData()
  }, [selectedDate])

  const loadWorkshopData = async () => {
    // Simulate API call with sample data
    setTimeout(() => {
      const sampleSlots: WorkshopSlot[] = [
        {
          id: "1",
          time: "08:00",
          jobNumber: "90941",
          customerName: "John Smith",
          vehicleReg: "AB12 CDE",
          description: "Annual service",
          duration: 2,
          status: "booked",
          priority: "medium",
        },
        {
          id: "2",
          time: "09:00",
          duration: 1,
          status: "available",
        },
        {
          id: "3",
          time: "10:00",
          jobNumber: "90942",
          customerName: "Sarah Johnson",
          vehicleReg: "FG34 HIJ",
          description: "Brake service",
          duration: 3,
          status: "in-progress",
          priority: "high",
        },
        {
          id: "4",
          time: "11:00",
          duration: 1,
          status: "available",
        },
        {
          id: "5",
          time: "12:00",
          duration: 1,
          status: "available",
        },
        {
          id: "6",
          time: "13:00",
          jobNumber: "90943",
          customerName: "Mike Wilson",
          vehicleReg: "KL56 MNO",
          description: "MOT test",
          duration: 1,
          status: "completed",
          priority: "low",
        },
        {
          id: "7",
          time: "14:00",
          duration: 1,
          status: "available",
        },
        {
          id: "8",
          time: "15:00",
          duration: 1,
          status: "available",
        },
        {
          id: "9",
          time: "16:00",
          duration: 1,
          status: "available",
        },
        {
          id: "10",
          time: "17:00",
          duration: 1,
          status: "available",
        },
      ]
      setWorkshopSlots(sampleSlots)
      setLoading(false)
    }, 1000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-50 border-green-200 hover:bg-green-100"
      case "booked":
        return "bg-blue-50 border-blue-200 hover:bg-blue-100"
      case "in-progress":
        return "bg-orange-50 border-orange-200 hover:bg-orange-100"
      case "completed":
        return "bg-gray-50 border-gray-200 hover:bg-gray-100"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800"
      case "booked":
        return "bg-blue-100 text-blue-800"
      case "in-progress":
        return "bg-orange-100 text-orange-800"
      case "completed":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-orange-100 text-orange-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
    setSelectedDate(newDate)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const workshopStats = {
    totalSlots: workshopSlots.length,
    available: workshopSlots.filter((s) => s.status === "available").length,
    booked: workshopSlots.filter((s) => s.status === "booked").length,
    inProgress: workshopSlots.filter((s) => s.status === "in-progress").length,
    completed: workshopSlots.filter((s) => s.status === "completed").length,
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workshop Diary</h1>
          <p className="text-muted-foreground">Manage workshop schedule and appointments</p>
        </div>
        <Button className="transition-all duration-200 hover:scale-105">
          <Plus className="h-4 w-4 mr-2" />
          Book Appointment
        </Button>
      </div>

      {/* Workshop Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Total Slots</p>
              <p className="text-2xl font-bold">{workshopStats.totalSlots}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Available</p>
              <p className="text-2xl font-bold text-green-600">{workshopStats.available}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Booked</p>
              <p className="text-2xl font-bold text-blue-600">{workshopStats.booked}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold text-orange-600">{workshopStats.inProgress}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-gray-600">{workshopStats.completed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Calendar className="h-5 w-5" />
              <CardTitle>{formatDate(selectedDate)}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate("prev")}
                className="transition-all duration-200 hover:scale-105"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
                className="transition-all duration-200 hover:scale-105"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate("next")}
                className="transition-all duration-200 hover:scale-105"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>Workshop schedule for the selected date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {workshopSlots.map((slot) => (
              <div
                key={slot.id}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer",
                  getStatusColor(slot.status),
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{slot.time}</span>
                      <span className="text-sm text-muted-foreground">({slot.duration}h)</span>
                    </div>
                    <Badge className={cn("text-xs", getStatusBadgeColor(slot.status))}>
                      {slot.status.replace("-", " ").toUpperCase()}
                    </Badge>
                    {slot.priority && (
                      <Badge className={cn("text-xs", getPriorityColor(slot.priority))}>
                        {slot.priority.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  {slot.status !== "available" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="transition-all duration-200 hover:scale-105 bg-transparent"
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="transition-all duration-200 hover:scale-105 bg-transparent"
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
                {slot.status !== "available" && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{slot.jobNumber}</span>
                      <span>-</span>
                      <span>{slot.description}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{slot.customerName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        <span>{slot.vehicleReg}</span>
                      </div>
                    </div>
                  </div>
                )}
                {slot.status === "available" && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <span>Available slot - Click to book</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
