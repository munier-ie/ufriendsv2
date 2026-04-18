import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import Plus from 'lucide-react/dist/esm/icons/plus';
import CheckCheck from 'lucide-react/dist/esm/icons/check-check';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function Support() {
        const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sending, setSending] = useState(false);
    
    // Form state
    const [subject, setSubject] = useState('');
    const [messageContent, setMessageContent] = useState('');
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/user/support', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(res.data.messages || []);
        } catch (error) {
            console.error('Failed to fetch messages', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!subject.trim() || !messageContent.trim()) return;
        
        setSending(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/user/support', { 
                subject, 
                message: messageContent 
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Add new message to the top of the list
            setMessages([res.data.data, ...messages]);
            setIsModalOpen(false);
            setSubject('');
            setMessageContent('');
            toast.success('Your message has been sent to our support team.');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <MessageSquare className="w-6 h-6 mr-2 text-primary" />
                        Support Center
                    </h1>
                    <p className="text-gray-500 mt-1">Contact our support team and track your requests</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="flex items-center">
                    <Plus size={18} className="mr-2" /> New Request
                </Button>
            </div>



            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="font-semibold text-gray-700">Your Support History</h2>
                </div>
                
                {loading ? (
                    <div className="flex justify-center items-center p-12">
                        <Loader2 className="animate-spin text-primary w-8 h-8" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center p-12 text-gray-500">
                        <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-lg font-medium text-gray-900 mb-1">No support requests yet</p>
                        <p>Need help? Create a new request and our team will assist you.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                        {messages.map(msg => (
                            <div key={msg.id} className="p-6 transition-colors hover:bg-gray-50">
                                <div className="flex justify-between items-start mb-2 block sm:flex">
                                    <h3 className="font-bold text-gray-900 text-lg sm:mr-4">{msg.subject}</h3>
                                    <div className="flex items-center mt-2 sm:mt-0 space-x-3 whitespace-nowrap">
                                        <span className="text-sm text-gray-400">
                                            {new Date(msg.createdAt).toLocaleDateString()}
                                        </span>
                                        <span className={`flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                            msg.status === 2 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {msg.status === 2 ? <CheckCheck size={12} className="mr-1" /> : <Clock size={12} className="mr-1" />}
                                            {msg.status === 2 ? 'Replied' : 'Pending Review'}
                                        </span>
                                    </div>
                                </div>
                                
                                <p className="text-gray-600 text-sm whitespace-pre-wrap mt-2">{msg.message}</p>
                                
                                {msg.status === 2 && msg.reply && (
                                    <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                                        <div className="flex items-center mb-1">
                                            <div className="font-semibold text-blue-900 text-sm">Response from Support</div>
                                            <span className="text-xs text-blue-400 ml-auto">
                                                {msg.repliedAt ? new Date(msg.repliedAt).toLocaleDateString() : ''}
                                            </span>
                                        </div>
                                        <p className="text-blue-800 text-sm whitespace-pre-wrap">{msg.reply}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* New Message Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !sending && setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl p-6 shadow-2xl z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto relative"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900">New Support Request</h3>
                                <button 
                                    onClick={() => !sending && setIsModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <span className="text-2xl">&times;</span>
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Input
                                    label="Subject"
                                    placeholder="Briefly summarize your issue"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    required
                                    disabled={sending}
                                />
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                    <textarea
                                        className="w-full border border-gray-300 rounded-lg p-3 min-h-[150px] focus:ring-2 focus:ring-primary focus:border-transparent outline-none disabled:opacity-50"
                                        placeholder="Please provide details about your issue..."
                                        value={messageContent}
                                        onChange={(e) => setMessageContent(e.target.value)}
                                        required
                                        disabled={sending}
                                    />
                                </div>
                                
                                <div className="pt-4 flex justify-end space-x-3">
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        onClick={() => setIsModalOpen(false)}
                                        disabled={sending}
                                    >
                                        Cancel
                                    </Button>
                                    <Button 
                                        type="submit" 
                                        loading={sending}
                                        disabled={!subject.trim() || !messageContent.trim()}
                                    >
                                        Send Message
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
