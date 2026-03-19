import { motion } from 'framer-motion';

export default function Logo({ className = "w-12 h-12" }) {
    return (
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1E90FF" />
                    <stop offset="100%" stopColor="#004687" />
                </linearGradient>
                <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00FFFF" />
                    <stop offset="100%" stopColor="#1E90FF" />
                </linearGradient>
            </defs>

            {/* "U" Shape */}
            <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                d="M25 20 V60 C25 75 35 85 50 85 C55 85 60 82 63 78 L63 55"
                stroke="url(#blueGradient)"
                strokeWidth="12"
                strokeLinecap="round"
            />

            {/* "f" Shape */}
            <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
                d="M65 85 V35 C65 25 70 20 80 20"
                stroke="url(#cyanGradient)"
                strokeWidth="12"
                strokeLinecap="round"
            />
            <motion.path
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, delay: 1 }}
                d="M60 45 H80"
                stroke="url(#cyanGradient)"
                strokeWidth="10"
                strokeLinecap="round"
            />
        </svg>
    );
}
