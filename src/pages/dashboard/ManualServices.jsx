import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import FileEdit from 'lucide-react/dist/esm/icons/file-edit';
import Search from 'lucide-react/dist/esm/icons/search';
import Send from 'lucide-react/dist/esm/icons/send';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Download from 'lucide-react/dist/esm/icons/download';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Hash from 'lucide-react/dist/esm/icons/hash';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

// ─── Constants ────────────────────────────────────────────────────────────────

const BVN_MOD_OPTIONS = [
    { value: '', label: 'Select modification type' },
    { value: 'change_name', label: 'Change of Name' },
    { value: 'arrange_name', label: 'Arrangement of Name' },
    { value: 'change_dob', label: 'Correction of Date of Birth' },
    { value: 'change_phone', label: 'Change of Phone Number' },
    { value: 'name_dob', label: 'Change of Name & Date of Birth' },
    { value: 'dob_phone', label: 'Date of Birth & Phone Number' },
    { value: 'name_phone', label: 'Name & Phone Number' },
    { value: 'name_dob_phone', label: 'Name, Date of Birth & Phone Number' },
];

const NIN_MOD_OPTIONS = [
    { value: '', label: 'Select modification type' },
    { value: 'change_name', label: 'Change of Name' },
    { value: 'arrange_name', label: 'Arrangement of Name' },
    { value: 'change_dob', label: 'Correction of Date of Birth' },
    { value: 'change_phone', label: 'Change of Phone Number' },
];

const NIN_VAL_OPTIONS = [
    { value: '', label: 'Select validation type' },
    { value: 'no_record', label: 'No Record Found' },
    { value: 'sim', label: 'SIM Validation' },
    { value: 'bank', label: 'Bank Validation' },
    { value: 'vnin', label: 'VNIN Validation' },
];

const ID_TYPE_OPTIONS = [
    { value: '', label: 'Select Identification Type' },
    { value: 'nin', label: 'NIN (National Identity Number)' },
    { value: 'voters_card', label: "Voter's Card" },
    { value: 'driving_license', label: "Driving License" },
    { value: 'international_passport', label: "International Passport" },
];

const GEO_ZONES = ['North Central', 'North East', 'North West', 'South East', 'South South', 'South West'];

const STATUS_MAP = {
    0: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
    1: { label: 'Approved', color: 'bg-green-100  text-green-700' },
    2: { label: 'Rejected', color: 'bg-red-100    text-red-700' },
};

const SERVICE_DISPLAY = {
    BVN_MODIFICATION: 'BVN Modification',
    BVN_RETRIEVAL: 'BVN Retrieval',
    VNIN_NIBSS: 'VNIN → NIBSS',
    BVN_ANDROID: 'BVN Android License',
    NIN_MODIFICATION: 'NIN Modification',
    NIN_VALIDATION: 'NIN Validation',
};

// ─── Sub-form renderers ───────────────────────────────────────────────────────

function NameBlock({ prefix, label, data, onChange }) {
    return (
        <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{label}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['Firstname', 'Middlename', 'Lastname'].map(f => {
                    const key = `${prefix}_${f.toLowerCase()}`;
                    return (
                        <Input
                            key={key}
                            label={f}
                            placeholder={`Enter ${f.toLowerCase()}`}
                            value={data[key] || ''}
                            onChange={e => onChange(key, e.target.value)}
                            required
                        />
                    );
                })}
            </div>
        </div>
    );
}

function DobBlock({ prefix, label, data, onChange }) {
    const key = `${prefix}_dob`;
    return (
        <div className="space-y-1">
            <Input
                label={label}
                placeholder="DD-MM-YYYY"
                value={data[key] || ''}
                onChange={e => {
                    let v = e.target.value.replace(/[^0-9]/g, '');
                    if (v.length > 2) v = v.slice(0, 2) + '-' + v.slice(2);
                    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
                    if (v.length > 10) v = v.slice(0, 10);
                    onChange(key, v);
                }}
                maxLength={10}
                required
            />
        </div>
    );
}

