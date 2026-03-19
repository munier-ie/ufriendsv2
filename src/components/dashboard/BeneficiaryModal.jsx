import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import X from 'lucide-react/dist/esm/icons/x';
import Search from 'lucide-react/dist/esm/icons/search';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import User from 'lucide-react/dist/esm/icons/user';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function BeneficiaryModal({ isOpen, onClose, onSelect }) {
    const [beneficiaries, setBeneficiaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [view, setView] = useState('list'); // 'list' or 'add'

    // Add form state
    const [newContact, setNewContact] = useState({ name: '', phone: '' });
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchBeneficiaries();
        }
    }, [isOpen]);

    const fetchBeneficiaries = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/beneficiary', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBeneficiaries(res.data);
        } catch (error) {
            console.error('Failed to fetch beneficiaries', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setAdding(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/beneficiary', newContact, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBeneficiaries([...beneficiaries, res.data.beneficiary]);
            setView('list');
            setNewContact({ name: '', phone: '' });
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to add contact');
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this contact?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/beneficiary/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBeneficiaries(beneficiaries.filter(b => b.id !== id));
        } catch (error) {
            console.error('Failed to delete', error);
        }
    };

    const filtered = beneficiaries.filter(b =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.phone.includes(search)
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-800">
                        {view === 'list' ? 'Select Contact' : 'Add New Contact'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 h-[400px] overflow-y-auto">
                    {view === 'list' ? (
                        <>
                            <div className="flex space-x-2 mb-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search contacts..."
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={() => setView('add')}
                                    className="p-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                                >
                                    <Plus size={24} />
                                </button>
                            </div>

                            {loading ? (
                                <div className="flex justify-center items-center h-40">
                                    <Loader2 className="animate-spin text-primary" size={32} />
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    <User size={48} className="mx-auto mb-3 opacity-20" />
                                    <p>No contacts found</p>
                                    <button onClick={() => setView('add')} className="text-primary font-medium mt-2">Add your first contact</button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filtered.map(b => (
                                        <div
                                            key={b.id}
                                            onClick={() => onSelect(b)}
                                            className="flex items-center justify-between p-3 hover:bg-gray-50 border border-gray-100 rounded-xl cursor-pointer group transition-colors"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-primary font-bold">
                                                    {b.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">{b.name}</p>
                                                    <p className="text-sm text-gray-500">{b.phone}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => handleDelete(b.id, e)}
                                                className="p-2 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <form onSubmit={handleAdd} className="space-y-6 pt-4">
                            <Input
                                label="Name"
                                placeholder="Contact Name"
                                value={newContact.name}
                                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                required
                            />
                            <Input
                                label="Phone Number"
                                placeholder="080..."
                                type="tel"
                                value={newContact.phone}
                                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                                required
                            />

                            <div className="flex space-x-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setView('list')}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1"
                                    loading={adding}
                                >
                                    Save Contact
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
