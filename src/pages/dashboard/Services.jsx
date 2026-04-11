import React, { useState, useEffect, useTransition } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Phone from 'lucide-react/dist/esm/icons/phone';
import Wifi from 'lucide-react/dist/esm/icons/wifi';
import Tv from 'lucide-react/dist/esm/icons/tv';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Hash from 'lucide-react/dist/esm/icons/hash';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import NetworkStatus from '../../components/dashboard/NetworkStatus';
import BeneficiaryModal from '../../components/dashboard/BeneficiaryModal';

// Logos (using placeholders for now, can be replaced with real assets)
const PROVIDER_LOGOS = {
    // Airtime/Data
    'mtn': 'MTN',
    'airtel': 'AIRTEL',
    'glo': 'GLO',
    '9mobile': '9MOBILE',
    // Cable
    'dstv': '/cable_tv/DSTV.jpg',
    'gotv': '/cable_tv/GOTV.png',
    'startimes': '/cable_tv/STARTIMES.jpg',
    // Electricity
    'ikeja': '/electricity/ikeja.png',
    'eko': '/electricity/ekedc.png',
    'abuja': '/electricity/abuja.png',
    'kano': '/electricity/kedco.png',
    'port harcourt': '/electricity/portharcourt.png',
    'jos': '/electricity/jos.jpg',
    'ibadan': '/electricity/ibadan.png',
    'kaduna': '/electricity/kaduna.jpg'
};

