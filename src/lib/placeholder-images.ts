// Placeholder images data removed as it was unused and causing HMR issues.
// getAvatarFallback is the only active export.

// Helper function to get the first character of the first two words
export const getAvatarFallback = (name: string) => {
  if (!name) return '??';
  const words = name.trim().split(/\s+/);
  if (words.length > 1) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};
