import React, { useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Send from 'lucide-react/dist/esm/icons/send';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

export default function BroadcastMessage() {
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        userType: '',
        sendEmail: false
    });
    const [sending, setSending] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.message) return toast.error('Please fill in all fields')

        if (!confirm('Are you sure you want to send this broadcast? It will create notifications for all selected users.')) return;

        setSending(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.post('/api/admin/broadcast', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.error(res.data.message)
            setFormData({ title: '', message: '', userType: '', sendEmail: false });
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || 'Failed to send broadcast')
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Megaphone className="w-6 h-6 mr-2 text-indigo-600" />
                Broadcast Messaging
            </h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="mb-6 bg-blue-50 text-blue-800 p-4 rounded-lg text-sm">
                    This tool sends a notification to all users or specific groups. Users will see this in their notification center.
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                        <select
                            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                            value={formData.userType}
                            onChange={e => setFormData({ ...formData, userType: e.target.value })}
                        >
                            <option value="">All Users</option>
                            <option value="1">Subscribers Only</option>
                            <option value="2">Agents Only</option>
                            <option value="3">Vendors Only</option>
                            <option value="4">Referrers Only</option>
                        </select>
                    </div>

                    <Input
                        label="Message Title"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. System Maintenance Update"
                        required
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Message Content</label>
                        <textarea
                            className="w-full border border-gray-300 rounded-lg p-3 min-h-[150px] focus:ring-2 focus:ring-indigo-500"
                            value={formData.message}
                            onChange={e => setFormData({ ...formData, message: e.target.value })}
                            placeholder="Type your message here..."
                            required
                        />
                    </div>

                    <div className="flex items-center mt-2">
                        <input
                            type="checkbox"
                            id="sendEmail"
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            checked={formData.sendEmail}
                            onChange={e => setFormData({ ...formData, sendEmail: e.target.checked })}
                        />
                        <label htmlFor="sendEmail" className="ml-2 block text-sm text-gray-900">
                            Send copy via Email
                        </label>
                    </div>

                    <Button type="submit" loading={sending} className="w-full flex justify-center items-center">
                        <Send size={18} className="mr-2" /> Send Broadcast
                    </Button>
                </form>
            </div>
        </div>
    );
}
