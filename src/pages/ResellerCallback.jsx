import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';

const ResellerCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
    const [error, setError] = useState(null);
    const verificationAttempted = useRef(false);

    useEffect(() => {
        const reference = searchParams.get('reference') || searchParams.get('trsRef');
        
        if (!reference) {
            setStatus('error');
            setError('No transaction reference found');
            return;
        }

        if (verificationAttempted.current) return;
        verificationAttempted.current = true;

        const verifyPayment = async () => {
            try {
                const response = await axios.get(`/api/reseller/verify/${reference}`);
                
                if (response.data.success) {
                    setStatus('success');
                    toast.success('Payment verified successfully!');
                    
                    // Redirect to status page after 3 seconds
                    setTimeout(() => {
                        navigate(`/reseller/status/${reference}`);
                    }, 3000);
                } else {
                    setStatus('error');
                    setError(response.data.error || 'Verification failed');
                }
            } catch (err) {
                console.error('Verification error:', err);
                setStatus('error');
                setError(err.response?.data?.error || 'Failed to verify payment. Please contact support.');
            }
        };

        verifyPayment();
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100 text-center">
                {status === 'verifying' && (
                    <div className="space-y-6">
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto animate-pulse">
                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Verifying Payment</h2>
                            <p className="text-gray-500 mt-2">Please wait while we confirm your transaction with Paystack...</p>
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-6">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Payment Confirmed!</h2>
                            <p className="text-gray-500 mt-2">Your reseller setup request has been successfully processing.</p>
                            <p className="text-sm text-gray-400 mt-4 italic text-center">Redirecting to status page...</p>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-6">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                            <XCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Verification Failed</h2>
                            <p className="text-red-500 mt-2">{error}</p>
                        </div>
                        <button
                            onClick={() => navigate('/reseller')}
                            className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
                        >
                            Back to Reseller Page
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResellerCallback;
