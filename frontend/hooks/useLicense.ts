import { useAuth } from '../context/AuthContext';

export const useLicense = () => {
  const { user } = useAuth();

  /**
   * Checks if the current user's organization has purchased a specific feature.
   * @param featureSlug The slug of the feature (e.g., 'messenger', 'events')
   */
  const hasFeature = (featureSlug: string): boolean => {
    // 1. Super Admins see everything
    if (user?.role === 'SUPER_ADMIN') return true;

    // 2. If no user or no license data, assume restricted
    // Note: If allowed_features is undefined, we assume basic features might be missing
    // or the user hasn't loaded fully. 
    if (!user || !user.allowed_features) return false;

    // 3. Check the list
    return user.allowed_features.includes(featureSlug);
  };

  /**
   * Returns true if the user has the Analytics package
   */
  const hasAnalytics = (): boolean => {
    return hasFeature('analytics');
  };

  return {
    hasFeature,
    hasAnalytics,
    allowedFeatures: user?.allowed_features || []
  };
};
