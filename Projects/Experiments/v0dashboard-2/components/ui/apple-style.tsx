"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Apple-inspired utility classes
export const appleStyles = {
  // Cards
  card: "bg-white rounded-xl shadow-sm border-0 transition-all duration-200",
  cardInteractive: "hover:shadow-md hover:scale-[1.02] cursor-pointer active:scale-[0.98]",
  cardContent: "p-6",
  cardHeader: "p-6 border-b border-gray-100",
  
  // Buttons
  buttonPrimary: "bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-150 active:scale-95 shadow-sm",
  buttonSecondary: "bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium transition-all duration-150 active:scale-95",
  buttonDestructive: "bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-150 active:scale-95",
  buttonGhost: "bg-transparent hover:bg-gray-100 text-blue-500 rounded-lg font-medium transition-all duration-150 active:scale-95",
  
  // Inputs
  input: "border-0 bg-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 rounded-lg px-4 py-3",
  inputSearch: "border-0 bg-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 rounded-full px-4 py-2 pl-10",
  
  // Badges
  badgeSuccess: "bg-green-100 text-green-800 rounded-full px-2.5 py-1 text-sm font-medium",
  badgeWarning: "bg-orange-100 text-orange-800 rounded-full px-2.5 py-1 text-sm font-medium",
  badgeError: "bg-red-100 text-red-800 rounded-full px-2.5 py-1 text-sm font-medium",
  badgeInfo: "bg-blue-100 text-blue-800 rounded-full px-2.5 py-1 text-sm font-medium",
  badgeDefault: "bg-gray-100 text-gray-800 rounded-full px-2.5 py-1 text-sm font-medium",
  
  // Typography
  titleLarge: "text-2xl font-bold leading-tight tracking-tight",
  title: "text-xl font-semibold leading-tight",
  headline: "text-lg font-semibold leading-normal",
  body: "text-base font-normal leading-relaxed",
  caption: "text-sm font-normal leading-normal text-gray-600",
  footnote: "text-xs font-normal leading-tight text-gray-500",
  
  // Layout
  sectionHeader: "px-4 py-2",
  sectionTitle: "text-sm font-medium text-gray-500 uppercase tracking-wide",
  
  // Lists
  list: "bg-white rounded-xl shadow-sm divide-y divide-gray-200",
  listItem: "flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150",
  
  // Navigation
  navbar: "flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200",
  
  // Animations
  fadeIn: "animate-in fade-in duration-200",
  slideIn: "animate-in slide-in-from-bottom-2 duration-200",
  scaleIn: "animate-in zoom-in-95 duration-200",
}

// Apple-inspired color palette
export const appleColors = {
  systemBlue: '#007AFF',
  systemGreen: '#34C759',
  systemIndigo: '#5856D6',
  systemOrange: '#FF9500',
  systemPink: '#FF2D92',
  systemPurple: '#AF52DE',
  systemRed: '#FF3B30',
  systemTeal: '#5AC8FA',
  systemYellow: '#FFCC00',
  systemGray: '#8E8E93',
  systemGray2: '#AEAEB2',
  systemGray3: '#C7C7CC',
  systemGray4: '#D1D1D6',
  systemGray5: '#E5E5EA',
  systemGray6: '#F2F2F7',
}

// Apple-style Card component
interface AppleCardProps {
  children: React.ReactNode
  className?: string
  interactive?: boolean
  onClick?: () => void
}

export function AppleCard({ children, className, interactive = false, onClick }: AppleCardProps) {
  return (
    <div 
      className={cn(
        appleStyles.card,
        interactive && appleStyles.cardInteractive,
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// Apple-style Button component
interface AppleButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export function AppleButton({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className,
  onClick,
  disabled = false,
  type = 'button'
}: AppleButtonProps) {
  const variantStyles = {
    primary: appleStyles.buttonPrimary,
    secondary: appleStyles.buttonSecondary,
    destructive: appleStyles.buttonDestructive,
    ghost: appleStyles.buttonGhost
  }
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }

  return (
    <Button
      type={type}
      className={cn(variantStyles[variant], sizeStyles[size], className)}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  )
}

// Apple-style Input component
interface AppleInputProps {
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  className?: string
  variant?: 'default' | 'search'
  disabled?: boolean
}

export function AppleInput({ 
  placeholder, 
  value, 
  onChange, 
  type = 'text', 
  className,
  variant = 'default',
  disabled = false
}: AppleInputProps) {
  const variantStyles = {
    default: appleStyles.input,
    search: appleStyles.inputSearch
  }

  return (
    <Input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={cn(variantStyles[variant], className)}
    />
  )
}

// Apple-style Badge component
interface AppleBadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default'
  className?: string
}

export function AppleBadge({ children, variant = 'default', className }: AppleBadgeProps) {
  const variantStyles = {
    success: appleStyles.badgeSuccess,
    warning: appleStyles.badgeWarning,
    error: appleStyles.badgeError,
    info: appleStyles.badgeInfo,
    default: appleStyles.badgeDefault
  }

  return (
    <span className={cn(variantStyles[variant], className)}>
      {children}
    </span>
  )
}

// Apple-style Section Header
interface AppleSectionHeaderProps {
  title: string
  subtitle?: string
  className?: string
}

export function AppleSectionHeader({ title, subtitle, className }: AppleSectionHeaderProps) {
  return (
    <div className={cn(appleStyles.sectionHeader, className)}>
      <h2 className={appleStyles.sectionTitle}>{title}</h2>
      {subtitle && <p className={appleStyles.footnote + " mt-1"}>{subtitle}</p>}
    </div>
  )
}

// Apple-style List components
interface AppleListProps {
  children: React.ReactNode
  className?: string
}

export function AppleList({ children, className }: AppleListProps) {
  return (
    <div className={cn(appleStyles.list, className)}>
      {children}
    </div>
  )
}

interface AppleListItemProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  leading?: React.ReactNode
  trailing?: React.ReactNode
}

export function AppleListItem({ 
  children, 
  onClick, 
  className, 
  leading,
  trailing 
}: AppleListItemProps) {
  return (
    <div 
      className={cn(appleStyles.listItem, className)}
      onClick={onClick}
    >
      {leading && <div className="mr-3">{leading}</div>}
      <div className="flex-1">{children}</div>
      {trailing && <div className="ml-3">{trailing}</div>}
    </div>
  )
}
