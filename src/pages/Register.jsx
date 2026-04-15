import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import AuthLayout from '../components/layout/AuthLayout';
import Logo from '../components/ui/Logo';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

const NIGERIAN_STATES = [
    "Abuja FCT", "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
    "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa",
    "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nassarawa", "Niger",
    "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

export default function Register() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        pin: '',
        state: '',
        referral: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useState(() => {
        const params = new URLSearchParams(location.search);
        const ref = params.get('referral') || params.get('ref');
        if (ref) {
            setFormData(prev => ({ ...prev, referral: ref }));
        }
    }, [location.search]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Local Validation
        if (formData.password !== formData.confirmPassword) {
            return setError('Passwords do not match');
        }
        if (formData.pin.length !== 4) {
            return setError('Transaction PIN must be exactly 4 digits');
        }
        if (!formData.state) {
            return setError('Please select your state');
        }
        if (!agreedToTerms) {
            return setError('You must agree to the Terms of Service and Privacy Policy to continue');
        }

        setLoading(true);
        setError('');

        try {
            const { confirmPassword, ...submitData } = formData;
            await axios.post('/api/auth/register', submitData);
            navigate('/login', { state: { message: 'Registration successful! Please login.' } });
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout maxWidth="max-w-2xl">
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
                        Create Account
                    </h1>
                    <p className="text-gray-500 mt-2">Join Ufriends today</p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 border border-red-100 flex items-center justify-center font-medium"
                    >
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <Input
                            label="First Name"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            placeholder="John"
                            required
                            className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 bg-gray-50/50"
                        />
                        <Input
                            label="Last Name"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            placeholder="Doe"
                            required
                            className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 bg-gray-50/50"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <Input
                            label="Email Address"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="john@example.com"
                            required
                            className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 bg-gray-50/50"
                        />
                        <Input
                            label="Phone Number"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="08012345678"
                            required
                            className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 bg-gray-50/50"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <Input
                            label="Password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
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
                        <Input
                            label="Confirm Password"
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="••••••••"
                            required
                            className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 bg-gray-50/50"
                            rightElement={
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="text-gray-400 hover:text-primary transition-colors focus:outline-none"
                                >
                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            }
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <Input
                            label="Transaction PIN (4 Digits)"
                            name="pin"
                            type={showPin ? "text" : "password"}
                            maxLength={4}
                            value={formData.pin}
                            onChange={handleChange}
                            placeholder="••••"
                            required
                            className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 bg-gray-50/50"
                            rightElement={
                                <button
                                    type="button"
                                    onClick={() => setShowPin(!showPin)}
                                    className="text-gray-400 hover:text-primary transition-colors focus:outline-none"
                                >
                                    {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            }
                        />
                        <div className="space-y-1.5 text-left">
                            <label className="text-sm font-medium text-gray-700 ml-1">State</label>
                            <select
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none text-gray-900"
                                required
                            >
                                <option value="" disabled>Select State</option>
                                {NIGERIAN_STATES.map(state => (
                                    <option key={state} value={state}>{state}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <Input
                        label="Referral ID (Optional)"
                        name="referral"
                        value={formData.referral}
                        onChange={handleChange}
                        placeholder="Referrer ID"
                        className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 bg-gray-50/50"
                    />

                    {/* Terms & Privacy Checkbox */}
                    <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <input
                            id="terms-checkbox"
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => { setAgreedToTerms(e.target.checked); setError(''); }}
                            className="mt-0.5 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary/20 cursor-pointer shrink-0"
                        />
                        <label htmlFor="terms-checkbox" className="text-sm text-gray-600 cursor-pointer leading-relaxed">
                            I have read and agree to the{' '}
                            <Link to="/terms" target="_blank" className="text-primary font-semibold hover:underline">Terms of Service</Link>
                            {' '}and{' '}
                            <Link to="/privacy" target="_blank" className="text-primary font-semibold hover:underline">Privacy Policy</Link>
                            {' '}of UFriends IT. I confirm I am at least 18 years old and that all verification activities I perform will have the explicit consent of the individual being verified.
                        </label>
                    </div>

                    <div className="pt-2">
                        <Button
                            type="submit"
                            className="w-full py-3 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg shadow-primary/25 transition-all duration-300 transform hover:-translate-y-0.5"
                            loading={loading}
                        >
                            Create Account
                        </Button>
                    </div>
                </form>

                <p className="mt-8 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary hover:text-secondary font-bold transition-colors">
                        Sign In
                    </Link>
                </p>
            </div>
        </AuthLayout>
    );
}

