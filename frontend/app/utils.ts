export const getMediaUrl = (path: string | null | undefined) => {
    if (!path) return null;
    
    // If it's already a full URL (starts with http), return it as is
    if (path.startsWith('http')) {
      return path;
    }
  
    // Ensure path starts with / for proper URL construction
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    // Otherwise, prepend the Django Backend URL
    // We use localhost:8000 because that's where Django is running
    return `http://localhost:8000${normalizedPath}`;
  };