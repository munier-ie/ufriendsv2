import React from 'react';
import Landmark from 'lucide-react/dist/esm/icons/landmark';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Repeat from 'lucide-react/dist/esm/icons/repeat';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';

/**
 * ServiceIcon Component
 * 
 * Centralized component to render service-specific icons or images.
 * 
 * @param {string} serviceName - The name of the service (e.g., 'Airtime', 'NIN Slip')
 * @param {string} size - The size of the icon container (default: 'w-10 h-10')
 * @param {string} iconSize - The size of the Lucide icon inside (default: 20)
 */
const ServiceIcon = ({ serviceName = '', size = 'w-10 h-10', iconSize = 20 }) => {
    const name = serviceName.toLowerCase();

    // 1. Exact Exam Token Codes (Priority 1)
    const examCodes = {
        'neone': '/assets/nin/neco.png',
        'netwo': '/assets/nin/neco.png',
        'nethr': '/assets/nin/neco.png',
        'nefour': '/assets/nin/neco.png',
        'nefive': '/assets/nin/neco.png',
        'waone': '/assets/nin/exam-pin.jpg',
        'watwo': '/assets/nin/exam-pin.jpg',
        'wathr': '/assets/nin/exam-pin.jpg',
        'wafour': '/assets/nin/exam-pin.jpg',
        'wafive': '/assets/nin/exam-pin.jpg'
    };

    if (examCodes[name]) {
        return (
            <div className={`${size} rounded-full overflow-hidden border border-gray-100 bg-white shadow-sm flex items-center justify-center`}>
                <img src={examCodes[name]} alt={serviceName} className="w-full h-full object-cover" />
            </div>
        );
    }

    // 2. Specific Brand/Image Mapping (Priority 2)
    const imageMapping = {
        'nin': '/assets/nin/ninIcon.png',
        'bvn': '/assets/nin/bvn-slip.jpg',
        'cac': '/assets/nin/samples/cac.jpg',
        'neco': '/assets/nin/neco.png',
        'waec': '/assets/nin/exam-pin.jpg',
        'exam': '/assets/nin/exam-pin.jpg',
        'airtime to cash': '/assets/nin/airtime-to-cash.jpg',
        'air swap': '/assets/nin/airtime-to-cash.jpg',
        'manual': '/assets/nin/bvn-services.jpg',
        'dstv': '/cable_tv/DSTV.jpg',
        'gotv': '/cable_tv/GOTV.png',
        'startimes': '/cable_tv/STARTIMES.jpg',
        'showmax': '/cable_tv/STARTIMES.jpg', // Fallback for showmax
        'ikeja': '/electricity/ikeja.png',
        'eko': '/electricity/ekedc.png',
        'ekedc': '/electricity/ekedc.png',
        'abuja': '/electricity/abuja.png',
        'abedc': '/electricity/abuja.png',
        'kano': '/electricity/kedco.png',
        'kedco': '/electricity/kedco.png',
        'port harcourt': '/electricity/portharcourt.png',
        'jos': '/electricity/jos.jpg',
        'ibadan': '/electricity/ibadan.png',
        'kaduna': '/electricity/kaduna.jpg'
    };

    for (const [key, path] of Object.entries(imageMapping)) {
        if (name.includes(key)) {
            return (
                <div className={`${size} rounded-full overflow-hidden border border-gray-100 bg-white shadow-sm flex items-center justify-center`}>
                    <img src={path} alt={serviceName} className="w-full h-full object-cover" />
                </div>
            );
        }
    }

    // 3. Network Provider Specific Branding (Priority 3)
    const networkBranding = [
        { key: 'mtn', color: 'from-yellow-400 to-yellow-600' },
        { key: 'airtel', color: 'from-red-500 to-red-600' },
        { key: 'glo', color: 'from-green-500 to-emerald-600' },
        { key: '9mobile', color: 'from-emerald-600 to-teal-700' }
    ];

    const activeNetwork = networkBranding.find(nb => name.includes(nb.key));

    // 4. Category SVG Icons (Priority 4)
    if (name.includes('airtime') || name.includes('recharge') || name.includes('pin')) {
        // Airtime branding matching Home.jsx (Green gradient)
        return (
            <div className={`${size} rounded-full bg-gradient-to-br ${activeNetwork ? activeNetwork.color : 'from-green-500 to-emerald-600'} flex items-center justify-center shadow-lg`}>
                <svg className="w-1/2 h-1/2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
            </div>
        );
    }

    if (name.includes('data') || name.includes('gb') || name.includes('mb') || name.includes('net') || name.includes('sme')) {
        // Data branding matching Home.jsx (Blue/Indigo gradient)
        return (
            <div className={`${size} rounded-full bg-gradient-to-br ${activeNetwork ? activeNetwork.color : 'from-blue-500 to-indigo-600'} flex items-center justify-center shadow-lg`}>
                <svg className="w-1/2 h-1/2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
            </div>
        );
    }

    if (name.includes('cable') || name.includes('tv')) {
        return (
            <div className={`${size} rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg`}>
                <svg className="w-1/2 h-1/2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            </div>
        );
    }

    if (name.includes('electricity') || name.includes('bill') || name.includes('disco')) {
        return (
            <div className={`${size} rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg`}>
                <Zap size={iconSize} className="text-white" />
            </div>
        );
    }

    if (name.includes('transfer')) {
        return (
            <div className={`${size} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg`}>
                <Repeat size={iconSize} className="text-white" />
            </div>
        );
    }

    if (name.includes('funding') || name.includes('wallet') || name.includes('topup') || name.includes('monnify') || name.includes('paymentpoint')) {
        return (
            <div className={`${size} rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg`}>
                <Wallet size={iconSize} className="text-white" />
            </div>
        );
    }

    if (name.includes('upgrade') || name.includes('verification')) {
        return (
            <div className={`${size} rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg`}>
                <Landmark size={iconSize} className="text-white" />
            </div>
        );
    }

    if (name.includes('bonus') || name.includes('referral')) {
        return (
            <div className={`${size} rounded-full bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center shadow-lg`}>
                <FileText size={iconSize} className="text-white" />
            </div>
        );
    }

    if (name.includes('sms')) {
        return (
            <div className={`${size} rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg`}>
                <Briefcase size={iconSize} className="text-white" />
            </div>
        );
    }

    // Default fallback icon
    return (
        <div className={`${size} rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200`}>
            <CreditCard size={iconSize} />
        </div>
    );
};

export default ServiceIcon;
