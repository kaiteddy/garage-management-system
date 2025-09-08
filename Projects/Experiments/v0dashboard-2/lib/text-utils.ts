/**
 * Text utility functions for cleaning and formatting text data
 */

/**
 * Clean text by removing or replacing problematic characters
 * @param text - The text to clean
 * @returns Cleaned text with problematic characters replaced
 */
export function cleanText(text: string | null | undefined): string {
  if (!text) return ''
  
  // Replace vertical tabs (\u000b) with spaces
  let cleaned = text.replace(/\u000b/g, ' ')
  
  // Replace other common problematic characters
  cleaned = cleaned.replace(/\u000c/g, ' ') // Form feed
  cleaned = cleaned.replace(/\u0000/g, '') // Null character
  cleaned = cleaned.replace(/\u001f/g, '') // Unit separator
  cleaned = cleaned.replace(/\u007f/g, '') // Delete character
  
  // Replace multiple consecutive spaces with single space
  cleaned = cleaned.replace(/\s+/g, ' ')
  
  // Trim whitespace from start and end
  cleaned = cleaned.trim()
  
  return cleaned
}

/**
 * Clean and format job description text for display
 * @param text - The job description text
 * @returns Formatted text with proper line breaks
 */
export function formatJobDescription(text: string | null | undefined): string {
  if (!text) return ''
  
  // First clean the text
  let cleaned = cleanText(text)
  
  // Split by common separators and rejoin with line breaks
  const parts = cleaned.split(/\s*(?:•|·|\*|\-)\s*/).filter(Boolean)
  
  if (parts.length > 1) {
    // If we have multiple parts, format as a list
    return parts.map(part => part.trim()).filter(Boolean).join('\n• ')
  }
  
  return cleaned
}

/**
 * Clean text for display in UI components
 * @param text - The text to clean
 * @returns Cleaned text safe for display
 */
export function cleanDisplayText(text: string | null | undefined): string {
  if (!text) return ''
  
  // Clean the text
  let cleaned = cleanText(text)
  
  // Convert common separators to more readable format
  cleaned = cleaned.replace(/\s*\|\s*/g, ' • ')
  cleaned = cleaned.replace(/\s*;\s*/g, ' • ')
  
  return cleaned
}
