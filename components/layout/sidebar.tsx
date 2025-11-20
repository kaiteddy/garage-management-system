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
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
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
      title: "Jobs",
      url: "/jobs",
      icon: Wrench,
    },
    {
      title: "Job Sheets",
      url: "/job-sheets",
      icon: FileText,
    },
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
      title: "Parts",
      url: "/parts",
      icon: Package,
    },
    {
      title: "Workshop",
      url: "/workshop",
      icon: Gauge,
    },
    {
      title: "MOT Check",
      url: "/mot-check",
      icon: Search,
    },
    {
      title: "MOT Reminders",
      url: "/mot-critical",
      icon: Calendar,
    },
    {
      title: "SMS Dashboard",
      url: "/sms-dashboard",
      icon: MessageSquare,
    },
    {
      title: "SMS Config",
      url: "/sms-config",
      icon: Settings2,
    },
    {
      title: "WhatsApp Complete Setup",
      url: "/whatsapp-complete-setup",
      icon: MessageCircle,
    },
    {
      title: "Twilio Configuration",
      url: "/twilio-config",
      icon: Settings2,
    },
    {
      title: "Message Templates",
      url: "/message-templates",
      icon: FileText,
    },
    {
      title: "Import",
      url: "/import",
      icon: Upload,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: BarChart3,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
    },
  ],
  projects: [
    {
      name: "MOT Checker",
      url: "/mot-check",
      icon: Search,
    },
    {
      name: "Reminders",
      url: "/mot-critical",
      icon: Bell,
    },
    {
      name: "Job Sheets",
      url: "/job-sheets",
      icon: ClipboardList,
    },
    {
      name: "Parts Lookup",
      url: "/parts",
      icon: Package,
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
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
