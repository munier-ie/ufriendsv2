import React, { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';

export default function LottieAnimation({
    animationData,
    size = 144,
    loop = true,
    className = '',
    fallbackIcon = null
}) {
    const containerRef = useRef(null);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        if (!containerRef.current || !animationData) return;

        // Resolve player across different ESM/CJS bundler wrappers (Vite, esbuild, webpack)
        const player = typeof lottie?.loadAnimation === 'function'
            ? lottie
            : (typeof lottie?.default?.loadAnimation === 'function' ? lottie.default : null);

        if (!player) {
            console.error('Lottie player failed to resolve loadAnimation function');
            setHasError(true);
            return;
        }

        setHasError(false);
        containerRef.current.innerHTML = '';

        // If animation canvas has 16:9 or wide aspect ratio (e.g. failed.json at 1920x1080),
        // slice the empty horizontal letterbox margins to fill the square container cleanly
        const isWide = animationData.w && animationData.h && (animationData.w / animationData.h > 1.3);

        let instance;
        try {
            instance = player.loadAnimation({
                container: containerRef.current,
                renderer: 'svg',
                loop,
                autoplay: true,
                animationData,
                rendererSettings: {
                    preserveAspectRatio: isWide ? 'xMidYMid slice' : 'xMidYMid meet'
                }
            });

            instance.addEventListener('data_failed', () => setHasError(true));
            instance.addEventListener('error', () => setHasError(true));
        } catch (err) {
            console.error('Lottie load error:', err);
            setHasError(true);
        }

        return () => {
            try {
                instance?.destroy();
            } catch (e) {
                // Ignore cleanup errors
            }
        };
    }, [animationData, loop]);

    if (hasError && fallbackIcon) {
        return (
            <div
                style={{ width: `${size}px`, height: `${size}px` }}
                className={`flex items-center justify-center mx-auto shrink-0 ${className}`}
            >
                {fallbackIcon}
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            style={{ width: `${size}px`, height: `${size}px` }}
            className={`flex items-center justify-center mx-auto shrink-0 select-none ${className}`}
        />
    );
}
