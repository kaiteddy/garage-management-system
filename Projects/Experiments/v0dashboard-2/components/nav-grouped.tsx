"use client"

import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface NavItem {
  title: string
  url: string
  icon?: LucideIcon
}

interface NavGroup {
  title: string
  items: NavItem[]
  defaultOpen?: boolean
}

export function NavGrouped({
  groups,
}: {
  groups: NavGroup[]
}) {
  const pathname = usePathname()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    groups.reduce((acc, group) => {
      acc[group.title] = group.defaultOpen ?? false
      return acc
    }, {} as Record<string, boolean>)
  )

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }))
  }

  return (
    <>
      {groups.map((group) => {
        const isOpen = openGroups[group.title]
        const hasActiveItem = group.items.some(item => pathname === item.url)
        
        return (
          <SidebarGroup key={group.title}>
            <Collapsible open={isOpen} onOpenChange={() => toggleGroup(group.title)}>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="group/label text-xs font-semibold tracking-wide uppercase text-sidebar-foreground/70 hover:text-sidebar-foreground cursor-pointer flex items-center justify-between">
                  <span>{group.title}</span>
                  {isOpen ? (
                    <ChevronDown className="h-3 w-3 transition-transform" />
                  ) : (
                    <ChevronRight className="h-3 w-3 transition-transform" />
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive = pathname === item.url
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton tooltip={item.title} isActive={isActive} asChild>
                          <Link href={item.url} className="flex items-center gap-2">
                            {item.icon && <item.icon className="h-4 w-4" />}
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )
      })}
    </>
  )
}
