import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingFooter from '../components/landing/LandingFooter';
import PageMeta from '../components/seo/PageMeta';
import { 
    Globe, Smartphone, CheckCircle, ArrowRight, Shield, 
    Zap, Code, Layout, Server, Database, Smartphone as Phone,
    Apple, PlaySquare, Layers, HelpCircle, Mail, Phone as PhoneIcon,
    Check, X, AlertCircle, Loader2, TrendingUp, MessageCircle
} from 'lucide-react';
import Button from '../components/ui/Button';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const HelpTooltip = ({ text }) => (
    <div className="tooltip-container ml-1.5">
        <HelpCircle size={14} className="text-slate-400 hover:text-primary cursor-help transition-colors" />
        <div className="tooltip-content">{text}</div>
    </div>
);

export default function ResellerPage() {
    const navigate = useNavigate();
    const [dbPrices, setDbPrices] = useState([]);
    const [settings, setSettings] = useState({ contactWhatsapp: '', sitePhone: '' });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [paystackKey, setPaystackKey] = useState(null);

    const [contact, setContact] = useState({ email: '', phone: '' });
    const [selectedPlatforms, setSelectedPlatforms] = useState(['web']);
    const [hostingType, setHostingType] = useState('managed');
    const [extraServices, setExtraServices] = useState({
        printing: false,
        manual: false
    });
    const [publishing, setPublishing] = useState({
        android: 'none',
        ios: 'none'
    });

    const [totalPrice, setTotalPrice] = useState(0);

    useEffect(() => {
        // Load Paystack Script
        const script = document.createElement('script');
        script.src = 'https://js.paystack.co/v1/inline.js';
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    useEffect(() => {
        const fetchPaystackKey = async () => {
            try {
                const res = await axios.get('/api/reseller/paystack-config');
                setPaystackKey(res.data.publicKey);
            } catch (err) {
                console.error('Failed to load Paystack config:', err);
            }
        };
        fetchPaystackKey();
    }, []);

    useEffect(() => {
        // Check for pending verification in localStorage
        const pendingRef = localStorage.getItem('pending_reseller_verification');
        if (pendingRef) {
            verifyPayment(pendingRef);
        }
    }, []);

    const verifyPayment = async (reference) => {
        setVerifying(true);
        try {
            const res = await axios.get(`/api/reseller/verify/${reference}`);
            if (res.data.success) {
                toast.success('Payment verified successfully!');
                localStorage.removeItem('pending_reseller_verification');
                navigate(`/reseller/status/${reference}`);
            } else {
                toast.error(res.data.error || 'Verification failed');
            }
        } catch (err) {
            console.error('Verification error:', err);
            toast.error('Verification failed. We will keep trying in the background.');
        } finally {
            setVerifying(false);
        }
    };
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [pricesRes, settingsRes] = await Promise.all([
                    axios.get('/api/reseller/options'),
                    axios.get('/api/admin/config/public-settings')
                ]);
                setDbPrices(pricesRes.data);
                if (settingsRes.data?.settings) {
                    setSettings(settingsRes.data.settings);
                }
            } catch (err) {
                console.error('Failed to fetch data:', err);
                toast.error('Failed to load pricing or settings');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const whatsappNumber = '2348169696095';
    const sitePhone = '+234 816 969 6095';
    const whatsappGroupLink = 'https://chat.whatsapp.com/CEfJtZRVQofFj8SQr8kHl2';

    useEffect(() => {
        if (dbPrices.length === 0) return;

        let total = 0;
        const findPrice = (cat, name) => {
            const opt = dbPrices.find(o => o.category === cat && o.name === name);
            return opt ? opt.price : 0;
        };

        selectedPlatforms.forEach(p => {
            total += findPrice(p, hostingType);
            
            if (p === 'android' && publishing.android !== 'none') {
                total += findPrice('publishing_android', publishing.android);
            }
            if (p === 'ios' && publishing.ios !== 'none') {
                total += findPrice('publishing_ios', publishing.ios);
            }
        });

        if (extraServices.printing) total += findPrice('extra', 'printing');
        if (extraServices.manual) total += findPrice('extra', 'manual');

        setTotalPrice(total);
    }, [selectedPlatforms, hostingType, extraServices, publishing, dbPrices]);

    const togglePlatform = (id) => {
        setSelectedPlatforms(prev => 
            prev.includes(id) 
                ? (prev.length > 1 ? prev.filter(p => p !== id) : prev) 
                : [...prev, id]
        );
    };

    const handleSubmit = async () => {
        // Input validation
        if (!contact.email || !contact.phone) {
            return toast.error('Please provide your email and phone number');
        }
        if (contact.phone.length !== 11) {
            return toast.error('Please provide a valid 11-digit Nigerian phone number');
        }

        // SECURITY: Block submission entirely if Paystack is not loaded/configured.
        // No request should be allowed without a successful payment.
        if (!paystackKey || !window.PaystackPop) {
            return toast.error('Payment system is not available. Please refresh the page or contact support.');
        }

        setSubmitting(true);
        try {
            const res = await axios.post('/api/reseller/request', {
                contactEmail: contact.email,
                contactPhone: contact.phone,
                platforms: selectedPlatforms,
                hostingType,
                extras: Object.keys(extraServices).filter(k => extraServices[k]),
                publishing
            });

            const { paymentRef, totalAmount, metadata } = res.data;

            // Open Paystack inline payment — verification only happens inside the callback
            const handler = window.PaystackPop.setup({
                key: paystackKey,
                email: contact.email,
                amount: Math.round(totalAmount * 100),
                ref: paymentRef,
                metadata: metadata,
                callback: (response) => {
                    // Store reference immediately for recovery (e.g. if user closes browser)
                    localStorage.setItem('pending_reseller_verification', response.reference);
                    // Verify on the backend — only on confirmed Paystack success callback
                    verifyPayment(response.reference);
                },
                onClose: () => {
                    toast.info('Payment window closed. Your request has not been submitted.');
                }
            });
            handler.openIframe();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    const FEATURES = settings.resellerFeatures || {
        vtu: [
            "Data Vending",
            "Airtime Top-up",
            "Electricity Bill Payment",
            "Airtime to Cash",
            "Exam PIN Vending",
            "Recharge Card Printing",
            "Data Card Vending"
        ],
        printing: [
            "Advanced NIN Slip Printing System",
            "Standard & Premium NIN Designs",
            "BVN Slip Generation Tool",
            "Secure PDF Export"
        ],
        manual: [
            "BVN Modification Service",
            "NIN Modification Service",
            "BVN Android License",
            "BVN Retrieval Service",
            "VNIN to NIBSS Validation",
            "NIN Validation Service"
        ]
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <PageMeta 
                title="Buy VTU Website & App - Build Your IT Agency"
                description="Launch your own VTU website and mobile application agency in Nigeria. Professional white-label software for VTU, Data, and Bill Payment business. Secure, fast, and reliable."
            />
            <LandingNavbar />

            <main className="pt-24 pb-16 px-4">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="text-center space-y-4">
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                            Build a Profitable <span className="text-primary">VTU Agency</span> in Nigeria
                        </h1>
                        <p className="text-slate-500 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
                            Stop being just a customer and start owning the platform. We provide state-of-the-art 
                            <span className="text-slate-700 font-bold"> white-label VTU websites</span> and 
                            <span className="text-slate-700 font-bold"> branded mobile applications</span> 
                            that allow you to automate sales of Airtime, Data, and Utility bills.
                        </p>
                    </div>


                    <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                        <div className="p-6 md:p-10 space-y-10">
                            
                            <section className="space-y-4">
                                <div className="flex items-center gap-3 pb-2 border-b border-slate-50">
                                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                        <Mail size={20} />
                                    </div>
                                    <h2 className="text-lg font-bold text-slate-900">Contact Information</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
                                        <div className="relative group">
                                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                                            <input 
                                                type="email" 
                                                placeholder="you@example.com"
                                                value={contact.email}
                                                onChange={(e) => setContact(prev => ({ ...prev, email: e.target.value }))}
                                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-sm transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Phone Number</label>
                                        <div className="relative group">
                                            <PhoneIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                                            <input 
                                                type="tel" 
                                                placeholder="080 0000 0000"
                                                value={contact.phone}
                                                maxLength={11}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    if (val.length <= 11) {
                                                        setContact(prev => ({ ...prev, phone: val }));
                                                    }
                                                }}
                                                className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-sm transition-all font-medium ${
                                                    contact.phone.length > 0 && contact.phone.length !== 11 
                                                        ? 'border-amber-400' 
                                                        : 'border-slate-100'
                                                }`}
                                            />
                                            {contact.phone.length > 0 && contact.phone.length !== 11 && (
                                                <p className="absolute -bottom-5 left-1 text-[9px] font-bold text-amber-500 uppercase tracking-tighter">
                                                    Nigerian numbers must be exactly 11 digits
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center gap-3 pb-2 border-b border-slate-50">
                                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                        <Layers size={20} />
                                    </div>
                                    <h2 className="text-lg font-bold text-slate-900">Platform Configuration</h2>
                                    <HelpTooltip text="Choose where your users can access your services. Web is for browsers, while Android and iOS are native apps." />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { id: 'web', label: 'Web Platform', icon: Globe, desc: 'Responsive Portal' },
                                        { id: 'android', label: 'Android App', icon: Phone, desc: 'Native Experience' },
                                        { id: 'ios', label: 'iOS App', icon: Apple, desc: 'Premium Reach' }
                                    ].map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => togglePlatform(p.id)}
                                            className={`relative flex flex-col items-center p-6 rounded-2xl border-2 transition-all group ${
                                                selectedPlatforms.includes(p.id)
                                                    ? 'border-primary bg-primary/5 ring-4 ring-primary/5'
                                                    : 'border-slate-50 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className={`p-3 rounded-xl mb-4 transition-colors ${
                                                selectedPlatforms.includes(p.id) ? 'bg-primary text-white' : 'bg-white text-slate-400 group-hover:text-slate-600 shadow-sm'
                                            }`}>
                                                <p.icon size={28} />
                                            </div>
                                            <span className={`text-sm font-bold ${selectedPlatforms.includes(p.id) ? 'text-slate-900' : 'text-slate-600'}`}>{p.label}</span>
                                            <span className="text-[10px] text-slate-400 font-medium mt-1">{p.desc}</span>
                                            
                                            {selectedPlatforms.includes(p.id) && (
                                                <div className="absolute top-3 right-3 text-primary">
                                                    <CheckCircle size={16} />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                <section className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <Server size={16} className="text-primary" /> Delivery Model
                                        <HelpTooltip text="Managed Hosting: We provide the server, maintenance, and security. Source Ownership: You receive the full source code to host on your own infrastructure." />
                                    </h3>
                                    <div className="space-y-3">
                                        {[
                                            { id: 'managed', label: 'Managed Hosting', icon: Shield, desc: 'We handle servers & updates' },
                                            { id: 'ownership', label: 'Source Ownership', icon: Database, desc: 'Full code & DB control' }
                                        ].map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setHostingType(t.id)}
                                                className={`flex items-center gap-4 w-full p-4 rounded-2xl border-2 transition-all ${
                                                    hostingType === t.id ? 'border-primary bg-primary/5' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'
                                                }`}
                                            >
                                                <div className={`p-2.5 rounded-xl ${hostingType === t.id ? 'bg-primary text-white' : 'bg-white text-slate-400 shadow-sm'}`}>
                                                    <t.icon size={20} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-bold text-slate-900">{t.label}</p>
                                                    <p className="text-[11px] text-slate-500 font-medium">{t.desc}</p>
                                                </div>
                                                {hostingType === t.id && <CheckCircle size={16} className="ml-auto text-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <PlaySquare size={16} className="text-primary" /> Store Deployment
                                        <HelpTooltip text="Choose your publishing method. Self: You receive the raw build files (APK for Android, IPA for iOS) to share manually. Shared: We deploy to our shared store accounts. Personal: We deploy to your own private store accounts." />
                                    </h3>
                                    <div className="space-y-5 bg-slate-50/50 p-5 rounded-2xl border border-slate-50">
                                        {['android', 'ios'].map(platform => {
                                            const isSelected = selectedPlatforms.includes(platform);
                                            return (
                                                <div className={`space-y-2.5 ${!isSelected && 'opacity-30 grayscale pointer-events-none'}`}>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{platform} Store</span>
                                                        {isSelected && publishing[platform] !== 'none' && (
                                                            <CheckCircle size={14} className="text-primary" />
                                                        )}
                                                        {!isSelected && <span className="text-[9px] font-bold text-slate-400 italic">Select Platform Above</span>}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {[
                                                            { id: 'none', label: platform === 'android' ? 'Self (APK)' : 'Self (IPA)', sub: platform === 'android' ? 'One-time' : 'Yearly' },
                                                            { id: 'shared', label: 'Shared', sub: platform === 'android' ? 'One-time' : 'Yearly' },
                                                            { id: 'personal', label: 'Personal', sub: platform === 'android' ? 'One-time' : 'Yearly' }
                                                        ].map(opt => {
                                                            const isActive = publishing[platform] === opt.id;
                                                            return (
                                                                <button
                                                                    key={opt.id}
                                                                    type="button"
                                                                    disabled={!isSelected}
                                                                    onClick={() => setPublishing(prev => ({ ...prev, [platform]: opt.id }))}
                                                                    className={`flex-1 py-3 px-1 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex flex-col items-center justify-center gap-0.5 ${
                                                                        isActive
                                                                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' 
                                                                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-1.5">
                                                                        {isActive && <Check size={10} strokeWidth={4} />}
                                                                        {opt.label}
                                                                    </div>
                                                                    <span className={`text-[8px] lowercase font-medium opacity-60 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                                                                        ({opt.sub})
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            </div>

                            {/* Service Features & Add-ons */}
                            <section className="space-y-6 pt-6">
                                <div className="flex items-center gap-3 pb-2 border-b border-slate-50">
                                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                        <Zap size={20} />
                                    </div>
                                    <h2 className="text-lg font-bold text-slate-900">Bundles & Feature Lists</h2>
                                    <HelpTooltip text="Additional services you can offer. Printing Hub for ID cards and Manual Services for custom admin-processed requests." />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Core VTU Package */}
                                    <div className="group relative bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/10 border border-slate-800 transition-all hover:scale-[1.02]">
                                        <div className="absolute -top-3 right-6 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg">CORE SYSTEM</div>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2.5 bg-primary/20 text-primary rounded-xl">
                                                <Code size={22} />
                                            </div>
                                            <h4 className="font-bold text-base">VTU Standard</h4>
                                        </div>
                                        <ul className="space-y-3.5">
                                            {FEATURES.vtu.map(f => (
                                                <li key={f} className="flex items-start gap-3 text-[11px] leading-snug text-slate-300 font-medium">
                                                    <CheckCircle size={14} className="text-primary shrink-0 mt-0.5" /> {f}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Printing Add-on */}
                                    <div 
                                        onClick={() => setExtraServices(prev => ({ ...prev, printing: !prev.printing }))}
                                        className={`group cursor-pointer rounded-3xl p-6 border-2 transition-all hover:scale-[1.02] ${
                                            extraServices.printing 
                                                ? 'border-primary bg-primary/5 ring-4 ring-primary/5 shadow-xl shadow-primary/10' 
                                                : 'border-slate-50 bg-slate-50/30 hover:border-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-6">
                                            <div className={`p-2.5 rounded-xl transition-colors ${extraServices.printing ? 'bg-primary text-white' : 'bg-white text-slate-400 shadow-sm'}`}>
                                                <Layout size={22} />
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                                extraServices.printing ? 'bg-primary border-primary text-white' : 'border-slate-200 text-transparent'
                                            }`}>
                                                <Check size={14} />
                                            </div>
                                        </div>
                                        <div className="mb-6">
                                            <h4 className="font-bold text-base text-slate-900">Printing Hub</h4>
                                            <p className="text-xs font-bold text-primary mt-1">Included: Professional ID Suite</p>
                                        </div>
                                        <ul className="space-y-3.5">
                                            {FEATURES.printing.map(f => (
                                                <li key={f} className={`flex items-start gap-3 text-[11px] leading-snug font-medium transition-colors ${
                                                    extraServices.printing ? 'text-slate-700' : 'text-slate-400'
                                                }`}>
                                                    <Check size={14} className={`shrink-0 mt-0.5 ${extraServices.printing ? 'text-primary' : 'text-slate-200'}`} /> {f}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Manual Add-on */}
                                    <div 
                                        onClick={() => setExtraServices(prev => ({ ...prev, manual: !prev.manual }))}
                                        className={`group cursor-pointer rounded-3xl p-6 border-2 transition-all hover:scale-[1.02] ${
                                            extraServices.manual 
                                                ? 'border-primary bg-primary/5 ring-4 ring-primary/5 shadow-xl shadow-primary/10' 
                                                : 'border-slate-50 bg-slate-50/30 hover:border-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-6">
                                            <div className={`p-2.5 rounded-xl transition-colors ${extraServices.manual ? 'bg-primary text-white' : 'bg-white text-slate-400 shadow-sm'}`}>
                                                <HelpCircle size={22} />
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                                extraServices.manual ? 'bg-primary border-primary text-white' : 'border-slate-200 text-transparent'
                                            }`}>
                                                <Check size={14} />
                                            </div>
                                        </div>
                                        <div className="mb-6">
                                            <h4 className="font-bold text-base text-slate-900">Manual Services</h4>
                                            <p className="text-xs font-bold text-primary mt-1">Included: Admin Processing</p>
                                        </div>
                                        <ul className="space-y-3.5">
                                            {FEATURES.manual.map(f => (
                                                <li key={f} className={`flex items-start gap-3 text-[11px] leading-snug font-medium transition-colors ${
                                                    extraServices.manual ? 'text-slate-700' : 'text-slate-400'
                                                }`}>
                                                    <Check size={14} className={`shrink-0 mt-0.5 ${extraServices.manual ? 'text-primary' : 'text-slate-200'}`} /> {f}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </section>

                            {/* Final Pricing and Submission */}
                            <section className="pt-10 border-t border-slate-100">
                                <div className="bg-slate-50 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                                    <div className="space-y-1.5 text-center md:text-left">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Estimated Investment</p>
                                        <div className="flex items-baseline gap-2 justify-center md:justify-start">
                                            <span className="text-4xl font-black text-slate-900">₦{totalPrice.toLocaleString()}</span>
                                            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">Setup Included</span>
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={handleSubmit}
                                        disabled={submitting || verifying}
                                        className="w-full md:w-auto min-w-[240px] py-4 text-sm font-black bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-xl shadow-primary/30 transition-all hover:scale-105"
                                    >
                                        {submitting ? (
                                            <><Loader2 className="animate-spin mr-3" size={20} /> Securing Request...</>
                                        ) : verifying ? (
                                            <><Loader2 className="animate-spin mr-3" size={20} /> Verifying Payment...</>
                                        ) : (
                                            <>Complete Purchase <ArrowRight className="ml-3" size={20} /></>
                                        )}
                                    </Button>
                                </div>
                                <p className="text-center text-[11px] text-slate-400 mt-6 max-w-lg mx-auto leading-relaxed">
                                    <AlertCircle size={14} className="inline mr-1 text-amber-500 mb-0.5" />
                                    By proceeding, you agree to our Reseller Service Level Agreement.
                                    Portal delivery takes 2-5 business days from payment confirmation.
                                </p>
                            </section>

                        </div>
                    </div>

                    {/* Quick Support Card moved below */}

                    {/* Deep SEO Content: Business Model & Ecosystem */}
                    <div className="py-12 border-t border-slate-100 space-y-16">
                        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                            <div className="space-y-6">
                                <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
                                    How You Earn as a <span className="text-primary">VTU Platform Owner</span>
                                </h2>
                                <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                    <p>
                                        When you purchase a <strong>VTU website from Ufriends</strong>, you gain full control over your pricing strategy. Our system connects you directly to wholesale providers at discounted rates, and you decide the profit margin for your end-users.
                                    </p>
                                    <ul className="space-y-3">
                                        <li className="flex gap-3">
                                            <CheckCircle size={18} className="text-primary shrink-0" />
                                            <span><strong>Commission Spread:</strong> Earn the difference between our wholesale API prices and your retail prices.</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <CheckCircle size={18} className="text-primary shrink-0" />
                                            <span><strong>Subscription Fees:</strong> Charge your users for premium account upgrades or reseller status.</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <CheckCircle size={18} className="text-primary shrink-0" />
                                            <span><strong>Service Charges:</strong> Implement small convenience fees on bill payments and exam PINs.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/40 transition-all" />
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                                    <Database size={24} className="text-primary" /> Technical Ecosystem
                                </h3>
                                <div className="space-y-6">
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <h4 className="text-sm font-bold text-primary mb-1">API Integration</h4>
                                        <p className="text-[11px] text-slate-400">High-speed REST APIs with 99.9% uptime for all Nigerian networks.</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <h4 className="text-sm font-bold text-primary mb-1">Wallet System</h4>
                                        <p className="text-[11px] text-slate-400">Secure virtual account funding (Monnify, Wema, Sterling) for your users.</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <h4 className="text-sm font-bold text-primary mb-1">Cloud Infrastructure</h4>
                                        <p className="text-[11px] text-slate-400">Hosted on ultra-fast SSD servers for lightning-quick transaction processing.</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                    {/* SEO-Rich Market Analysis Section (Moved below form) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-12 border-t border-slate-100">
                        <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 space-y-3">
                            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                                <TrendingUp size={20} />
                            </div>
                            <h3 className="font-bold text-slate-900">High Demand Market</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Nigeria's telecommunications industry is one of the fastest-growing in Africa. With millions of daily users buying airtime and data, owning a <strong>VTU portal</strong> puts you in the center of a multi-billion naira daily transaction volume.
                            </p>
                        </div>
                        <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 space-y-3">
                            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                                <Shield size={20} />
                            </div>
                            <h3 className="font-bold text-slate-900">Proven Infrastructure</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Our software is built with <strong>fintech-grade security</strong>. We handle the complex API integrations with major networks like MTN, Airtel, Glo, and 9mobile, so you can focus entirely on marketing your brand and growing your user base.
                            </p>
                        </div>
                        <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 space-y-3">
                            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                                <Zap size={20} />
                            </div>
                            <h3 className="font-bold text-slate-900">Passive Income Stream</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Unlike manual vending, our <strong>automated VTU system</strong> works 24/7. Once your website and mobile apps are live, transactions are processed instantly without your intervention, allowing you to earn even while you sleep.
                            </p>
                        </div>
                    </div>

                    <section className="space-y-10">
                            <div className="text-center space-y-3">
                                <h2 className="text-2xl font-black text-slate-900">Frequently Asked Questions</h2>
                                <p className="text-slate-500 text-sm">Everything you need to know about the Ufriends Reseller Program</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[
                                    { q: "How long does the setup take?", a: "Standard VTU websites are ready within 48-72 hours. Mobile apps (Android/iOS) may take 3-7 business days depending on store approval processes." },
                                    { q: "Do I need technical skills?", a: "No. We handle all technical maintenance, hosting, and API updates. You get a user-friendly admin panel to manage your business." },
                                    { q: "Can I use my own domain name?", a: "Yes. Our white-label service allows you to link your custom domain (e.g., www.yourbrand.com.ng) to the platform." },
                                    { q: "What are the requirements for iOS?", a: "To have a native iOS app, you either need a Personal Apple Developer Account or use our shared hosting model for deployment." }
                                ].map((item, i) => (
                                    <div key={i} className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                                        <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                                            <HelpCircle size={18} className="text-primary" /> {item.q}
                                        </h4>
                                        <p className="text-xs text-slate-500 leading-relaxed">{item.a}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 transition-all hover:bg-slate-100">
                            <div className="w-12 h-12 bg-white text-green-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                                <PhoneIcon size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultant Hotline</p>
                                <a href={`https://wa.me/${whatsappNumber}`} target="_blank" className="text-sm font-bold text-slate-900 hover:text-primary">{sitePhone}</a>
                            </div>
                        </div>
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 transition-all hover:bg-slate-100">
                            <div className="w-12 h-12 bg-white text-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                                <MessageCircle size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Community Link</p>
                                <a href={whatsappGroupLink} target="_blank" className="text-sm font-bold text-slate-900 hover:text-emerald-600">Join Support Group</a>
                            </div>
                        </div>
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 transition-all hover:bg-slate-100">
                            <div className="w-12 h-12 bg-white text-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                                <Shield size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secure Escrow</p>
                                <span className="text-sm font-bold text-slate-900">Protected Payments</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <LandingFooter />
        </div>
    );
}
