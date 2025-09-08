'use client'

import { AppSidebar } from "@/components/layout/sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { TabProvider } from "@/contexts/tab-context"
import { ChromeTabs } from "@/components/ui/chrome-tabs"
import { TabContentManager } from "@/components/ui/tab-content-manager"
import { useEffect, useState } from "react"
import { useTabContext } from "@/contexts/tab-context"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR/build, render a simple layout without complex components
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4">
          {children}
        </div>
      </div>
    )
  }

  return (
    <TabProvider>
      <ClientLayoutInner>{children}</ClientLayoutInner>
    </TabProvider>
  )
}

function ClientLayoutInner({ children }: { children: React.ReactNode }) {
  const { activeTabId } = useTabContext()
  const hasActiveTab = activeTabId !== null

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>MOT Service</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="ml-auto px-4">
              <ThemeToggle />
            </div>
          </header>

          {/* Chrome-like Tab Bar */}
          <ChromeTabs />

          {/* Content Area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Tab content - only shown when there's an active tab */}
            {hasActiveTab && <TabContentManager className="flex-1" />}

            {/* Regular page content - only shown when no tabs are active */}
            {!hasActiveTab && (
              <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                {children}
              </div>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
      <SonnerToaster />
    </ThemeProvider>
  )
}
