import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Logo from '../components/ui/Logo';

function EyeIcon({ open }) {
    return open ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
    ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    );
}

function PasswordField({ label, value, onChange, placeholder, disabled }) {
    const [show, setShow] = useState(false);
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <input
                    type={show ? 'text' : 'password'}
                    required
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="w-full pl-10 pr-11 py-3 rounded-xl border text-sm transition-all duration-200 outline-none disabled:bg-gray-50 disabled:opacity-60"
                    style={{ borderColor: '#CBD5E1' }}
                    onFocus={e => { e.target.style.borderColor = '#004687'; e.target.style.boxShadow = '0 0 0 3px rgba(0,70,135,0.08)'; }}
                    onBlur={e => { e.target.style.borderColor = '#CBD5E1'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                    type="button"
                    onClick={() => setShow(s => !s)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                >
                    <EyeIcon open={show} />
                </button>
            </div>
        </div>
    );
}

export default function ResetPassword() {
    const navigate = useNavigate();
    const location = useLocation();

    const [token, setToken] = useState('');
    const [id, setId] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [tokenInvalid, setTokenInvalid] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const t = params.get('token');
        const i = params.get('id');
        if (t && i) {
            setToken(t);
            setId(i);
        } else {
            setTokenInvalid(true);
        }
    }, [location]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match. Please re-enter them.');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        setLoading(true);

        try {
            await axios.post('/api/auth/reset-password', { id, token, newPassword });
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.error || 'This reset link is invalid or has expired. Please request a new one.');
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
                    <h1 className="text-4xl font-bold mb-4">Create new password</h1>
                    <p className="text-blue-200 text-lg max-w-sm mx-auto leading-relaxed">
                        Choose a strong password to keep your Ufriends account secure.
                    </p>
                    <div className="mt-12 flex flex-col gap-4 text-left max-w-xs mx-auto">
                        {[
                            {
                                text: 'At least 6 characters',
                                icon: <svg className="w-4 h-4 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            },
                            {
                                text: 'Mix letters, numbers & symbols',
                                icon: <svg className="w-4 h-4 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                            },
                            {
                                text: 'Never share your password',
                                icon: <svg className="w-4 h-4 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
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
                    <div className="lg:hidden flex justify-center mb-8">
                        <Logo className="w-14 h-14" />
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl border border-blue-50 p-8 sm:p-10">
                        {tokenInvalid ? (
                            <div className="text-center py-4">
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                                    style={{ background: '#FEF2F2' }}
                                >
                                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Reset Link</h2>
                                <p className="text-gray-500 text-sm mb-6">This link is missing required parameters. Please request a fresh reset link.</p>
                                <button
                                    onClick={() => navigate('/forgot-password')}
                                    className="w-full py-3 rounded-xl font-semibold text-white text-sm"
                                    style={{ background: 'linear-gradient(135deg, #004687, #1E90FF)' }}
                                >
                                    Request New Link
                                </button>
                            </div>
                        ) : success ? (
                            <div className="text-center py-4">
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                                    style={{ background: '#f3fcfd' }}
                                >
                                    <svg className="w-8 h-8" style={{ color: '#004687' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-bold mb-2" style={{ color: '#004687' }}>Password Updated!</h2>
                                <p className="text-gray-500 text-sm mb-6">Your password has been reset successfully. You can now sign in with your new password.</p>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90"
                                    style={{ background: 'linear-gradient(135deg, #004687, #1E90FF)' }}
                                >
                                    Continue to Sign In
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold" style={{ color: '#004687' }}>Set New Password</h2>
                                    <p className="text-gray-500 mt-1 text-sm">Enter and confirm your new password below.</p>
                                </div>

                                {error && (
                                    <div
                                        className="rounded-2xl p-4 mb-5 flex items-start gap-3"
                                        style={{ background: '#FFF5F5', border: '1.5px solid #FCA5A5' }}
                                    >
                                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-red-700 text-sm">{error}</p>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <PasswordField
                                        label="New Password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        disabled={loading}
                                    />

                                    <PasswordField
                                        label="Confirm Password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="Repeat new password"
                                        disabled={loading}
                                    />

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-70 mt-2"
                                        style={{ background: loading ? '#6B9BC3' : 'linear-gradient(135deg, #004687, #1E90FF)' }}
                                    >
                                        {loading ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Updating password…
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                </svg>
                                                Update Password
                                            </>
                                        )}
                                    </button>
                                </form>

                                <div className="mt-6 text-center">
                                    <button
                                        onClick={() => navigate('/forgot-password')}
                                        className="text-sm font-medium transition-colors hover:underline"
                                        style={{ color: '#004687' }}
                                    >
                                        ← Request a new link
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
