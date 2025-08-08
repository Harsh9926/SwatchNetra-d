/**
 * Utility functions for handling Firebase Timestamp objects
 * Prevents "Objects are not valid as a React child" errors
 */

export const convertTimestamp = (timestamp: any): string => {
  if (!timestamp) return 'N/A';
  
  // If it's already a string, return it
  if (typeof timestamp === 'string') {
    return new Date(timestamp).toLocaleString();
  }
  
  // If it's a Firebase Timestamp with toDate method
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toLocaleString();
  }
  
  // If it's a Firebase Timestamp with seconds and nanoseconds
  if (timestamp && typeof timestamp.seconds === 'number') {
    return new Date(timestamp.seconds * 1000).toLocaleString();
  }
  
  // If it's a Date object
  if (timestamp instanceof Date) {
    return timestamp.toLocaleString();
  }
  
  // Try to convert to Date as fallback
  try {
    return new Date(timestamp).toLocaleString();
  } catch (error) {
    console.warn('Failed to convert timestamp:', timestamp);
    return 'Invalid Date';
  }
};

export const convertTimestampToDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  
  // If it's already a Date, return it
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  // If it's a Firebase Timestamp with toDate method
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  // If it's a Firebase Timestamp with seconds and nanoseconds
  if (timestamp && typeof timestamp.seconds === 'number') {
    return new Date(timestamp.seconds * 1000);
  }
  
  // Try to convert to Date as fallback
  try {
    return new Date(timestamp);
  } catch (error) {
    console.warn('Failed to convert timestamp to Date:', timestamp);
    return new Date();
  }
};

export const convertTimestampToTime = (timestamp: any): string => {
  if (!timestamp) return 'N/A';
  
  const date = convertTimestampToDate(timestamp);
  return date.toLocaleTimeString();
};

export const convertTimestampToDateString = (timestamp: any): string => {
  if (!timestamp) return 'N/A';
  
  const date = convertTimestampToDate(timestamp);
  return date.toLocaleDateString();
};

export const formatTimeAgo = (timestamp: any): string => {
  if (!timestamp) return 'N/A';
  
  const date = convertTimestampToDate(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
};

/**
 * Safely converts any Firebase document data to ensure timestamps are properly handled
 */
export const sanitizeFirebaseData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = { ...data };
  
  // Common timestamp fields to convert
  const timestampFields = [
    'createdAt', 'updatedAt', 'timestamp', 'lastUpdated', 'lastLogin',
    'checkIn', 'checkOut', 'shiftStartTime', 'shiftEndTime', 'requestedAt',
    'assignedAt', 'startTime', 'endTime', 'completedAt'
  ];
  
  timestampFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = convertTimestampToDate(sanitized[field]).toISOString();
    }
  });
  
  return sanitized;
};
