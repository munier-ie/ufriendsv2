import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import Play from 'lucide-react/dist/esm/icons/play';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Image from 'lucide-react/dist/esm/icons/image';
import Radio from 'lucide-react/dist/esm/icons/radio';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Unlock from 'lucide-react/dist/esm/icons/unlock';
import X from 'lucide-react/dist/esm/icons/x';
import Eye from 'lucide-react/dist/esm/icons/eye';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Search from 'lucide-react/dist/esm/icons/search';

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_ICON = {
    video: Play,
    pdf: FileText,
    image: Image,
    text: BookOpen,
    livestream: Radio,
};

const TYPE_LABEL = {
    video: 'Video',
    pdf: 'PDF',
    image: 'Image',
    text: 'Article',
    livestream: 'Live',
};

const TYPE_COLOR = {
    video: 'from-blue-500 to-indigo-600',
    pdf: 'from-red-500 to-rose-600',
    image: 'from-pink-500 to-fuchsia-600',
    text: 'from-green-500 to-emerald-600',
    livestream: 'from-orange-500 to-amber-600',
};

const FILTERS = [
    { label: 'All', value: '' },
    { label: 'Free', value: 'free' },
    { label: 'Premium', value: 'premium' },
    { label: 'Videos', value: 'video' },
    { label: 'PDFs', value: 'pdf' },
    { label: 'Articles', value: 'text' },
    { label: 'Live', value: 'livestream' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getYouTubeEmbedUrl(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}?rel=0` : url;
}

// ─── Content Viewer ───────────────────────────────────────────────────────────

function ContentViewer({ content, onClose }) {
    const Icon = TYPE_ICON[content.type] || BookOpen;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${TYPE_COLOR[content.type] || 'from-gray-400 to-gray-600'} flex items-center justify-center`}>
                            <Icon size={20} className="text-white" />
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{TYPE_LABEL[content.type]}</span>
                            <h3 className="text-lg font-bold text-gray-900 leading-tight">{content.title}</h3>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {content.description && (
                        <p className="text-gray-600 text-sm leading-relaxed">{content.description}</p>
                    )}

                    {/* Video */}
                    {content.type === 'video' && (
                        <>
                            {content.youtubeUrl ? (
                                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                                    <iframe
                                        className="absolute inset-0 w-full h-full rounded-2xl"
                                        src={getYouTubeEmbedUrl(content.youtubeUrl)}
                                        title={content.title}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>
                            ) : content.fileUrl ? (
                                <video
                                    controls
                                    className="w-full rounded-2xl bg-black"
                                    src={content.fileUrl}
                                    preload="metadata"
                                />
                            ) : null}
                        </>
                    )}

                    {/* PDF */}
                    {content.type === 'pdf' && content.fileUrl && (
                        <div className="space-y-3">
                            <iframe
                                src={content.fileUrl}
                                className="w-full rounded-2xl border border-gray-200"
                                style={{ height: '60vh' }}
                                title={content.title}
                            />
                            <a
                                href={content.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-2 text-sm font-medium text-primary hover:underline"
                            >
                                <ExternalLink size={16} />
                                <span>Open in new tab</span>
                            </a>
                        </div>
                    )}

                    {/* Image */}
                    {content.type === 'image' && content.fileUrl && (
                        <img
                            src={content.fileUrl}
                            alt={content.title}
                            className="w-full rounded-2xl object-contain max-h-[60vh]"
                        />
                    )}

                    {/* Text / Article */}
                    {content.type === 'text' && content.body && (
                        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {content.body}
                        </div>
                    )}

                    {/* Live Stream */}
                    {content.type === 'livestream' && content.externalUrl && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
                                <Radio size={32} className="text-orange-600 animate-pulse" />
                            </div>
                            <p className="text-gray-600 mb-4">This is a live session. Click below to join.</p>
                            <a
                                href={content.externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-semibold px-6 py-3 rounded-xl hover:shadow-lg transition-all"
                            >
                                <ExternalLink size={18} />
                                <span>Join Live Session</span>
                            </a>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── Purchase Modal ───────────────────────────────────────────────────────────

function PurchaseModal({ content, onClose, onPurchased, walletBalance }) {
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handlePurchase = async (e) => {
        e.preventDefault();
        if (pin.length < 4) { setError('Enter your 4–6 digit transaction PIN'); return; }
        setLoading(true);
        setError('');
        try {
            await axios.post(`/api/academy/${content.id}/purchase`,
                { transactionPin: pin },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            onPurchased(content.id);
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Purchase failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const sufficient = walletBalance >= content.price;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center space-x-2 mb-1">
                                <Lock size={18} />
                                <span className="text-sm font-medium opacity-90">Unlock Premium Content</span>
                            </div>
                            <h3 className="text-xl font-bold">{content.title}</h3>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    {/* Price & Balance */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 rounded-2xl p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">Cost</p>
                            <p className="text-2xl font-bold text-gray-900">₦{content.price?.toLocaleString()}</p>
                        </div>
                        <div className={`rounded-2xl p-4 text-center ${sufficient ? 'bg-green-50' : 'bg-red-50'}`}>
                            <p className="text-xs text-gray-500 mb-1">Your Balance</p>
                            <p className={`text-2xl font-bold ${sufficient ? 'text-green-600' : 'text-red-600'}`}>
                                ₦{walletBalance?.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {!sufficient ? (
                        <div className="flex items-center space-x-2 bg-red-50 text-red-700 rounded-xl p-4">
                            <AlertCircle size={18} />
                            <p className="text-sm font-medium">Insufficient balance. Please fund your wallet first.</p>
                        </div>
                    ) : (
                        <form onSubmit={handlePurchase} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Transaction PIN
                                </label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={pin}
                                    onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Enter your PIN"
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                    autoComplete="off"
                                />
                            </div>

                            {error && (
                                <div className="flex items-center space-x-2 bg-red-50 text-red-600 rounded-xl p-3">
                                    <AlertCircle size={16} />
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || pin.length < 4}
                                className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-3.5 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Unlock size={18} />
                                        <span>Unlock for ₦{content.price?.toLocaleString()}</span>
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── Content Card ─────────────────────────────────────────────────────────────

function ContentCard({ content, onView, onUnlock }) {
    const Icon = TYPE_ICON[content.type] || BookOpen;
    const isLocked = content.locked;
    const isPremium = content.plan === 'premium';

    return (
        <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 flex flex-col"
        >
            {/* Thumbnail */}
            <div className={`relative h-40 bg-gradient-to-br ${TYPE_COLOR[content.type] || 'from-gray-400 to-gray-600'} flex items-center justify-center`}>
                {content.thumbnailUrl ? (
                    <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-cover" />
                ) : (
                    <Icon size={48} className="text-white/60" />
                )}
                {/* Plan badge */}
                <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold flex items-center space-x-1 ${isPremium ? 'bg-amber-400 text-amber-900' : 'bg-emerald-400 text-emerald-900'
                    }`}>
                    {isPremium ? <Lock size={10} /> : <Unlock size={10} />}
                    <span>{isPremium ? 'Premium' : 'Free'}</span>
                </div>
                {/* Type badge */}
                <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/30 backdrop-blur-sm rounded-full text-xs font-medium text-white">
                    {TYPE_LABEL[content.type]}
                </div>
                {/* Lock overlay */}
                {isLocked && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                        <Lock size={36} className="text-white" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-4 flex-1 flex flex-col">
                <h4 className="font-bold text-gray-900 mb-1 line-clamp-2 flex-1">{content.title}</h4>
                {content.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{content.description}</p>
                )}

                <div className="mt-auto">
                    {isLocked ? (
                        <button
                            onClick={() => onUnlock(content)}
                            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold py-2.5 rounded-xl hover:shadow-md transition-all"
                        >
                            <Lock size={14} />
                            <span>Unlock ₦{content.price?.toLocaleString()}</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => onView(content)}
                            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-primary to-secondary text-white text-sm font-bold py-2.5 rounded-xl hover:shadow-md transition-all"
                        >
                            <Eye size={14} />
                            <span>View Content</span>
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Academy() {
    const [contents, setContents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('');
    const [search, setSearch] = useState('');
    const [walletBalance, setWalletBalance] = useState(0);
    const [viewing, setViewing] = useState(null);
    const [purchasing, setPurchasing] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchContents = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const [contentRes, walletRes] = await Promise.all([
                axios.get('/api/academy', { headers }),
                axios.get('/api/wallet/balance', { headers }),
            ]);
            setContents(contentRes.data.contents || []);
            setWalletBalance(walletRes.data.wallet || 0);
        } catch {
            showToast('Failed to load Academy content', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchContents(); }, [fetchContents]);

    const handlePurchased = (contentId) => {
        setContents(prev => prev.map(c => c.id === contentId ? { ...c, locked: false } : c));
        showToast('Content unlocked! Enjoy learning 🎉');
    };

    const handleViewLocked = (content) => {
        // Fetch full content after unlock
        const token = localStorage.getItem('token');
        axios.get(`/api/academy/${content.id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setViewing(res.data.content))
            .catch(() => showToast('Failed to load content', 'error'));
    };

    // Derive filtered list
    const filtered = contents.filter(c => {
        const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase());
        if (!matchSearch) return false;
        if (!activeFilter) return true;
        if (activeFilter === 'free' || activeFilter === 'premium') return c.plan === activeFilter;
        return c.type === activeFilter;
    });

    const freeCount = contents.filter(c => c.plan === 'free').length;
    const premiumCount = contents.filter(c => c.plan === 'premium').length;

    return (
        <div className="space-y-6">
            {/* Hero */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl shadow-xl"
                style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #7c3aed 100%)' }}
            >
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute -top-8 -right-8">
                        <GraduationCap size={180} className="text-white" />
                    </div>
                </div>
                <div className="relative z-10 p-8">
                    <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-white/15 rounded-xl backdrop-blur-sm">
                            <GraduationCap size={28} className="text-white" />
                        </div>
                        <span className="text-white/70 text-sm font-semibold tracking-widest uppercase">Ufriends Academy</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-white mb-2">Learn &amp; Grow</h1>
                    <p className="text-white/70 text-sm max-w-sm">
                        Study guides, tutorials, videos, and more — curated to help you succeed.
                    </p>
                    <div className="flex items-center space-x-4 mt-5">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-white text-sm">
                            <span className="font-bold text-emerald-300">{freeCount}</span> Free
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-white text-sm">
                            <span className="font-bold text-amber-300">{premiumCount}</span> Premium
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Search */}
            <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search lessons, guides, tutorials..."
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-sm"
                />
            </div>

            {/* Filters */}
            <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
                {FILTERS.map(f => (
                    <button
                        key={f.value}
                        onClick={() => setActiveFilter(f.value)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeFilter === f.value
                                ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-primary/40 hover:text-primary'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Content Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl h-64 animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                    <GraduationCap size={56} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-500 mb-1">No content found</h3>
                    <p className="text-sm text-gray-400">Try a different filter or check back later.</p>
                </div>
            ) : (
                <motion.div
                    layout
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                    <AnimatePresence>
                        {filtered.map(c => (
                            <motion.div
                                key={c.id}
                                layout
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                            >
                                <ContentCard
                                    content={c}
                                    onView={(item) => {
                                        if (item.plan === 'free' || !item.locked) {
                                            const token = localStorage.getItem('token');
                                            axios.get(`/api/academy/${item.id}`, { headers: { Authorization: `Bearer ${token}` } })
                                                .then(res => setViewing(res.data.content))
                                                .catch(() => showToast('Failed to load content', 'error'));
                                        } else {
                                            setPurchasing(item);
                                        }
                                    }}
                                    onUnlock={(item) => setPurchasing(item)}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* Viewer Modal */}
            <AnimatePresence>
                {viewing && <ContentViewer content={viewing} onClose={() => setViewing(null)} />}
            </AnimatePresence>

            {/* Purchase Modal */}
            <AnimatePresence>
                {purchasing && (
                    <PurchaseModal
                        content={purchasing}
                        walletBalance={walletBalance}
                        onClose={() => setPurchasing(null)}
                        onPurchased={(id) => {
                            handlePurchased(id);
                            handleViewLocked(purchasing);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 30 }}
                        className={`fixed bottom-6 right-6 z-[100] flex items-center space-x-3 px-5 py-3.5 rounded-2xl shadow-xl font-medium text-sm ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
                            }`}
                    >
                        {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                        <span>{toast.msg}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
