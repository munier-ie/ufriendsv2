import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import AuthLayout from '../components/layout/AuthLayout';
import Logo from '../components/ui/Logo';
import { Eye, EyeOff, ArrowLeft, Clock } from 'lucide-react';

export default function Login() {
    const [step, setStep] = useState('login'); // 'login' | 'email-verify' | '2fa-verify'
    const [userId, setUserId] = useState(null);
    const [infoMessage, setInfoMessage] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    
    const [formData, setFormData] = useState({
        phone: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [lockoutSeconds, setLockoutSeconds] = useState(0);
    const lockoutTimerRef = useRef(null);
    const navigate = useNavigate();

    // Auto-redirect if already logged in
    useEffect(() => {
        if (localStorage.getItem('token')) {
            navigate('/dashboard');
        }
    }, [navigate]);

    // Countdown timer for lockout
    useEffect(() => {
        if (lockoutSeconds > 0) {
            lockoutTimerRef.current = setInterval(() => {
                setLockoutSeconds(prev => {
                    if (prev <= 1) {
                        clearInterval(lockoutTimerRef.current);
                        setError('');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(lockoutTimerRef.current);
    }, [lockoutSeconds]);

    const formatLockout = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
    };

    const handleChange = (e) => {
        let { name, value } = e.target;
        if (name === 'phone') {
            value = value.replace(/\s+/g, '');
        }
        setFormData({ ...formData, [name]: value });
        if (lockoutSeconds === 0) setError('');
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        if (lockoutSeconds > 0) return;
        setLoading(true);
        setError('');

        try {
            const { data } = await axios.post('/api/auth/access', formData);
            
            if (data.emailVerificationRequired) {
                setUserId(data.userId);
                setInfoMessage(data.message);
                setStep('email-verify');
            } else if (data.twoFaRequired) {
                setUserId(data.userId);
                setInfoMessage(data.message);
                setStep('2fa-verify');
            } else {
                // Success
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                navigate('/dashboard');
            }
        } catch (err) {
            const retryAfter = err.response?.data?.retryAfter;
            const msg = err.response?.data?.error || 'Login failed. Please check your credentials.';
            setError(msg);
            if (retryAfter && retryAfter > 0) {
                clearInterval(lockoutTimerRef.current);
                setLockoutSeconds(retryAfter);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifySubmit = async (e, endpoint) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data } = await axios.post(`/api/auth/${endpoint}`, {
                userId,
                code: verificationCode
            });

            if (data.twoFaRequired) {
                // Transition from email verify to 2fa verify
                setInfoMessage(data.message);
                setVerificationCode('');
                setStep('2fa-verify');
            } else {
                // Success
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Verification failed. Please check the code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className="mb-6 flex justify-between items-center px-2">
                <Link 
                    to="/" 
                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary transition-colors group"
                >
                    <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
                    <span>Go Back Home</span>
                </Link>
            </div>
            <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full border border-white/50">
                <div className="text-center mb-8 flex flex-col items-center">
                    <Logo className="w-16 h-16 mb-4" />
                    <h1 className="text-3xl font-bold text-gray-900">
                        {step === 'login' ? 'Welcome Back' : 'Verification Required'}
                    </h1>
                    <p className="text-gray-500 mt-2">
                        {step === 'login' ? 'Sign in to your Ufriends account' : infoMessage}
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {error && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`p-3 rounded-xl text-sm mb-6 border flex items-center justify-center gap-2 font-medium ${
                                lockoutSeconds > 0
                                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                                    : 'bg-red-50 text-red-600 border-red-100'
                            }`}
                        >
                            {lockoutSeconds > 0 && <Clock size={16} className="shrink-0" />}
                            <span>{error}</span>
                            {lockoutSeconds > 0 && (
                                <span className="ml-auto font-mono bg-orange-100 text-orange-800 px-2 py-0.5 rounded-md text-xs font-bold">
                                    {formatLockout(lockoutSeconds)}
                                </span>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {step === 'login' && (
                    <form onSubmit={handleLoginSubmit} className="space-y-6">
                        <Input
                            label="Phone Number"
                            name="phone"
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="Enter your phone number"
                            required
                            className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 bg-gray-50/50"
                        />

                        <Input
                            label="Password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            required
                            className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 bg-gray-50/50"
                            rightElement={
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-gray-400 hover:text-primary transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            }
                        />

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center text-gray-600 cursor-pointer hover:text-gray-900 transition-colors">
                                <input type="checkbox" className="mr-2 rounded border-gray-300 text-primary focus:ring-primary" />
                                Remember me
                            </label>
                            <Link to="/forgot-password" className="text-primary hover:text-secondary font-medium transition-colors">
                                Forgot password?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            className="w-full py-3 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg shadow-primary/25 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                            loading={loading}
                            disabled={loading || lockoutSeconds > 0}
                        >
                            {lockoutSeconds > 0 ? `Locked — ${formatLockout(lockoutSeconds)}` : 'Sign In'}
                        </Button>

                        <p className="mt-8 text-center text-sm text-gray-600">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-primary hover:text-secondary font-bold transition-colors">
                                Create Account
                            </Link>
                        </p>
                    </form>
                )}

                {step === 'email-verify' && (
                    <form onSubmit={(e) => handleVerifySubmit(e, 'verify-email')} className="space-y-6">
                        <Input
                            label="Verification Code (OTP)"
                            name="code"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={verificationCode}
                            onChange={(e) => { setVerificationCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                            placeholder="Enter 6-digit code"
                            required
                            maxLength={6}
                            className="text-center tracking-widest text-xl rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 bg-gray-50/50"
                        />

                        <Button
                            type="submit"
                            className="w-full py-3 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg shadow-primary/25 transition-all duration-300 transform hover:-translate-y-0.5"
                            loading={loading}
                        >
                            Verify Email
                        </Button>

                        <button 
                            type="button" 
                            onClick={() => { setStep('login'); setVerificationCode(''); setError(''); }}
                            className="w-full text-center text-sm font-medium text-gray-500 hover:text-gray-700 mt-4 outline-none"
                        >
                            Cancel & Return to Login
                        </button>
                    </form>
                )}

                {step === '2fa-verify' && (
                    <form onSubmit={(e) => handleVerifySubmit(e, 'verify-2fa')} className="space-y-6">
                        <Input
                            label="Two-Factor Authentication Code"
                            name="code"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={verificationCode}
                            onChange={(e) => { setVerificationCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                            placeholder="Enter 6-digit code"
                            required
                            maxLength={6}
                            className="text-center tracking-widest text-xl rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 bg-gray-50/50"
                        />

                        <Button
                            type="submit"
                            className="w-full py-3 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg shadow-primary/25 transition-all duration-300 transform hover:-translate-y-0.5"
                            loading={loading}
                        >
                            Verify 2FA
                        </Button>

                        <button 
                            type="button" 
                            onClick={() => { setStep('login'); setVerificationCode(''); setError(''); }}
                            className="w-full text-center text-sm font-medium text-gray-500 hover:text-gray-700 mt-4 outline-none"
                        >
                            Cancel & Return to Login
                        </button>
                    </form>
                )}
            </div>
        </AuthLayout>
    );
}

