import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast, Toaster } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingFooter from '../components/landing/LandingFooter';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { ShieldAlert, KeyRound, AlertTriangle, LifeBuoy, MailX, Clock, Database, Trash2, ArrowRight, ChevronDown } from 'lucide-react';

function FaqItem({ question, answer, index }) {
    const [open, setOpen] = useState(false);
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.4, delay: index * 0.07 }} 
            viewport={{ once: true }} 
            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
        >
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-5 text-left">
                <span className="font-semibold text-gray-900 text-sm pr-4">{question}</span>
                <ChevronDown className={`w-5 h-5 text-[#004687] shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                        <p className="px-6 pb-5 text-sm text-gray-500 leading-relaxed">{answer}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default function DeleteAccountPage() {
    const navigate = useNavigate();
    const [token, setToken] = useState(null);
    const [step, setStep] = useState(1);
    const [reason, setReason] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
            toast.error('You must be logged in to delete your account.');
            navigate('/login');
        } else {
            setToken(storedToken);
        }
    }, [navigate]);

    const handleRequestDeletion = async (e) => {
        e.preventDefault();
        if (!reason) {
            toast.error('Please select a reason for deletion.');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('/api/user/account-deletion/request', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(response.data.message || 'OTP sent to your email.');
            setStep(2);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to request account deletion.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmDeletion = async (e) => {
        e.preventDefault();
        if (!otp) {
            toast.error('Please enter the OTP sent to your email.');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('/api/user/account-deletion/confirm', {
                otp,
                reason
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            toast.success(response.data.message || 'Account terminated.');
            
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            setTimeout(() => {
                navigate('/');
            }, 3000);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to confirm account deletion.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) return null;

    const faqs = [
        {
            question: "What happens to my wallet balance?",
            answer: "Please ensure you have withdrawn or used all funds in your wallet before requesting deletion. We cannot refund wallet balances after an account is permanently deleted."
        },
        {
            question: "Can I create a new account later?",
            answer: "Yes, after your account is permanently deleted (14 days), your email and phone number will be freed up, and you can register a new account if you wish to return."
        },
        {
            question: "Do you keep any of my data?",
            answer: "We delete all personally identifiable information. However, we may retain certain anonymized transaction records strictly for tax, legal, and regulatory compliance as required by Nigerian law."
        },
        {
            question: "What happens to my virtual bank accounts?",
            answer: "Your assigned virtual bank accounts (Moniepoint, Wema, etc.) will be immediately deactivated and any funds sent to them will bounce back to the sender."
        },
        {
            question: "How do I cancel my deletion request?",
            answer: "If you change your mind within the 14-day cool-off period, please contact our support team immediately. We can restore your account manually."
        },
        {
            question: "Are my past transactions deleted?",
            answer: "Your personal linkage to the transactions is removed. The transactions themselves are anonymized and kept purely for accounting purposes."
        },
        {
            question: "How long does the deletion process take?",
            answer: "The termination is immediate (you are logged out instantly). Permanent deletion takes exactly 14 days from the time you confirm the OTP."
        },
        {
            question: "Will I still receive promotional emails?",
            answer: "No. Requesting account deletion immediately removes your email address from all our marketing and promotional mailing lists."
        }
    ];

    return (
        <div className="min-h-screen flex flex-col bg-[#f8fafc] relative overflow-hidden">
            <Toaster position="top-right" richColors />
            
            <div className="relative z-20">
                <LandingNavbar />
            </div>
            
            <main className="flex-grow flex flex-col relative z-10 w-full">
                
                {/* ─── HERO SECTION: DELETION CARD ─── */}
                <section className="relative w-full pt-32 pb-24 px-4 flex flex-col items-center">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="relative max-w-md w-full bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-8 border border-gray-100 overflow-hidden z-10"
                    >
                        <ShieldAlert className="absolute -right-6 -top-6 w-40 h-40 text-red-500 opacity-[0.03] transform rotate-12 pointer-events-none" />

                        <h1 className="relative z-10 text-2xl font-bold text-center text-gray-900 mb-2 font-display">Delete Account</h1>
                        
                        <div className="relative z-10 bg-red-50/80 text-red-700 p-4 rounded-xl flex items-start space-x-3 mb-8 text-sm leading-relaxed border border-red-100">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                            <p>
                                <strong>Warning:</strong> Your account will be terminated immediately and permanently deleted after 14 days. This action cannot be undone once the 14 days have passed.
                            </p>
                        </div>

                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.form 
                                    key="step1"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onSubmit={handleRequestDeletion} 
                                    className="space-y-6 relative z-10"
                                >
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Why are you leaving?
                                        </label>
                                        <select 
                                            value={reason} 
                                            onChange={(e) => setReason(e.target.value)}
                                            className="w-full rounded-xl border-gray-200 focus:border-red-500 focus:ring-red-500/20 p-3.5 bg-gray-50/50 border transition-all text-gray-700 text-sm"
                                            required
                                        >
                                            <option value="" disabled>Select a reason...</option>
                                            <option value="privacy_concerns">Privacy concerns</option>
                                            <option value="too_many_emails">Too many emails/notifications</option>
                                            <option value="no_longer_useful">Services are no longer useful to me</option>
                                            <option value="poor_experience">Poor user experience / Buggy</option>
                                            <option value="creating_new_account">Creating a new account</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>

                                    <Button
                                        type="submit"
                                        loading={loading}
                                        disabled={loading}
                                        className="w-full py-3.5 text-base font-semibold rounded-xl bg-red-600 hover:bg-red-700 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-60 text-white"
                                    >
                                        Request Account Deletion
                                    </Button>
                                </motion.form>
                            )}

                            {step === 2 && (
                                <motion.form 
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    onSubmit={handleConfirmDeletion} 
                                    className="space-y-6 relative z-10"
                                >
                                    <Input
                                        label="Verification Code (OTP)"
                                        name="otp"
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        placeholder="Enter 6-digit OTP"
                                        required
                                        maxLength={6}
                                        className="rounded-xl border-gray-200 focus:border-red-500 focus:ring-red-500/20 bg-gray-50/50 text-center font-mono text-lg tracking-widest"
                                        leftElement={<KeyRound className="h-5 w-5 text-gray-400" />}
                                    />

                                    <div className="space-y-3 pt-2">
                                        <Button
                                            type="submit"
                                            loading={loading}
                                            disabled={loading}
                                            className="w-full py-3.5 text-base font-semibold rounded-xl bg-red-600 hover:bg-red-700 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-60 text-white"
                                        >
                                            Confirm Deletion
                                        </Button>
                                        
                                        <Button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            disabled={loading}
                                            variant="outline"
                                            className="w-full py-3.5 text-base font-semibold rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 transition-all duration-300"
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </section>

                {/* ─── SECTION 2: ALTERNATIVES ─── */}
                <section className="w-full bg-transparent py-20 px-4">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4 font-display">Before You Leave...</h2>
                            <p className="text-gray-600 max-w-2xl mx-auto">
                                Account deletion is permanent. If you're experiencing issues, there might be a better solution.
                            </p>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-6">
                            
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                viewport={{ once: true }}
                                className="group relative overflow-hidden bg-white rounded-2xl p-7 border border-blue-100/80 shadow-sm hover:shadow-xl hover:border-[#1e90ff] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                            >
                                <div className="absolute -top-4 -right-4 pointer-events-none opacity-0 group-hover:opacity-[0.07] group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ease-out text-[#004687]">
                                    <LifeBuoy className="w-36 h-36 stroke-[1.2]" />
                                </div>
                                <div className="relative z-10">
                                    <div className="mb-4">
                                        <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-50 text-[#004687] border border-blue-200/80 inline-block">
                                            24/7 Support Team
                                        </span>
                                    </div>
                                    <h4 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-[#004687] transition-colors">
                                        Need Help?
                                    </h4>
                                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                                        If you're stuck, facing technical issues with our services, or having trouble verifying your identity, our support team is available 24/7 to resolve them.
                                    </p>
                                </div>
                                <Link
                                    to="/contact"
                                    className="relative z-10 w-full inline-flex items-center justify-center px-4 py-3.5 bg-gradient-to-r from-[#1e90ff] to-[#004687] text-white hover:from-[#1e90ff]/90 hover:to-[#004687]/90 font-semibold text-xs rounded-xl transition-all shadow-md group-hover:shadow-lg"
                                >
                                    <span>Contact Support</span>
                                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                viewport={{ once: true }}
                                className="group relative overflow-hidden bg-white rounded-2xl p-7 border border-blue-100/80 shadow-sm hover:shadow-xl hover:border-[#1e90ff] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                            >
                                <div className="absolute -top-4 -right-4 pointer-events-none opacity-0 group-hover:opacity-[0.07] group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ease-out text-[#004687]">
                                    <MailX className="w-36 h-36 stroke-[1.2]" />
                                </div>
                                <div className="relative z-10">
                                    <div className="mb-4">
                                        <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-50 text-[#004687] border border-blue-200/80 inline-block">
                                            Notification Settings
                                        </span>
                                    </div>
                                    <h4 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-[#004687] transition-colors">
                                        Too Many Emails?
                                    </h4>
                                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                                        You can opt out of promotional emails and notifications at any time without deleting your account. Keep your account active while silencing the noise.
                                    </p>
                                </div>
                                <Link
                                    to="/dashboard/profile"
                                    className="relative z-10 w-full inline-flex items-center justify-center px-4 py-3.5 bg-gradient-to-r from-[#1e90ff] to-[#004687] text-white hover:from-[#1e90ff]/90 hover:to-[#004687]/90 font-semibold text-xs rounded-xl transition-all shadow-md group-hover:shadow-lg"
                                >
                                    <span>Update Preferences</span>
                                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </motion.div>
                            
                        </div>
                    </div>
                </section>

                {/* ─── SECTION 3: TIMELINE ─── */}
                <section className="w-full bg-white py-20 px-4 border-y border-gray-100">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-16">
                            <span className="inline-block text-sm font-semibold text-[#004687] bg-blue-50 border border-blue-200/80 px-4 py-1.5 rounded-full mb-4">
                                Transparency
                            </span>
                            <h2 className="text-3xl font-bold text-gray-900 mb-4 font-display">The Deletion Process</h2>
                            <p className="text-gray-600 max-w-2xl mx-auto">
                                We want to make sure your data is handled securely and in compliance with global privacy regulations like NDPR.
                            </p>
                        </div>
                        
                        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#1e90ff]/30 before:to-transparent">
                            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-blue-50 text-[#004687] shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10 ring-4 ring-white">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl border border-gray-100 shadow-sm bg-white hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between space-x-2 mb-2">
                                        <div className="font-bold text-gray-900">Day 1: Termination</div>
                                    </div>
                                    <div className="text-sm text-gray-500 leading-relaxed">Your account is immediately suspended. You can no longer log in, and your profile is hidden from the platform.</div>
                                </div>
                            </motion.div>
                            
                            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} viewport={{ once: true }} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-blue-50 text-[#004687] shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10 ring-4 ring-white">
                                    <Database className="w-4 h-4" />
                                </div>
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl border border-gray-100 shadow-sm bg-white hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between space-x-2 mb-2">
                                        <div className="font-bold text-gray-900">Day 1-13: Cool-off Period</div>
                                    </div>
                                    <div className="text-sm text-gray-500 leading-relaxed">We retain your encrypted data in case you change your mind. To cancel deletion, you must contact our support team.</div>
                                </div>
                            </motion.div>
                            
                            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} viewport={{ once: true }} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-red-50 text-red-500 shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10 ring-4 ring-white">
                                    <Trash2 className="w-4 h-4" />
                                </div>
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl border border-gray-100 shadow-sm bg-white hover:border-red-100 hover:shadow-md transition-all">
                                    <div className="flex items-center justify-between space-x-2 mb-2">
                                        <div className="font-bold text-gray-900">Day 14: Permanent Deletion</div>
                                    </div>
                                    <div className="text-sm text-gray-500 leading-relaxed">All personal data, transaction history, and virtual accounts are permanently purged from our active databases.</div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* ─── SECTION 4: FAQ ─── */}
                <section className="w-full bg-transparent py-20 px-4">
                    <div className="max-w-3xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4 font-display">Frequently Asked Questions</h2>
                            <p className="text-gray-600">Got questions about the deletion process? We've got answers.</p>
                        </div>
                        
                        <div className="space-y-3">
                            {faqs.map((faq, index) => (
                                <FaqItem key={index} question={faq.question} answer={faq.answer} index={index} />
                            ))}
                        </div>
                    </div>
                </section>

            </main>

            <div className="relative z-20">
                <LandingFooter />
            </div>
        </div>
    );
}