export default function Services() {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('airtime');
    const [isPending, startTransition] = useTransition();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [verifiedName, setVerifiedName] = useState(null);
    const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false); // New State

    // Enhanced Form State
    const [formData, setFormData] = useState({
        serviceId: '',
        networkId: '', // For filtering plans
        recipient: '',
        amount: '',
        pin: '', // Pin is now collected in modal
        quantity: 1,
        networkType: 'VTU', // vtu, share, momo
        dataType: '', // show all by default
        cablePlan: '',
        subscriptionType: 'change', // change, renew
        iucNumber: '', // For cable
        meterNumber: '', // For electricity
        meterType: 'prepaid', // prepaid, postpaid
        portedNumber: false, // For airtime validator
        accessToken: '' // Set during verify for providers like subandgain
    });

    const [amountToPay, setAmountToPay] = useState(0);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const typeParam = params.get('type');

        if (typeParam) {
            setActiveTab(typeParam);
        } else if (location.pathname.includes('data-pins')) {
            setActiveTab('data_pin');
        } else if (location.pathname.includes('exam-pins')) {
            setActiveTab('exam');
        }
    }, [location]);

    useEffect(() => {
        fetchServices(activeTab);
    }, [activeTab]);

    // Calculate Amount to Pay
    useEffect(() => {
        let price = parseFloat(formData.amount) || 0;

        // Find selected service/plan
        const selectedService = services.find(s => s.id == formData.serviceId);

        if (selectedService && selectedService.price > 0 && activeTab !== 'airtime') {
            const qty = parseInt(formData.quantity) || 1;
            price = selectedService.price * qty;
        }

        // Apply discount logic
        // Use service.userDiscount if available, otherwise fallback to defaults
        let discountPercent = 0;
        if (selectedService && selectedService.userDiscount) {
            discountPercent = parseFloat(selectedService.userDiscount) / 100;
        } else if (activeTab === 'airtime') {
            discountPercent = 0.02; // 2% fallback for airtime
        }

        let discount = price * discountPercent;
        setAmountToPay(price - discount);
    }, [formData.amount, formData.serviceId, formData.quantity, services, activeTab, formData.networkType]);

    const fetchServices = async (type) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/services/${type}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setServices(res.data.services);
            resetForm();
        } catch (error) {
            console.error('Failed to fetch services:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            serviceId: '',
            networkId: '',
            recipient: '',
            amount: '',
            pin: '',
            quantity: 1,
            networkType: 'vtu',
            dataType: '',
            cablePlan: '',
            subscriptionType: 'change',
            iucNumber: '',
            meterNumber: '',
            meterType: 'prepaid',
            portedNumber: false,
            accessToken: ''
        });
        setVerifiedName(null);
        setMessage({ type: '', text: '' });
    };

    const handleVerify = async () => {
        const numberToVerify = activeTab === 'electricity' ? formData.meterNumber :
            activeTab === 'cable' ? formData.iucNumber :
                formData.recipient;

        if (!numberToVerify || numberToVerify.length < 5) {
            setMessage({ type: 'error', text: 'Please enter a valid number' });
            return;
        }

        // Determine the provider to verify against.
        // Priority: selected plan's provider > networkId (set by icon click) > nothing
        const selectedService = services.find(s => s.id == formData.serviceId);
        const providerForVerify = selectedService?.provider || formData.networkId?.toLowerCase();

        if (!providerForVerify) {
            setMessage({ type: 'error', text: `Please select a ${activeTab === 'cable' ? 'Cable TV provider' : 'Disco/Provider'} first` });
            return;
        }

        setVerifying(true);
        setMessage({ type: '', text: '' });

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/services/verify', {
                type: activeTab,
                provider: providerForVerify,
                number: numberToVerify,
                meterType: activeTab === 'electricity' ? formData.meterType : undefined
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.valid) {
                setVerifiedName(res.data.customerName);
                if (res.data.accessToken) {
                    setFormData(prev => ({ ...prev, accessToken: res.data.accessToken }));
                }
                setMessage({ type: 'success', text: `Verified: ${res.data.customerName}` });
            } else {
                setMessage({ type: 'error', text: 'Verification failed' });
                setVerifiedName(null);
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Verification failed' });
            setVerifiedName(null);
        } finally {
            setVerifying(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if ((activeTab === 'cable' || activeTab === 'electricity') && !verifiedName) {
            setMessage({ type: 'error', text: 'Please verify the number first' });
            return;
        }

        // Open PIN Modal instead of submitting immediately
        setFormData({ ...formData, pin: '' }); // Reset PIN for security
        setShowPinModal(true);
    };

    const handleFinalSubmit = async () => {
        if (formData.pin.length !== 4) {
            setMessage({ type: 'error', text: 'Please enter a valid 4-digit PIN' });
            return;
        }

        setSubmitting(true);
        setMessage({ type: '', text: '' });

        try {
            const token = localStorage.getItem('token');
            const endpoint = (activeTab === 'data_pin' || activeTab === 'pins' || activeTab === 'exam') ? '/api/pins/purchase' : '/api/services/purchase';

            const isPinTab = (activeTab === 'data_pin' || activeTab === 'pins' || activeTab === 'exam');
            const payload = {
                ...formData,
                serviceId: parseInt(formData.serviceId),
                amount: parseFloat(formData.amount),
                // For exam/pin services, quantity is encoded in the service name/DB (NEONE=1, NETWO=2 etc.)
                // Always send 1 so the backend uses examPin.quantity to determine the actual eduType code
                quantity: isPinTab ? 1 : (parseInt(formData.quantity) || 1)
            };

            const res = await axios.post(endpoint, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            let successMsg = res.data.message;
            if (res.data.token) successMsg += `. TOKEN: ${res.data.token}`;
            if (res.data.pin) successMsg += `. PIN: ${res.data.pin}`;

            setMessage({ type: 'success', text: successMsg });
            setShowPinModal(false);
            resetForm();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Transaction failed' });
            // Don't close modal on error so user can retry PIN if it was wrong PIN, 
            // but if it's strictly transaction failure, maybe close?
            // User requested: "Then ask for pin". If pin is wrong, we stay.
            if (!error.response?.data?.error?.toLowerCase().includes('pin')) {
                setShowPinModal(false);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleSelectBeneficiary = (contact) => {
        setFormData({ ...formData, recipient: contact.phone });
        setShowBeneficiaryModal(false);
    };

    const handleIconClick = (providerName) => {
        // For data plans, networkId should be the NETWORK NAME (MTN/GLO/etc), not provider.
        // For other tabs, use provider matching as before.
        if (activeTab === 'data' || activeTab === 'airtime') {
            const networkMap = { 'mtn': 'MTN', 'glo': 'GLO', 'airtel': 'AIRTEL', '9mobile': '9MOBILE' };
            const networkName = networkMap[providerName.toLowerCase()] || providerName.toUpperCase();
            setFormData({ ...formData, serviceId: '', networkId: networkName, amount: '' });
        } else {
            const service = services.find(s =>
                s.provider.toLowerCase().includes(providerName.toLowerCase()) ||
                s.name.toLowerCase().includes(providerName.toLowerCase())
            );
            if (service) {
                setFormData({ ...formData, serviceId: service.id, networkId: service.provider });
            }
        }
    };

    const tabs = [
        { id: 'airtime', label: 'Airtime', icon: Phone },
        { id: 'data', label: 'Data', icon: Wifi },
        { id: 'cable', label: 'Cable TV', icon: Tv },
        { id: 'electricity', label: 'Electricity', icon: Zap },
        { id: 'data_pin', label: 'Data Pins', icon: Hash },
        { id: 'exam', label: 'Exam Pins', icon: GraduationCap }
    ];

    const needsVerification = activeTab === 'cable' || activeTab === 'electricity';
    const isPinService = activeTab === 'data_pin' || activeTab === 'exam';

    // Helper: parse a data size string like '25.0MB', '1.5GB', '500MB' -> value in MB
    const parseDataSize = (name) => {
        const match = name.match(/(\d+(\.\d+)?)(MB|GB|TB)/i);
        if (!match) return Infinity; // push unrecognizable items to the end
        const value = parseFloat(match[1]);
        const unit = match[3].toUpperCase();
        if (unit === 'GB') return value * 1024;
        if (unit === 'TB') return value * 1024 * 1024;
        return value; // MB
    };

    // Filter plans based on provider and type specific criteria
    const filteredPlans = services.filter(s => {
        // For data/airtime, filter by network name embedded in plan name (e.g. 'MTN 1.0GB (SME)')
        if (formData.networkId && (activeTab === 'data' || activeTab === 'airtime')) {
            if (!s.name.toUpperCase().startsWith(formData.networkId.toUpperCase())) return false;
        } else if (formData.networkId && activeTab !== 'data' && activeTab !== 'airtime') {
            if (!s.provider.toLowerCase().includes(formData.networkId.toLowerCase())) return false;
        }

        // Data Specific Filtering: match plan type (SME, GIFTING, CORPORATE, CORPORATE2)
        if (activeTab === 'data' && formData.dataType) {
            const type = formData.dataType.toUpperCase();
            const nameUpper = s.name.toUpperCase();
            
            if (type === 'CORPORATE') {
                if (!nameUpper.includes('CORPORATE') && !nameUpper.includes('C.G')) return false;
            } else if (type === 'GIFTING') {
                // If GIFTING, it might match CORPORATE GIFTING, which is fine
                if (!nameUpper.includes('GIFTING')) return false;
            } else {
                // e.g. SME will match SME and SME2
                if (!nameUpper.includes(type)) return false;
            }
        }

        return true;
    });

    // Sort data plans from smallest to largest size
    const sortedPlans = activeTab === 'data'
        ? [...filteredPlans].sort((a, b) => parseDataSize(a.name) - parseDataSize(b.name))
        : activeTab === 'exam'
        ? [...filteredPlans].sort((a, b) => {
            if (a.examType !== b.examType) return a.examType < b.examType ? -1 : 1;
            return (a.quantity || 0) - (b.quantity || 0);
          })
        : filteredPlans;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Utility Services</h1>

            {/* Network Status Viewer */}
            {(activeTab === 'airtime' || activeTab === 'data') && (
                <NetworkStatus type={activeTab} />
            )}

            {/* Tabs */}
            <div className="flex space-x-2 overflow-x-auto pb-2 border-b border-gray-200 no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            startTransition(() => { setActiveTab(tab.id); });
                        }}
                        className={`flex items-center space-x-2 px-6 py-3 border-b-2 whitespace-nowrap transition-all ${activeTab === tab.id
                            ? 'border-primary text-primary bg-primary/5'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <tab.icon size={18} />
                        <span className="font-medium">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Status Message */}
            <AnimatePresence>
                {message.text && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`p-4 rounded-xl flex items-center space-x-3 ${message.type === 'success'
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : 'bg-red-50 text-red-700 border border-red-100'
                            }`}
                    >
                        {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <span className="font-medium">{message.text}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Form Area */}
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-6 md:p-8 border border-gray-100 relative overflow-hidden">
                {isPending && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Provider Icons - Enhanced Cards */}
                    {!isPinService && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-6">
                            {Object.keys(PROVIDER_LOGOS).filter(k => {
                                if (activeTab === 'airtime' || activeTab === 'data') return ['mtn', 'airtel', 'glo', '9mobile'].includes(k);
                                if (activeTab === 'cable') return ['dstv', 'gotv', 'startimes'].includes(k);
                                if (activeTab === 'electricity') return ['ikeja', 'eko', 'abuja', 'kano', 'port harcourt', 'jos', 'ibadan', 'kaduna'].includes(k);
                                return false;
                            }).map(key => (
                                <motion.button
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    key={key}
                                    type="button"
                                    onClick={() => handleIconClick(key)}
                                    className={`relative p-4 rounded-xl border flex flex-col items-center justify-center transition-all shadow-sm ${formData.networkId && (formData.networkId.toLowerCase() === key || formData.networkId.toLowerCase().includes(key))
                                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20 shadow-primary/20'
                                        : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                                        }`}
                                >
                                    {formData.networkId && (formData.networkId.toLowerCase() === key || formData.networkId.toLowerCase().includes(key)) && (
                                        <div className="absolute top-2 right-2 text-primary">
                                            <CheckCircle size={14} />
                                        </div>
                                    )}
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 overflow-hidden ${PROVIDER_LOGOS[key].startsWith('/') ? 'bg-white border border-gray-100' :
                                        (key === 'mtn' ? 'bg-yellow-400 text-yellow-900' :
                                            key === 'glo' ? 'bg-green-600 text-white' :
                                                key === 'airtel' ? 'bg-red-500 text-white' :
                                                    key === '9mobile' ? 'bg-green-800 text-white' :
                                                        ['dstv', 'gotv', 'startimes'].includes(key) ? 'bg-blue-600 text-white' :
                                                            'bg-gray-800 text-white')
                                        }`}>
                                        {PROVIDER_LOGOS[key].startsWith('/') ? (
                                            <img src={PROVIDER_LOGOS[key]} alt={key} className="w-full h-full object-contain p-1" />
                                        ) : (
                                            <span className="font-bold text-[10px]">{PROVIDER_LOGOS[key].substring(0, 3)}</span>
                                        )}
                                    </div>
                                    <span className="font-bold text-xs uppercase tracking-wider">{key}</span>
                                </motion.button>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Data Specific: Data Type moved above Plan dropdown */}
                        {activeTab === 'data' && (
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">Data Type</label>
                                <select
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[44px] outline-none"
                                    value={formData.dataType}
                                    onChange={(e) => setFormData({ ...formData, dataType: e.target.value, serviceId: '', amount: '' })}
                                >
                                    <option value="">All Types</option>
                                    <option value="SME">SME</option>
                                    <option value="GIFTING">Gifting</option>
                                    <option value="CORPORATE">Corporate</option>
                                    <option value="CORPORATE2">Corporate 2</option>
                                    <option value="DATA AWOOF">Data Awoof</option>
                                    <option value="DATA SHARE">Data Share</option>
                                    <option value="DATA COUPONS">Data Coupons</option>
                                </select>
                            </div>
                        )}

                        {/* Service Selection */}
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Service Provider / Plan</label>
                            <select
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[44px] focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                                value={formData.serviceId}
                                onChange={(e) => {
                                    const service = services.find(s => s.id == e.target.value);
                                    setFormData({
                                        ...formData,
                                        serviceId: e.target.value,
                                        // Preserve networkId for data/airtime (set by icon click). Only update for cable/electricity.
                                        networkId: (activeTab === 'data' || activeTab === 'airtime')
                                            ? formData.networkId
                                            : service?.provider,
                                        // Only set amount if it's not airtime (Airtime is variable)
                                        amount: (service && activeTab !== 'airtime') ? service.price : ''
                                    });
                                }}
                                required
                            >
                                <option value="">Select a plan</option>
                                {sortedPlans.map((s) => {
                                    // For exam pins, display "NECO - 1 Token" or "WAEC - 3 Tokens"
                                    let label;
                                    if (activeTab === 'exam' && s.quantity) {
                                        const qty = s.quantity;
                                        const qtyLabel = qty === 1 ? '1 Token' : `${qty} Tokens`;
                                        label = `${s.examType || s.code || s.name.split(' ')[0]} - ${qtyLabel} (₦${s.price?.toLocaleString()})`;
                                    } else {
                                        // Clean plan name (strip Days etc.)
                                        const cleanName = s.name.replace(/\s*Days?\s*\)/ig, ')').replace(/\{GIFTING\}/ig, '').trim();
                                        label = `${cleanName}${(s.price > 0 && activeTab !== 'airtime') ? ` (₦${s.price?.toLocaleString()})` : ''}`;
                                    }
                                    return (
                                        <option key={s.id} value={s.id}>
                                            {label}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* Airtime Specific: Network Type */}
                        {activeTab === 'airtime' && (
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">Network Type</label>
                                <select
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[44px] outline-none"
                                    value={formData.networkType}
                                    onChange={(e) => setFormData({ ...formData, networkType: e.target.value })}
                                >
                                    <option value="VTU">VTU</option>
                                    <option value="Share">Share & Sell</option>
                                    <option value="Momo">Momo</option>
                                </select>
                            </div>
                        )}

                        {/* Removed Data Type from here as it was correctly moved up */}

                        {/* Cable Specific: Subscription Type */}
                        {activeTab === 'cable' && (
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">Subscription Type</label>
                                <select
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[44px] outline-none"
                                    value={formData.subscriptionType}
                                    onChange={(e) => setFormData({ ...formData, subscriptionType: e.target.value })}
                                >
                                    <option value="change">Change Plan</option>
                                    <option value="renew">Renew Plan</option>
                                </select>
                            </div>
                        )}

                        {/* PHONE NUMBER / RECIPIENT INPUT */}
                        {!isPinService && (
                            <div className="space-y-1 relative">
                                <label className="block text-sm font-medium text-gray-700 flex justify-between items-center">
                                    <span>{activeTab === 'electricity' ? 'Customer Phone' : 'Phone Number'}</span>
                                    {activeTab !== 'cable' && (
                                        <button
                                            type="button"
                                            onClick={() => setShowBeneficiaryModal(true)}
                                            className="text-primary text-xs flex items-center hover:bg-primary/10 px-2 py-1 rounded-full transition-colors"
                                        >
                                            <UserPlus size={12} className="mr-1" /> Select Contact
                                        </button>
                                    )}
                                </label>
                                <Input
                                    placeholder="e.g. 08012345678"
                                    value={formData.recipient}
                                    onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                                    required
                                    className="text-lg tracking-wide"
                                />
                                {activeTab === 'airtime' && (
                                    <div className="flex items-center justify-between mt-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                                        <span className="text-xs text-gray-600">Ported Number?</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={formData.portedNumber}
                                                onChange={(e) => setFormData({ ...formData, portedNumber: e.target.checked })}
                                            />
                                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Electricity/Cable Unique Inputs */}
                        {(activeTab === 'electricity' || activeTab === 'cable') && (
                            <div className="space-y-1 relative">
                                <label className="block text-sm font-medium text-gray-700">
                                    {activeTab === 'electricity' ? 'Meter Number' : 'IUC/SmartCard Number'}
                                </label>
                                <div className="flex space-x-2">
                                    <Input
                                        placeholder={activeTab === 'electricity' ? 'Meter Number' : 'IUC Number'}
                                        value={activeTab === 'electricity' ? formData.meterNumber : formData.iucNumber}
                                        onChange={(e) => activeTab === 'electricity'
                                            ? setFormData({ ...formData, meterNumber: e.target.value })
                                            : setFormData({ ...formData, iucNumber: e.target.value })
                                        }
                                        required
                                        className="flex-1"
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleVerify}
                                        disabled={verifying || ((activeTab === 'electricity' ? !formData.meterNumber : !formData.iucNumber))}
                                        className="px-4"
                                        variant={verifiedName ? "outline" : "default"}
                                    >
                                        {verifying ? <Loader2 className="animate-spin" size={16} /> : verifiedName ? <CheckCircle size={16} /> : 'Verify'}
                                    </Button>
                                </div>
                                {verifiedName && <p className="text-xs text-green-600 font-medium absolute -bottom-5 left-0">Verified: {verifiedName}</p>}
                            </div>
                        )}

                        {/* Electricity Meter Type */}
                        {activeTab === 'electricity' && (
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">Meter Type</label>
                                <select
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[44px] outline-none"
                                    value={formData.meterType}
                                    onChange={(e) => setFormData({ ...formData, meterType: e.target.value })}
                                >
                                    <option value="prepaid">Prepaid</option>
                                    <option value="postpaid">Postpaid</option>
                                </select>
                            </div>
                        )}

                        {isPinService && (
                            <>
                                {/* Quantity removed as per requirements */}

                                {activeTab === 'data_pin' && (
                                    <Input
                                        label="Business Name (On Card)"
                                        placeholder="e.g. Ufriends Data"
                                        value={formData.businessName || ''}
                                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                        className="capitalize"
                                    />
                                )}
                            </>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Input
                                    label="Amount"
                                    type="number"
                                    placeholder="Min ₦50"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    required
                                    readOnly={!!services.find(s => s.id == formData.serviceId)?.price && activeTab !== 'airtime'}
                                    className="text-lg font-semibold"
                                />
                                {/* Quick Amount Chips for Airtime */}
                                {activeTab === 'airtime' && (
                                    <div className="flex space-x-2 mt-2 overflow-x-auto no-scrollbar">
                                        {[100, 200, 500, 1000, 2000].map(amt => (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, amount: amt.toString() })}
                                                className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors whitespace-nowrap"
                                            >
                                                ₦{amt}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {/* Quick Selection Chips for Data */}
                                {activeTab === 'data' && (
                                    <div className="flex space-x-2 mt-2 overflow-x-auto no-scrollbar">
                                        {['500MB', '1GB', '2GB', '3GB', '5GB', '10GB'].map(vol => {
                                            const plan = sortedPlans.find(p => p.name.toLowerCase().includes(vol.toLowerCase()));
                                            return (
                                                <button
                                                    key={vol}
                                                    type="button"
                                                    disabled={!plan}
                                                    onClick={() => {
                                                        if (plan) {
                                                            setFormData({ ...formData, serviceId: plan.id, amount: plan.price });
                                                        }
                                                    }}
                                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${plan
                                                        ? (formData.serviceId == plan.id ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700')
                                                        : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                                        }`}
                                                >
                                                    {vol}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">Amount To Pay</label>
                                <div className="relative w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[44px] bg-gray-50 flex items-center justify-between font-bold text-gray-800 text-lg">
                                    <span>₦{amountToPay.toLocaleString()}</span>
                                    {amountToPay < formData.amount && (
                                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                                            {Math.round(((formData.amount - amountToPay) / formData.amount) * 100)}% OFF
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>


                    <div className="pt-4">
                        <Button
                            type="submit"
                            className="w-full py-4 text-lg font-bold bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg shadow-primary/25"
                            loading={loading}
                            disabled={loading || isPending || (needsVerification && !verifiedName)}
                        >
                            {isPinService ? 'Purchase PINs' : 'Proceed'}
                        </Button>
                    </div>
                </form>

                {/* PIN Verification Modal */}
                <AnimatePresence>
                    {showPinModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
                            >
                                <div className="p-6 text-center space-y-4">
                                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                                        <Hash size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Enter Transaction PIN</h3>
                                        <p className="text-sm text-gray-500 mt-1">Please enter your 4-digit PIN to confirm this transaction.</p>
                                    </div>

                                    <div className="py-2">
                                        <Input
                                            type="password"
                                            maxLength={4}
                                            placeholder="••••"
                                            className="text-center text-2xl tracking-[0.5em] font-bold h-14"
                                            value={formData.pin}
                                            onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                                            autoFocus
                                        />
                                    </div>

                                    <div className="flex space-x-3 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => setShowPinModal(false)}
                                            disabled={submitting}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="button"
                                            className="flex-1"
                                            onClick={handleFinalSubmit}
                                            disabled={submitting || formData.pin.length !== 4}
                                            loading={submitting}
                                        >
                                            Confirm
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Beneficiary Modal */}
                <AnimatePresence>
                    {showBeneficiaryModal && (
                        <BeneficiaryModal
                            isOpen={showBeneficiaryModal}
                            onClose={() => setShowBeneficiaryModal(false)}
                            onSelect={handleSelectBeneficiary}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Information Card */}
            <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                <h3 className="text-primary font-bold mb-2 flex items-center space-x-2">
                    <AlertCircle size={18} />
                    <span>Important Information</span>
                </h3>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 opacity-80">
                    {activeTab === 'electricity' && (
                        <li className="text-red-500 font-medium">Note: Service charge of ₦100 applies to electricity bills.</li>
                    )}
                    <li>Minimum purchase amount is ₦50.</li>
                    {needsVerification && <li>You must verify the Meter/SmartCard number before paying.</li>}
                    {isPinService && <li>Purchased PINs will be displayed in your transaction history.</li>}
                    <li>Transactions are usually processed instantly.</li>
                </ul>
            </div >
        </div >
    );
}
