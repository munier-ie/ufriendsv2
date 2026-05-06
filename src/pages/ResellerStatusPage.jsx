import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
    CheckCircle, Clock, Loader2, Download, ExternalLink, 
    Smartphone, Globe, Apple, AlertCircle, ArrowLeft,
    Shield, Zap, MessageSquare, Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import axios from 'axios';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingFooter from '../components/landing/LandingFooter';
import PageMeta from '../components/seo/PageMeta';
import Button from '../components/ui/Button';

export default function ResellerStatusPage() {
    const { reference } = useParams();
    const [request, setRequest] = useState(null);
    const [settings, setSettings] = useState({ contactWhatsapp: '' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [onboardingData, setOnboardingData] = useState({
        appName: '',
        primaryColor: '#004687',
        secondaryColor: '#ffffff',
        successColor: '#22c55e',
        warningColor: '#eab308',
        errorColor: '#ef4444',
        logo: '',
        domain: ''
    });
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get('/api/admin/config/public-settings');
                if (res.data?.settings) setSettings(res.data.settings);
            } catch (err) {
                console.error('Failed to fetch settings');
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await axios.get(`/api/reseller/status/${reference}`);
                setRequest(res.data);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load request status');
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [reference]);

    const whatsappNumber = String(settings?.contactWhatsapp || "").replace(/\D/g, '') || '2348169696095';

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleOnboardingSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            let finalOnboardingData = { ...onboardingData };

            // 1. Upload Logo if present
            if (logoFile) {
                const formData = new FormData();
                formData.append('logo', logoFile);
                const uploadRes = await axios.post('/api/reseller/upload-logo', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                finalOnboardingData.logo = uploadRes.data.logoUrl;
            }

            // 2. Finalize Domain
            if (finalOnboardingData.domain && !finalOnboardingData.domain.endsWith('.com.ng')) {
                finalOnboardingData.domain = finalOnboardingData.domain + '.com.ng';
            }

            await axios.post(`/api/reseller/onboarding/${reference}`, finalOnboardingData);
            toast.success('Branding information submitted successfully!');
            setRequest(prev => ({ ...prev, onboardingCompleted: true, onboardingData: finalOnboardingData }));
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to submit branding information');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white">
                <LandingNavbar />
                <main className="pt-32 pb-20 px-4">
                    <div className="max-w-md mx-auto text-center space-y-6">
                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle size={40} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Request Not Found</h1>
                        <p className="text-slate-500">{error}</p>
                        <Link to="/reseller">
                            <Button variant="outline" className="mt-4">
                                <ArrowLeft className="mr-2" size={18} /> Back to Reseller Page
                            </Button>
                        </Link>
                    </div>
                </main>
                <LandingFooter />
            </div>
        );
    }

    const steps = [
        { id: 'pending', label: request.paymentStatus === 'paid' ? 'Payment Verified' : 'Payment Pending', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
        { id: 'processing', label: 'Setup in Progress', icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50' },
        { id: 'completed', label: 'Setup Completed', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' }
    ];

    const currentStepIndex = steps.findIndex(s => s.id === request.status);

    return (
        <div className="min-h-screen bg-slate-50">
            <PageMeta title={`Setup Status - ${reference}`} />
            <LandingNavbar />

            <main className="pt-32 pb-20 px-4">
                <div className="max-w-3xl mx-auto space-y-8">
                    
                    {/* Header Card */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-6">
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 ${steps[currentStepIndex]?.bg} ${steps[currentStepIndex]?.color}`}>
                            {React.createElement(steps[currentStepIndex]?.icon || Clock, { size: 40 })}
                        </div>
                        <div className="text-center md:text-left space-y-1">
                            <h1 className="text-2xl font-black text-slate-900">Setup #{reference.substring(0, 8).toUpperCase()}</h1>
                            <p className="text-slate-500 font-medium">Status: <span className={`font-bold ${steps[currentStepIndex]?.color}`}>{steps[currentStepIndex]?.label}</span></p>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Payment: {request.paymentStatus.toUpperCase()}</p>
                        </div>
                        <div className="md:ml-auto">
                            <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hi, I am checking on my setup ' + reference)}`} target="_blank" className="flex items-center gap-2 text-primary font-bold text-sm bg-primary/5 px-4 py-2 rounded-xl hover:bg-primary/10 transition-colors">
                                <MessageSquare size={18} /> Support Chat
                            </a>
                        </div>
                    </div>

                    {/* Progress Visualizer */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {steps.map((step, idx) => {
                            const isCompleted = idx <= currentStepIndex;
                            const isCurrent = idx === currentStepIndex;
                            return (
                                <div key={step.id} className={`p-4 rounded-2xl border transition-all ${
                                    isCurrent ? 'bg-white border-primary shadow-md' : 
                                    isCompleted ? 'bg-white border-slate-200' : 'bg-slate-100/50 border-transparent opacity-50'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCompleted ? step.bg + ' ' + step.color : 'bg-slate-200 text-slate-400'}`}>
                                            {isCompleted ? <CheckCircle size={16} /> : idx + 1}
                                        </div>
                                        <span className={`text-sm font-bold ${isCurrent ? 'text-slate-900' : 'text-slate-500'}`}>{step.label}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Results / Delivery Card */}
                    {request.status === 'completed' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-8"
                        >
                            <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
                                <div className="w-12 h-12 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center shrink-0">
                                    <CheckCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900">Your Assets are Ready!</h3>
                                    <p className="text-sm text-gray-500">Access your platforms using the links below.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {request.webUrl && (
                                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-primary/20 transition-all group">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Globe size={20} className="text-primary" />
                                            <span className="text-sm font-black text-gray-700 uppercase tracking-tight">Web Platform</span>
                                        </div>
                                        <a 
                                            href={request.webUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                                        >
                                            Visit Website <ExternalLink size={16} />
                                        </a>
                                    </div>
                                )}
                                {request.apkUrl && (
                                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-green-500/20 transition-all group">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Smartphone size={20} className="text-green-500" />
                                            <span className="text-sm font-black text-gray-700 uppercase tracking-tight">Android App (APK)</span>
                                        </div>
                                        <a 
                                            href={request.apkUrl} 
                                            className="w-full py-3 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-all shadow-md shadow-green-500/20"
                                        >
                                            Download APK <Download size={16} />
                                        </a>
                                    </div>
                                )}
                                {request.playStoreUrl && (
                                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-500/20 transition-all group">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Zap size={20} className="text-blue-500" />
                                            <span className="text-sm font-black text-gray-700 uppercase tracking-tight">Play Store</span>
                                        </div>
                                        <a 
                                            href={request.playStoreUrl} 
                                            target="_blank" 
                                            className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-all"
                                        >
                                            View Store <ExternalLink size={16} />
                                        </a>
                                    </div>
                                )}
                                {request.appStoreUrl && (
                                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-500/20 transition-all group">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Apple size={20} className="text-gray-700" />
                                            <span className="text-sm font-black text-gray-700 uppercase tracking-tight">App Store</span>
                                        </div>
                                        <a 
                                            href={request.appStoreUrl} 
                                            target="_blank" 
                                            className="w-full py-3 bg-gray-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-900 transition-all"
                                        >
                                            View Store <ExternalLink size={16} />
                                        </a>
                                    </div>
                                )}
                            </div>

                            {request.adminNote && (
                                <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-2">Admin Note:</span>
                                    <p className="text-sm font-medium text-gray-700 leading-relaxed italic">"{request.adminNote}"</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Onboarding Form */}
                    {request.paymentStatus === 'paid' && !request.onboardingCompleted && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                                    <Layout size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Complete Your Setup</h2>
                                    <p className="text-slate-500 text-sm">Please provide your branding details to help us set up your platform.</p>
                                </div>
                            </div>

                            <form onSubmit={handleOnboardingSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                                <div className="space-y-2">
                                     <label className="text-xs font-bold text-slate-600 uppercase">App / Website Name</label>
                                     <input 
                                         type="text" 
                                         required
                                         placeholder="e.g. My VTU Hub"
                                         value={onboardingData.appName}
                                         onChange={(e) => setOnboardingData(prev => ({ ...prev, appName: e.target.value }))}
                                         className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-sm transition-all"
                                     />
                                 </div>

                                 <div className="space-y-2">
                                     <label className="text-xs font-bold text-slate-600 uppercase">Preferred Domain (.com.ng)</label>
                                     <div className="relative">
                                         <input 
                                             type="text" 
                                             placeholder="e.g. myvtu"
                                             value={onboardingData.domain}
                                             onChange={(e) => setOnboardingData(prev => ({ ...prev, domain: e.target.value }))}
                                             className="w-full pl-4 pr-20 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-sm transition-all"
                                         />
                                         <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">.com.ng</span>
                                     </div>
                                     <p className="text-[10px] text-slate-400 font-medium italic">* If taken, admin will contact you at {request.contactPhone} to discuss alternatives.</p>
                                 </div>

                                 <div className="md:col-span-2 space-y-4">
                                     <label className="text-xs font-bold text-slate-600 uppercase block mb-2">Color Palette Configuration</label>
                                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                         {[
                                             { id: 'primaryColor', label: 'Primary' },
                                             { id: 'secondaryColor', label: 'Secondary' },
                                             { id: 'successColor', label: 'Success' },
                                             { id: 'warningColor', label: 'Warning' },
                                             { id: 'errorColor', label: 'Error' }
                                         ].map(color => (
                                             <div key={color.id} className="space-y-1.5">
                                                 <span className="text-[10px] font-bold text-slate-400 uppercase">{color.label}</span>
                                                 <div className="flex gap-2">
                                                     <input 
                                                         type="color" 
                                                         value={onboardingData[color.id]}
                                                         onChange={(e) => setOnboardingData(prev => ({ ...prev, [color.id]: e.target.value }))}
                                                         className="w-8 h-8 p-0.5 bg-white border border-slate-200 rounded cursor-pointer shrink-0"
                                                     />
                                                     <input 
                                                         type="text" 
                                                         value={onboardingData[color.id]}
                                                         onChange={(e) => setOnboardingData(prev => ({ ...prev, [color.id]: e.target.value }))}
                                                         className="w-full px-2 py-1.5 bg-slate-50 border border-slate-100 rounded text-[10px] font-mono outline-none focus:border-primary"
                                                     />
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                 </div>

                                 <div className="md:col-span-2 space-y-2">
                                     <label className="text-xs font-bold text-slate-600 uppercase">Official Logo</label>
                                     <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl hover:bg-slate-100/50 transition-colors group cursor-pointer relative">
                                         <input 
                                             type="file" 
                                             accept="image/*"
                                             onChange={handleLogoChange}
                                             className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                         />
                                         <div className="w-24 h-24 bg-white rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                             {logoPreview ? (
                                                 <img src={logoPreview} alt="Preview" className="w-full h-full object-contain p-2" />
                                             ) : (
                                                 <Layout className="text-slate-300" size={32} />
                                             )}
                                         </div>
                                         <div className="text-center sm:text-left">
                                             <h4 className="text-sm font-bold text-slate-900 mb-1">Click or drag your logo here</h4>
                                             <p className="text-[11px] text-slate-500">PNG, JPG, or SVG. Max 5MB.</p>
                                         </div>
                                     </div>
                                 </div>

                                 <div className="md:col-span-2 pt-4">
                                     <Button 
                                         type="submit"
                                         disabled={submitting}
                                         className="w-full py-4 text-sm font-black bg-slate-900 text-white rounded-xl shadow-xl shadow-slate-200 transition-all hover:scale-[1.02]"
                                     >
                                         {submitting ? <><Loader2 className="animate-spin mr-2" size={18} /> Submitting Setup...</> : 'Save & Finalize My Setup'}
                                     </Button>
                                 </div>
                             </form>
                        </motion.div>
                    )}

                    {/* Success Message for Completed Onboarding */}
                    {request.onboardingCompleted && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-green-50 border border-green-100 rounded-3xl p-6 flex items-center gap-4"
                        >
                            <div className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center shrink-0">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-green-900 text-sm">Branding Details Received</h3>
                                <p className="text-green-700 text-xs">Our team is already using your details to customize your platform.</p>
                            </div>
                        </motion.div>
                    )}

                    {/* Order Details */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
                        <h3 className="font-bold text-slate-900 border-b border-slate-50 pb-4">Configuration Summary</h3>
                        <div className="grid grid-cols-2 gap-y-4 text-sm">
                            <span className="text-slate-500">Contact Email</span>
                            <span className="text-slate-900 font-bold text-right">{request.contactEmail}</span>
                            
                            <span className="text-slate-500">Platforms</span>
                            <div className="flex gap-2 justify-end">
                                {request.platforms.map(p => (
                                    <span key={p} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{p}</span>
                                ))}
                            </div>

                            <span className="text-slate-500">Hosting Model</span>
                            <span className="text-slate-900 font-bold text-right capitalize">{request.hostingType}</span>

                            <span className="text-slate-500">Extras</span>
                            <div className="flex gap-2 justify-end">
                                {request.extras.length > 0 ? request.extras.map(e => (
                                    <span key={e} className="bg-primary/5 text-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase">{e}</span>
                                )) : <span className="text-slate-400">None</span>}
                            </div>
                        </div>
                    </div>

                </div>
            </main>

            <LandingFooter />
        </div>
    );
}
