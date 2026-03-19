import React, { useState } from 'react';
import { motion } from 'framer-motion';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';

export default function NetworkStatus({ type = 'airtime' }) {
    const [refreshing, setRefreshing] = useState(false);

    // Mock data - in production this would fetch from an API
    const networks = [
        { name: 'MTN', status: 98, color: 'bg-green-500' },
        { name: 'Airtel', status: 95, color: 'bg-green-500' },
        { name: 'Glo', status: 88, color: 'bg-yellow-500' },
        { name: '9Mobile', status: 92, color: 'bg-green-500' }
    ];

    const handleRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    };

    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-700 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                    Network Status
                </h3>
                <button
                    onClick={handleRefresh}
                    className={`text-gray-400 hover:text-primary transition-colors ${refreshing ? 'animate-spin' : ''}`}
                    title="Refresh Status"
                >
                    <RefreshCw size={14} />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {networks.map((net) => (
                    <div key={net.name} className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="font-medium text-gray-600">{net.name}</span>
                            <span className="text-gray-500">{net.status}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${net.status}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={`h-full ${net.color}`}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between text-[10px] text-gray-400">
                <div className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1"></div> Stable</div>
                <div className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1"></div> Fluctuating</div>
                <div className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1"></div> Unavailable</div>
            </div>
        </div>
    );
}
