"use client"

import type * as React from "react"
import {
  GalleryVerticalEnd,
  Settings2,
  Car,
  Users,
  FileText,
  Package,
  Wrench,
  BarChart3,
  ClipboardList,
  Search,
  Bell,
  Home,
  Calendar,
  Upload,
  Gauge,
  FileSpreadsheet,
  Quote,
  MessageSquare,
  MessageCircle,
  Building2,
  CalendarDays,
  BookOpen,
  Globe,
  UserCheck,
  Smartphone,
  Image,
  TestTube,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavGrouped } from "@/components/nav-grouped"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar"

const data = {
  user: {
    name: "MOT Service",
    email: "admin@motservice.com",
    avatar: "/placeholder-user.jpg",
  },
  teams: [
    {
      name: "MOT Service Centre",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
  ],
  // Core business operations - Always visible
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: Home,
    },
    {
      title: "Customers",
      url: "/customers",
      icon: Users,
    },
    {
      title: "Vehicles",
      url: "/vehicles",
      icon: Car,
    },
    {
      title: "Job Sheets",
      url: "/job-sheets",
      icon: Wrench,
    },
    {
      title: "Parts",
      url: "/parts",
      icon: Package,
    },
  ],

  // Workshop operations - Expanded by default
  workshop: [
    {
      title: "Workshop",
      url: "/workshop",
      icon: Gauge,
    },
    {
      title: "Workshop Calendar",
      url: "/workshop/calendar",
      icon: CalendarDays,
    },
    {
      title: "Online Booking",
      url: "/book-online",
      icon: Globe,
    },
    {
      title: "MOT Check",
      url: "/mot-check",
      icon: Search,
    },
    {
      title: "MOT Reminders",
      url: "/mot-reminders",
      icon: Calendar,
    },
    {
      title: "Critical MOTs",
      url: "/mot-critical",
      icon: Bell,
    },
  ],

  // Business management - Collapsed by default
  business: [
    {
      title: "Documents",
      url: "/documents",
      icon: FileText,
    },
    {
      title: "Invoices",
      url: "/invoices",
      icon: FileSpreadsheet,
    },
    {
      title: "Quotes",
      url: "/quotes",
      icon: Quote,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: BarChart3,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: BarChart3,
    },
  ],

  // Communications - Collapsed by default
  communications: [
    {
      title: "Communications Hub",
      url: "/communications",
      icon: MessageSquare,
    },
    {
      title: "WhatsApp Management",
      url: "/whatsapp-management",
      icon: MessageCircle,
    },
  ],

  // Administration - Collapsed by default
  admin: [
    {
      title: "Business Settings",
      url: "/business-settings",
      icon: Building2,
    },
    {
      title: "Booking Management",
      url: "/admin/bookings",
      icon: BookOpen,
    },
    {
      title: "Import Data",
      url: "/import",
      icon: Upload,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
    },
  ],
  // Development & Testing tools - Hidden in production
  projects: [
    {
      name: "Test Vehicle Images",
      url: "/test-vehicle-images",
      icon: Image,
    },
    {
      name: "Test SWS Integration",
      url: "/test-sws-integration",
      icon: Search,
    },
    {
      name: "PartSouq Test",
      url: "/partsouq-test",
      icon: TestTube,
    },
    {
      name: "Logo Test",
      url: "/test-logos",
      icon: Image,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavGrouped groups={[
          {
            title: "Workshop & MOT",
            items: data.workshop,
            defaultOpen: true
          },
          {
            title: "Business & Reports",
            items: data.business,
            defaultOpen: false
          },
          {
            title: "Communications",
            items: data.communications,
            defaultOpen: false
          },
          {
            title: "Administration",
            items: data.admin,
            defaultOpen: false
          }
        ]} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
