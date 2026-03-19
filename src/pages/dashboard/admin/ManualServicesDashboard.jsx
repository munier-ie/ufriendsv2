import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Eye from 'lucide-react/dist/esm/icons/eye';
import X from 'lucide-react/dist/esm/icons/x';
import Upload from 'lucide-react/dist/esm/icons/upload';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Button from '../../../components/ui/Button';

const STATUS_LABELS = {
    0: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    1: { label: 'Approved', color: 'bg-green-100  text-green-700', icon: CheckCircle },
    2: { label: 'Rejected', color: 'bg-red-100    text-red-700', icon: XCircle },
};

const SERVICE_LABELS = {
    BVN_MODIFICATION: 'BVN Modification',
    BVN_RETRIEVAL: 'BVN Retrieval',
    VNIN_NIBSS: 'VNIN → NIBSS',
    BVN_ANDROID: 'BVN Android License',
    NIN_MODIFICATION: 'NIN Modification',
    NIN_VALIDATION: 'NIN Validation',
};

const SERVICE_TYPES = ['', ...Object.keys(SERVICE_LABELS)];

const DEFAULT_SETTINGS = {
    bvnModificationPrice: 2000, bvnRetrievalPrice: 1000, vninNibssPrice: 1500,
    bvnAndroidPrice: 3000, ninModificationPrice: 2000, ninValidationPrice: 500,
    bvnModificationActive: true, bvnRetrievalActive: true, vninNibssActive: true,
    bvnAndroidActive: true, ninModificationActive: true, ninValidationActive: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function DetailRow({ label, value }) {
    return (
        <div>
            <p className="text-gray-400 text-xs font-medium">{label}</p>
            <p className="text-gray-900 font-medium break-words text-sm">{value || '—'}</p>
        </div>
    );
}

function Toggle({ checked, onChange }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-green-500' : 'bg-gray-300'}`}
        >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
        </button>
    );
}

