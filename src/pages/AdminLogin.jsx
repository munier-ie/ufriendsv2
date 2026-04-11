import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';

export default function AdminLogin() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        pin: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pinRequired, setPinRequired] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [step, setStep] = useState('login');
    const [adminId, setAdminId] = useState(null);
    const [verificationCode, setVerificationCode] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const payload = {
                username: formData.username,
                password: formData.password
            };

            if (pinRequired && formData.pin) {
                payload.pin = formData.pin;
            }

            const response = await axios.post('/api/admin/auth/login', payload);

            if (response.data.twoFaRequired) {
                setAdminId(response.data.adminId);
                setStep('2fa-verify');
            } else if (response.data.success) {
                localStorage.setItem('adminToken', response.data.token);
                localStorage.setItem('adminUser', JSON.stringify(response.data.admin));
                navigate('/admin/dashboard');
            }
        } catch (err) {
            if (err.response?.data?.pinRequired) {
                setPinRequired(true);
                setError('Please enter your transaction PIN');
            } else {
                setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifySubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { data } = await axios.post('/api/admin/auth/verify-2fa', {
                adminId,
                code: verificationCode
            });

            if (data.success) {
                localStorage.setItem('adminToken', data.token);
                localStorage.setItem('adminUser', JSON.stringify(data.admin));
                navigate('/admin/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Verification failed. Please check the code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-tertiary to-secondary/10 flex items-center justify-center p-4">
            {/* Background Pattern */}
            <div
                className="absolute inset-0 z-0 pointer-events-none opacity-30"
                style={{
                    backgroundImage: `
                        repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px),
                        repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px)
                    `,
                }}
            />

            <div className="w-full max-w-md relative z-10">
                {/* Admin Login Card */}
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
                    {/* Logo and Title */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <Logo className="w-16 h-16" />
                        </div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-red-400">
                            {step === 'login' ? 'Admin Panel' : '2FA Required'}
                        </h1>
                        <p className="text-gray-600 mt-2">
                            {step === 'login' ? 'Sign in to access the admin dashboard' : 'Enter your authenticator code'}
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    {/* Login Form */}
                    {step === 'login' && (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            label="Username"
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            required
                            placeholder="Enter your admin username"
                            icon={
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            }
                        />

                        {/* Password with eye toggle */}
                        <div className="relative">
                            <Input
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                placeholder="Enter your password"
                                icon={
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                }
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 focus:outline-none"
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        {pinRequired && (
                            <Input
                                label="Transaction PIN"
                                type="password"
                                maxLength="4"
                                value={formData.pin}
                                onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                                required
                                placeholder="Enter 4-digit PIN"
                                icon={
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                }
                            />
                        )}

                        <Button
                            type="submit"
                            className="w-full py-4 text-lg font-bold bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-lg shadow-red-500/25"
                            loading={loading}
                        >
                            Sign In
                        </Button>
                    </form>
                    )}

                    {step === '2fa-verify' && (
                        <form onSubmit={handleVerifySubmit} className="space-y-5">
                            <Input
                                label="2FA Code"
                                type="text"
                                maxLength="6"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                required
                                placeholder="Enter 6-digit code"
                                className="text-center tracking-widest text-xl font-mono"
                            />
                            
                            <Button
                                type="submit"
                                className="w-full py-4 text-lg font-bold bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-lg shadow-red-500/25"
                                loading={loading}
                            >
                                Verify Identity
                            </Button>

                            <button 
                                type="button" 
                                onClick={() => { setStep('login'); setVerificationCode(''); setError(''); }}
                                className="w-full text-center text-sm font-medium text-gray-500 hover:text-gray-700 outline-none"
                            >
                                Cancel & Return to Login
                            </button>
                        </form>
                    )}

                    {/* Back to User Login */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => navigate('/login')}
                            className="text-sm text-gray-600 hover:text-primary transition-colors"
                        >
                            ← Back to User Login
                        </button>
                    </div>
                </div>

                {/* Security Notice */}
                <div className="mt-6 text-center text-sm text-gray-600 bg-white/50 backdrop-blur-sm rounded-xl p-4">
                    <svg className="w-5 h-5 inline-block mr-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Access to this area is restricted to authorized administrators only
                </div>
            </div>
        </div>
    );
}
