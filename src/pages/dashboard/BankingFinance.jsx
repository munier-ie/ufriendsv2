import { Landmark, CreditCard, Banknote, Loader2, CheckCircle, Clock } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import axios from 'axios';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

// ─── Shared Components ────────────────────────────────────────────────────────

const PinModal = ({ isOpen, onClose, onSubmit, amount, serviceName, submitting }) => {
    const [pin, setPin] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative"
            >
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Confirm Payment</h3>
                    <p className="text-gray-500 text-sm">
                        You are about to pay <span className="font-bold text-gray-900">₦{(amount || 0).toLocaleString()}</span> for {serviceName}.
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Enter Transaction PIN</label>
                        <input
                            type="password"
                            maxLength="4"
                            className="w-full text-center tracking-[1em] font-mono text-2xl rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-gray-50 transition-all"
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="••••"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button 
                            variant="outline" 
                            className="flex-1 py-3 bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100" 
                            onClick={() => { onClose(); setPin(''); }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                            onClick={() => { onSubmit(pin); setPin(''); }}
                            disabled={pin.length !== 4 || submitting}
                        >
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm'}
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// ─── POS Request Form ──────────────────────────────────────────────────────────
function PosRequestForm({ data, onChange, uploading, onUpload }) {
    const isMoniepoint = data.provider === 'moniepoint';
    const hasAccount = data.hasAccount === 'yes';
    const tier = data.tier;
    const noAccountFlow = !isMoniepoint || (isMoniepoint && data.hasAccount === 'no');

    const businessCategories = ['Retail', 'Food & Beverage', 'Services', 'Health & Beauty', 'Other'];
    const posTypes = [
        { id: 'android', label: 'Android POS', img: '/assets/nin/pos1.jpg' },
        { id: 'traditional', label: 'Traditional POS', img: '/assets/nin/pos2.jpg' },
        { id: 'mini', label: 'Mini POS', img: '/assets/nin/pos3.jpg' }
    ];

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">POS Provider</label>
                <select className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white transition-all" value={data.provider || ''} onChange={e => onChange('provider', e.target.value)} required>
                    <option value="" disabled>Select Provider</option>
                    <option value="moniepoint">Moniepoint</option>
                    <option value="opay">Opay</option>
                    <option value="other">Other</option>
                </select>
            </div>

            {data.provider === 'moniepoint' && (
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Do you have a Moniepoint account?</label>
                    <select className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white transition-all" value={data.hasAccount || ''} onChange={e => onChange('hasAccount', e.target.value)} required>
                        <option value="" disabled>Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                </div>
            )}

            {isMoniepoint && hasAccount && (
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Which Tier is your account?</label>
                    <select className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white transition-all" value={data.tier || ''} onChange={e => onChange('tier', e.target.value)} required>
                        <option value="" disabled>Select Tier</option>
                        <option value="1">Tier 1</option>
                        <option value="2">Tier 2</option>
                        <option value="3">Tier 3</option>
                    </select>
                </div>
            )}

            {/* Dynamic Fields based on Flow */}
            {(noAccountFlow || (isMoniepoint && hasAccount && ['1', '2', '3'].includes(tier))) && (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(noAccountFlow || tier === '1' || tier === '2' || tier === '3') && (
                            <>
                                <Input label="BVN or NIN used for account" placeholder="Enter BVN/NIN" value={data.bvnNin || ''} onChange={e => onChange('bvnNin', e.target.value.replace(/\D/g, ''))} maxLength={11} required />
                            </>
                        )}

                        {(noAccountFlow || tier === '1') && (
                            <>
                                <Input label="Phone Number" type="tel" placeholder="080..." value={data.phone || ''} onChange={e => onChange('phone', e.target.value.replace(/\D/g, ''))} required />
                                <Input label="Email Address" type="email" placeholder="example@mail.com" value={data.email || ''} onChange={e => onChange('email', e.target.value)} required />
                            </>
                        )}
                    </div>

                    {(noAccountFlow || tier === '1') && (
                        <div className="space-y-3 pt-2">
                            <p className="text-sm font-semibold text-gray-600">Next of Kin Details</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Name" placeholder="Next of Kin Name" value={data.nokName || ''} onChange={e => onChange('nokName', e.target.value)} required />
                                <Input label="Phone" type="tel" placeholder="Next of Kin Phone" value={data.nokPhone || ''} onChange={e => onChange('nokPhone', e.target.value.replace(/\D/g, ''))} required />
                                <Input label="Email" type="email" placeholder="Next of Kin Email" value={data.nokEmail || ''} onChange={e => onChange('nokEmail', e.target.value)} required />
                                <Input label="Address" placeholder="Next of Kin Address" value={data.nokAddress || ''} onChange={e => onChange('nokAddress', e.target.value)} required />
                            </div>
                        </div>
                    )}

                    {(noAccountFlow || tier === '1' || tier === '2') && (
                        <div className="space-y-3 pt-2">
                            <Input label="Residential Address" placeholder="Your Address" value={data.address || ''} onChange={e => onChange('address', e.target.value)} required />
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Proof of Address</label>
                                <div className="flex items-center gap-3">
                                    <input type="file" id="proofOfAddress" className="hidden" accept="image/*,.pdf" onChange={e => onUpload(e, 'proofOfAddressUrl')} />
                                    <label htmlFor="proofOfAddress" className={`flex-1 flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${data.proofOfAddressUrl ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-primary/50'}`}>
                                        {uploading ? <Loader2 className="animate-spin text-primary" size={20} /> : data.proofOfAddressUrl ? <span className="text-green-600 font-medium">Uploaded</span> : <span className="text-gray-500 text-sm">Upload Electricity Bill / Tenancy Agreement</span>}
                                    </label>
                                </div>
                                <input type="hidden" value={data.proofOfAddressUrl || ''} required />
                            </div>
                        </div>
                    )}

                    {noAccountFlow && (
                        <div className="space-y-3 pt-2">
                            <Input label="Business Address" placeholder="Your Business Address" value={data.businessAddress || ''} onChange={e => onChange('businessAddress', e.target.value)} required />
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">Business Category</label>
                                <select className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white transition-all" value={data.businessCategory || ''} onChange={e => onChange('businessCategory', e.target.value)} required>
                                    <option value="" disabled>Select Category</option>
                                    {businessCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Your Picture</label>
                                <div className="flex items-center gap-3">
                                    <input type="file" id="userPicture" className="hidden" accept="image/*" onChange={e => onUpload(e, 'userPictureUrl')} />
                                    <label htmlFor="userPicture" className={`flex-1 flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${data.userPictureUrl ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-primary/50'}`}>
                                        {uploading ? <Loader2 className="animate-spin text-primary" size={20} /> : data.userPictureUrl ? <span className="text-green-600 font-medium">Uploaded</span> : <span className="text-gray-500 text-sm">Upload Picture</span>}
                                    </label>
                                </div>
                                <input type="hidden" value={data.userPictureUrl || ''} required />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {(data.provider) && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">Select POS Type</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {posTypes.map(pos => (
                            <div key={pos.id} onClick={() => onChange('posType', pos.id)} className={`cursor-pointer border-2 rounded-xl overflow-hidden transition-all ${data.posType === pos.id ? 'border-primary ring-2 ring-primary/20' : 'border-gray-100 hover:border-primary/50'}`}>
                                <div className="h-32 bg-gray-50 flex items-center justify-center overflow-hidden">
                                    <img src={pos.img} alt={pos.label} className="h-full w-full object-cover opacity-80" onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=POS'; }} />
                                </div>
                                <div className="p-3 text-center bg-white">
                                    <p className={`font-semibold text-sm ${data.posType === pos.id ? 'text-primary' : 'text-gray-700'}`}>{pos.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <input type="hidden" value={data.posType || ''} required />

                    <div className="space-y-1 pt-4">
                        <label className="block text-sm font-medium text-gray-700">Payment Option</label>
                        <select className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white transition-all" value={data.subType || ''} onChange={e => onChange('subType', e.target.value)} required>
                            <option value="" disabled>Select Option</option>
                            <option value="PAY_MONEY">Pay POS Fee</option>
                            <option value="FEE_WAIVER">Fee Waiver (0 NGN)</option>
                        </select>
                    </div>

                    {data.subType === 'FEE_WAIVER' && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Proof of Business (For Waiver)</label>
                            <div className="flex items-center gap-3">
                                <input type="file" id="proofOfBusiness" className="hidden" accept="image/*,.pdf" onChange={e => onUpload(e, 'proofOfBusinessUrl')} />
                                <label htmlFor="proofOfBusiness" className={`flex-1 flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${data.proofOfBusinessUrl ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-primary/50'}`}>
                                    {uploading ? <Loader2 className="animate-spin text-primary" size={20} /> : data.proofOfBusinessUrl ? <span className="text-green-600 font-medium">Uploaded</span> : <span className="text-gray-500 text-sm">Upload Shop Photo / Business Cert</span>}
                                </label>
                            </div>
                            <input type="hidden" value={data.proofOfBusinessUrl || ''} required />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Loan Request Form ─────────────────────────────────────────────────────────
function LoanRequestForm({ data, onChange }) {
    return (
        <div className="space-y-4">
            <Input label="Account Number" inputMode="numeric" placeholder="Enter bank account number" value={data.accountNumber || ''} onChange={e => onChange('accountNumber', e.target.value.replace(/\D/g, ''))} maxLength={10} required />
            <Input label="Contact Details (Phone / Email)" placeholder="Enter phone or email" value={data.contactDetails || ''} onChange={e => onChange('contactDetails', e.target.value)} required />
            <Input label="Amount Needed (₦)" inputMode="numeric" placeholder="Enter amount" value={data.amountNeeded || ''} onChange={e => onChange('amountNeeded', e.target.value.replace(/\D/g, ''))} required />

            <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Loan Repayment Schedule</label>
                <select className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white transition-all" value={data.repaymentSchedule || ''} onChange={e => onChange('repaymentSchedule', e.target.value)} required>
                    <option value="" disabled>Select</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                </select>
            </div>

            <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Duration</label>
                <select className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white transition-all" value={data.duration || ''} onChange={e => onChange('duration', e.target.value)} required>
                    <option value="" disabled>Select Duration</option>
                    <option value="12weeks">12 Weeks</option>
                    <option value="24weeks">24 Weeks</option>
                    <option value="36weeks">36 Weeks</option>
                    <option value="52weeks">52 Weeks</option>
                </select>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BankingFinance() {
    const { globalSettings } = useOutletContext();
    const [searchParams] = useSearchParams();
    const initialTab = searchParams.get('tab') || 'POS_REQUEST';

    const [activeTab, setActiveTab] = useState(initialTab);
    const [formData, setFormData] = useState({});
    const [prices, setPrices] = useState({});
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);

    // History Modal
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    // PIN Modal
    const [showPinModal, setShowPinModal] = useState(false);

    useEffect(() => {
        fetchPrices();
        fetchHistory();
    }, []);

    const fetchPrices = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/manual-services/prices', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPrices(res.data);
        } catch (error) {
            console.error('Failed to load prices');
        }
    };

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/manual-services/history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const filtered = res.data.filter(r => r.serviceType === 'POS_REQUEST' || r.serviceType === 'LOAN_REQUEST');
            setHistory(filtered);
        } catch (error) {
            console.error('Failed to load history');
        }
    };

    const updateFormData = useCallback((key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleFileUpload = async (e, fieldName) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB');
            return;
        }

        try {
            setUploading(true);
            const token = localStorage.getItem('token');
            const reader = new FormData();
            reader.append('file', file);

            const res = await axios.post('/api/manual-services/upload-id', reader, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            updateFormData(fieldName, res.data.fileUrl);
            toast.success('File uploaded successfully');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const getPrice = () => {
        if (activeTab === 'LOAN_REQUEST') {
            return prices['LOAN_REQUEST'] || 0;
        }
        if (activeTab === 'POS_REQUEST') {
            if (formData.subType === 'FEE_WAIVER') return 0;
            return prices['POS_REQUEST'] || 0;
        }
        return 0;
    };

    const handleSubmitClick = (e) => {
        e.preventDefault();

        // Validation for POS Request
        if (activeTab === 'POS_REQUEST') {
            if (!formData.provider) return toast.error('Select POS provider');
            if (!formData.posType) return toast.error('Select POS type');
            if (!formData.subType) return toast.error('Select payment option');
            if (formData.subType === 'FEE_WAIVER' && !formData.proofOfBusinessUrl) {
                return toast.error('Please upload proof of business for fee waiver');
            }
        }

        // Validation for Loan Request
        if (activeTab === 'LOAN_REQUEST') {
            if (!formData.accountNumber) return toast.error('Account number is required');
            if (!formData.amountNeeded) return toast.error('Amount is required');
        }

        const price = getPrice();
        if (price > 0) {
            setShowPinModal(true);
        } else {
            // Submit directly if price is 0
            submitRequest('0000');
        }
    };

    const submitRequest = async (pin) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const res = await axios.post('/api/manual-services/submit', {
                serviceType: activeTab,
                subType: formData.subType || 'STANDARD',
                formData: formData,
                pin: pin,
                price: getPrice()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(res.data.message || 'Request submitted successfully');
            setFormData({});
            fetchHistory();
            if (showPinModal) setShowPinModal(false);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to submit request');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'POS_REQUEST', label: 'POS Request', icon: CreditCard },
        { id: 'LOAN_REQUEST', label: 'Loan Request', icon: Banknote }
    ];

    const getStatusMap = (status) => {
        switch (status) {
            case 0:
            case '0': return { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' };
            case 1:
            case '1': return { label: 'Approved', color: 'bg-green-100  text-green-700' };
            case 2:
            case '2': return { label: 'Rejected', color: 'bg-red-100    text-red-700' };
            case 3:
            case '3': return { label: 'In Progress', color: 'bg-blue-100 text-blue-700' };
            default: return { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' };
        }
    };

    const getServiceDisplay = (service) => {
        switch (service) {
            case 'POS_REQUEST': return 'POS Request';
            case 'LOAN_REQUEST': return 'Loan Request';
            default: return service;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            <div className="flex items-center space-x-3 mb-8">
                <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-xl shadow-lg border border-white/20">
                    <Landmark size={28} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Banking & Finance</h1>
                    <p className="text-gray-500 text-sm mt-1">Request POS terminals or apply for a loan</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 overflow-x-auto pb-2 border-b border-gray-200 no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setFormData({}); }}
                        className={`flex items-center space-x-2 px-6 py-3 border-b-2 whitespace-nowrap transition-all ${
                            activeTab === tab.id
                                ? 'border-primary text-primary bg-primary/5'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <tab.icon size={18} />
                        <span className="font-medium">{tab.label}</span>
                    </button>
                ))}

                <button
                    onClick={() => setShowHistory(true)}
                    className="flex items-center space-x-2 px-6 py-3 border-b-2 whitespace-nowrap transition-all border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 ml-auto"
                >
                    <Clock size={18} />
                    <span className="font-medium">History</span>
                </button>
            </div>

            {/* Form Area */}
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-6 md:p-8 border border-gray-100">
                <form onSubmit={handleSubmitClick}>
                    <AnimatePresence mode="wait">
                        {activeTab === 'POS_REQUEST' ? (
                            <motion.div 
                                key="pos-form"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <PosRequestForm data={formData} onChange={updateFormData} uploading={uploading} onUpload={handleFileUpload} />
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="loan-form"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <LoanRequestForm data={formData} onChange={updateFormData} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                        <div className="text-gray-500 text-sm">
                            Service Fee:{' '}
                            <span className="font-bold text-gray-900 text-lg">
                                ₦{getPrice().toLocaleString()}
                            </span>
                        </div>
                        <Button
                            type="submit"
                            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 shadow-lg shadow-primary/20"
                            disabled={loading || uploading}
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Submit Request'}
                        </Button>
                    </div>
                </form>
            </div>

            {/* History Modal */}
            <AnimatePresence>
                {showHistory && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col"
                        >
                            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Request History</h3>
                                    <p className="text-sm text-gray-500">Your recent POS and Loan requests</p>
                                </div>
                                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4">
                                {history.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No history found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {history.map(req => {
                                            const statusInfo = getStatusMap(req.status);
                                            return (
                                                <div key={req.id} className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <p className="font-semibold text-gray-900 text-sm">{getServiceDisplay(req.serviceType)}</p>
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusInfo.color}`}>
                                                            {statusInfo.label}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 space-y-1">
                                                        <p>Date: {new Date(req.createdAt).toLocaleDateString()}</p>
                                                        <p>Fee: ₦{req.price.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <PinModal
                isOpen={showPinModal}
                onClose={() => setShowPinModal(false)}
                onSubmit={submitRequest}
                amount={getPrice()}
                serviceName={activeTab === 'POS_REQUEST' ? 'POS Request' : 'Loan Request'}
                submitting={loading}
            />
        </div>
    );
}
