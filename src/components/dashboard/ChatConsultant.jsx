import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import {
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    BadgeCheck,
    Bot,
    Brain,
    Calculator,
    Check,
    CheckCheck,
    ChevronDown,
    ChevronRight,
    CircleDot,
    Clock,
    Copy,
    CornerDownLeft,
    CreditCard,
    ExternalLink,
    Eye,
    FileSpreadsheet,
    FileText,
    Globe,
    HelpCircle,
    Info,
    Landmark,
    Layers,
    Lightbulb,
    Lock,
    Loader2,
    MessageSquare,
    Mic,
    MoreHorizontal,
    PanelLeft,
    Phone,
    Plus,
    RadioTower,
    RefreshCw,
    ScanText,
    Search,
    Send,
    Share2,
    Shield,
    ShieldCheck,
    Sparkles,
    Trash2,
    Volume2,
    Wallet,
    Wifi,
    X,
    Zap,
} from 'lucide-react';
import Logo from '../ui/Logo';

const STORAGE_KEY = 'ufriends_ai_chats_v4';
const MAX_MESSAGE_CHARS = 2000;

const AVAILABLE_MODELS = [
    { id: 'deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash', badge: 'Default', desc: 'Ultra-fast reasoning' },
    { id: 'qwen3.8-omni-flash', name: 'Qwen 3.8 Omni Flash', badge: 'Fast', desc: 'Multimodal speed' },
    { id: 'qwen3.8-flash', name: 'Qwen 3.8 Flash', badge: 'Light', desc: 'Low latency' },
    { id: 'glm-5.3', name: 'GLM 5.3', badge: 'Pro', desc: 'Deep knowledge' },
    { id: 'kimi-k3', name: 'Kimi K3', badge: 'Long Context', desc: 'Complex reasoning' },
];

const STARTER_SERVICES = [
    {
        title: 'Cheap Wholesale Data',
        detail: 'MTN, Airtel, Glo, 9mobile SME bundles from ₦290/GB',
        badge: 'Wholesale Data',
        icon: Wifi,
        prompt: 'Show MTN and Airtel wholesale data plans',
        categoryTag: 'Data Bundles',
    },
    {
        title: 'Instant Airtime Recharge',
        detail: 'Instant auto-carrier detection for any Nigerian phone number',
        badge: 'Airtime',
        icon: Phone,
        prompt: 'I want to recharge airtime for 08031234567',
        categoryTag: 'Airtime Recharge',
    },
    {
        title: 'BVN & NIN Correction',
        detail: 'Lawful online demographic modification & official slip retrieval',
        badge: 'Identity',
        icon: ShieldCheck,
        prompt: 'What are the steps for BVN and NIN modification?',
        categoryTag: 'Identity Services',
    },
    {
        title: 'Wallet & Virtual NUBAN',
        detail: 'Automated Monnify / Wema Bank Virtual Account instant funding',
        badge: 'Wallet',
        icon: Wallet,
        prompt: 'How do I fund my wallet and what is my virtual account?',
        categoryTag: 'Wallet & Funding',
    },
];

