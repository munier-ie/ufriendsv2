import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Landmark from 'lucide-react/dist/esm/icons/landmark';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Download from 'lucide-react/dist/esm/icons/download';
import Eye from 'lucide-react/dist/esm/icons/eye';
import X from 'lucide-react/dist/esm/icons/x';
import Hash from 'lucide-react/dist/esm/icons/hash';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Phone from 'lucide-react/dist/esm/icons/phone';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

// --- Constants ---
const INITIAL_FORM = {
    nin: '', bvn: '', ninPhone: '',
    // CAC fields
    businessName: '', altBusinessName: '', businessType: '',
    companyAddress: '', residentialAddress: '', natureOfBusiness: '',
    shareCapital: '', email: '', phone: '',
    pin: ''
};

const BUSINESS_TYPES = [
    { value: '', label: 'Select Certificate Type' },
    { value: 'biz', label: 'Business Name Registration' },
    { value: 'limited', label: 'Limited Liability Company (LTD)' },
    { value: 'enterprise', label: 'Enterprise (Business Name)' },
    { value: 'ngo', label: 'NGO / Incorporated Trustees' }
];

const STATUS_MAP = {
    0: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
    1: { label: 'Approved', color: 'bg-green-100 text-green-700' },
    2: { label: 'Rejected', color: 'bg-red-100 text-red-700' }
};

// --- Reusable File Upload Component ---
function FileUploadField({ label, id, accept = 'image/*', file, onChange, required = true }) {
    return (
        <div className="space-y-1">
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="relative">
                <input
                    type="file"
                    id={id}
                    accept={accept}
                    onChange={onChange}
                    required={required}
                    className="hidden"
                />
                <label
                    htmlFor={id}
                    className="flex items-center gap-3 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                >
                    <div className="p-2 bg-gray-100 rounded-lg">
                        <Upload size={18} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        {file ? (
                            <span className="text-sm font-medium text-gray-900 truncate block">{file.name}</span>
                        ) : (
                            <span className="text-sm text-gray-500">Click to upload {label.toLowerCase()}</span>
                        )}
                        <span className="text-xs text-gray-400 block">JPG, PNG, GIF, WEBP (Max 5MB)</span>
                    </div>
                    {file ? (
                        <CheckCircle size={18} className="text-green-500 shrink-0" />
                    ) : null}
                </label>
            </div>
        </div>
    );
}

