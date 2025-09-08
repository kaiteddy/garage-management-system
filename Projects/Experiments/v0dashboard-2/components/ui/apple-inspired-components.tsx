"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Apple-inspired color palette
export const appleColors = {
  // System colors
  systemBlue: '#007AFF',
  systemGreen: '#34C759',
  systemIndigo: '#5856D6',
  systemOrange: '#FF9500',
  systemPink: '#FF2D92',
  systemPurple: '#AF52DE',
  systemRed: '#FF3B30',
  systemTeal: '#5AC8FA',
  systemYellow: '#FFCC00',
  
  // Gray palette
  systemGray: '#8E8E93',
  systemGray2: '#AEAEB2',
  systemGray3: '#C7C7CC',
  systemGray4: '#D1D1D6',
  systemGray5: '#E5E5EA',
  systemGray6: '#F2F2F7',
  
  // Label colors
  label: '#000000',
  secondaryLabel: '#3C3C43',
  tertiaryLabel: '#3C3C43',
  quaternaryLabel: '#3C3C43',
  
  // Background colors
  systemBackground: '#FFFFFF',
  secondarySystemBackground: '#F2F2F7',
  tertiarySystemBackground: '#FFFFFF',
  
  // Grouped background
  systemGroupedBackground: '#F2F2F7',
  secondarySystemGroupedBackground: '#FFFFFF',
  tertiarySystemGroupedBackground: '#F2F2F7',
}

// Apple-inspired Card component
interface AppleCardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'grouped' | 'inset'
  interactive?: boolean
}

export function AppleCard({ children, className, variant = 'default', interactive = false }: AppleCardProps) {
  const baseClasses = "rounded-xl border-0 shadow-sm transition-all duration-200"

  const variantClasses = {
    default: "bg-white",
    grouped: "bg-white mx-4",
    inset: "bg-gray-50 mx-4"
  }

  const interactiveClasses = interactive
    ? "hover:shadow-md hover:scale-[1.02] cursor-pointer active:scale-[0.98]"
    : ""

  return (
    <div className={cn(baseClasses, variantClasses[variant], interactiveClasses, className)}>
      {children}
    </div>
  )
}

// Apple-inspired Button component
interface AppleButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'destructive' | 'plain'
  size?: 'small' | 'medium' | 'large'
  className?: string
  onClick?: () => void
  disabled?: boolean
}

export function AppleButton({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  className,
  onClick,
  disabled = false 
}: AppleButtonProps) {
  const baseClasses = "font-medium rounded-lg transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
  
  const variantClasses = {
    primary: "bg-blue-500 hover:bg-blue-600 text-white shadow-sm",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-900",
    destructive: "bg-red-500 hover:bg-red-600 text-white",
    plain: "bg-transparent hover:bg-gray-100 text-blue-500"
  }
  
  const sizeClasses = {
    small: "px-3 py-1.5 text-sm",
    medium: "px-4 py-2 text-base",
    large: "px-6 py-3 text-lg"
  }

  return (
    <Button
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  )
}

// Apple-inspired Input component
interface AppleInputProps {
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  className?: string
  variant?: 'default' | 'search' | 'rounded'
}

export function AppleInput({ 
  placeholder, 
  value, 
  onChange, 
  type = 'text', 
  className,
  variant = 'default' 
}: AppleInputProps) {
  const baseClasses = "border-0 bg-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
  
  const variantClasses = {
    default: "rounded-lg px-4 py-3",
    search: "rounded-full px-4 py-2 pl-10",
    rounded: "rounded-xl px-4 py-3"
  }

  return (
    <Input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={cn(baseClasses, variantClasses[variant], className)}
    />
  )
}

// Apple-inspired Badge component
interface AppleBadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export function AppleBadge({ children, variant = 'default', size = 'medium', className }: AppleBadgeProps) {
  const baseClasses = "inline-flex items-center font-medium rounded-full"
  
  const variantClasses = {
    default: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-orange-100 text-orange-800",
    error: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800"
  }
  
  const sizeClasses = {
    small: "px-2 py-0.5 text-xs",
    medium: "px-2.5 py-1 text-sm",
    large: "px-3 py-1.5 text-base"
  }

  return (
    <Badge className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}>
      {children}
    </Badge>
  )
}

// Apple-inspired List component
interface AppleListProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'inset' | 'grouped'
}

export function AppleList({ children, className, variant = 'default' }: AppleListProps) {
  const baseClasses = "divide-y divide-gray-200"
  
  const variantClasses = {
    default: "bg-white rounded-xl",
    inset: "bg-white rounded-xl mx-4",
    grouped: "bg-white rounded-xl mx-4 my-2"
  }

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)}>
      {children}
    </div>
  )
}

interface AppleListItemProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  interactive?: boolean
  leading?: React.ReactNode
  trailing?: React.ReactNode
}

export function AppleListItem({ 
  children, 
  onClick, 
  className, 
  interactive = false,
  leading,
  trailing 
}: AppleListItemProps) {
  const baseClasses = "flex items-center px-4 py-3 transition-colors duration-150"
  const interactiveClasses = interactive || onClick 
    ? "hover:bg-gray-50 active:bg-gray-100 cursor-pointer" 
    : ""

  return (
    <div 
      className={cn(baseClasses, interactiveClasses, className)}
      onClick={onClick}
    >
      {leading && <div className="mr-3">{leading}</div>}
      <div className="flex-1">{children}</div>
      {trailing && <div className="ml-3">{trailing}</div>}
    </div>
  )
}

// Apple-inspired Navigation Bar
interface AppleNavBarProps {
  title: string
  leftButton?: React.ReactNode
  rightButton?: React.ReactNode
  className?: string
}

export function AppleNavBar({ title, leftButton, rightButton, className }: AppleNavBarProps) {
  return (
    <div className={cn("flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200", className)}>
      <div className="flex-1 flex justify-start">
        {leftButton}
      </div>
      <div className="flex-1 flex justify-center">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>
      <div className="flex-1 flex justify-end">
        {rightButton}
      </div>
    </div>
  )
}

// Apple-inspired Section Header
interface AppleSectionHeaderProps {
  title: string
  subtitle?: string
  className?: string
}

export function AppleSectionHeader({ title, subtitle, className }: AppleSectionHeaderProps) {
  return (
    <div className={cn("px-4 py-2", className)}>
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  )
}
