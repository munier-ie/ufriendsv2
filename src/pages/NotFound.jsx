import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="text-center max-w-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center justify-center w-24 h-24 bg-red-100 text-red-600 rounded-full mb-6"
                >
                    <AlertCircle size={48} />
                </motion.div>

                <h1 className="text-4xl font-bold text-gray-900 mb-2">Page Not Found</h1>
                <p className="text-gray-600 mb-8">
                    The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                </p>

                <Link
                    to="/dashboard"
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                    <ArrowLeft size={20} />
                    <span>Back to Dashboard</span>
                </Link>
            </div>
        </div>
    );
}
