"use client"

import React from 'react'
import { cn } from '@/lib/utils'

// ============================================================================
// APPLE DESIGN SYSTEM FOUNDATION (iOS 26 / macOS Tahoe 26)
// Based on latest Apple Human Interface Guidelines and Design Resources
// ============================================================================

// Apple System Colors (2024/2025 Latest)
export const appleSystemColors = {
  // Primary System Colors
  systemBlue: '#007AFF',
  systemGreen: '#34C759', 
  systemIndigo: '#5856D6',
  systemOrange: '#FF9500',
  systemPink: '#FF2D92',
  systemPurple: '#AF52DE',
  systemRed: '#FF3B30',
  systemTeal: '#5AC8FA',
  systemYellow: '#FFCC00',
  
  // Neutral Colors
  systemGray: '#8E8E93',
  systemGray2: '#AEAEB2',
  systemGray3: '#C7C7CC',
  systemGray4: '#D1D1D6',
  systemGray5: '#E5E5EA',
  systemGray6: '#F2F2F7',
  
  // Label Colors (Dynamic)
  label: '#000000',
  secondaryLabel: '#3C3C43',
  tertiaryLabel: '#3C3C43',
  quaternaryLabel: '#3C3C43',
  
  // Fill Colors
  systemFill: '#78788033',
  secondarySystemFill: '#78788028',
  tertiarySystemFill: '#7676801E',
  quaternarySystemFill: '#74748014',
  
  // Background Colors
  systemBackground: '#FFFFFF',
  secondarySystemBackground: '#F2F2F7',
  tertiarySystemBackground: '#FFFFFF',
  
  // Grouped Background Colors
  systemGroupedBackground: '#F2F2F7',
  secondarySystemGroupedBackground: '#FFFFFF',
  tertiarySystemGroupedBackground: '#F2F2F7',
  
  // Separator Colors
  separator: '#3C3C4336',
  opaqueSeparator: '#C6C6C8',
  
  // Link Color
  link: '#007AFF',
  
  // Dark Mode Variants
  dark: {
    label: '#FFFFFF',
    secondaryLabel: '#EBEBF5',
    tertiaryLabel: '#EBEBF5',
    quaternaryLabel: '#EBEBF5',
    systemBackground: '#000000',
    secondarySystemBackground: '#1C1C1E',
    tertiarySystemBackground: '#2C2C2E',
    systemGroupedBackground: '#000000',
    secondarySystemGroupedBackground: '#1C1C1E',
    tertiarySystemGroupedBackground: '#2C2C2E',
  }
}

// Apple Typography Scale (SF Pro)
export const appleTypography = {
  // Display Styles
  largeTitle: 'text-[34px] font-normal leading-[41px] tracking-[0.37px]',
  title1: 'text-[28px] font-normal leading-[34px] tracking-[0.36px]',
  title2: 'text-[22px] font-normal leading-[28px] tracking-[0.35px]',
  title3: 'text-[20px] font-normal leading-[25px] tracking-[0.38px]',
  
  // Text Styles
  headline: 'text-[17px] font-semibold leading-[22px] tracking-[-0.41px]',
  body: 'text-[17px] font-normal leading-[22px] tracking-[-0.41px]',
  callout: 'text-[16px] font-normal leading-[21px] tracking-[-0.32px]',
  subheadline: 'text-[15px] font-normal leading-[20px] tracking-[-0.24px]',
  footnote: 'text-[13px] font-normal leading-[18px] tracking-[-0.08px]',
  caption1: 'text-[12px] font-normal leading-[16px] tracking-[0px]',
  caption2: 'text-[11px] font-normal leading-[13px] tracking-[0.07px]',
  
  // Weight Variants
  weights: {
    ultraLight: 'font-[100]',
    thin: 'font-[200]',
    light: 'font-[300]',
    regular: 'font-[400]',
    medium: 'font-[500]',
    semibold: 'font-[600]',
    bold: 'font-[700]',
    heavy: 'font-[800]',
    black: 'font-[900]',
  }
}

// Apple Spacing System
export const appleSpacing = {
  // Standard Spacing Scale
  xs: '4px',    // 0.25rem
  sm: '8px',    // 0.5rem
  md: '12px',   // 0.75rem
  lg: '16px',   // 1rem
  xl: '20px',   // 1.25rem
  '2xl': '24px', // 1.5rem
  '3xl': '32px', // 2rem
  '4xl': '40px', // 2.5rem
  '5xl': '48px', // 3rem
  
  // Component Specific
  buttonPadding: '12px 20px',
  inputPadding: '12px 16px',
  cardPadding: '20px',
  sectionSpacing: '32px',
  
  // Layout
  containerMaxWidth: '1200px',
  sidebarWidth: '280px',
  headerHeight: '64px',
}

