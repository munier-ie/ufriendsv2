import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes and tw-merge for deduplication
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