function ServicePriceRow({ label, priceKey, activeKey, settings, onChange }) {
    return (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <input
                    type="number"
                    value={settings[priceKey] ?? 0}
                    onChange={e => onChange(priceKey, parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    min="0"
                    placeholder="0"
                />
            </div>
            <div className="flex flex-col items-center gap-1 shrink-0">
                <span className="text-xs text-gray-400">Active</span>
                <Toggle
                    checked={settings[activeKey] ?? true}
                    onChange={val => onChange(activeKey, val)}
                />
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ManualServicesDashboard() {
    const [activeView, setActiveView] = useState('pending');
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReq, setSelectedReq] = useState(null);
    const [adminNote, setAdminNote] = useState('');
    const [proofUrl, setProofUrl] = useState('');
    const [proofFile, setProofFile] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [filterType, setFilterType] = useState('');
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsSaved, setSettingsSaved] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, [activeView, filterType]);

    useEffect(() => {
        fetchSettings();
    }, []);

    const token = () => localStorage.getItem('adminToken');

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const params = { limit: 50 };
            if (activeView === 'pending') params.status = 0;
            if (filterType) params.serviceType = filterType;

            const res = await axios.get('/api/admin/manual-services/requests', {
                headers: { Authorization: `Bearer ${token()}` },
                params
            });
            setRequests(res.data.requests || []);
        } catch (e) {
            console.error('Failed to fetch requests', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/admin/manual-services/settings', {
                headers: { Authorization: `Bearer ${token()}` }
            });
            setSettings(res.data.settings || DEFAULT_SETTINGS);
        } catch (e) {
            console.error('Failed to fetch settings', e);
        }
    };

    const openDetail = (req) => {
        setSelectedReq(req);
        setAdminNote(req.adminNote || '');
        setProofUrl(req.proofUrl || '');
        setProofFile(null);
    };

    const parseDetails = (raw) => {
        try { return JSON.parse(raw); } catch { return {}; }
    };

    const handleProcess = async (id, status) => {
        const action = status === 1 ? 'APPROVE' : 'REJECT';
        if (!window.confirm(`Are you sure you want to ${action} this request?`)) return;

        setProcessingId(id);
        try {
            const fd = new FormData();
            fd.append('status', status);
            if (adminNote) fd.append('adminNote', adminNote);
            if (proofUrl) fd.append('proofUrl', proofUrl);
            if (proofFile) fd.append('proof', proofFile);

            await axios.put(`/api/admin/manual-services/requests/${id}`, fd, {
                headers: {
                    Authorization: `Bearer ${token()}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setRequests(prev => prev.filter(r => r.id !== id));
            setSelectedReq(null);
            setAdminNote('');
            setProofUrl('');
            setProofFile(null);
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to process request');
        } finally {
            setProcessingId(null);
        }
    };

    const handleSettingChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            await axios.put('/api/admin/manual-services/settings', settings, {
                headers: { Authorization: `Bearer ${token()}` }
            });
            setSettingsSaved(true);
            setTimeout(() => setSettingsSaved(false), 2500);
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to save settings');
        } finally {
            setSavingSettings(false);
        }
    };

    const PRICE_ROWS = [
        { label: 'BVN Modification', priceKey: 'bvnModificationPrice', activeKey: 'bvnModificationActive' },
        { label: 'BVN Retrieval', priceKey: 'bvnRetrievalPrice', activeKey: 'bvnRetrievalActive' },
        { label: 'VNIN → NIBSS', priceKey: 'vninNibssPrice', activeKey: 'vninNibssActive' },
        { label: 'BVN Android License', priceKey: 'bvnAndroidPrice', activeKey: 'bvnAndroidActive' },
        { label: 'NIN Modification', priceKey: 'ninModificationPrice', activeKey: 'ninModificationActive' },
        { label: 'NIN Validation', priceKey: 'ninValidationPrice', activeKey: 'ninValidationActive' },
    ];

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Manual Services</h1>
                <p className="text-gray-500 text-sm">Manage BVN/NIN service requests submitted by users</p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 overflow-x-auto no-scrollbar">
                {[
                    { id: 'pending', label: 'Pending' },
                    { id: 'all', label: 'All History' },
                    { id: 'settings', label: 'Settings' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveView(tab.id)}
                        className={`px-6 py-3 border-b-2 whitespace-nowrap text-sm font-medium transition-all ${activeView === tab.id
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Settings ── */}
            {activeView === 'settings' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-2xl text-center">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                        <Settings size={32} className="text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Detailed Pricing Management</h2>
                    <p className="text-gray-500 mb-8">
                        Manual service pricing has been moved to a new granular management system.
                        You can now set different prices for each modification type and per user category (User, Agent, Vendor).
                    </p>

                    <div className="space-y-4">
                        <Button
                            onClick={() => window.location.href = '/admin/dashboard/manual-services/pricing'}
                            className="w-full py-4 text-lg"
                        >
                            Open Detailed Pricing Page
                        </Button>

                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left">
                            <h4 className="text-blue-900 font-bold text-sm mb-1 uppercase tracking-wider">Note:</h4>
                            <p className="text-blue-800 text-sm">
                                Use the toggle switches on the pricing page to enable/disable specific service variants.
                                The "Base Price" for each service acts as the starting price if no sub-type is selected.
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* ── Requests list ── */}
            {activeView !== 'settings' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Filter bar */}
                    <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
                        <label className="text-sm font-medium text-gray-600">Filter by service:</label>
                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                        >
                            {SERVICE_TYPES.map(t => (
                                <option key={t} value={t}>{t ? SERVICE_LABELS[t] : 'All Services'}</option>
                            ))}
                        </select>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="animate-spin text-primary" size={32} />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                            <Clock size={40} className="mx-auto mb-3 text-gray-300" />
                            <p className="font-medium">No {activeView === 'pending' ? 'pending ' : ''}requests found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        {['#', 'Service', 'Sub-type', 'Applicant', 'Date', 'Amount', 'Status', 'Action'].map(h => (
                                            <th key={h} className="px-5 py-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {requests.map((req, idx) => {
                                        const statusInfo = STATUS_LABELS[req.status] || STATUS_LABELS[0];
                                        const StatusIcon = statusInfo.icon;
                                        return (
                                            <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-5 py-4 text-sm text-gray-500">{idx + 1}</td>
                                                <td className="px-5 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                                                    {SERVICE_LABELS[req.serviceType] || req.serviceType}
                                                </td>
                                                <td className="px-5 py-4 text-sm text-gray-500">
                                                    {req.subType ? req.subType.replace(/_/g, ' ') : '—'}
                                                </td>
                                                <td className="px-5 py-4 text-sm text-gray-700">
                                                    {req.user ? `${req.user.firstName} ${req.user.lastName}`.trim() : '—'}
                                                </td>
                                                <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">
                                                    {new Date(req.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-5 py-4 text-sm font-bold text-gray-900">
                                                    ₦{req.amount?.toLocaleString()}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>
                                                        <StatusIcon size={12} />
                                                        {statusInfo.label}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <button
                                                        onClick={() => openDetail(req)}
                                                        className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : null}

            {/* ── Detail Modal ── */}
            <AnimatePresence>
                {selectedReq ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedReq(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex items-center justify-between z-10">
                                <h3 className="text-lg font-bold text-gray-900">Request Details</h3>
                                <button onClick={() => setSelectedReq(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-5 space-y-5">
                                {/* Summary */}
                                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                    <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Request Summary</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <DetailRow label="Service" value={SERVICE_LABELS[selectedReq.serviceType] || selectedReq.serviceType} />
                                        <DetailRow label="Sub-type" value={selectedReq.subType?.replace(/_/g, ' ')} />
                                        <DetailRow label="Ref" value={selectedReq.transRef} />
                                        <DetailRow label="Amount" value={`₦${selectedReq.amount?.toLocaleString()}`} />
                                        <DetailRow label="Date" value={new Date(selectedReq.createdAt).toLocaleString('en-NG')} />
                                        <DetailRow label="Status" value={STATUS_LABELS[selectedReq.status]?.label} />
                                    </div>
                                </div>

                                {/* Submitted Details */}
                                {(() => {
                                    const d = parseDetails(selectedReq.details);
                                    const keys = Object.keys(d).filter(k => k !== 'subType');
                                    if (!keys.length) return null;
                                    return (
                                        <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                                            <h4 className="font-bold text-blue-900 text-xs uppercase tracking-wider">Submitted Form Data</h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                {keys.map(k => (
                                                    <DetailRow key={k} label={k.replace(/_/g, ' ')} value={d[k]} />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Applicant */}
                                {selectedReq.user && (
                                    <div className="bg-green-50 rounded-xl p-4 space-y-3">
                                        <h4 className="font-bold text-green-900 text-xs uppercase tracking-wider">Applicant</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <DetailRow label="Name" value={`${selectedReq.user.firstName} ${selectedReq.user.lastName}`} />
                                            <DetailRow label="Email" value={selectedReq.user.email} />
                                            <DetailRow label="Phone" value={selectedReq.user.phone} />
                                            <DetailRow label="ID" value={`#${selectedReq.user.id}`} />
                                        </div>
                                    </div>
                                )}

                                {/* Existing proof */}
                                {selectedReq.proofUrl && (
                                    <a
                                        href={selectedReq.proofUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 hover:bg-green-100 transition-colors text-sm font-medium"
                                    >
                                        <ExternalLink size={16} />
                                        View Existing Proof
                                    </a>
                                )}

                                {/* Admin Note */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Admin Notes</label>
                                    <textarea
                                        rows={3}
                                        value={adminNote}
                                        onChange={e => setAdminNote(e.target.value)}
                                        placeholder="Add notes about this request..."
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none transition-all text-sm"
                                        maxLength={1000}
                                    />
                                </div>

                                {/* Proof Upload */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Upload Proof of Completion</label>
                                    <input
                                        type="text"
                                        placeholder="Paste proof URL (optional)"
                                        value={proofUrl}
                                        onChange={e => setProofUrl(e.target.value)}
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
                                    />
                                    <label className="flex items-center gap-3 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                                        <Upload size={18} className="text-gray-400 shrink-0" />
                                        <span className="text-sm text-gray-500">
                                            {proofFile ? proofFile.name : 'Or click to upload a file (image or PDF, max 10MB)'}
                                        </span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*,.pdf"
                                            onChange={e => setProofFile(e.target.files?.[0] || null)}
                                        />
                                    </label>
                                </div>

                                {/* Actions */}
                                {selectedReq.status === 0 ? (
                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            onClick={() => handleProcess(selectedReq.id, 2)}
                                            loading={processingId === selectedReq.id}
                                            variant="outline"
                                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                                        >
                                            Reject &amp; Refund
                                        </Button>
                                        <Button
                                            onClick={() => handleProcess(selectedReq.id, 1)}
                                            loading={processingId === selectedReq.id}
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                        >
                                            Approve
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="text-center py-2">
                                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${STATUS_LABELS[selectedReq.status]?.color || ''}`}>
                                            Already {STATUS_LABELS[selectedReq.status]?.label || 'Processed'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
