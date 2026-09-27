import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Info, Wallet } from 'lucide-react';
import LottieAnimation from './LottieAnimation';
import successAnimation from '../../assets/illustrations/success.json';
import failedAnimation from '../../assets/illustrations/failed.json';
import warningAnimation from '../../assets/illustrations/warning.json';

const TYPE_CONFIG = {
    success: {
        animation: successAnimation,
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        progressBarClass: 'bg-emerald-500',
        defaultTitle: 'Success',
        btnClass: 'bg-gradient-to-r from-[#004687] to-[#1E90FF] text-white shadow-[#004687]/20'
    },
    error: {
        animation: failedAnimation,
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
        progressBarClass: 'bg-rose-500',
        defaultTitle: 'Action Could Not Be Completed',
        btnClass: 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-rose-600/20'
    },
    warning: {
        animation: warningAnimation,
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
        progressBarClass: 'bg-amber-500',
        defaultTitle: 'Attention',
        btnClass: 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-amber-600/20'
    },
    info: {
        animation: warningAnimation,
        badgeClass: 'bg-blue-50 text-[#004687] border-blue-200/80',
        progressBarClass: 'bg-[#004687]',
        defaultTitle: 'Notice',
        btnClass: 'bg-gradient-to-r from-[#004687] to-[#1E90FF] text-white shadow-[#004687]/20'
    },
    loading: {
        animation: null,
        badgeClass: 'bg-blue-50 text-[#004687] border-blue-200/80',
        progressBarClass: 'bg-[#004687]',
        defaultTitle: 'Please wait...',
        btnClass: 'bg-gradient-to-r from-[#004687] to-[#1E90FF] text-white shadow-[#004687]/20'
    }
};

export default function AlertModal({
    isOpen,
    type = 'info',
    title,
    message,
    details,
    balanceInfo,
    actionText = 'Okay',
    onAction,
    cancelText,
    onCancel,
    onClose,
    autoClose = false,
    duration = 3800
}) {
    const [timeLeft, setTimeLeft] = useState(duration);
    const [isPaused, setIsPaused] = useState(false);

    const config = TYPE_CONFIG[type] || TYPE_CONFIG.info;

    // Auto-dismiss timer
    useEffect(() => {
        if (!isOpen || !autoClose || type === 'loading' || isPaused) return;

        const interval = 100;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= interval) {
                    clearInterval(timer);
                    onClose?.();
                    return 0;
                }
                return prev - interval;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [isOpen, autoClose, type, isPaused, onClose]);

    // Reset timer when opened
    useEffect(() => {
        if (isOpen) {
            setTimeLeft(duration);
        }
    }, [isOpen, duration]);

    // Keyboard escape listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen && type !== 'loading') {
                onClose?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, type, onClose]);

    if (!isOpen) return null;

    const cleanText = (text) => {
        if (typeof text !== 'string') return text;
        return text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}]/gu, '').trim();
    };

    const displayTitle = cleanText(title || config.defaultTitle);
    const displayMessage = cleanText(message);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => {
                if (type !== 'loading') onClose?.();
            }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 12 }}
                transition={{ type: 'spring', damping: 26, stiffness: 360 }}
                className="relative bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm sm:max-w-md overflow-hidden text-left"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Dismiss button */}
                {type !== 'loading' && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors focus:outline-none z-10"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                )}

                <div className="p-6 sm:p-7 text-center">
                    {/* Illustration / Lottie Animation */}
                    <div className="flex justify-center items-center mb-3">
                        {type === 'loading' ? (
                            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-[#004687]">
                                <Loader2 size={40} className="animate-spin" />
                            </div>
                        ) : config.animation ? (
                            <div className="w-36 h-36 flex items-center justify-center -my-2 mx-auto">
                                <LottieAnimation
                                    animationData={config.animation}
                                    size={144}
                                    loop={true}
                                />
                            </div>
                        ) : (
                            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-[#004687]">
                                <Info size={36} />
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                        {displayTitle}
                    </h3>

                    {/* Message */}
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed font-normal">
                        {displayMessage}
                    </p>

                    {/* Structured Balance Breakdown if available */}
                    {balanceInfo && (balanceInfo.required || balanceInfo.available) && (
                        <div className="mt-4 p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl text-left">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                {balanceInfo.required && (
                                    <div>
                                        <span className="text-gray-500 font-medium block">Required</span>
                                        <span className="font-bold text-gray-900 text-sm font-mono">{balanceInfo.required}</span>
                                    </div>
                                )}
                                {balanceInfo.available && (
                                    <div>
                                        <span className="text-gray-500 font-medium block">Your Balance</span>
                                        <span className="font-bold text-rose-600 text-sm font-mono">{balanceInfo.available}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Optional Details Box */}
                    {details && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-2xl border border-gray-100 text-left text-xs font-mono text-gray-700 break-all max-h-32 overflow-y-auto">
                            {typeof details === 'object' ? JSON.stringify(details, null, 2) : details}
                        </div>
                    )}

                    {/* Action Buttons */}
                    {type !== 'loading' && (
                        <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
                            {cancelText && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onCancel?.();
                                        onClose?.();
                                    }}
                                    className="w-full py-3.5 px-4 border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm order-2 sm:order-1"
                                >
                                    {cancelText}
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    onAction?.();
                                    onClose?.();
                                }}
                                className={`w-full py-3.5 px-5 font-bold rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm order-1 sm:order-2 flex items-center justify-center gap-2 ${
                                    actionText === 'Fund Wallet' || actionText === 'Add Money'
                                        ? 'bg-gradient-to-r from-[#004687] to-[#1E90FF] text-white shadow-[#004687]/25'
                                        : config.btnClass
                                }`}
                            >
                                {(actionText === 'Fund Wallet' || actionText === 'Add Money') && (
                                    <Wallet size={16} className="shrink-0" />
                                )}
                                <span>{actionText}</span>
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
