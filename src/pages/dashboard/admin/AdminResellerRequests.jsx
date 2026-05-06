import React, { useState, useEffect } from 'react';
import { 
    Search, Filter, ExternalLink, Download, 
    CheckCircle, Clock, Zap, AlertCircle, 
    MoreVertical, Eye, Edit3, Trash2, Loader2,
    Globe, Smartphone, Apple, Layout, Copy
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

export default function AdminResellerRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [updating, setUpdating] = useState(false);

    const [editForm, setEditForm] = useState({
        status: '',
        apkUrl: '',
        playStoreUrl: '',
        appStoreUrl: '',
        webUrl: '',
        adminNote: ''
    });

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/reseller', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(res.data);
        } catch (err) {
            toast.error('Failed to fetch reseller requests');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (req) => {
        setSelectedRequest(req);
        setEditForm({
            status: req.status,
            apkUrl: req.apkUrl || '',
            playStoreUrl: req.playStoreUrl || '',
            appStoreUrl: req.appStoreUrl || '',
            webUrl: req.webUrl || '',
            adminNote: req.adminNote || ''
        });
        setShowEditModal(true);
    };

    const handleView = (req) => {
        setSelectedRequest(req);
        setShowViewModal(true);
    };

    const copyToClipboard = (text, label) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied!`);
    };

    const copyImageToClipboard = async (imageUrl) => {
        try {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = imageUrl;
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob(async (blob) => {
                try {
                    const item = new ClipboardItem({ 'image/png': blob });
                    await navigator.clipboard.write([item]);
                    toast.success('Logo copied to clipboard as PNG!');
                } catch (err) {
                    throw err;
                }
            }, 'image/png');
        } catch (err) {
            console.error('Failed to copy image:', err);
            toast.error('Failed to copy image. Please use Download instead.');
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.patch(`/api/admin/reseller/${selectedRequest.id}`, editForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Request updated successfully');
            setShowEditModal(false);
            fetchRequests();
        } catch (err) {
            toast.error('Failed to update request');
        } finally {
            setUpdating(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase">Completed</span>;
            case 'processing': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase">Processing</span>;
            default: return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase">Pending</span>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reseller Requests</h1>
                    <p className="text-sm text-gray-500">Manage white-label setup requests and fulfillment.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Reference</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Platforms</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center">
                                        <Loader2 className="animate-spin text-primary mx-auto" size={24} />
                                    </td>
                                </tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-gray-400 text-sm italic">
                                        No reseller requests found.
                                    </td>
                                </tr>
                            ) : (
                                requests.map((req) => (
                                    <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-900">{req.contactEmail}</span>
                                                <span className="text-xs text-gray-400">{req.contactPhone}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-mono text-gray-500">#{req.paymentRef?.substring(0, 8)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-1 flex-wrap">
                                                {req.platforms.map(p => (
                                                    <span key={p} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-black uppercase">{p}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(req.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleView(req)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                                    title="View Business Info"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleEdit(req)}
                                                    className="p-2 text-gray-400 hover:text-primary transition-colors"
                                                    title="Edit/Fulfill"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900">Manage Request Fulfillment</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <Trash2 size={20} />
                            </button>
                        </div>
                        <div className="p-6 bg-gray-50/30 border-b border-gray-100 max-h-[60vh] overflow-y-auto">
                            {selectedRequest?.onboardingCompleted ? (
                                <div className="space-y-4 mb-6 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                    <h4 className="text-[11px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                                        <Layout size={14} /> Customer Branding Data
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold">App Name</span>
                                            <p className="text-sm font-bold text-gray-900">{selectedRequest.onboardingData?.appName}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold">Preferred Domain</span>
                                            <p className="text-sm font-bold text-gray-900">{selectedRequest.onboardingData?.domain || 'Not provided'}</p>
                                        </div>
                                        <div className="space-y-2 col-span-2">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold">Color Palette</span>
                                            <div className="flex flex-wrap gap-3">
                                                {['primaryColor', 'secondaryColor', 'successColor', 'warningColor', 'errorColor'].map(c => (
                                                    <div key={c} className="flex items-center gap-1.5 bg-white p-1 pr-2 rounded-lg border border-gray-100 shadow-sm">
                                                        <div 
                                                            className="w-4 h-4 rounded border border-gray-100" 
                                                            style={{ backgroundColor: selectedRequest.onboardingData?.[c] }}
                                                        />
                                                        <span className="text-[9px] font-bold text-gray-500 uppercase">{c.replace('Color', '')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2 col-span-2 pt-2 border-t border-gray-50">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold">App Logo</span>
                                            {selectedRequest.onboardingData?.logo ? (
                                                <div className="w-20 h-20 bg-white rounded-xl border border-gray-100 p-2 shadow-sm">
                                                    <img src={selectedRequest.onboardingData.logo} alt="Logo" className="w-full h-full object-contain" />
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-400 italic">No logo uploaded</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                                    <AlertCircle size={18} className="text-amber-500" />
                                    <p className="text-xs font-bold text-amber-700 uppercase tracking-tighter">Onboarding data not yet submitted by customer</p>
                                </div>
                            )}

                            <form onSubmit={handleUpdate} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Update Status</label>
                                    <select 
                                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                                    >
                                        <option value="pending">Pending Payment</option>
                                        <option value="processing">Processing / In Setup</option>
                                        <option value="completed">Completed / Delivered</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Web URL</label>
                                    <Input 
                                        placeholder="https://client-site.com"
                                        value={editForm.webUrl}
                                        onChange={(e) => setEditForm({...editForm, webUrl: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Android APK URL</label>
                                    <Input 
                                        placeholder="https://ufriends.com.ng/apps/client.apk"
                                        value={editForm.apkUrl}
                                        onChange={(e) => setEditForm({...editForm, apkUrl: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Play Store URL</label>
                                    <Input 
                                        placeholder="https://play.google.com/store/apps/details?id=..."
                                        value={editForm.playStoreUrl}
                                        onChange={(e) => setEditForm({...editForm, playStoreUrl: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">iOS App Store URL</label>
                                    <Input 
                                        placeholder="https://apps.apple.com/app/..."
                                        value={editForm.appStoreUrl}
                                        onChange={(e) => setEditForm({...editForm, appStoreUrl: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Admin Note (Shown to Customer)</label>
                                <textarea 
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary resize-none h-24"
                                    placeholder="Your setup is complete. You can now login with your admin credentials..."
                                    value={editForm.adminNote}
                                    onChange={(e) => setEditForm({...editForm, adminNote: e.target.value})}
                                />
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-gray-100">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    className="flex-1"
                                    onClick={() => setShowEditModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    className="flex-1 bg-primary text-white"
                                    loading={updating}
                                >
                                    Save & Complete
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            )}
            {/* View Modal */}
            {showViewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-blue-50/30">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Eye size={20} className="text-blue-500" /> Branding Details
                            </h3>
                            <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                                <Trash2 size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-8">
                            {selectedRequest?.onboardingCompleted ? (
                                <>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">App Name</span>
                                            <div className="flex items-center justify-between group bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <span className="text-sm font-bold text-gray-900">{selectedRequest.onboardingData?.appName}</span>
                                                <button 
                                                    onClick={() => copyToClipboard(selectedRequest.onboardingData?.appName, 'App Name')}
                                                    className="p-1.5 text-gray-400 hover:text-primary hover:bg-white rounded-lg transition-all"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Domain</span>
                                            <div className="flex items-center justify-between group bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <span className="text-sm font-bold text-gray-900">{selectedRequest.onboardingData?.domain}</span>
                                                <button 
                                                    onClick={() => copyToClipboard(selectedRequest.onboardingData?.domain, 'Domain')}
                                                    className="p-1.5 text-gray-400 hover:text-primary hover:bg-white rounded-lg transition-all"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Color Palette</span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {['primaryColor', 'secondaryColor', 'successColor', 'warningColor', 'errorColor'].map(c => (
                                                <div key={c} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <div 
                                                            className="w-6 h-6 rounded-lg border border-gray-100 shadow-inner" 
                                                            style={{ backgroundColor: selectedRequest.onboardingData?.[c] }}
                                                        />
                                                        <span className="text-xs font-bold text-gray-700 capitalize">{c.replace('Color', '')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px] font-mono text-gray-400">{selectedRequest.onboardingData?.[c]}</span>
                                                        <button 
                                                            onClick={() => copyToClipboard(selectedRequest.onboardingData?.[c], c)}
                                                            className="p-1 text-gray-300 hover:text-primary transition-colors"
                                                        >
                                                            <Copy size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-6 border-t border-gray-50">
                                        <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Official Logo</span>
                                        <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div className="w-24 h-24 bg-white rounded-xl border border-gray-200 p-2 shadow-sm shrink-0">
                                                <img src={selectedRequest.onboardingData?.logo} alt="Logo" className="w-full h-full object-contain" />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <button 
                                                    onClick={() => copyImageToClipboard(selectedRequest.onboardingData?.logo)}
                                                    className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-white px-4 py-2 rounded-lg border border-gray-200 hover:border-primary hover:text-primary transition-all"
                                                >
                                                    <Copy size={14} /> Copy Logo Image
                                                </button>
                                                <a 
                                                    href={selectedRequest.onboardingData?.logo} 
                                                    download={`logo-${selectedRequest.onboardingData?.appName}.png`}
                                                    target="_blank"
                                                    className="flex items-center justify-center gap-2 text-xs font-bold text-white bg-slate-900 px-4 py-2 rounded-lg hover:bg-slate-800 transition-all"
                                                >
                                                    <Download size={14} /> Download Logo
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-12 space-y-4">
                                    <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                                        <Clock size={32} />
                                    </div>
                                    <p className="text-sm font-bold text-gray-500 uppercase">Awaiting customer submission...</p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <Button onClick={() => setShowViewModal(false)} className="bg-slate-900 text-white px-8">
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
