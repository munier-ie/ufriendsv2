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
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Button from '../../../components/ui/Button';

const STATUS_LABELS = {
    0: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    1: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    2: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle }
};

const TYPE_LABELS = {
    biz: 'Business Name Registration',
    limited: 'Limited Liability Company',
    enterprise: 'Enterprise (Business Name)',
    ngo: 'NGO / Incorporated Trustees'
};

export default function CacDashboard() {
    const [activeView, setActiveView] = useState('pending');
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [selectedReg, setSelectedReg] = useState(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [settings, setSettings] = useState({
        charge: 5000,
        chargeAgent: 5000,
        chargeVendor: 5000,
        chargeBase: 0,
        charge2: 15000,
        charge2Agent: 15000,
        charge2Vendor: 15000,
        charge2Base: 0,
        referralCommission: 0,
        referralCommission2: 0,
        active: true
    });

    useEffect(() => {
        fetchRequests(activeView === 'pending' ? 0 : undefined);
        fetchSettings();
    }, [activeView]);

    const fetchRequests = async (status) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const params = status !== undefined ? { status } : {};
            const res = await axios.get('/api/admin/cac/requests', {
                headers: { Authorization: `Bearer ${token}` },
                params
            });
            setRegistrations(res.data.registrations || []);
        } catch (error) {
            console.error('Failed to fetch requests', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/cac/settings', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSettings(res.data.settings);
        } catch (error) {
            console.error('Failed to fetch settings', error);
        }
    };

    const handleProcess = async (id, status) => {
        const action = status === 1 ? 'APPROVE' : 'REJECT';
        if (!window.confirm(`Are you sure you want to ${action} this registration?`)) return;

        setProcessingId(id);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put(`/api/admin/cac/requests/${id}`, { status, adminNotes }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRegistrations(prev => prev.filter(r => r.id !== id));
            setSelectedReg(null);
            setAdminNotes('');
            alert(`Registration ${action.toLowerCase()}d successfully`);
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to process request');
        } finally {
            setProcessingId(null);
        }
    };

    const handleSaveSettings = async () => {
        setProcessingId('settings');
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put('/api/admin/cac/settings', settings, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Settings updated successfully');
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to update settings');
        } finally {
            setProcessingId(null);
        }
    };

    const openDetail = (reg) => {
        setSelectedReg(reg);
        setAdminNotes(reg.adminNotes || '');
    };

    const parseDocuments = (docString) => {
        try {
            return JSON.parse(docString);
        } catch {
            return null;
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">CAC Registration</h1>
                    <p className="text-gray-500 text-sm">Manage CAC registration requests and settings</p>
                </div>
            </div>

            {/* View Tabs */}
            <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto no-scrollbar">
                {[
                    { id: 'pending', label: 'Pending Requests' },
                    { id: 'all', label: 'All History' },
                    { id: 'settings', label: 'Settings' }
                ].map((tab) => (
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

            {/* Settings View */}
            {activeView === 'settings' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-primary/10 rounded-xl">
                            <Settings size={20} className="text-primary" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Service Configuration</h2>
                    </div>

                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Business Name User Price (₦)
                                </label>
                                <input
                                    type="number"
                                    value={settings.charge}
                                    onChange={(e) => setSettings(prev => ({ ...prev, charge: parseFloat(e.target.value) || 0 }))}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Business Name Agent Price (₦)
                                </label>
                                <input
                                    type="number"
                                    value={settings.chargeAgent}
                                    onChange={(e) => setSettings(prev => ({ ...prev, chargeAgent: parseFloat(e.target.value) || 0 }))}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Business Name Vendor Price (₦)
                                </label>
                                <input
                                    type="number"
                                    value={settings.chargeVendor}
                                    onChange={(e) => setSettings(prev => ({ ...prev, chargeVendor: parseFloat(e.target.value) || 0 }))}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 text-red-600">
                                    Business Name Base Cost (₦)
                                </label>
                                <input
                                    type="number"
                                    value={settings.chargeBase}
                                    onChange={(e) => setSettings(prev => ({ ...prev, chargeBase: parseFloat(e.target.value) || 0 }))}
                                    className="w-full rounded-xl border border-red-200 bg-red-50/30 px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Ref Commission (₦)
                                </label>
                                <input
                                    type="number"
                                    value={settings.referralCommission}
                                    onChange={(e) => setSettings(prev => ({ ...prev, referralCommission: parseFloat(e.target.value) || 0 }))}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Limited Liability User Price (₦)
                                </label>
                                <input
                                    type="number"
                                    value={settings.charge2}
                                    onChange={(e) => setSettings(prev => ({ ...prev, charge2: parseFloat(e.target.value) || 0 }))}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Limited Liability Agent Price (₦)
                                </label>
                                <input
                                    type="number"
                                    value={settings.charge2Agent}
                                    onChange={(e) => setSettings(prev => ({ ...prev, charge2Agent: parseFloat(e.target.value) || 0 }))}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Limited Liability Vendor Price (₦)
                                </label>
                                <input
                                    type="number"
                                    value={settings.charge2Vendor}
                                    onChange={(e) => setSettings(prev => ({ ...prev, charge2Vendor: parseFloat(e.target.value) || 0 }))}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 text-red-600">
                                    Limited Liability Base Cost (₦)
                                </label>
                                <input
                                    type="number"
                                    value={settings.charge2Base}
                                    onChange={(e) => setSettings(prev => ({ ...prev, charge2Base: parseFloat(e.target.value) || 0 }))}
                                    className="w-full rounded-xl border border-red-200 bg-red-50/30 px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Ref Commission (₦)
                                </label>
                                <input
                                    type="number"
                                    value={settings.referralCommission2}
                                    onChange={(e) => setSettings(prev => ({ ...prev, referralCommission2: parseFloat(e.target.value) || 0 }))}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <span className="text-gray-700 font-medium">Enable CAC Registration Service</span>
                            <button
                                onClick={() => setSettings(prev => ({ ...prev, active: !prev.active }))}
                                className={`relative w-12 h-6 rounded-full transition-colors ${settings.active ? 'bg-green-500' : 'bg-gray-300'
                                    }`}
                            >
                                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.active ? 'translate-x-6' : 'translate-x-0.5'
                                    }`} />
                            </button>
                        </div>

                        <Button
                            onClick={handleSaveSettings}
                            loading={processingId === 'settings'}
                            className="w-full"
                        >
                            Save Settings
                        </Button>
                    </div>
                </div>
            ) : null}

            {/* Registrations List */}
            {activeView !== 'settings' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="animate-spin text-primary" size={32} />
                        </div>
                    ) : registrations.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                            <Clock size={40} className="mx-auto mb-3 text-gray-300" />
                            <p className="font-medium">No {activeView === 'pending' ? 'pending ' : ''}registrations found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Business</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Applicant</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Amount</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {registrations.map((reg, idx) => {
                                        const statusInfo = STATUS_LABELS[reg.status] || STATUS_LABELS[0];
                                        const StatusIcon = statusInfo.icon;
                                        return (
                                            <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-gray-500">{idx + 1}</td>
                                                <td className="px-6 py-4">
                                                    <p className="font-medium text-gray-900 text-sm">{reg.businessName}</p>
                                                    <p className="text-xs text-gray-500">{TYPE_LABELS[reg.businessType] || reg.businessType}</p>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-700">
                                                    {reg.user ? `${reg.user.firstName || ''} ${reg.user.lastName || ''}`.trim() : '—'}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {new Date(reg.createdAt).toLocaleDateString('en-NG', {
                                                        day: 'numeric', month: 'short', year: 'numeric'
                                                    })}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                                    ₦{reg.charge?.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>
                                                        <StatusIcon size={12} />
                                                        {statusInfo.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => openDetail(reg)}
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

            {/* ==================== Detail Modal ==================== */}
            <AnimatePresence>
                {selectedReg ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedReg(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex items-center justify-between z-10">
                                <h3 className="text-lg font-bold text-gray-900">Registration Details</h3>
                                <button onClick={() => setSelectedReg(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-5 space-y-5">
                                {/* Business Info */}
                                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                    <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Business Information</h4>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <DetailRow label="Certificate Type" value={TYPE_LABELS[selectedReg.businessType] || selectedReg.businessType} />
                                        <DetailRow label="Charge" value={`₦${selectedReg.charge?.toLocaleString()}`} />
                                        <DetailRow label="Business Name 1" value={selectedReg.businessName} />
                                        <DetailRow label="Business Name 2" value={selectedReg.altBusinessName || '—'} />
                                        <DetailRow label="Nature of Business" value={selectedReg.natureOfBusiness || '—'} />
                                        <DetailRow label="Share Capital" value={selectedReg.shareCapital || '—'} />
                                    </div>
                                </div>

                                {/* Contact & Address */}
                                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                    <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Contact & Address</h4>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <DetailRow label="Company Address" value={selectedReg.companyAddress || '—'} />
                                        <DetailRow label="Residential Address" value={selectedReg.residentialAddress || '—'} />
                                        <DetailRow label="Email" value={selectedReg.email || '—'} />
                                        <DetailRow label="Phone" value={selectedReg.phone || '—'} />
                                    </div>
                                </div>

                                {/* Applicant Info */}
                                {selectedReg.user ? (
                                    <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                                        <h4 className="font-bold text-blue-900 text-sm uppercase tracking-wider">Applicant (User)</h4>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <DetailRow label="Name" value={`${selectedReg.user.firstName || ''} ${selectedReg.user.lastName || ''}`.trim()} />
                                            <DetailRow label="Email" value={selectedReg.user.email || '—'} />
                                            <DetailRow label="Phone" value={selectedReg.user.phone || '—'} />
                                            <DetailRow label="User ID" value={`#${selectedReg.user.id}`} />
                                        </div>
                                    </div>
                                ) : null}

                                {/* Documents */}
                                {(() => {
                                    const docs = parseDocuments(selectedReg.documents);
                                    if (!docs) return null;
                                    return (
                                        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                            <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Uploaded Documents</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {docs.directorIdCard ? (
                                                    <a
                                                        href={docs.directorIdCard}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
                                                    >
                                                        <ExternalLink size={16} className="text-primary shrink-0" />
                                                        <span className="text-sm font-medium text-gray-700">Director ID Card</span>
                                                    </a>
                                                ) : null}
                                                {docs.passportPhoto ? (
                                                    <a
                                                        href={docs.passportPhoto}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
                                                    >
                                                        <ExternalLink size={16} className="text-primary shrink-0" />
                                                        <span className="text-sm font-medium text-gray-700">Passport Photograph</span>
                                                    </a>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Admin Notes */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Admin Notes</label>
                                    <textarea
                                        rows={3}
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        placeholder="Add notes about this registration..."
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none resize-none"
                                        maxLength={1000}
                                    />
                                </div>

                                {/* Actions */}
                                {selectedReg.status === 0 ? (
                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            onClick={() => handleProcess(selectedReg.id, 2)}
                                            loading={processingId === selectedReg.id}
                                            variant="outline"
                                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                                        >
                                            Reject
                                        </Button>
                                        <Button
                                            onClick={() => handleProcess(selectedReg.id, 1)}
                                            loading={processingId === selectedReg.id}
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                        >
                                            Approve
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="text-center py-2">
                                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${STATUS_LABELS[selectedReg.status]?.color || ''}`}>
                                            Already {STATUS_LABELS[selectedReg.status]?.label || 'Processed'}
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

function DetailRow({ label, value }) {
    return (
        <div>
            <p className="text-gray-500 text-xs font-medium">{label}</p>
            <p className="text-gray-900 font-medium break-words">{value}</p>
        </div>
    );
}
