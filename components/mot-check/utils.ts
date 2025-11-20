import { format, parseISO, differenceInDays, isBefore, isAfter } from 'date-fns';
import { MOTTestResult, MOTDefect, MOTTestCenter } from './types';

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'd MMMM yyyy');
  } catch (e) {
    return dateString;
  }
};

export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'd MMM yyyy, h:mm a');
  } catch (e) {
    return dateString;
  }
};

export const getDaysRemaining = (expiryDate: string | null | undefined): number | null => {
  if (!expiryDate) return null;
  try {
    const today = new Date();
    const expiry = parseISO(expiryDate);
    return differenceInDays(expiry, today);
  } catch (e) {
    return null;
  }
};

export const isMOTExpired = (expiryDate: string | null | undefined): boolean => {
  if (!expiryDate) return false;
  try {
    const today = new Date();
    return isBefore(parseISO(expiryDate), today);
  } catch (e) {
    return false;
  }
};

export const isMOTDueSoon = (expiryDate: string | null | undefined, days = 30): boolean => {
  if (!expiryDate) return false;
  try {
    const today = new Date();
    const dueDate = parseISO(expiryDate);
    const daysRemaining = differenceInDays(dueDate, today);
    return daysRemaining <= days && daysRemaining > 0;
  } catch (e) {
    return false;
  }
};

export const getDefectSeverity = (defect: MOTDefect): 'dangerous' | 'major' | 'minor' | 'advisory' => {
  if (defect.dangerous) return 'dangerous';
  const type = defect.type.toLowerCase();
  if (type.includes('dangerous')) return 'dangerous';
  if (type.includes('major')) return 'major';
  if (type.includes('minor')) return 'minor';
  return 'advisory';
};

export const sortTestCentersByDistance = (centers: MOTTestCenter[]): MOTTestCenter[] => {
  return [...centers].sort((a, b) => {
    const distanceA = parseFloat(a.distance.split(' ')[0]);
    const distanceB = parseFloat(b.distance.split(' ')[0]);
    return distanceA - distanceB;
  });
};

export const validateRegistration = (registration: string): boolean => {
  // UK registration format: 1-3 letters, 1-4 numbers, 1-3 letters (with optional spaces)
  const regex = /^[A-Za-z]{1,3}\s?[0-9]{1,4}\s?[A-Za-z]{1,3}$/;
  return regex.test(registration);
};

export const formatRegistration = (registration: string): string => {
  // Remove all whitespace and convert to uppercase
  return registration.replace(/\s+/g, '').toUpperCase();
};

export const getMOTStatus = (test: MOTTestResult): 'pass' | 'fail' | 'advisory' | 'dangerous' => {
  if (test.testResult.toLowerCase() === 'passed') return 'pass';
  
  const hasDangerous = test.defects.some(d => getDefectSeverity(d) === 'dangerous');
  if (hasDangerous) return 'dangerous';
  
  const hasMajor = test.defects.some(d => getDefectSeverity(d) === 'major');
  if (hasMajor) return 'fail';
  
  return 'advisory';
};

export const getTestCenterRatingColor = (rating: number): string => {
  if (rating >= 4.5) return 'bg-green-100 text-green-800';
  if (rating >= 4.0) return 'bg-blue-100 text-blue-800';
  if (rating >= 3.0) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

export const generatePDF = async (data: MOTCheckResult): Promise<Blob> => {
  // This is a placeholder - actual implementation would use @react-pdf/renderer
  // or another PDF generation library
  const pdfContent = {
    title: `MOT Check Report - ${data.registration}`,
    date: new Date().toISOString(),
    data
  };
  
  // In a real implementation, this would generate an actual PDF
  return new Blob([JSON.stringify(pdfContent, null, 2)], { type: 'application/pdf' });
};
