import { motion } from 'framer-motion';

export default function AuthLayout({ children, title, subtitle, maxWidth }) {
    return (
        <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
            {/* Radial Gradient Background from Top */}
            <div
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    background: "radial-gradient(125% 125% at 50% 10%, #fff 40%, #7c3aed 100%)",
                }}
            />
            {/* Overlay for branding colors */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-30 bg-gradient-to-br from-primary/10 to-secondary/10 mix-blend-overlay"></div>

            <div className={`relative z-10 w-full ${maxWidth || 'max-w-md'} p-4`}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {children}
                </motion.div>
            </div>
        </div>
    );
}