export default function GovServices() {
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'nin');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [bvnPricing, setBvnPricing] = useState(null);
    const [ninPricing, setNinPricing] = useState(null);
    const [cacPricing, setCacPricing] = useState(null);
    const [selectedSlipType, setSelectedSlipType] = useState('regular');
    const [selectedBvnSlipType, setSelectedBvnSlipType] = useState('regular');
    const [loadingPricing, setLoadingPricing] = useState(false);
    const [slipPreview, setSlipPreview] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);

    // NIN lookup method state
    const [ninLookupMethod, setNinLookupMethod] = useState('nin'); // 'nin' or 'phone'

    // CAC-specific state
    const [directorIdCard, setDirectorIdCard] = useState(null);
    const [passportPhoto, setPassportPhoto] = useState(null);
    const [cacHistory, setCacHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [formData, setFormData] = useState(INITIAL_FORM);

    const updateField = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    useEffect(() => {
        if (activeTab === 'bvn') fetchBvnPricing();
        else if (activeTab === 'nin') fetchNinPricing();
        else if (activeTab === 'cac') {
            fetchCacPricing();
            fetchCacHistory();
        }
    }, [activeTab]);

    const fetchBvnPricing = async () => {
        setLoadingPricing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/bvn/pricing', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBvnPricing(res.data);
        } catch (error) {
            console.error('Failed to fetch BVN pricing', error);
        } finally {
            setLoadingPricing(false);
        }
    };

    const fetchNinPricing = async () => {
        setLoadingPricing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/nin/pricing', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNinPricing(res.data);
        } catch (error) {
            console.error('Failed to fetch NIN pricing', error);
        } finally {
            setLoadingPricing(false);
        }
    };

    const fetchCacPricing = async () => {
        setLoadingPricing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/professional/cac-pricing', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCacPricing(res.data);
        } catch (error) {
            console.error('Failed to fetch CAC pricing', error);
        } finally {
            setLoadingPricing(false);
        }
    };

    const fetchCacHistory = async () => {
        setLoadingHistory(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/professional/cac-history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCacHistory(res.data.registrations || []);
        } catch (error) {
            console.error('Failed to fetch CAC history', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setMessage({ type: '', text: '' });
        setSlipPreview(null);
    };

    const getCacPrice = () => {
        if (!cacPricing) return 5000;
        const isLimited = formData.businessType === 'limited';
        return isLimited ? cacPricing.charge2 : cacPricing.charge1;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (activeTab === 'bvn' && formData.bvn.length !== 11) {
            setMessage({ type: 'error', text: 'BVN must be exactly 11 digits' });
            return;
        }

        // CAC-specific validation
        if (activeTab === 'cac') {
            if (!directorIdCard) {
                setMessage({ type: 'error', text: 'Please upload Director ID card' });
                return;
            }
            if (!passportPhoto) {
                setMessage({ type: 'error', text: 'Please upload Passport photograph' });
                return;
            }
            if (directorIdCard.size > 5 * 1024 * 1024 || passportPhoto.size > 5 * 1024 * 1024) {
                setMessage({ type: 'error', text: 'Files must be under 5MB each' });
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                setMessage({ type: 'error', text: 'Please enter a valid email address' });
                return;
            }
        }

        updateField('pin', '');
        setShowPinModal(true);
    };

    const handleFinalSubmit = async () => {
        if (formData.pin.length !== 4) {
            setMessage({ type: 'error', text: 'Please enter a valid 4-digit PIN' });
            return;
        }

        setSubmitting(true);
        setMessage({ type: '', text: '' });
        setSlipPreview(null);

        try {
            const token = localStorage.getItem('token');

            if (activeTab === 'cac') {
                // CAC uses FormData for file uploads
                const fd = new FormData();
                fd.append('businessName', formData.businessName);
                fd.append('altBusinessName', formData.altBusinessName);
                fd.append('businessType', formData.businessType);
                fd.append('companyAddress', formData.companyAddress);
                fd.append('residentialAddress', formData.residentialAddress);
                fd.append('natureOfBusiness', formData.natureOfBusiness);
                fd.append('shareCapital', formData.shareCapital);
                fd.append('email', formData.email);
                fd.append('phone', formData.phone.replace(/\D/g, ''));
                fd.append('pin', formData.pin);
                fd.append('directorIdCard', directorIdCard);
                fd.append('passportPhoto', passportPhoto);

                const res = await axios.post('/api/professional/cac-register', fd, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });

                setMessage({ type: 'success', text: res.data.message });
                setShowPinModal(false);
                setFormData(INITIAL_FORM);
                setDirectorIdCard(null);
                setPassportPhoto(null);
                fetchCacHistory();
            } else {
                // NIN / BVN use JSON
                let requestType = '';
                let details = {};

                if (activeTab === 'nin') {
                    requestType = 'NIN_SLIP_SERVICE';
                    if (ninLookupMethod === 'phone') {
                        details = {
                            lookupMethod: 'phone',
                            phoneNumber: formData.ninPhone.replace(/\D/g, ''),
                            slipType: selectedSlipType
                        };
                    } else {
                        details = { nin: formData.nin, slipType: selectedSlipType };
                    }
                } else if (activeTab === 'bvn') {
                    requestType = 'BVN_SLIP_SERVICE';
                    details = { bvnNumber: formData.bvn, slipType: selectedBvnSlipType };
                }

                const res = await axios.post('/api/professional/request', {
                    type: requestType, details, pin: formData.pin
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.data.success && res.data.report) {
                    setSlipPreview(res.data.report);
                    setMessage({
                        type: 'success',
                        text: `${activeTab === 'nin' ? 'NIN' : 'BVN'} verified successfully! Your slip is ready for download.`
                    });
                } else {
                    setMessage({ type: 'success', text: res.data.message });
                }

                setShowPinModal(false);
                setFormData(INITIAL_FORM);
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Request failed' });
            if (!error.response?.data?.error?.toLowerCase().includes('pin')) {
                setShowPinModal(false);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDownloadSlip = () => {
        if (slipPreview?.pdfUrl) window.open(slipPreview.pdfUrl, '_blank');
    };

    // --- Compute tabs ---
    const tabs = [
        {
            id: 'nin', label: 'NIN Slip', icon: Landmark,
            image: '/assets/nin/ninIcon.png',
            price: ninPricing?.[selectedSlipType] || 150
        },
        {
            id: 'bvn', label: 'BVN Slip', icon: FileText,
            image: '/assets/nin/bvn-slip.jpg',
            price: bvnPricing?.[selectedBvnSlipType] || 500,
            active: bvnPricing?.active !== false
        },
        {
            id: 'cac', label: 'CAC Registration', icon: Briefcase,
            image: '/assets/nin/samples/cac.jpg',
            price: getCacPrice(),
            active: cacPricing?.active !== false
        }
    ];

    const currentTab = tabs.find(t => t.id === activeTab);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Government & Professional Services</h1>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 overflow-x-auto pb-2 border-b border-gray-200 no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`flex items-center space-x-2 px-6 py-3 border-b-2 whitespace-nowrap transition-all ${activeTab === tab.id
                            ? 'border-primary text-primary bg-primary/5'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        {tab.image ? (
                            <img src={tab.image} alt={tab.label} className="w-5 h-5 rounded-sm object-cover" />
                        ) : (
                            <tab.icon size={18} />
                        )}
                        <span className="font-medium">{tab.label}</span>
                        {tab.active === false ? (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inactive</span>
                        ) : null}
                    </button>
                ))}
            </div>

            {/* Status Message */}
            <AnimatePresence>
                {message.text ? (
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
                ) : null}
            </AnimatePresence>

            {/* Slip Preview Card (NIN/BVN only) */}
            {slipPreview ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-green-900 mb-2">✓ {activeTab === 'nin' ? 'NIN' : 'BVN'} Slip Generated</h3>
                            <p className="text-green-700 text-sm mb-3">
                                <strong>{slipPreview.firstName} {slipPreview.lastName}</strong>
                            </p>
                            <p className="text-green-600 text-xs">
                                Transaction Ref: {slipPreview.transactionRef}
                            </p>
                        </div>
                        <div className="flex space-x-2">
                            <Button variant="outline" size="sm" icon={Eye} onClick={() => setShowPreviewModal(true)} className="border-green-300 text-green-700 hover:bg-green-100">
                                Preview
                            </Button>
                            <Button size="sm" icon={Download} onClick={handleDownloadSlip} className="bg-green-600 hover:bg-green-700">
                                Download PDF
                            </Button>
                        </div>
                    </div>
                </motion.div>
            ) : null}

            {/* Main Form Card */}
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-6 md:p-8 border border-gray-100">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{currentTab.label} Request</h2>
                        <p className="text-gray-500 text-sm">Please fill in the details below accurately.</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400 font-medium">Service Fee</p>
                        <p className="text-2xl font-black text-primary">₦{currentTab.price?.toLocaleString()}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* ==================== NIN TAB ==================== */}
                    {activeTab === 'nin' ? (
                        <div className="space-y-6">
                            {/* Lookup Method Toggle */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700">Lookup Method</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setNinLookupMethod('nin')}
                                        className={`flex items-center justify-center gap-2 p-3 border-2 rounded-xl transition-all text-sm font-bold ${ninLookupMethod === 'nin'
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                            }`}
                                    >
                                        <Hash size={16} />
                                        NIN Number
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNinLookupMethod('phone')}
                                        className={`flex items-center justify-center gap-2 p-3 border-2 rounded-xl transition-all text-sm font-bold ${ninLookupMethod === 'phone'
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                            }`}
                                    >
                                        <Phone size={16} />
                                        Phone Number
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700">Select Slip Type</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {['regular', 'standard', 'premium', 'vnin'].map((type) => {
                                        const sampleImg = {
                                            regular: '/assets/nin/samples/nin-regular.png',
                                            standard: '/assets/nin/samples/nin-standard.png',
                                            premium: '/assets/nin/samples/nin-premium.png',
                                            vnin: '/assets/nin/samples/nin-vnin.jpg'
                                        }[type];

                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setSelectedSlipType(type)}
                                                className={`p-4 border-2 rounded-xl transition-all text-left flex flex-col h-full ${selectedSlipType === type
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-bold text-lg capitalize">{type} Slip</span>
                                                    {selectedSlipType === type ? <CheckCircle size={20} className="text-primary" /> : null}
                                                </div>

                                                {sampleImg ? (
                                                    <div className="mb-3 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 h-32 flex items-center justify-center">
                                                        <img
                                                            src={sampleImg}
                                                            alt={`${type} slip sample`}
                                                            className="w-full h-full object-contain hover:scale-105 transition-transform"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="mb-3 rounded-lg border border-gray-100 bg-gray-50 h-32 flex items-center justify-center">
                                                        <Landmark size={40} className="text-gray-300" />
                                                    </div>
                                                )}

                                                <div className="mt-auto">
                                                    <p className="text-2xl font-black text-primary mb-2">
                                                        ₦{ninPricing?.[type]?.toLocaleString() || (type === 'vnin' ? '1,000' : type === 'regular' ? '150' : '200')}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {type === 'regular' ? 'Basic NIMC table format' : type === 'standard' ? 'ID card with QR code' : type === 'premium' ? 'Premium ID card design' : 'Verification-as-a-Service report'}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Input field based on lookup method */}
                            {ninLookupMethod === 'phone' ? (
                                <Input
                                    label="Phone Number"
                                    placeholder="Enter phone number (e.g. 08012345678)"
                                    maxLength={15}
                                    value={formData.ninPhone}
                                    onChange={(e) => updateField('ninPhone', e.target.value.replace(/[^0-9+]/g, ''))}
                                    required
                                    className="text-lg tracking-wider text-center font-semibold"
                                />
                            ) : (
                                <Input
                                    label="NIN Number"
                                    placeholder="Enter 11-digit NIN"
                                    maxLength={11}
                                    value={formData.nin}
                                    onChange={(e) => updateField('nin', e.target.value.replace(/\D/g, ''))}
                                    required
                                    className="text-lg tracking-wider text-center font-semibold"
                                />
                            )}

                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <p className="text-sm text-blue-800">
                                    <strong>Note:</strong>{' '}
                                    {ninLookupMethod === 'phone'
                                        ? 'Your NIN will be retrieved using the phone number registered with NIMC. The slip will be generated and available for download immediately.'
                                        : `Your NIN will be verified instantly with NIMC. The ${selectedSlipType} slip will be generated and available for download immediately.`
                                    }
                                </p>
                            </div>
                        </div>
                    ) : null}

                    {/* ==================== BVN TAB ==================== */}
                    {activeTab === 'bvn' ? (
                        <div className="space-y-6">
                            <div className="border-b border-gray-100 pb-4">
                                <h2 className="text-xl font-bold text-gray-900">Bank Verification Number (BVN) Service</h2>
                                <p className="text-sm text-gray-500">Retrieve and generate premium verification slips instantly</p>
                            </div>
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700">Select Slip Type</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {['regular', 'plastic'].map((type) => {
                                        const sampleImg = {
                                            regular: '/assets/nin/samples/bvn-regular.jpeg',
                                            plastic: '/assets/nin/samples/bvn-plastic.jpg'
                                        }[type];

                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setSelectedBvnSlipType(type)}
                                                className={`p-4 border-2 rounded-xl transition-all text-left flex flex-col h-full ${selectedBvnSlipType === type
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-bold text-lg capitalize">{type === 'plastic' ? 'Premium Plastic' : 'Regular'} Slip</span>
                                                    {selectedBvnSlipType === type ? <CheckCircle size={20} className="text-primary" /> : null}
                                                </div>

                                                {sampleImg ? (
                                                    <div className="mb-3 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 h-40 flex items-center justify-center">
                                                        <img
                                                            src={sampleImg}
                                                            alt={`${type} slip sample`}
                                                            className="w-full h-full object-contain hover:scale-105 transition-transform"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="mb-3 rounded-lg border border-gray-100 bg-gray-50 h-40 flex items-center justify-center">
                                                        <FileText size={48} className="text-gray-300" />
                                                    </div>
                                                )}

                                                <div className="mt-auto">
                                                    <p className="text-2xl font-black text-primary mb-2">
                                                        ₦{bvnPricing?.[type]?.toLocaleString() || (type === 'regular' ? '500' : '1,000')}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {type === 'regular' ? 'Basic table format for verification' : 'Premium plastic card design (Ideal for printing)'}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <Input
                                label="BVN Number"
                                placeholder="Enter 11-digit BVN"
                                maxLength={11}
                                value={formData.bvn}
                                onChange={(e) => updateField('bvn', e.target.value.replace(/\D/g, ''))}
                                required
                                disabled={currentTab.active === false}
                                className="text-lg tracking-wider text-center font-semibold"
                            />
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <p className="text-sm text-blue-800">
                                    <strong>Note:</strong> Your BVN will be verified instantly with NIMC. Ensure the number is correct before proceeding.
                                </p>
                            </div>
                        </div>
                    ) : null}

                    {/* ==================== CAC TAB ==================== */}
                    {activeTab === 'cac' ? (
                        <div className="space-y-6">
                            {/* Certificate Type */}
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">Certificate Type</label>
                                <select
                                    className="w-full rounded-xl border border-gray-300 px-4 py-3 min-h-[44px] focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none bg-white"
                                    value={formData.businessType}
                                    onChange={(e) => updateField('businessType', e.target.value)}
                                    required
                                >
                                    {BUSINESS_TYPES.map(bt => (
                                        <option key={bt.value} value={bt.value} disabled={bt.value === ''}>
                                            {bt.label}{bt.value && cacPricing ? ` (₦${(bt.value === 'limited' ? cacPricing.charge2 : cacPricing.charge1)?.toLocaleString()})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Business Names */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Business Name 1 (Proposed)"
                                    placeholder="Enter primary business name"
                                    value={formData.businessName}
                                    onChange={(e) => updateField('businessName', e.target.value)}
                                    required
                                />
                                <Input
                                    label="Business Name 2 (Alternative)"
                                    placeholder="Enter alternative name"
                                    value={formData.altBusinessName}
                                    onChange={(e) => updateField('altBusinessName', e.target.value)}
                                    required
                                />
                            </div>

                            {/* Addresses */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Company Address"
                                    placeholder="Enter company address"
                                    value={formData.companyAddress}
                                    onChange={(e) => updateField('companyAddress', e.target.value)}
                                    required
                                />
                                <Input
                                    label="Residential Address"
                                    placeholder="Enter residential address"
                                    value={formData.residentialAddress}
                                    onChange={(e) => updateField('residentialAddress', e.target.value)}
                                    required
                                />
                            </div>

                            {/* Nature of Business + Share Capital */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Nature of Business"
                                    placeholder="e.g. General Merchandise"
                                    value={formData.natureOfBusiness}
                                    onChange={(e) => updateField('natureOfBusiness', e.target.value)}
                                    required
                                />
                                <Input
                                    label="Share Capital (Optional)"
                                    placeholder="e.g. 1,000,000"
                                    value={formData.shareCapital}
                                    onChange={(e) => updateField('shareCapital', e.target.value)}
                                />
                            </div>

                            {/* Contact Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Email Address"
                                    type="email"
                                    placeholder="example@email.com"
                                    value={formData.email}
                                    onChange={(e) => updateField('email', e.target.value)}
                                    required
                                />
                                <Input
                                    label="Phone Number"
                                    placeholder="08012345678"
                                    value={formData.phone}
                                    onChange={(e) => updateField('phone', e.target.value.replace(/[^0-9+]/g, ''))}
                                    required
                                    maxLength={15}
                                />
                            </div>

                            {/* File Uploads */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FileUploadField
                                    label="ID Card of Director(s)"
                                    id="cac-director-id"
                                    file={directorIdCard}
                                    onChange={(e) => setDirectorIdCard(e.target.files?.[0] || null)}
                                />
                                <FileUploadField
                                    label="Passport Photograph"
                                    id="cac-passport"
                                    file={passportPhoto}
                                    onChange={(e) => setPassportPhoto(e.target.files?.[0] || null)}
                                />
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <p className="text-sm text-amber-800">
                                    <strong>Note:</strong> Provide two proposed business names — CAC may request
                                    alternatives if your first choice is unavailable. Our agents will contact you
                                    at your email/phone for additional documents if needed.
                                </p>
                            </div>
                        </div>
                    ) : null}

                    {/* Submit Button */}
                    <div className="pt-4">
                        <Button
                            type="submit"
                            className="w-full py-4 text-lg font-bold bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg shadow-primary/25"
                            loading={loading}
                            disabled={
                                (activeTab === 'bvn' && currentTab.active === false) ||
                                (activeTab === 'cac' && cacPricing?.active === false)
                            }
                        >
                            {activeTab === 'bvn' ? 'Verify BVN' : activeTab === 'nin' ? 'Verify NIN' : 'Submit CAC Registration'}
                        </Button>
                    </div>
                </form>
            </div>

            {/* ==================== CAC Submission History ==================== */}
            {activeTab === 'cac' ? (
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-6 md:p-8 border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Clock size={20} className="text-primary" />
                        Your Submitted Businesses
                    </h3>

                    {loadingHistory ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin text-primary" size={28} />
                        </div>
                    ) : cacHistory.length === 0 ? (
                        <div className="text-center py-8">
                            <Briefcase size={40} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500">No submitted businesses found.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {cacHistory.map((reg) => {
                                const certLabel = reg.businessType === 'limited'
                                    ? 'Limited Liability Registration'
                                    : reg.businessType === 'biz'
                                        ? 'Business Name Registration'
                                        : reg.businessType === 'ngo'
                                            ? 'NGO / Incorporated Trustees'
                                            : 'Enterprise Registration';
                                const statusInfo = STATUS_MAP[reg.status] || STATUS_MAP[0];

                                return (
                                    <div
                                        key={reg.id}
                                        className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="p-2.5 bg-green-50 rounded-lg shrink-0">
                                            <Briefcase size={20} className="text-green-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-gray-400 font-medium">{certLabel}</p>
                                            <p className="font-semibold text-gray-900 truncate">
                                                {reg.businessName}
                                                {reg.altBusinessName ? `, ${reg.altBusinessName}` : ''}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(reg.createdAt).toLocaleDateString('en-NG', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </p>
                                            {reg.adminNotes ? (
                                                <p className="text-xs text-red-600 mt-1 font-medium">
                                                    Note: {reg.adminNotes}
                                                </p>
                                            ) : null}
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${statusInfo.color}`}>
                                            {statusInfo.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : null}

            {/* Info Card */}
            <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                <h3 className="text-primary font-bold mb-2 flex items-center space-x-2">
                    <AlertCircle size={18} />
                    <span>Information</span>
                </h3>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 opacity-80">
                    {activeTab === 'bvn' ? (
                        <>
                            <li>BVN verification is instant - your slip will be generated immediately.</li>
                            <li>Ensure your BVN number is correct before submitting.</li>
                            <li>Your slip will include your photo and all registered BVN details.</li>
                            <li>Service fees are non-refundable for successful verifications.</li>
                        </>
                    ) : activeTab === 'cac' ? (
                        <>
                            <li>CAC registration is processed within 5-14 working days.</li>
                            <li>Our agents will contact you via email/phone for additional documents if needed.</li>
                            <li>Business Name registration is faster than Limited Liability.</li>
                            <li>Provide two proposed names — CAC may reject a name if it's already taken.</li>
                            <li>Service fees are non-refundable once processing has started.</li>
                        </>
                    ) : (
                        <>
                            <li>NIN verification is instant - your slip will be generated immediately.</li>
                            <li>Ensure your NIN number is correct before submitting.</li>
                            <li>Ensure your transaction PIN is correct before submitting.</li>
                            <li>Service fees are non-refundable once processing has started.</li>
                        </>
                    )}
                </ul>
            </div>

            {/* ==================== PIN Modal ==================== */}
            <AnimatePresence>
                {showPinModal ? (
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
                                        onChange={(e) => updateField('pin', e.target.value.replace(/\D/g, ''))}
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
                ) : null}
            </AnimatePresence>

            {/* ==================== Slip Preview Modal ==================== */}
            {showPreviewModal && slipPreview ? (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
                    >
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">{activeTab === 'nin' ? 'NIN' : 'BVN'} Slip Preview</h3>
                            <button onClick={() => setShowPreviewModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <iframe
                                src={slipPreview.pdfUrl}
                                className="w-full h-[600px] border border-gray-200 rounded-lg"
                                title={`${activeTab === 'nin' ? 'NIN' : 'BVN'} Slip Preview`}
                            />
                            <div className="mt-4 flex justify-end space-x-3">
                                <Button variant="outline" onClick={() => setShowPreviewModal(false)}>Close</Button>
                                <Button icon={Download} onClick={handleDownloadSlip}>Download PDF</Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            ) : null}
        </div>
    );
}
