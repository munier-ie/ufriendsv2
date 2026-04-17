import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Send from 'lucide-react/dist/esm/icons/send';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import CheckCheck from 'lucide-react/dist/esm/icons/check-check';
import Button from '../../../components/ui/Button';

export default function ContactMessages() {
    const [messages, setMessages] = useState([]);
    const [stats, setStats] = useState({ total: 0, unread: 0, replied: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedMsg, setSelectedMsg] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchMessages();
        fetchStats();
    }, []);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/contact', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(res.data.messages);
        } catch (error) {
            console.error('Failed to fetch messages', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/contact/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(res.data.stats);
        } catch (error) {
            console.error('Failed to fetch stats', error);
        }
    };

    const handleReply = async () => {
        if (!replyText.trim()) return;
        setSending(true);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put(`/api/admin/contact/${selectedMsg.id}/reply`, { reply: replyText }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Reply sent successfully')
            setReplyText('');
            setSelectedMsg(null);
            fetchMessages();
            fetchStats();
        } catch (error) {
            toast.error('Failed to send reply')
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!confirm('Area you sure you want to delete this message?')) return;
        try {
            const token = localStorage.getItem('adminToken');
            await axios.delete(`/api/admin/contact/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(messages.filter(m => m.id !== id));
            if (selectedMsg?.id === id) setSelectedMsg(null);
            fetchStats();
        } catch (error) {
            toast.error('Failed to delete message')
        }
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3 flex flex-col gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Support Messages</h1>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 text-center">
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="text-lg font-bold">{stats.total}</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-100">
                        <div className="text-xs text-blue-600">Unread</div>
                        <div className="text-lg font-bold text-blue-700">{stats.unread}</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg text-center border border-green-100">
                        <div className="text-xs text-green-600">Replied</div>
                        <div className="text-lg font-bold text-green-700">{stats.replied}</div>
                    </div>
                </div>

                {/* Message List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-gray-100 font-medium text-gray-700 bg-gray-50">Inbox</div>
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-gray-400" /></div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {messages.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">No messages found</div>
                                ) : (
                                    messages.map(msg => (
                                        <div
                                            key={msg.id}
                                            onClick={() => setSelectedMsg(msg)}
                                            className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedMsg?.id === msg.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={`font-medium text-sm truncate pr-2 ${msg.status === 0 ? 'text-gray-900 font-bold' : 'text-gray-700'}`}>
                                                    {msg.subject}
                                                </h4>
                                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                                    {new Date(msg.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-2 truncate">{msg.name}</p>
                                            <div className="flex justify-between items-center">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${msg.status === 2 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {msg.status === 2 ? 'Replied' : 'Pending'}
                                                </span>
                                                <button onClick={(e) => handleDelete(msg.id, e)} className="text-gray-400 hover:text-red-500">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Message Detail / Reply View */}
            <div className="w-full md:w-2/3 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                {selectedMsg ? (
                    <>
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedMsg.subject}</h2>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                <div className="flex items-center">
                                    <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 mr-2">
                                        {selectedMsg.name[0]}
                                    </span>
                                    <div>
                                        <span className="font-medium text-gray-900">{selectedMsg.name}</span>
                                        <span className="text-gray-400 mx-2">&bull;</span>
                                        <span>{selectedMsg.email}</span>
                                    </div>
                                </div>
                                <span className="ml-auto">{new Date(selectedMsg.createdAt).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                            <div className="prose max-w-none text-gray-800 whitespace-pre-wrap">
                                {selectedMsg.message}
                            </div>

                            {selectedMsg.status === 2 && selectedMsg.reply && (
                                <div className="mt-8 ml-8 bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <div className="flex items-center gap-2 mb-2 text-blue-800 font-medium text-sm">
                                        <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center">A</div>
                                        Admin Reply
                                        <span className="text-xs text-blue-400 font-normal ml-auto">
                                            {selectedMsg.repliedAt && new Date(selectedMsg.repliedAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{selectedMsg.reply}</p>
                                </div>
                            )}
                        </div>

                        {selectedMsg.status !== 2 && (
                            <div className="p-4 border-t border-gray-100 bg-white">
                                <textarea
                                    className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] mb-3"
                                    placeholder="Type your reply here..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                ></textarea>
                                <div className="flex justify-end">
                                    <Button
                                        onClick={handleReply}
                                        loading={sending}
                                        disabled={!replyText.trim()}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        <Send size={16} className="mr-2" /> Send Reply
                                    </Button>
                                </div>
                            </div>
                        )}
                        {selectedMsg.status === 2 && (
                            <div className="p-4 border-t border-gray-100 bg-gray-50 text-center text-green-600 font-medium text-sm flex items-center justify-center">
                                <CheckCheck size={16} className="mr-2" /> This message has been replied to.
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                        <Mail size={48} className="mb-4 text-gray-200" />
                        <p>Select a message to read</p>
                    </div>
                )}
            </div>
        </div>
    );
}
