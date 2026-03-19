import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import History from 'lucide-react/dist/esm/icons/history';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';

export default function BulkSMS() {
    const [formData, setFormData] = useState({
        senderId: '',
        recipients: '',
        message: '',
        flash: false
    });
    const [submitting, setSubmitting] = useState(false);
    const [apiResponse, setApiResponse] = useState({ type: '', text: '' });

    const charCount = formData.message.length;
    const pages = Math.ceil(charCount / 160) || 1;
    const recipientCount = formData.recipients.split(/[\n,]+/).filter(num => num.trim()).length;
    const costPerPage = 2.50; // Mock cost
    const totalCost = recipientCount * pages * costPerPage;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setApiResponse({ type: '', text: '' });

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/sms/send', {
                ...formData,
                recipients: formData.recipients.split(/[\n,]+/).map(r => r.trim()).filter(r => r)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setApiResponse({ type: 'success', text: res.data.message });
            setFormData({ senderId: '', recipients: '', message: '', flash: false });
        } catch (error) {
            setApiResponse({ type: 'error', text: error.response?.data?.error || 'Failed to send SMS' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <MessageSquare className="mr-2 text-primary" /> Bulk SMS
                </h1>
                <Button variant="outline" size="sm" className="flex items-center">
                    <History size={16} className="mr-1" /> History
                </Button>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
                <AnimatePresence>
                    {apiResponse.text && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`mb-6 p-4 rounded-xl flex items-center space-x-3 ${apiResponse.type === 'success'
                                ? 'bg-green-50 text-green-700 border border-green-100'
                                : 'bg-red-50 text-red-700 border border-red-100'
                                }`}
                        >
                            {apiResponse.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                            <span className="font-medium">{apiResponse.text}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        label="Sender ID"
                        maxLength={11}
                        placeholder="Max 11 characters"
                        value={formData.senderId}
                        onChange={(e) => setFormData({ ...formData, senderId: e.target.value })}
                        required
                        helperText="The name that appears on the receiver's phone."
                    />

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Recipients</label>
                        <textarea
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[100px] focus:ring-2 focus:ring-primary outline-none resize-y"
                            placeholder="Enter phone numbers separated by comma or new line"
                            value={formData.recipients}
                            onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                            required
                        />
                        <p className="text-xs text-gray-500 text-right">{recipientCount} recipients</p>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Message</label>
                        <textarea
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[120px] focus:ring-2 focus:ring-primary outline-none resize-y"
                            placeholder="Type your message here..."
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            required
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>{pages} Page(s)</span>
                            <span>{charCount} Characters</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="flash"
                            checked={formData.flash}
                            onChange={(e) => setFormData({ ...formData, flash: e.target.checked })}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="flash" className="text-sm text-gray-700">Send as Flash SMS</label>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Total Cost</span>
                        <span className="text-2xl font-bold text-gray-900">
                            ₦{totalCost.toFixed(2)}
                        </span>
                    </div>

                    <Button
                        type="submit"
                        className="w-full py-4 text-lg font-bold"
                        loading={submitting}
                        disabled={!formData.senderId || !formData.recipients || !formData.message}
                    >
                        Send Message
                    </Button>
                </form>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 border border-blue-100">
                <p><strong>Note:</strong> DND (Do Not Disturb) numbers may not receive messages. You will still be charged for sent messages.</p>
            </div>
        </div>
    );
}
