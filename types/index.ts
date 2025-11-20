import type { ComponentType } from "react"

export type Team = {
  name: string
  logo: ComponentType<{ className?: string }>
  plan: string
}

export type NavChild = {
  title: string
  url: string
}

export type NavItem = {
  title: string
  url: string
  icon: ComponentType<{ className?: string }>
  badge?: string
  items?: NavChild[]
}

export type QuickProject = {
  name: string
  url: string
  icon: ComponentType<{ className?: string }>
}
