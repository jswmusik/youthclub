// Get the base URL from the API configuration
const getBaseUrl = () => {
  // Use the same IP as configured in the API
  return 'http://127.0.0.1:8000';
};

export const getMediaUrl = (path: string | null | undefined) => {
    if (!path) return null;
    
    // If it's already a full URL (starts with http), return it as is
    if (path.startsWith('http')) {
      return path;
    }
  
    // Ensure path starts with / for proper URL construction
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    // Otherwise, prepend the Django Backend URL
    return `${getBaseUrl()}${normalizedPath}`;
  };

export const getInitials = (firstName?: string, lastName?: string): string => {
    const first = firstName?.charAt(0).toUpperCase() || '';
    const last = lastName?.charAt(0).toUpperCase() || '';
    return (first + last) || '?';
};
