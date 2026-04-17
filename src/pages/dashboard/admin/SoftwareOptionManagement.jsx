import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Save from 'lucide-react/dist/esm/icons/save';
import Phone from 'lucide-react/dist/esm/icons/phone';
import Terminal from 'lucide-react/dist/esm/icons/terminal';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

export default function SoftwareOptionManagement() {
    const [options, setOptions] = useState([]);
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // New option state
    const [newOption, setNewOption] = useState({ category: 'Software Type', name: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('adminToken');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const [optionsRes, whatsappRes] = await Promise.all([
                axios.get('/api/admin/software/options', config),
                axios.get('/api/admin/software/whatsapp', config)
            ]);
            setOptions(optionsRes.data);
            setWhatsappNumber(whatsappRes.data.phoneNumber);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load settings')
        } finally {
            setLoading(false);
        }
    };

    const handleAddOption = async (e) => {
        e.preventDefault();
        if (!newOption.name.trim()) return;

        try {
            setSaving(true);
            const token = localStorage.getItem('adminToken');
            const res = await axios.post('/api/admin/software/options', newOption, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOptions([...options, res.data]);
            setNewOption({ ...newOption, name: '' });
            toast.success('Option added successfully')
        } catch (error) {
            toast.error('Failed to add option')
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteOption = async (id) => {
        if (!window.confirm('Are you sure you want to delete this option?')) return;

        try {
            const token = localStorage.getItem('adminToken');
            await axios.delete(`/api/admin/software/options/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOptions(options.filter(opt => opt.id !== id));
            toast.success('Option deleted')
        } catch (error) {
            toast.error('Failed to delete option')
        }
    };

    const handleUpdateWhatsapp = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem('adminToken');
            await axios.put('/api/admin/software/whatsapp', { phoneNumber: whatsappNumber }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('WhatsApp number updated')
        } catch (error) {
            toast.error('Failed to update WhatsApp number')
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-64 space-y-4">
                <Loader2 className="animate-spin text-primary" size={40} />
                <p className="font-bold text-gray-500">Loading Settings...</p>
            </div>
        );
    }

    const softwareTypes = options.filter(opt => opt.category === 'Software Type');
    const languages = options.filter(opt => opt.category === 'Programming Language');

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Software Development Settings</h1>
                    <p className="text-gray-500">Manage software types, technologies, and contact information</p>
                </div>
            </div>

            {/* WhatsApp Setting */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Phone className="mr-2 text-primary" size={20} /> Contact WhatsApp Number
                </h2>
                <div className="flex flex-col md:flex-row gap-4 md:items-end">
                    <div className="flex-1">
                        <Input
                            label="WhatsApp Number (with country code, no +)"
                            value={whatsappNumber}
                            onChange={(e) => setWhatsappNumber(e.target.value)}
                            placeholder="2347026417709"
                        />
                    </div>
                    <Button onClick={handleUpdateWhatsapp} disabled={saving} className="mb-1">
                        <Save size={18} className="mr-2" /> Save Number
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Software Types List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <Globe className="mr-2 text-primary" size={20} /> Software Types
                    </h2>

                    <form onSubmit={handleAddOption} className="mb-6 flex gap-2">
                        <Input
                            className="flex-1"
                            value={newOption.category === 'Software Type' ? newOption.name : ''}
                            onChange={(e) => setNewOption({ category: 'Software Type', name: e.target.value })}
                            placeholder="Add e.g. ERP System"
                        />
                        <Button type="submit" size="sm" disabled={saving || !newOption.name || newOption.category !== 'Software Type'}>
                            <Plus size={18} />
                        </Button>
                    </form>

                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2 flex-1">
                        {softwareTypes.length === 0 && <p className="text-center text-gray-400 py-4 italic">No software types added yet</p>}
                        {softwareTypes.map(opt => (
                            <div key={opt.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100">
                                <span className="text-gray-700 font-medium">{opt.name}</span>
                                <button
                                    onClick={() => handleDeleteOption(opt.id)}
                                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Option"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Programming Languages List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <Terminal className="mr-2 text-primary" size={20} /> Programming Languages
                    </h2>

                    <form onSubmit={handleAddOption} className="mb-6 flex gap-2">
                        <Input
                            className="flex-1"
                            value={newOption.category === 'Programming Language' ? newOption.name : ''}
                            onChange={(e) => setNewOption({ category: 'Programming Language', name: e.target.value })}
                            placeholder="Add e.g. Golang"
                        />
                        <Button type="submit" size="sm" disabled={saving || !newOption.name || newOption.category !== 'Programming Language'}>
                            <Plus size={18} />
                        </Button>
                    </form>

                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2 flex-1">
                        {languages.length === 0 && <p className="text-center text-gray-400 py-4 italic">No languages added yet</p>}
                        {languages.map(opt => (
                            <div key={opt.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100">
                                <span className="text-gray-700 font-medium">{opt.name}</span>
                                <button
                                    onClick={() => handleDeleteOption(opt.id)}
                                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Option"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
