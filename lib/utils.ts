import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format duration for timer type
export const formatDuration = (seconds: number) => {
  if (!seconds) return "0s";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  let result = "";
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0 || hours > 0) result += `${minutes}m `;
  result += `${remainingSeconds}s`;

  return result.trim();
};

export function calculateContrastColor(hexColor: string): string {
  // If no color is provided, return black
  if (!hexColor || hexColor === "#000") return "#ffffff";

  // Remove # if present
  const hex = hexColor.replace("#", "");

  // Convert hex to RGB
  let r, g, b;
  if (hex.length === 3) {
    // Shorthand hex format (e.g. #ABC)
    r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
    g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
    b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
  } else {
    // Full hex format (e.g. #AABBCC)
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }

  // Calculate luminance - perceived brightness
  // Using the formula: 0.299*R + 0.587*G + 0.114*B
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return white for dark colors and black for light colors
  return luminance > 0.5 ? "#000000" : "#ffffff";
}
