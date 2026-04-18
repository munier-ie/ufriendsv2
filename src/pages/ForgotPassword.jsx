import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Logo from '../components/ui/Logo';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // null | 'success'
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);
        try {
            const response = await axios.post('/api/auth/forgot-password', { email });
            setStatus('success');
            toast.success(response.data.message);
        } catch (err) {
            const errorCode = err.response?.data?.error;
            const serverMsg = err.response?.data?.message;

            if (errorCode === 'EMAIL_NOT_CONFIGURED') {
                toast.error('Email service is currently unavailable. Please contact support or try again later.');
            } else if (errorCode === 'EMAIL_SEND_FAILED') {
                toast.error(serverMsg || 'We could not deliver the email. Please try again in a moment.');
            } else if (err.response?.status === 400) {
                toast.error(err.response?.data?.error || 'Invalid request. Please check your email and try again.');
            } else {
                toast.error('Something went wrong. Please check your internet connection and try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #f3fcfd 0%, #e8f4fb 50%, #ddeefa 100%)' }}>
            {/* Left decorative panel */}
            <div
                className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-16 relative overflow-hidden"
                style={{ background: 'linear-gradient(160deg, #004687 0%, #003366 60%, #002244 100%)' }}
            >
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 80%, #1E90FF 0%, transparent 50%), radial-gradient(circle at 80% 20%, #1E90FF 0%, transparent 50%)'
                }} />
                <div className="relative z-10 text-center text-white">
                    <Logo className="w-20 h-20 mx-auto mb-8" />
                    <h1 className="text-4xl font-bold mb-4">Forgot your password?</h1>
                    <p className="text-blue-200 text-lg max-w-sm mx-auto leading-relaxed">
                        No worries! Enter your email and we'll send you a secure link to reset it within minutes.
                    </p>
                    <div className="mt-12 flex flex-col gap-4 text-left max-w-xs mx-auto">
                        {[
                            {
                                text: 'Link expires in 5 minutes',
                                icon: <svg className="w-4 h-4 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            },
                            {
                                text: 'Single-use only for maximum security',
                                icon: <svg className="w-4 h-4 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            },
                            {
                                text: 'Sent instantly to your inbox',
                                icon: <svg className="w-4 h-4 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            },
                        ].map(({ icon, text }) => (
                            <div key={text} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                                <span className="flex-shrink-0">{icon}</span>
                                <span className="text-blue-100 text-sm">{text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right form panel */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex justify-center mb-8">
                        <Logo className="w-14 h-14" />
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl border border-blue-50 p-8 sm:p-10">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold" style={{ color: '#004687' }}>Reset Password</h2>
                            <p className="text-gray-500 mt-1 text-sm">We'll send a secure link to your email address.</p>
                        </div>

                        {status === 'success' ? (
                            <div>
                                <div
                                    className="rounded-2xl p-5 mb-4 flex items-start gap-4"
                                    style={{ background: '#f3fcfd', border: '1.5px solid #1E90FF33' }}
                                >
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ background: '#1E90FF22' }}
                                    >
                                        <svg className="w-5 h-5" style={{ color: '#004687' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm" style={{ color: '#004687' }}>Check your inbox!</p>
                                        <p className="text-gray-600 text-sm mt-1">If an account exists for {email}, a reset link has been sent.</p>
                                    </div>
                                </div>

                                {/* Spam folder hint */}
                                <div className="rounded-xl p-3.5 mb-5 flex items-start gap-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                                    <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-amber-800 text-xs leading-relaxed">
                                        Don't see it? Check your <strong>spam or junk folder</strong>. The link expires in <strong>5 minutes</strong>.
                                    </p>
                                </div>

                                <button
                                    onClick={() => { setStatus(null); setEmail(''); }}
                                    className="w-full py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200 hover:opacity-80"
                                    style={{ borderColor: '#004687', color: '#004687' }}
                                >
                                    Try a different email
                                </button>
                            </div>

                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                            </svg>
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all duration-200 outline-none"
                                            style={{
                                                borderColor: '#CBD5E1',
                                                fontSize: '0.95rem',
                                            }}
                                            onFocus={e => { e.target.style.borderColor = '#004687'; e.target.style.boxShadow = '0 0 0 3px rgba(0,70,135,0.08)'; }}
                                            onBlur={e => { e.target.style.borderColor = '#CBD5E1'; e.target.style.boxShadow = 'none'; }}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-70"
                                    style={{ background: loading ? '#6B9BC3' : 'linear-gradient(135deg, #004687, #1E90FF)' }}
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Sending reset link…
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            Send Reset Link
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        <div className="mt-6 text-center">
                            <button
                                onClick={() => navigate('/login')}
                                className="text-sm font-medium transition-colors hover:underline"
                                style={{ color: '#004687' }}
                            >
                                ← Back to Sign In
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