// Apple Border Radius
export const appleBorderRadius = {
  none: '0px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  full: '9999px',
  
  // Component Specific
  button: '8px',
  input: '8px',
  card: '12px',
  modal: '16px',
  sheet: '20px',
}

// Apple Shadows
export const appleShadows = {
  // Elevation Levels
  level1: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  level2: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
  level3: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
  level4: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
  level5: '0 25px 50px rgba(0, 0, 0, 0.25)',
  
  // Component Specific
  button: '0 1px 3px rgba(0, 0, 0, 0.1)',
  card: '0 4px 6px rgba(0, 0, 0, 0.07)',
  modal: '0 20px 25px rgba(0, 0, 0, 0.1)',
  dropdown: '0 10px 15px rgba(0, 0, 0, 0.1)',
}

// Apple Animations & Transitions
export const appleAnimations = {
  // Duration
  fast: '150ms',
  normal: '250ms',
  slow: '350ms',
  
  // Easing Functions (Apple's preferred)
  easeOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  easeIn: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  easeInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  
  // Common Transitions
  default: 'all 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  transform: 'transform 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  opacity: 'opacity 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  
  // Scale Effects (iOS-style)
  scaleDown: 'scale(0.95)',
  scaleUp: 'scale(1.05)',
  
  // Hover States
  buttonHover: 'transform 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  cardHover: 'transform 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
}

// Apple Component Base Classes
export const appleBaseClasses = {
  // Typography
  fontSystem: 'font-[system-ui,-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",Helvetica,Arial,sans-serif]',
  fontMono: 'font-[ui-monospace,SFMono-Regular,"SF Mono",Monaco,Consolas,"Liberation Mono","Courier New",monospace]',
  
  // Layout
  container: 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8',
  section: 'py-8 lg:py-12',
  
  // Interactive States
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
  
  // Animations
  transition: 'transition-all duration-250 ease-out',
  hover: 'hover:scale-[1.02] active:scale-[0.98]',
  
  // Glass Effect (iOS-style)
  glass: 'backdrop-blur-xl bg-white/80 border border-white/20',
  glassDark: 'backdrop-blur-xl bg-black/80 border border-white/10',
}

// Apple Color Utilities
export const getAppleColor = (color: keyof typeof appleSystemColors, opacity?: number) => {
  const baseColor = appleSystemColors[color]
  if (opacity !== undefined) {
    // Convert hex to rgba
    const hex = baseColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  return baseColor
}

// Apple CSS Custom Properties
export const appleCSSVariables = `
  :root {
    /* Colors */
    --apple-blue: ${appleSystemColors.systemBlue};
    --apple-green: ${appleSystemColors.systemGreen};
    --apple-red: ${appleSystemColors.systemRed};
    --apple-orange: ${appleSystemColors.systemOrange};
    --apple-purple: ${appleSystemColors.systemPurple};
    
    /* Typography */
    --apple-font-system: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Helvetica, Arial, sans-serif;
    
    /* Spacing */
    --apple-spacing-xs: ${appleSpacing.xs};
    --apple-spacing-sm: ${appleSpacing.sm};
    --apple-spacing-md: ${appleSpacing.md};
    --apple-spacing-lg: ${appleSpacing.lg};
    --apple-spacing-xl: ${appleSpacing.xl};
    
    /* Border Radius */
    --apple-radius-sm: ${appleBorderRadius.sm};
    --apple-radius-md: ${appleBorderRadius.md};
    --apple-radius-lg: ${appleBorderRadius.lg};
    
    /* Shadows */
    --apple-shadow-sm: ${appleShadows.level1};
    --apple-shadow-md: ${appleShadows.level2};
    --apple-shadow-lg: ${appleShadows.level3};
    
    /* Animations */
    --apple-transition: ${appleAnimations.default};
    --apple-easing: ${appleAnimations.easeOut};
  }
  
  @media (prefers-color-scheme: dark) {
    :root {
      --apple-label: ${appleSystemColors.dark.label};
      --apple-background: ${appleSystemColors.dark.systemBackground};
      --apple-secondary-background: ${appleSystemColors.dark.secondarySystemBackground};
    }
  }
`
