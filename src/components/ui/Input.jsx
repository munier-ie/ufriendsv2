import { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

/**
 * Input component with label and error states
 * 
 * @param {Object} props
 * @param {string} props.label - Label text
 * @param {string} props.error - Error message
 * @param {string} props.className - Additional input classes
 * @param {string} props.containerClassName - Additional container classes
 * 
 * Note: Uses forwardRef for React 18 compatibility.
 * For React 19+, remove forwardRef and use ref directly.
 */
const Input = forwardRef(({
    label,
    error,
    className,
    containerClassName,
    rightElement,
    id: providedId,
    ...props
}, ref) => {
    // Generate unique ID for accessibility if not provided
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;

    return (
        <div className={cn('space-y-1', containerClassName)}>
            {label && (
                <label
                    htmlFor={id}
                    className="block text-sm font-medium text-gray-700"
                >
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    ref={ref}
                    id={id}
                    className={cn(
                        // Base styles
                        'block w-full rounded-lg border border-gray-300 shadow-sm',
                        'px-3 py-2 min-h-[44px]', // Touch target: 44px min
                        'text-gray-900 placeholder-gray-400',
                        'transition-colors duration-200',
                        // Focus states
                        'focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
                        // Error states
                        error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
                        // Disabled states
                        'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
                        rightElement && 'pr-11',
                        className
                    )}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? errorId : undefined}
                    {...props}
                />
                {rightElement && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        {rightElement}
                    </div>
                )}
            </div>
            {error && (
                <p
                    id={errorId}
                    className="text-sm text-red-600 mt-1"
                    role="alert"
                >
                    {error}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';
export default Input;
