import { BASE_URL } from "./apiPaths";

/**
 * Constructs a full URL for an image path
 * Handles both relative paths and absolute URLs
 * @param {string} imagePath - The image path (could be relative or absolute)
 * @returns {string} - Full URL for the image
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it's a relative path, prepend the base URL
  if (imagePath.startsWith('/')) {
    return `${BASE_URL}${imagePath}`;
  }
  
  // For any other case, treat as relative path
  return `${BASE_URL}/${imagePath}`;
};

/**
 * Gets the profile image URL for a user
 * @param {Object} user - User object containing profileImageUrl
 * @returns {string} - Full URL for the profile image
 */
export const getUserProfileImageUrl = (user) => {
  if (!user || !user.profileImageUrl) return '';
  return getImageUrl(user.profileImageUrl);
};