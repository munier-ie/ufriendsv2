import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, CheckCircle2, Apple, AlertCircle, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function DownloadModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, platform: 'ios' })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#004687', '#1e90ff', '#ffffff']
        });
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to connect to server. Please check your connection.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#004687] to-[#1e90ff] p-6 text-white text-center relative">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
              <Apple className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold">iOS Version</h3>
            <p className="text-white/80 mt-1">Under Development</p>
          </div>

          <div className="p-8">
            {status === 'success' ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-6"
              >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <h4 className="text-2xl font-bold text-gray-900 mb-2">You're on the list!</h4>
                <p className="text-gray-600">
                  Thank you for your interest. We'll notify you the moment Ufriends launches on the App Store.
                </p>
                <button 
                  onClick={onClose}
                  className="mt-8 w-full py-4 bg-gray-100 text-gray-900 font-semibold rounded-2xl hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </motion.div>
            ) : (
              <>
                <p className="text-gray-600 text-center mb-8">
                  We're working hard to bring the Ufriends experience to iOS. Join the waitlist to be among the first to know when it's ready!
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="email"
                      required
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary focus:bg-white outline-none transition-all text-gray-900"
                    />
                  </div>

                  {status === 'error' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{message}</span>
                    </motion.div>
                  )}

                  <button 
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full py-4 bg-gradient-to-r from-[#004687] to-[#1e90ff] text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:translate-y-0"
                  >
                    {status === 'loading' ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Joining...</span>
                      </div>
                    ) : (
                      'Join Waitlist'
                    )}
                  </button>
                </form>

                <p className="text-center text-xs text-gray-400 mt-6 uppercase tracking-widest font-semibold">
                  Secure • No Spam • 100% Free
                </p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