function makeId() {
    return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function initialChat(userName) {
    const now = Date.now();
    return {
        id: makeId(),
        title: 'New conversation',
        messages: [
            {
                id: 'msg_welcome',
                role: 'assistant',
                text: `Hello ${userName || 'there'}! I'm your **Ufriends Assistant**.\n\nI can help you buy wholesale data & airtime, fund your wallet via your unique virtual account, or guide you through BVN/NIN verification.`,
                intro: true,
                timestamp: now,
            },
        ],
        model: 'deepseek-v4.1-flash',
        createdAt: now,
        updatedAt: now,
    };
}

function loadSavedChats(userName) {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch {}
    return [initialChat(userName)];
}

function formatTime(timestamp) {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ─────────────────────────────────────────────────────────
 * NON-GENERIC ACTION STEPPER (Directly inspired by Image 1)
 * ───────────────────────────────────────────────────────── */
function ActionStepper({ steps = [], thought = '', isGenerating = false, generationLabel = 'Processing request...' }) {
    const [thoughtOpen, setThoughtOpen] = useState(false);

    const getStepIcon = (type) => {
        switch (type) {
            case 'scan':
                return { icon: ScanText, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' };
            case 'carrier':
                return { icon: RadioTower, color: 'text-amber-600 bg-amber-50 border-amber-100' };
            case 'wallet':
                return { icon: Landmark, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
            case 'quote':
                return { icon: Calculator, color: 'text-blue-600 bg-blue-50 border-blue-100' };
            case 'compliance':
                return { icon: ShieldCheck, color: 'text-purple-600 bg-purple-50 border-purple-100' };
            case 'ready':
                return { icon: CheckCheck, color: 'text-teal-600 bg-teal-50 border-teal-100' };
            default:
                return { icon: Zap, color: 'text-slate-600 bg-slate-50 border-slate-200' };
        }
    };

    return (
        <div className="w-full space-y-2 select-text font-sans">
            {/* Thought collapsible block (like Image 1: Thought >) */}
            {thought && (
                <div className="rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 text-xs shadow-xs transition-all">
                    <button
                        type="button"
                        onClick={() => setThoughtOpen(!thoughtOpen)}
                        className="flex w-full items-center justify-between text-left text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                                <Brain size={13} strokeWidth={2.2} />
                            </span>
                            <span className="font-semibold text-slate-800">
                                Thought {thoughtOpen ? 'overview' : ''}
                            </span>
                            <span className="text-[11px] text-slate-400">
                                ({Math.round(thought.length / 50) || 1}s reasoning)
                            </span>
                        </div>
                        <ChevronDown
                            size={14}
                            className={`text-slate-400 transition-transform duration-200 ${thoughtOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    <AnimatePresence>
                        {thoughtOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-2 pt-2 border-t border-slate-100 text-[11.5px] leading-relaxed text-slate-500 font-mono bg-slate-50/70 p-2.5 rounded-lg whitespace-pre-wrap">
                                    {thought}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Viewed badge row (like Image 1: 👁 Viewed Onboarding Demo) */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium shadow-2xs">
                    <Eye size={13} className="text-slate-500" />
                    <span className="text-slate-400 text-[11px]">Viewed</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                        Ufriends VTU Network
                    </span>
                </span>

                {steps.map((step, idx) => {
                    const { icon: StepIcon, color } = getStepIcon(step.type);
                    return (
                        <span
                            key={idx}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px] font-medium shadow-2xs ${color}`}
                            title={step.detail || step.label}
                        >
                            <StepIcon size={12} strokeWidth={2.2} />
                            <span>{step.label}</span>
                        </span>
                    );
                })}

                {isGenerating && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50/80 px-2.5 py-1 text-[11.5px] font-medium text-blue-700 animate-pulse">
                        <Loader2 size={12} className="animate-spin text-blue-600" />
                        <span>{generationLabel}</span>
                    </span>
                )}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────
 * INTERACTIVE TRANSACTION QUOTE CARD
 * ───────────────────────────────────────────────────────── */
function QuoteCard({ quote, onConfirm, onCancel }) {
    const [confirmed, setConfirmed] = useState(quote.status === 'confirmed');
    const [loading, setLoading] = useState(false);
    const [network, setNetwork] = useState(quote.network || 'MTN');

    const networkColors = {
        MTN: 'bg-amber-400 text-amber-950 border-amber-300',
        Airtel: 'bg-red-500 text-white border-red-400',
        Glo: 'bg-emerald-600 text-white border-emerald-500',
        '9mobile': 'bg-lime-800 text-white border-lime-700',
    };

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm(quote.quoteId, network);
            setConfirmed(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
            <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Calculator size={15} strokeWidth={2.2} />
                    </span>
                    <div>
                        <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            {quote.service === 'data' ? 'Data Order Quote' : 'Airtime Recharge Quote'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">Ref: {quote.quoteId}</p>
                    </div>
                </div>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${networkColors[network] || 'bg-slate-800 text-white'}`}>
                    {network}
                </span>
            </div>

            <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium">Recipient</span>
                        <span className="font-semibold text-slate-800 font-mono">{quote.phone}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium">Service Tariff</span>
                        <span className="font-bold text-slate-900 text-sm">₦{Number(quote.total || quote.amount).toLocaleString()}</span>
                    </div>
                </div>

                {quote.plan && (
                    <div className="rounded-xl bg-blue-50/50 border border-blue-100 px-3 py-2 text-xs text-blue-900 flex items-center justify-between">
                        <span className="font-medium text-slate-600">Bundle Plan:</span>
                        <span className="font-bold">{quote.plan}</span>
                    </div>
                )}

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                    <span>Transaction Fee: ₦0.00</span>
                    <span className="flex items-center gap-1 font-medium text-emerald-600">
                        <Check size={12} strokeWidth={2.5} /> Instant Delivery
                    </span>
                </div>

                <div className="pt-2">
                    {confirmed ? (
                        <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs font-semibold text-emerald-700">
                            <BadgeCheck size={16} />
                            Order Confirmed & Credited
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={loading}
                                onClick={handleConfirm}
                                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                Confirm Order (₦{Number(quote.total || quote.amount).toLocaleString()})
                            </button>
                            <button
                                type="button"
                                onClick={() => onCancel(quote.quoteId)}
                                className="rounded-xl border border-slate-200 hover:bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-600 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────
 * INTERACTIVE WALLET & VIRTUAL ACCOUNT CARD
 * ───────────────────────────────────────────────────────── */
function WalletCard({ wallet, onAction }) {
    const [copied, setCopied] = useState(false);
    const accNum = wallet?.virtualAccount?.accountNumber || '9801234567';

    const handleCopy = () => {
        navigator.clipboard.writeText(accNum);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
            <div className="border-b border-slate-100 bg-linear-to-r from-blue-50 to-indigo-50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                        <Wallet size={15} />
                    </span>
                    <div>
                        <p className="text-xs font-bold text-slate-900">Ufriends Dedicated NUBAN</p>
                        <p className="text-[10px] text-slate-500">Automated Instant Credit</p>
                    </div>
                </div>
                <span className="rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                    Active
                </span>
            </div>

            <div className="p-4 space-y-3">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Bank Name</span>
                        <span className="text-xs font-bold text-slate-900">{wallet?.virtualAccount?.bankName || 'Wema Bank (Monnify)'}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Account Number</span>
                        <div className="flex items-center gap-1.5">
                            <span className="font-mono text-sm font-bold text-blue-700">{accNum}</span>
                            <button
                                type="button"
                                onClick={handleCopy}
                                className="rounded-md p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                title="Copy account number"
                            >
                                {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between px-1 text-xs text-slate-600">
                    <span>Account Name:</span>
                    <span className="font-semibold text-slate-800">{wallet?.virtualAccount?.accountName || 'Ufriends / User'}</span>
                </div>

                <div className="rounded-xl bg-blue-50/40 p-2.5 border border-blue-100 text-[11px] text-slate-600 leading-relaxed">
                    Transfer any amount from your bank app (Opay, PalmPay, GTB, Zenith, Kuda) to fund your wallet instantly with 0% extra fee.
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────
 * CLEAN MARKDOWN TEXT FORMATTER
 * ───────────────────────────────────────────────────────── */
function CleanMarkdown({ content }) {
    if (!content) return null;

    const renderFormatted = (text) => {
        const parts = text.split('\n');
        return parts.map((line, idx) => {
            const trimmed = line.trim();

            if (trimmed.startsWith('# ')) {
                return (
                    <h2 key={idx} className="mt-4 mb-2 text-base font-bold text-slate-900 tracking-tight">
                        {trimmed.slice(2)}
                    </h2>
                );
            }
            if (trimmed.startsWith('## ')) {
                return (
                    <h3 key={idx} className="mt-3 mb-1.5 text-sm font-bold text-slate-900">
                        {trimmed.slice(3)}
                    </h3>
                );
            }
            if (trimmed.startsWith('### ')) {
                return (
                    <h4 key={idx} className="mt-2.5 mb-1 text-xs font-bold uppercase tracking-wider text-slate-700">
                        {trimmed.slice(4)}
                    </h4>
                );
            }
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                return (
                    <li key={idx} className="ml-4 list-disc text-xs leading-relaxed text-slate-700 mb-1">
                        {parseInlineStyles(trimmed.slice(2))}
                    </li>
                );
            }
            if (/^\d+\.\s/.test(trimmed)) {
                return (
                    <li key={idx} className="ml-4 list-decimal text-xs leading-relaxed text-slate-700 mb-1">
                        {parseInlineStyles(trimmed.replace(/^\d+\.\s*/, ''))}
                    </li>
                );
            }
            if (trimmed.startsWith('> ')) {
                return (
                    <blockquote key={idx} className="my-2 border-l-2 border-blue-500 bg-blue-50/50 py-1.5 px-3 text-xs text-slate-700 rounded-r-lg">
                        {parseInlineStyles(trimmed.slice(2))}
                    </blockquote>
                );
            }
            if (trimmed === '---') {
                return <hr key={idx} className="my-3 border-slate-200" />;
            }
            if (!trimmed) {
                return <div key={idx} className="h-1.5" />;
            }

            return (
                <p key={idx} className="text-xs leading-relaxed text-slate-700 mb-1.5">
                    {parseInlineStyles(trimmed)}
                </p>
            );
        });
    };

    const parseInlineStyles = (str) => {
        // Split by bold (**text**)
        const boldRegex = /\*\*(.*?)\*\*/g;
        const elements = [];
        let lastIndex = 0;
        let match;

        while ((match = boldRegex.exec(str)) !== null) {
            if (match.index > lastIndex) {
                elements.push(str.substring(lastIndex, match.index));
            }
            elements.push(
                <strong key={`b_${match.index}`} className="font-semibold text-slate-900">
                    {match[1]}
                </strong>
            );
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < str.length) {
            elements.push(str.substring(lastIndex));
        }

        return elements.length > 0 ? elements : str;
    };

    return <div className="space-y-0.5 select-text">{renderFormatted(content)}</div>;
}

/* ─────────────────────────────────────────────────────────
 * MAIN CHAT CONSULTANT COMPONENT (LIGHT THEME DEFAULT)
 * ───────────────────────────────────────────────────────── */
export default function ChatConsultant({ isOpen, onClose, whatsappNumber, userName }) {
    const [chats, setChats] = useState(() => loadSavedChats(userName));
    const [activeChatId, setActiveChatId] = useState(() => chats[0]?.id || 'chat_default');
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState('deepseek-v4.1-flash');
    const [modelMenuOpen, setModelMenuOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showScrollBottom, setShowScrollBottom] = useState(false);

    // Active generating progress stepper
    const [currentGeneratingSteps, setCurrentGeneratingSteps] = useState(null);

    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const inputRef = useRef(null);

    const activeChat = useMemo(() => {
        return chats.find((c) => c.id === activeChatId) || chats[0];
    }, [chats, activeChatId]);

    // Save chats to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(chats.slice(0, 30)));
        } catch {}
    }, [chats]);

    // Auto scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [activeChat?.messages, loading, currentGeneratingSteps]);

    // Scroll detector
    const handleScroll = () => {
        if (!chatContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 180);
    };

    const updateActiveChat = (updater) => {
        setChats((prev) => prev.map((c) => (c.id === activeChatId ? updater(c) : c)));
    };

    const handleNewChat = () => {
        if (loading) return;
        const newC = initialChat(userName);
        setChats((prev) => [newC, ...prev]);
        setActiveChatId(newC.id);
        setInput('');
        setCurrentGeneratingSteps(null);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleDeleteChat = async (chatId, e) => {
        e.stopPropagation();
        if (loading) return;
        try {
            await axios.post('/api/ai-chat/reset', { conversationId: chatId });
        } catch {}

        const remaining = chats.filter((c) => c.id !== chatId);
        const nextChats = remaining.length ? remaining : [initialChat(userName)];
        setChats(nextChats);
        if (activeChatId === chatId) setActiveChatId(nextChats[0].id);
    };

    const handleConfirmQuote = async (quoteId, network) => {
        try {
            const res = await axios.post('/api/ai-chat/confirm', { quoteId, network });
            if (res.data?.success) {
                updateActiveChat((c) => ({
                    ...c,
                    messages: [
                        ...c.messages,
                        {
                            id: makeId(),
                            role: 'assistant',
                            text: `**Transaction Successful!**\n\nYour order has been verified and processed. Reference: \`${res.data.quote?.transactionRef}\`.\nUpdated Wallet Balance: **₦${Number(res.data.newBalance || 0).toLocaleString()}**.`,
                            timestamp: Date.now(),
                        },
                    ],
                }));
            }
        } catch (err) {
            console.error('Confirm quote failed:', err);
        }
    };

    const handleCancelQuote = (quoteId) => {
        axios.post('/api/ai-chat/cancel', { quoteId }).catch(() => {});
        updateActiveChat((c) => ({
            ...c,
            messages: [
                ...c.messages,
                {
                    id: makeId(),
                    role: 'assistant',
                    text: `*(Quote ${quoteId} was cancelled by user)*`,
                    timestamp: Date.now(),
                },
            ],
        }));
    };

    const handleSendMessage = async (customPrompt) => {
        const textToSend = (customPrompt || input).trim();
        if (!textToSend || loading || !activeChat) return;

        const userMsgId = makeId();
        const assistantMsgId = makeId();
        const now = Date.now();

        // Detect category tag for user chip (like Image 1: Onboarding Demos)
        let categoryTag = 'General Inquiry';
        if (/(airtime|recharge|topup)/i.test(textToSend)) categoryTag = 'Airtime Recharge';
        else if (/(data|bundle|sme|gig|gb)/i.test(textToSend)) categoryTag = 'Data Bundles';
        else if (/(bvn|nin|slip|identity)/i.test(textToSend)) categoryTag = 'Identity Services';
        else if (/(wallet|balance|fund|nuban)/i.test(textToSend)) categoryTag = 'Wallet & Funding';

        // Add user message
        const updatedTitle = activeChat.title === 'New conversation' ? textToSend.slice(0, 36) : activeChat.title;
        updateActiveChat((c) => ({
            ...c,
            title: updatedTitle,
            updatedAt: now,
            messages: [
                ...c.messages,
                {
                    id: userMsgId,
                    role: 'user',
                    text: textToSend,
                    categoryTag,
                    timestamp: now,
                },
            ],
        }));

        setInput('');
        setLoading(true);

        // Pre-render immediate action stepper steps while waiting
        setCurrentGeneratingSteps({
            steps: [
                { type: 'scan', label: 'Analyzing request intent', status: 'done' },
                { type: 'ready', label: 'Querying Ufriends platform knowledge', status: 'done' },
            ],
            thought: 'Parsing request and parameters for wholesale VTU fulfillment...',
        });

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(
                '/api/ai-chat/consult',
                {
                    message: textToSend,
                    conversationId: activeChat.id,
                    model: selectedModel,
                },
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    timeout: 30000,
                }
            );

            const { reply, thought, actionSteps, actionCard, model } = res.data || {};

            updateActiveChat((c) => ({
                ...c,
                updatedAt: Date.now(),
                messages: [
                    ...c.messages,
                    {
                        id: assistantMsgId,
                        role: 'assistant',
                        text: reply || 'Here are the details for your request.',
                        thought: thought || '',
                        actionSteps: actionSteps || [],
                        actionCard: actionCard || null,
                        model: model || selectedModel,
                        timestamp: Date.now(),
                    },
                ],
            }));
        } catch (error) {
            console.error('Chat error:', error);
            updateActiveChat((c) => ({
                ...c,
                messages: [
                    ...c.messages,
                    {
                        id: assistantMsgId,
                        role: 'assistant',
                        text: error.response?.data?.error || "I'm having a brief connection issue. Please verify your connection or retry in a few moments.",
                        error: true,
                        timestamp: Date.now(),
                    },
                ],
            }));
        } finally {
            setLoading(false);
            setCurrentGeneratingSteps(null);
        }
    };

    const filteredChats = useMemo(() => {
        if (!searchQuery.trim()) return chats;
        return chats.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [chats, searchQuery]);

    const activeModelObj = AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex h-[100dvh] w-full bg-[#f8fafc] text-slate-900 font-sans antialiased overflow-hidden select-none"
            >
                {/* ────────────────── LEFT SIDEBAR (LIGHT THEME - IMAGE 2 & 3 STYLE) ────────────────── */}
                <aside
                    className={`shrink-0 border-r border-slate-200/90 bg-white flex flex-col transition-all duration-300 ${
                        sidebarOpen ? 'w-[280px]' : 'w-0 overflow-hidden'
                    }`}
                >
                    {/* Header */}
                    <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
                        <div className="flex items-center gap-2.5">
                            <Logo className="h-8 w-8" />
                            <div>
                                <span className="font-bold text-slate-900 text-sm tracking-tight">Ufriends</span>
                                <span className="block text-[10px] text-slate-400 font-medium">AI Consultant</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(false)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                            title="Collapse sidebar"
                        >
                            <PanelLeft size={16} />
                        </button>
                    </div>

                    {/* New Conversation Button */}
                    <div className="p-3">
                        <button
                            type="button"
                            onClick={handleNewChat}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] px-3.5 py-2.5 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
                        >
                            <Plus size={15} strokeWidth={2.4} />
                            <span>New AI chat</span>
                        </button>
                    </div>

                    {/* Search chats */}
                    <div className="px-3 pb-2">
                        <div className="relative flex items-center">
                            <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search conversations..."
                                className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-1.5 pl-8 pr-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    {/* History list */}
                    <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
                        <p className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Recent Chats
                        </p>
                        {filteredChats.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => setActiveChatId(chat.id)}
                                className={`group flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-all cursor-pointer ${
                                    chat.id === activeChatId
                                        ? 'bg-blue-50/90 text-blue-700 font-semibold shadow-2xs'
                                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                                }`}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <MessageSquare size={13} className="shrink-0 text-slate-400 group-hover:text-blue-500" />
                                    <span className="truncate">{chat.title}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => handleDeleteChat(chat.id, e)}
                                    className="opacity-0 group-hover:opacity-100 rounded-md p-1 text-slate-300 hover:bg-white hover:text-red-500 transition-all cursor-pointer"
                                    title="Delete conversation"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Quick Tools & Support Drawer */}
                    <div className="border-t border-slate-100 p-3 space-y-1">
                        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-2.5 text-xs">
                            <div className="flex items-center gap-1.5 font-semibold text-blue-900 text-[11px] mb-1">
                                <Sparkles size={12} className="text-blue-600" />
                                Wholesale Direct
                            </div>
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                                Nigerian telecommunications wholesale rates applied automatically.
                            </p>
                        </div>

                        {/* User Profile Footer Pill (Image 3 style) */}
                        <div className="flex items-center justify-between rounded-xl p-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 font-bold text-white text-xs">
                                    {userName ? userName[0].toUpperCase() : 'U'}
                                    <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate font-semibold text-slate-900 text-xs">{userName || 'Valued User'}</p>
                                    <p className="truncate text-[10px] text-slate-400">ufriends.com.ng</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                title="Exit workspace"
                            >
                                <ExternalLink size={14} />
                            </button>
                        </div>
                    </div>
                </aside>

                {/* ────────────────── MAIN CHAT WORKSPACE (IMAGE 1 STYLE) ────────────────── */}
                <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] relative">
                    {/* Top Bar Header (Image 1 Style) */}
                    <header className="h-16 shrink-0 border-b border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            {!sidebarOpen && (
                                <button
                                    type="button"
                                    onClick={() => setSidebarOpen(true)}
                                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                                    title="Open sidebar"
                                >
                                    <PanelLeft size={18} />
                                </button>
                            )}

                            {/* Title with dropdown indicator + Private badge */}
                            <div className="flex items-center gap-2 min-w-0">
                                <h1 className="text-sm font-bold text-slate-900 truncate">
                                    {activeChat?.title || 'New AI chat'}
                                </h1>
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 border border-slate-200">
                                    <Lock size={10} />
                                    Private
                                </span>
                            </div>
                        </div>

                        {/* Top Actions: Share, More, Close */}
                        <div className="flex items-center gap-2">
                            {/* Model Pill Indicator (like Image 1: Gemini 3 Pro Beta) */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setModelMenuOpen(!modelMenuOpen)}
                                    className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                                >
                                    <Sparkles size={11} className="text-blue-600" />
                                    <span>{activeModelObj.name}</span>
                                    <span className="rounded bg-blue-50 text-blue-600 px-1 py-0.2 text-[9px] font-bold">
                                        {activeModelObj.badge}
                                    </span>
                                    <ChevronDown size={11} className="text-slate-400" />
                                </button>

                                {modelMenuOpen && (
                                    <div className="absolute right-0 top-full mt-1.5 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-fade-in font-sans">
                                        <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Select Model
                                        </p>
                                        {AVAILABLE_MODELS.map((m) => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedModel(m.id);
                                                    setModelMenuOpen(false);
                                                }}
                                                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                                                    selectedModel === m.id
                                                        ? 'bg-blue-50 text-blue-700 font-bold'
                                                        : 'text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div>
                                                    <p className="font-semibold">{m.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-normal">{m.desc}</p>
                                                </div>
                                                {selectedModel === m.id && <Check size={14} className="text-blue-600" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Share button (Image 1) */}
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    alert('Link copied to clipboard!');
                                }}
                                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                            >
                                <Share2 size={13} />
                                <span>Share</span>
                            </button>

                            {/* Close button (Image 1) */}
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                                title="Close AI chat"
                                aria-label="Close AI chat"
                            >
                                <X size={17} />
                            </button>
                        </div>
                    </header>

                    {/* Chat Messages Feed */}
                    <div
                        ref={chatContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6"
                    >
                        {/* Empty Starter Screen (Image 2 style) */}
                        {activeChat?.messages.length <= 1 && (
                            <div className="max-w-2xl mx-auto py-8 text-center animate-fade-in">
                                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3 shadow-2xs">
                                    <Sparkles size={24} />
                                </div>
                                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                                    What's on your mind?
                                </h2>
                                <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                                    Ask anything about Ufriends data bundles, automated wallet funding, or telecom transactions.
                                </p>

                                {/* 4 Service Cards Grid */}
                                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                                    {STARTER_SERVICES.map((srv) => (
                                        <button
                                            key={srv.title}
                                            type="button"
                                            onClick={() => handleSendMessage(srv.prompt)}
                                            className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-md hover:border-blue-400/50 transition-all cursor-pointer text-left"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                    <srv.icon size={18} strokeWidth={2} />
                                                </span>
                                                <span className="rounded-full bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-700 px-2 py-0.5 text-[10px] font-semibold text-slate-500 transition-colors">
                                                    {srv.badge}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-xs text-slate-900 group-hover:text-blue-700 transition-colors">
                                                    {srv.title}
                                                </h3>
                                                <p className="mt-1 text-[11px] text-slate-400 leading-normal">
                                                    {srv.detail}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Active Message History */}
                        {activeChat?.messages.map((msg) => {
                            const isUser = msg.role === 'user';

                            return (
                                <div key={msg.id} className={`w-full flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                                    {isUser ? (
                                        /* ──────── USER MESSAGE WITH CATEGORY BADGE (IMAGE 1 STYLE) ──────── */
                                        <div className="max-w-[85%] sm:max-w-[75%] flex flex-col items-end gap-1.5">
                                            {/* Context Tag Chip (like purple 'Onboarding Demos' chip in Image 1) */}
                                            {msg.categoryTag && (
                                                <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                                    <Zap size={10} />
                                                    {msg.categoryTag}
                                                </span>
                                            )}

                                            <div className="flex items-start gap-2.5">
                                                {/* User Bubble (Image 1 Style) */}
                                                <div className="rounded-2xl rounded-tr-sm bg-slate-100 text-slate-900 px-4 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-2xs">
                                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                                </div>

                                                {/* User Avatar */}
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-xs mt-0.5 shadow-2xs">
                                                    {userName ? userName[0].toUpperCase() : 'U'}
                                                </div>
                                            </div>

                                            <span className="text-[10px] text-slate-400 pr-9">
                                                {formatTime(msg.timestamp)}
                                            </span>
                                        </div>
                                    ) : (
                                        /* ──────── ASSISTANT MESSAGE (IMAGE 1 & 3 STYLE) ──────── */
                                        <div className="w-full max-w-3xl flex items-start gap-3">
                                            {/* Assistant Logo Avatar */}
                                            <div className="shrink-0 mt-0.5">
                                                <Logo className="h-7 w-7" />
                                            </div>

                                            <div className="flex-1 space-y-3 min-w-0">
                                                {/* Non-Generic Action Stepper (Image 1: Thought >, Viewed, Steps) */}
                                                {(msg.actionSteps?.length > 0 || msg.thought) && (
                                                    <ActionStepper
                                                        steps={msg.actionSteps || []}
                                                        thought={msg.thought || ''}
                                                    />
                                                )}

                                                {/* Interactive Action Card if returned */}
                                                {msg.actionCard && (
                                                    <div className="pt-1">
                                                        {msg.actionCard.type === 'quote' && (
                                                            <QuoteCard
                                                                quote={msg.actionCard.quote}
                                                                onConfirm={handleConfirmQuote}
                                                                onCancel={handleCancelQuote}
                                                            />
                                                        )}
                                                        {msg.actionCard.type === 'wallet' && (
                                                            <WalletCard
                                                                wallet={msg.actionCard.wallet}
                                                                onAction={(action) => handleSendMessage(action)}
                                                            />
                                                        )}
                                                    </div>
                                                )}

                                                {/* Clean Assistant Markdown Bubble */}
                                                <div className="rounded-2xl rounded-tl-sm bg-white border border-slate-200/90 p-4 shadow-2xs text-slate-800 text-xs sm:text-[13px]">
                                                    <CleanMarkdown content={msg.text} />
                                                </div>

                                                <span className="text-[10px] text-slate-400 block pl-1">
                                                    {formatTime(msg.timestamp)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Active Generating Stepper while waiting for AI */}
                        {loading && (
                            <div className="w-full max-w-3xl flex items-start gap-3 animate-fade-in">
                                <Logo className="h-7 w-7 shrink-0 mt-0.5 animate-pulse" />
                                <div className="flex-1 space-y-2">
                                    <ActionStepper
                                        steps={currentGeneratingSteps?.steps || []}
                                        thought={currentGeneratingSteps?.thought || ''}
                                        isGenerating={true}
                                        generationLabel="Generating Ufriends response..."
                                    />
                                    <div className="rounded-2xl rounded-tl-sm bg-white border border-slate-200 p-4 text-xs text-slate-400 flex items-center gap-2">
                                        <Loader2 size={14} className="animate-spin text-blue-600" />
                                        <span>Consulting Ufriends wholesale services...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Scroll to Bottom Floating Button (Image 1 Style) */}
                    {showScrollBottom && (
                        <button
                            type="button"
                            onClick={scrollToBottom}
                            className="absolute bottom-28 left-1/2 -translate-x-1/2 rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-md hover:bg-slate-50 transition-all cursor-pointer z-20"
                            title="Scroll to latest message"
                        >
                            <ArrowDown size={16} />
                        </button>
                    )}

                    {/* ────────────────── DOCKED MODERN CHAT INPUT (IMAGE 1 & 2 STYLE) ────────────────── */}
                    <div className="shrink-0 p-4 sm:px-8 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/90 to-transparent">
                        <div className="max-w-3xl mx-auto">
                            {/* Input Container Box */}
                            <div className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm transition-all focus-within:border-blue-500 focus-within:shadow-md">
                                {/* Context Chip at Top of Input (Image 1: kevin x louise chip) */}
                                <div className="flex items-center gap-1.5 pb-2">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
                                        <Bot size={11} className="text-blue-600" />
                                        <span>Ufriends Live Assistant</span>
                                        <button
                                            type="button"
                                            onClick={() => setInput('')}
                                            className="ml-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                        >
                                            <X size={10} />
                                        </button>
                                    </span>
                                </div>

                                {/* Textarea Input */}
                                <textarea
                                    ref={inputRef}
                                    rows={2}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Ask AI anything (e.g. 'Recharge ₦500 airtime to 08031234567')..."
                                    className="w-full resize-none bg-transparent px-1 text-xs sm:text-[13px] leading-relaxed text-slate-900 placeholder:text-slate-400 outline-none"
                                />

                                {/* Bottom Action Bar (Image 1 & 2 Style) */}
                                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                                    <div className="flex items-center gap-2">
                                        {/* Attachment Plus button */}
                                        <button
                                            type="button"
                                            onClick={() => handleSendMessage('Show all available service categories')}
                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                                            title="Add tools or services"
                                        >
                                            <Plus size={15} />
                                        </button>

                                        {/* Model pill in input (Image 1) */}
                                        <button
                                            type="button"
                                            onClick={() => setModelMenuOpen(true)}
                                            className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                        >
                                            <Sparkles size={10} className="text-blue-600" />
                                            <span>{activeModelObj.name}</span>
                                            <span className="text-[9px] text-slate-400">Beta</span>
                                        </button>

                                        {/* Globe knowledge icon (Image 2) */}
                                        <button
                                            type="button"
                                            onClick={() => handleSendMessage('What is the current MTN SME data rate?')}
                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                                            title="Search Ufriends Knowledge Base"
                                        >
                                            <Globe size={14} />
                                        </button>

                                        {/* Mic voice input (Image 1 & 2 & 3) */}
                                        <button
                                            type="button"
                                            onClick={() => alert('Voice input is ready for mobile & desktop microphone.')}
                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                                            title="Voice input"
                                        >
                                            <Mic size={14} />
                                        </button>
                                    </div>

                                    {/* Circular Upward Arrow Send Button (Image 1 Style) */}
                                    <button
                                        type="button"
                                        disabled={loading || !input.trim()}
                                        onClick={() => handleSendMessage()}
                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white transition-all shadow-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                        title="Send message"
                                    >
                                        <ArrowUp size={16} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>

                            {/* Centered Footer Disclaimer (Image 1 & 3) */}
                            <p className="mt-2 text-center text-[10px] text-slate-400">
                                Ufriends AI may make mistakes. Please verify important account and transaction details.
                            </p>
                        </div>
                    </div>
                </main>
            </motion.div>
        </AnimatePresence>
    );
}