function PhoneBlock({ prefix, label, data, onChange }) {
    const key = `${prefix}_phone`;
    return (
        <Input
            label={label}
            placeholder="08012345678"
            value={data[key] || ''}
            onChange={e => onChange(key, e.target.value.replace(/[^0-9+]/g, ''))}
            maxLength={15}
            required
        />
    );
}

// ─── Dynamic modification form (shared by BVN & NIN mod) ─────────────────────
function ModificationForm({ subType, data, onChange, activeSub, uploading, onUpload }) {
    const showName = ['change_name', 'arrange_name', 'name_dob', 'name_phone', 'name_dob_phone'].includes(subType);
    const showDob = ['change_dob', 'name_dob', 'dob_phone', 'name_dob_phone'].includes(subType);
    const showPhone = ['change_phone', 'dob_phone', 'name_phone', 'name_dob_phone'].includes(subType);

    if (!subType) return null;

    return (
        <div className="space-y-6">
            {/* Specific identity fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                {activeSub === 'BVN_MODIFICATION' && (
                    <div className="col-span-2 md:col-span-1">
                        <Input
                            label="BVN"
                            placeholder="Enter 11-digit BVN"
                            value={data.bvn || ''}
                            onChange={e => onChange('bvn', e.target.value.replace(/\D/g, ''))}
                            maxLength={11}
                            required
                        />
                    </div>
                )}
                {activeSub === 'NIN_MODIFICATION' && (
                    <div className="col-span-2">
                        <Input
                            label="NIN"
                            placeholder="Enter 11-digit NIN"
                            value={data.nin || ''}
                            onChange={e => onChange('nin', e.target.value.replace(/\D/g, ''))}
                            maxLength={11}
                            required
                        />
                    </div>
                )}

                {activeSub === 'BVN_MODIFICATION' && (
                    <>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Method of Identification</label>
                            <select
                                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white transition-all"
                                value={data.idType || ''}
                                onChange={e => onChange('idType', e.target.value)}
                                required
                            >
                                {ID_TYPE_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value} disabled={!o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-span-2">
                            {data.idType === 'nin' ? (
                                <Input
                                    label="Confirm NIN"
                                    placeholder="Enter 11-digit NIN"
                                    value={data.nin || ''}
                                    onChange={e => onChange('nin', e.target.value.replace(/\D/g, ''))}
                                    maxLength={11}
                                    required
                                />
                            ) : data.idType && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Upload {ID_TYPE_OPTIONS.find(o => o.value === data.idType)?.label}</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="file"
                                            id="id-upload"
                                            className="hidden"
                                            accept="image/*,.pdf"
                                            onChange={onUpload}
                                        />
                                        <label
                                            htmlFor="id-upload"
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${data.idFileUrl ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-primary/50'}`}
                                        >
                                            {uploading ? (
                                                <Loader2 className="animate-spin text-primary" size={24} />
                                            ) : data.idFileUrl ? (
                                                <div className="text-center">
                                                    <CheckCircle className="text-green-500 mx-auto mb-1" size={24} />
                                                    <p className="text-xs text-green-700 font-bold">Document Uploaded</p>
                                                </div>
                                            ) : (
                                                <div className="text-center text-gray-400">
                                                    <Smartphone size={24} className="mx-auto mb-1" />
                                                    <p className="text-xs">Click to upload clear image or PDF</p>
                                                </div>
                                            )}
                                        </label>
                                        {data.idFileUrl && (
                                            <a href={data.idFileUrl} target="_blank" rel="noreferrer" className="p-3 bg-white border border-gray-200 rounded-xl text-primary hover:bg-gray-50">
                                                <Eye size={20} />
                                            </a>
                                        )}
                                    </div>
                                    <input type="hidden" value={data.idFileUrl || ''} required />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {showName && (
                <>
                    <NameBlock prefix="old" label="Old Details" data={data} onChange={onChange} />
                    <NameBlock prefix="new" label="New Details" data={data} onChange={onChange} />
                </>
            )}
            {showDob && (
                <>
                    <DobBlock prefix="old" label="Old Date of Birth (DD-MM-YYYY)" data={data} onChange={onChange} />
                    <DobBlock prefix="new" label="New Date of Birth (DD-MM-YYYY)" data={data} onChange={onChange} />
                </>
            )}
            {showPhone && (
                <>
                    <PhoneBlock prefix="old" label="Old Phone Number" data={data} onChange={onChange} />
                    <PhoneBlock prefix="new" label="New Phone Number" data={data} onChange={onChange} />
                </>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ManualServices() {
    const [activeGroup, setActiveGroup] = useState('bvn');     // 'bvn' | 'nin'
    const [activeSub, setActiveSub] = useState('BVN_MODIFICATION');
    const [settings, setSettings] = useState(null);
    const [formData, setFormData] = useState({});
    const [message, setMessage] = useState({ type: '', text: '' });
    const [submitting, setSubmitting] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [pin, setPin] = useState('');
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [uploading, setUploading] = useState(false);

    // grouped tabs
    const bvnTabs = [
        { id: 'BVN_MODIFICATION', label: 'BVN Modification', icon: FileEdit },
        { id: 'BVN_RETRIEVAL', label: 'BVN Retrieval', icon: Search },
        { id: 'VNIN_NIBSS', label: 'VNIN → NIBSS', icon: Send },
        { id: 'BVN_ANDROID', label: 'BVN Android License', icon: Smartphone },
    ];
    const ninTabs = [
        { id: 'NIN_MODIFICATION', label: 'NIN Modification', icon: FileEdit },
        { id: 'NIN_VALIDATION', label: 'NIN Validation', icon: ShieldCheck },
    ];

    const activeTabs = activeGroup === 'bvn' ? bvnTabs : ninTabs;

    useEffect(() => {
        fetchSettings();
        fetchHistory();
    }, []);

    useEffect(() => {
        setFormData({});
        setMessage({ type: '', text: '' });
    }, [activeSub]);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/manual-services/pricing', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Combine settings and prices into one state object
            setSettings({
                ...res.data.settings,
                prices: res.data.prices
            });
        } catch (e) {
            console.error('Failed to fetch pricing', e);
        }
    };

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/manual-services/history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data.requests || []);
        } catch (e) {
            console.error('Failed to fetch history', e);
        } finally {
            setHistoryLoading(false);
        }
    };

    const update = useCallback((key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const reader = new FormData();
        reader.append('file', file);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/manual-services/upload-id', reader, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            update('idFileUrl', res.data.filePath);
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to upload document');
        } finally {
            setUploading(false);
        }
    };

    const currentPrice = () => {
        if (!settings || !Array.isArray(settings.prices)) return 0;

        const needsSubType = ['BVN_MODIFICATION', 'NIN_MODIFICATION', 'NIN_VALIDATION'].includes(activeSub);
        if (needsSubType && !formData.subType) return 0;

        const priceObj = settings.prices.find(p =>
            p.serviceType === activeSub &&
            (p.subType === (formData.subType || ''))
        );

        return priceObj ? priceObj.price : 0;
    };

    useEffect(() => {
        if (settings && Array.isArray(settings.prices)) {
            // force update of displayed price when subType changes
        }
    }, [formData.subType, activeSub, settings]);

    const isActive = () => {
        if (!settings) return true;
        const map = {
            BVN_MODIFICATION: settings.bvnModificationActive,
            BVN_RETRIEVAL: settings.bvnRetrievalActive,
            VNIN_NIBSS: settings.vninNibssActive,
            BVN_ANDROID: settings.bvnAndroidActive,
            NIN_MODIFICATION: settings.ninModificationActive,
            NIN_VALIDATION: settings.ninValidationActive,
        };
        return map[activeSub] ?? true;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Extra validation for uploads
        if (activeSub === 'BVN_MODIFICATION' && formData.idType && formData.idType !== 'nin' && !formData.idFileUrl) {
            setMessage({ type: 'error', text: 'Please upload the identification document' });
            return;
        }

        setPin('');
        setShowPinModal(true);
    };

    const handleFinalSubmit = async () => {
        if (pin.length !== 4) {
            setMessage({ type: 'error', text: 'Please enter a valid 4-digit PIN' });
            return;
        }
        setSubmitting(true);
        setMessage({ type: '', text: '' });
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/manual-services/submit', {
                serviceType: activeSub,
                subType: formData.subType || null,
                details: formData,
                pin
            }, { headers: { Authorization: `Bearer ${token}` } });

            const successMsg = res.data.bvn
                ? `BVN retrieved: ${res.data.bvn}`
                : res.data.message || 'Request submitted successfully.';

            setMessage({ type: 'success', text: successMsg });
            setShowPinModal(false);
            setFormData({});
            setPin('');
            fetchHistory();
        } catch (err) {
            const errMsg = err.response?.data?.error || 'Submission failed';
            setMessage({ type: 'error', text: errMsg });
            if (!errMsg.toLowerCase().includes('pin')) setShowPinModal(false);
        } finally {
            setSubmitting(false);
        }
    };

    const switchGroup = (g) => {
        setActiveGroup(g);
        setActiveSub(g === 'bvn' ? 'BVN_MODIFICATION' : 'NIN_MODIFICATION');
        setFormData({});
        setMessage({ type: '', text: '' });
    };

    // ─── Form panels ────────────────────────────────────────────────────────

    const renderForm = () => {
        switch (activeSub) {

            case 'BVN_MODIFICATION':
            case 'NIN_MODIFICATION': {
                const opts = activeSub === 'BVN_MODIFICATION' ? BVN_MOD_OPTIONS : NIN_MOD_OPTIONS;
                return (
                    <div className="space-y-5">
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Modification Type</label>
                            <select
                                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white transition-all"
                                value={formData.subType || ''}
                                onChange={e => update('subType', e.target.value)}
                                required
                            >
                                {opts.map(o => (
                                    <option key={o.value} value={o.value} disabled={!o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                        <ModificationForm
                            subType={formData.subType}
                            data={formData}
                            onChange={update}
                            activeSub={activeSub}
                            uploading={uploading}
                            onUpload={handleFileUpload}
                        />
                    </div>
                );
            }

            case 'BVN_RETRIEVAL':
                return (
                    <div className="space-y-4">
                        <Input
                            label="Phone Number"
                            placeholder="Enter registered phone number (e.g. 08012345678)"
                            value={formData.phoneNumber || ''}
                            onChange={e => update('phoneNumber', e.target.value.replace(/[^0-9+]/g, ''))}
                            maxLength={15}
                            required
                        />
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                            <strong>Note:</strong> We will attempt to retrieve your BVN using the provided phone number.
                            If automatic retrieval is unavailable, an admin will process the request manually.
                        </div>
                    </div>
                );

            case 'VNIN_NIBSS':
                return (
                    <div className="space-y-4">
                        <Input label="Ticket ID" placeholder="Enter ticket ID" value={formData.ticketId || ''} onChange={e => update('ticketId', e.target.value)} required />
                        <Input label="NIN" placeholder="Enter 11-digit NIN" value={formData.nin || ''} onChange={e => update('nin', e.target.value.replace(/\D/g, ''))} maxLength={11} required />
                        <Input label="BVN" placeholder="Enter 11-digit BVN" value={formData.bvn || ''} onChange={e => update('bvn', e.target.value.replace(/\D/g, ''))} maxLength={11} required />
                        <Input label="Full Name" placeholder="Enter full name" value={formData.fullName || ''} onChange={e => update('fullName', e.target.value)} required />
                    </div>
                );

            case 'BVN_ANDROID':
                return (
                    <div className="space-y-4">
                        {/* Kegow download banner */}
                        <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                            <Download size={20} className="text-primary shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-800">Download Kegow App</p>
                                <p className="text-xs text-gray-500">Get your Kegow account number from the app before filling the form.</p>
                            </div>
                            <a
                                href="https://app.kegow.com/referral/UD305716"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors shrink-0"
                            >
                                <ExternalLink size={14} />
                                Download
                            </a>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="BVN" placeholder="11-digit BVN" value={formData.bvn || ''} onChange={e => update('bvn', e.target.value.replace(/\D/g, ''))} maxLength={11} required />
                            <Input label="First Name" placeholder="First name" value={formData.firstname || ''} onChange={e => update('firstname', e.target.value)} required />
                            <Input label="Last Name" placeholder="Last name" value={formData.lastname || ''} onChange={e => update('lastname', e.target.value)} required />
                            <Input label="Kegow Account Number" placeholder="Kegow account no." value={formData.kegowAccount || ''} onChange={e => update('kegowAccount', e.target.value)} required />
                            <Input label="Account Name" placeholder="Account name" value={formData.accountName || ''} onChange={e => update('accountName', e.target.value)} required />
                            <Input label="Agent Location" placeholder="Agent location" value={formData.agentLocation || ''} onChange={e => update('agentLocation', e.target.value)} required />
                            <Input label="State" placeholder="State of residence" value={formData.state || ''} onChange={e => update('state', e.target.value)} required />
                            <Input label="LGA" placeholder="Local Govt. Area" value={formData.lga || ''} onChange={e => update('lga', e.target.value)} required />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Geo Political Zone</label>
                            <select
                                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white transition-all"
                                value={formData.geoZone || ''}
                                onChange={e => update('geoZone', e.target.value)}
                                required
                            >
                                <option value="" disabled>Select geo political zone</option>
                                {GEO_ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Address" placeholder="Street address" value={formData.address || ''} onChange={e => update('address', e.target.value)} required />
                            <Input label="House Number" placeholder="House number" value={formData.houseNumber || ''} onChange={e => update('houseNumber', e.target.value)} required />
                        </div>
                    </div>
                );

            case 'NIN_VALIDATION':
                return (
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Validation Type</label>
                            <select
                                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white transition-all"
                                value={formData.subType || ''}
                                onChange={e => update('subType', e.target.value)}
                                required
                            >
                                {NIN_VAL_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value} disabled={!o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                        {formData.subType && (
                            <Input
                                label="NIN"
                                placeholder="Enter 11-digit NIN"
                                value={formData.nin || ''}
                                onChange={e => update('nin', e.target.value.replace(/\D/g, ''))}
                                maxLength={11}
                                required
                            />
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manual Services</h1>
                    <p className="text-sm text-gray-500">BVN &amp; NIN administrative services processed by our agents</p>
                </div>
                <button
                    onClick={() => { setShowHistory(v => !v); if (!showHistory) fetchHistory(); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 text-primary font-semibold text-sm rounded-xl hover:bg-primary/20 transition-colors"
                >
                    <Clock size={16} />
                    {showHistory ? 'Hide History' : 'View History'}
                </button>
            </div>

            {/* Group Toggle */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
                {[{ id: 'bvn', label: 'BVN Services' }, { id: 'nin', label: 'NIN Services' }].map(g => (
                    <button
                        key={g.id}
                        onClick={() => switchGroup(g.id)}
                        className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeGroup === g.id
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {g.label}
                    </button>
                ))}
            </div>

            {/* Sub-tabs */}
            <div className="flex space-x-1 overflow-x-auto pb-2 no-scrollbar border-b border-gray-200">
                {activeTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSub(tab.id)}
                        className={`flex items-center gap-2 px-5 py-3 border-b-2 whitespace-nowrap transition-all text-sm font-medium ${activeSub === tab.id
                            ? 'border-primary text-primary bg-primary/5'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
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
                        className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success'
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : 'bg-red-50 text-red-700 border border-red-100'
                            }`}
                    >
                        {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <span className="font-medium">{message.text}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Form Card */}
            {!isActive() ? (
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100 text-center">
                    <AlertCircle size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">This service is currently unavailable.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-6 md:p-8 border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{SERVICE_DISPLAY[activeSub]}</h2>
                            <p className="text-gray-500 text-sm">Fill in the details below accurately</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400 font-medium">Service Fee</p>
                            <p className="text-2xl font-black text-primary">₦{currentPrice().toLocaleString()}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {renderForm()}
                        <div className="pt-4">
                            <Button
                                type="submit"
                                className="w-full py-4 text-lg font-bold bg-gradient-to-r from-primary to-secondary"
                                loading={submitting}
                            >
                                Submit Request
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* History Section */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-6 md:p-8 border border-gray-100"
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                            <Clock size={20} className="text-primary" /> Your Submitted Requests
                        </h3>

                        {historyLoading ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="animate-spin text-primary" size={28} />
                            </div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">
                                <Clock size={36} className="mx-auto mb-3 text-gray-300" />
                                <p>No requests submitted yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map(req => {
                                    const statusInfo = STATUS_MAP[req.status] || STATUS_MAP[0];
                                    return (
                                        <div key={req.id} className="flex flex-wrap items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-400 font-medium">{req.transRef}</p>
                                                <p className="font-semibold text-gray-900 text-sm">{SERVICE_DISPLAY[req.serviceType] || req.serviceType}</p>
                                                {req.subType && (
                                                    <p className="text-xs text-gray-500">{req.subType.replace(/_/g, ' ')}</p>
                                                )}
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {new Date(req.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <p className="font-bold text-gray-800 text-sm">₦{req.amount?.toLocaleString()}</p>
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>
                                                    {statusInfo.label}
                                                </span>
                                                {req.status === 1 && req.proofUrl && (
                                                    <a
                                                        href={req.proofUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors"
                                                    >
                                                        <Eye size={12} />
                                                        View Proof
                                                    </a>
                                                )}
                                                {req.adminNote && (
                                                    <span className="text-xs text-gray-500 max-w-[160px] truncate" title={req.adminNote}>
                                                        {req.adminNote}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Info box */}
            <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10">
                <h3 className="text-primary font-bold mb-2 flex items-center gap-2 text-sm">
                    <AlertCircle size={16} /> How It Works
                </h3>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 opacity-90">
                    <li>Submit your request and pay the service fee from your wallet.</li>
                    <li>Our agents will process your request and upload proof of completion.</li>
                    <li>You will see the proof in your request history once completed.</li>
                    <li>Fees are non-refundable for approved requests.</li>
                </ul>
            </div>

            {/* PIN Modal */}
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
                                    <p className="text-sm text-gray-500 mt-1">
                                        Confirm your 4-digit PIN to submit this request (₦{currentPrice().toLocaleString()}).
                                    </p>
                                </div>
                                <Input
                                    type="password"
                                    maxLength={4}
                                    placeholder="••••"
                                    value={pin}
                                    onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                                    className="text-2xl tracking-widest text-center font-bold"
                                    autoFocus
                                />
                                {message.type === 'error' && (
                                    <p className="text-red-600 text-sm font-medium">{message.text}</p>
                                )}
                                <div className="flex gap-3 pt-1">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => { setShowPinModal(false); setPin(''); }}
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        onClick={handleFinalSubmit}
                                        loading={submitting}
                                        disabled={pin.length !== 4}
                                    >
                                        Confirm
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
