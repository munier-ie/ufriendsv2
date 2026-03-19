import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Trash2, CheckCheck, Loader2, Calendar, AlertCircle } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/notifications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(res.data.notifications);
            setUnreadCount(res.data.unreadCount);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        } finally {
            setLoading(false);
        }
    };

    const markAllAsRead = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/notifications/mark-read', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const deleteNotification = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/notifications/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.filter(n => n.id !== id));
            // Update unread count if the deleted one was unread
            const deleted = notifications.find(n => n.id === id);
            if (deleted && !deleted.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Failed to delete notification', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <Bell size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                        <p className="text-sm text-gray-500">Stay updated on your account activity</p>
                    </div>
                </div>

                {unreadCount > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={markAllAsRead}
                        className="flex items-center gap-2"
                    >
                        <CheckCheck size={16} /> Mark all as read
                    </Button>
                )}
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                {notifications.length === 0 ? (
                    <div className="p-12 text-center space-y-4">
                        <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto">
                            <Bell size={32} />
                        </div>
                        <p className="text-gray-500 font-medium">No notifications yet.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {notifications.map((n) => (
                            <motion.div
                                key={n.id}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={`p-4 md:p-6 flex gap-4 transition-colors hover:bg-gray-50 ${!n.isRead ? 'bg-primary/5' : ''}`}
                            >
                                <div className={`shrink-0 w-2 h-2 mt-2 rounded-full ${!n.isRead ? 'bg-primary' : 'bg-transparent'}`} />

                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className={`font-bold text-gray-900 ${!n.isRead ? 'text-primary' : ''}`}>
                                            {n.title}
                                        </h3>
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1 font-medium whitespace-nowrap ml-2 uppercase tracking-wider">
                                            <Calendar size={10} /> {new Date(n.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {n.message}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-medium">
                                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>

                                <button
                                    onClick={() => deleteNotification(n.id)}
                                    className="shrink-0 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-4 flex gap-3">
                <AlertCircle className="text-blue-500 shrink-0" size={20} />
                <p className="text-xs text-blue-700 leading-relaxed">
                    <b>Tip:</b> Notifications are kept for 30 days to help you track your recent activities and account status updates.
                </p>
            </div>
        </div>
    );
}
