import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl focus:ring-blue-500',
    secondary: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm focus:ring-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm focus:ring-red-500',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-400'
};

const sizes = {
    sm: 'px-3 py-1.5 text-sm min-h-[36px]',
    md: 'px-4 py-2 text-base min-h-[44px]',
    lg: 'px-6 py-3 text-lg min-h-[48px]'
};

/**
 * Button component with variants and loading states
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content
 * @param {'primary'|'secondary'|'danger'|'ghost'} props.variant - Visual variant
 * @param {'sm'|'md'|'lg'} props.size - Size variant
 * @param {string} props.className - Additional classes
 * @param {boolean} props.loading - Loading state (shows spinner)
 * @param {boolean} props.disabled - Disabled state
 * 
 * Note: Single boolean prop (loading) is acceptable per Vercel patterns.
 * For multiple states, consider composition with explicit variants.
 */
export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    className,
    loading,
    disabled,
    ...props
}) {
    const isDisabled = loading || disabled;

    return (
        <motion.button
            whileTap={!isDisabled ? { scale: 0.98 } : undefined}
            className={cn(
                // Base styles with accessibility improvements
                'inline-flex items-center justify-center rounded-lg font-medium',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                // Touch target: min 44x44px for accessibility
                variants[variant],
                sizes[size],
                className
            )}
            disabled={isDisabled}
            aria-busy={loading}
            aria-disabled={isDisabled}
            {...props}
        >
            {loading && (
                <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            )}
            {loading && <span className="sr-only">Loading...</span>}
            {children}
        </motion.button>
    );
}
