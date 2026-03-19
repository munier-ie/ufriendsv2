import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import X from 'lucide-react/dist/esm/icons/x';
import Upload from 'lucide-react/dist/esm/icons/upload';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import ToggleLeft from 'lucide-react/dist/esm/icons/toggle-left';
import ToggleRight from 'lucide-react/dist/esm/icons/toggle-right';
import Users from 'lucide-react/dist/esm/icons/users';
import Search from 'lucide-react/dist/esm/icons/search';
import Lock from 'lucide-react/dist/esm/icons/lock';

const TYPE_OPTIONS = [
    { value: 'video', label: '📹 Video' },
    { value: 'pdf', label: '📄 PDF' },
    { value: 'image', label: '🖼️ Image' },
    { value: 'text', label: '📝 Article' },
    { value: 'livestream', label: '📡 Live Stream' },
];

const PLAN_OPTIONS = [
    { value: 'free', label: 'Free' },
    { value: 'premium', label: 'Premium (Paid)' },
];

const EMPTY_FORM = {
    title: '', description: '', type: 'video', plan: 'free', price: '', referralCommission: '',
    youtubeUrl: '', externalUrl: '', body: '', sortOrder: '0', active: true,
};

function FormField({ label, required, children, hint }) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
        </div>
    );
}

function ContentModal({ initial, onClose, onSaved }) {
    const isEdit = !!initial;
    const [form, setForm] = useState(initial ? {
        title: initial.title || '',
        description: initial.description || '',
        type: initial.type || 'video',
        plan: initial.plan || 'free',
        price: initial.price ? String(initial.price) : '',
        referralCommission: initial.referralCommission ? String(initial.referralCommission) : '',
        youtubeUrl: initial.youtubeUrl || '',
        externalUrl: initial.externalUrl || '',
        body: initial.body || '',
        sortOrder: String(initial.sortOrder ?? 0),
        active: initial.active ?? true,
    } : { ...EMPTY_FORM });

    const [file, setFile] = useState(null);
    const [thumbnail, setThumbnail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileRef = useRef();
    const thumbRef = useRef();

    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
            if (file) fd.append('file', file);
            if (thumbnail) fd.append('thumbnail', thumbnail);

            const token = localStorage.getItem('adminToken');
            const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' };

            if (isEdit) {
                await axios.put(`/api/admin/academy/${initial.id}`, fd, { headers });
            } else {
                await axios.post('/api/admin/academy', fd, { headers });
            }
            onSaved();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8 px-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                            <GraduationCap size={20} className="text-white" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">
                            {isEdit ? 'Edit Content' : 'Add New Content'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Basic Info */}
                    <FormField label="Title" required>
                        <input
                            required minLength={3} maxLength={200}
                            value={form.title}
                            onChange={e => set('title', e.target.value)}
                            placeholder="e.g. How to Buy Data with VTU"
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                    </FormField>

                    <FormField label="Description">
                        <textarea
                            value={form.description}
                            onChange={e => set('description', e.target.value)}
                            placeholder="Short summary of the content..."
                            rows={2}
                            maxLength={1000}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                        />
                    </FormField>

                    {/* Type & Plan */}
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Content Type" required>
                            <select
                                value={form.type}
                                onChange={e => set('type', e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                            >
                                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </FormField>

                        <FormField label="Plan" required>
                            <select
                                value={form.plan}
                                onChange={e => set('plan', e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                            >
                                {PLAN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </FormField>
                    </div>

                    {/* Price (only for premium) */}
                    {form.plan === 'premium' && (
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Price (₦)" required>
                                <input
                                    type="number" min={1} step={1}
                                    value={form.price}
                                    onChange={e => set('price', e.target.value)}
                                    placeholder="e.g. 2000"
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                />
                            </FormField>
                            <FormField label="Ref Comm (₦)">
                                <input
                                    type="number" min={0} step={1}
                                    value={form.referralCommission}
                                    onChange={e => set('referralCommission', e.target.value)}
                                    placeholder="e.g. 200"
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                />
                            </FormField>
                        </div>
                    )}

                    {/* Conditional fields by type */}
                    {form.type === 'video' && (
                        <FormField label="YouTube URL" hint="Paste a YouTube video link to embed it. OR upload a video file below.">
                            <input
                                type="url"
                                value={form.youtubeUrl}
                                onChange={e => set('youtubeUrl', e.target.value)}
                                placeholder="https://youtube.com/watch?v=..."
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            />
                        </FormField>
                    )}

                    {form.type === 'livestream' && (
                        <FormField label="Live Stream URL" required hint="YouTube Live, Zoom, Google Meet, etc.">
                            <input
                                type="url"
                                value={form.externalUrl}
                                onChange={e => set('externalUrl', e.target.value)}
                                placeholder="https://youtube.com/live/..."
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            />
                        </FormField>
                    )}

                    {form.type === 'text' && (
                        <FormField label="Article Body" required hint="Write your full article/guide here.">
                            <textarea
                                value={form.body}
                                onChange={e => set('body', e.target.value)}
                                placeholder="Write your lesson here..."
                                rows={8}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none font-mono"
                            />
                        </FormField>
                    )}

                    {/* File Upload – for video, pdf, image */}
                    {(form.type === 'video' || form.type === 'pdf' || form.type === 'image') && (
                        <FormField label={`Upload ${form.type === 'video' ? 'Video File' : form.type === 'pdf' ? 'PDF File' : 'Image'}`}
                            hint="Max 50MB. Accepted: MP4/WebM (video), PDF, JPG/PNG/WebP (image)">
                            <input
                                type="file"
                                ref={fileRef}
                                onChange={e => setFile(e.target.files[0])}
                                accept={form.type === 'video' ? 'video/mp4,video/webm,video/ogg' : form.type === 'pdf' ? 'application/pdf' : 'image/*'}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                className="w-full border-2 border-dashed border-gray-300 hover:border-primary rounded-xl py-4 flex flex-col items-center justify-center space-y-1 transition-colors text-gray-500 hover:text-primary"
                            >
                                <Upload size={22} />
                                <span className="text-sm font-medium">{file ? file.name : 'Click to upload'}</span>
                                {initial?.fileUrl && !file && <span className="text-xs text-green-600">Current file: uploaded ✓</span>}
                            </button>
                        </FormField>
                    )}

                    {/* Thumbnail Upload */}
                    <FormField label="Thumbnail Image" hint="Shown in the content grid. JPG/PNG/WebP.">
                        <input
                            type="file"
                            ref={thumbRef}
                            onChange={e => setThumbnail(e.target.files[0])}
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => thumbRef.current?.click()}
                            className="w-full border-2 border-dashed border-gray-300 hover:border-primary rounded-xl py-4 flex flex-col items-center justify-center space-y-1 transition-colors text-gray-500 hover:text-primary"
                        >
                            <Upload size={22} />
                            <span className="text-sm font-medium">{thumbnail ? thumbnail.name : 'Click to upload thumbnail'}</span>
                            {initial?.thumbnailUrl && !thumbnail && <span className="text-xs text-green-600">Thumbnail exists ✓</span>}
                        </button>
                    </FormField>

                    {/* Sort Order & Active */}
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Sort Order" hint="Lower = appears first">
                            <input
                                type="number" min={0}
                                value={form.sortOrder}
                                onChange={e => set('sortOrder', e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            />
                        </FormField>
                        <FormField label="Status">
                            <button
                                type="button"
                                onClick={() => set('active', !form.active)}
                                className={`w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${form.active ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-300 bg-gray-50 text-gray-500'
                                    }`}
                            >
                                {form.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                <span>{form.active ? 'Active' : 'Inactive'}</span>
                            </button>
                        </FormField>
                    </div>

                    {error && (
                        <div className="flex items-start space-x-2 bg-red-50 text-red-600 rounded-xl p-3">
                            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{typeof error === 'string' ? error : JSON.stringify(error)}</span>
                        </div>
                    )}

                    <div className="flex space-x-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 bg-gradient-to-r from-primary to-secondary text-white font-bold py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center">
                            {loading ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : (isEdit ? 'Save Changes' : 'Add Content')}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────

export default function AcademyDashboard() {
    const [contents, setContents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchContents = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/academy', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setContents(res.data.contents || []);
        } catch {
            showToast('Failed to fetch content', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchContents(); }, [fetchContents]);

    const handleToggle = async (id, current) => {
        try {
            const token = localStorage.getItem('adminToken');
            await axios.patch(`/api/admin/academy/${id}/toggle`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setContents(prev => prev.map(c => c.id === id ? { ...c, active: !current } : c));
            showToast(`Content ${!current ? 'activated' : 'deactivated'}`);
        } catch {
            showToast('Toggle failed', 'error');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const token = localStorage.getItem('adminToken');
            await axios.delete(`/api/admin/academy/${deleteTarget.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setContents(prev => prev.filter(c => c.id !== deleteTarget.id));
            setDeleteTarget(null);
            showToast('Content deleted');
        } catch {
            showToast('Delete failed', 'error');
        }
    };

    const filtered = contents.filter(c =>
        !search || c.title.toLowerCase().includes(search.toLowerCase())
    );

    const totalPurchases = contents.reduce((sum, c) => sum + (c._count?.purchases || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Content', value: contents.length, color: 'from-primary to-secondary' },
                    { label: 'Premium', value: contents.filter(c => c.plan === 'premium').length, color: 'from-amber-500 to-orange-600' },
                    { label: 'Total Purchases', value: totalPurchases, color: 'from-emerald-500 to-teal-600' },
                ].map(stat => (
                    <div key={stat.label}
                        className={`bg-gradient-to-br ${stat.color} rounded-2xl p-4 text-white shadow-lg`}>
                        <p className="text-3xl font-extrabold">{stat.value}</p>
                        <p className="text-xs opacity-80 mt-1 font-medium">{stat.label}</p>
                    </div>
                ))}
            </motion.div>

            {/* Toolbar */}
            <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search content..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>
                <button
                    onClick={() => { setEditTarget(null); setModalOpen(true); }}
                    className="flex items-center space-x-2 bg-gradient-to-r from-primary to-secondary text-white font-semibold px-4 py-2.5 rounded-xl hover:shadow-md transition-all text-sm flex-shrink-0"
                >
                    <Plus size={18} />
                    <span>Add Content</span>
                </button>
            </div>

            {/* Content Table */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-white rounded-3xl shadow-lg overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-400">
                        <div className="w-10 h-10 border-2 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                        Loading content...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center">
                        <GraduationCap size={48} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No content yet</p>
                        <button onClick={() => { setEditTarget(null); setModalOpen(true); }}
                            className="mt-3 text-sm text-primary font-semibold hover:underline">
                            Add your first content
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-primary to-secondary text-white text-sm">
                                    <th className="text-left px-6 py-4 font-semibold">Title</th>
                                    <th className="text-left px-4 py-4 font-semibold">Type</th>
                                    <th className="text-left px-4 py-4 font-semibold">Plan</th>
                                    <th className="text-left px-4 py-4 font-semibold">Price</th>
                                    <th className="text-left px-4 py-4 font-semibold text-orange-200">Ref Comm</th>
                                    <th className="text-center px-4 py-4 font-semibold">
                                        <Users size={14} className="inline mr-1" />Sold
                                    </th>
                                    <th className="text-center px-4 py-4 font-semibold">Status</th>
                                    <th className="text-center px-4 py-4 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-900 text-sm truncate max-w-[200px]">{c.title}</p>
                                            {c.description && (
                                                <p className="text-xs text-gray-400 truncate max-w-[200px] mt-0.5">{c.description}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full capitalize">{c.type}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center w-fit space-x-1 ${c.plan === 'premium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                                                }`}>
                                                {c.plan === 'premium' && <Lock size={10} />}
                                                <span className="capitalize">{c.plan}</span>
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm font-bold text-gray-800">
                                            {c.plan === 'premium' ? `₦${c.price?.toLocaleString()}` : '—'}
                                        </td>
                                        <td className="px-4 py-4 text-sm font-medium text-orange-600">
                                            {c.referralCommission ? `₦${c.referralCommission.toLocaleString()}` : '—'}
                                        </td>
                                        <td className="px-4 py-4 text-center text-sm font-semibold text-gray-700">
                                            {c._count?.purchases || 0}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <button onClick={() => handleToggle(c.id, c.active)}>
                                                {c.active
                                                    ? <ToggleRight size={26} className="text-green-500 hover:text-green-600 transition-colors" />
                                                    : <ToggleLeft size={26} className="text-gray-400 hover:text-gray-500 transition-colors" />
                                                }
                                            </button>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-center space-x-2">
                                                <button
                                                    onClick={() => { setEditTarget(c); setModalOpen(true); }}
                                                    className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(c)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </motion.div>

            {/* Create / Edit Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <ContentModal
                        initial={editTarget}
                        onClose={() => { setModalOpen(false); setEditTarget(null); }}
                        onSaved={() => { fetchContents(); showToast(editTarget ? 'Content updated!' : 'Content created!'); }}
                    />
                )}
            </AnimatePresence>

            {/* Delete Confirm Modal */}
            <AnimatePresence>
                {deleteTarget && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={28} className="text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Content?</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                "<strong>{deleteTarget.title}</strong>" will be permanently deleted along with all purchase records.
                            </p>
                            <div className="flex space-x-3">
                                <button onClick={() => setDeleteTarget(null)}
                                    className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button onClick={handleDelete}
                                    className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700">
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
                        className={`fixed bottom-6 right-6 z-[100] flex items-center space-x-3 px-5 py-3.5 rounded-2xl shadow-xl font-medium text-sm text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-gray-900'
                            }`}>
                        {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                        <span>{toast.msg}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
