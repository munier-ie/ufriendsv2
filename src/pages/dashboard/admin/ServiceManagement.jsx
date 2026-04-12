import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Edit3 from 'lucide-react/dist/esm/icons/edit-3';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import Plus from 'lucide-react/dist/esm/icons/plus';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function ServiceManagement() {
    const [services, setServices] = useState([]);
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingService, setEditingService] = useState(null);
    const [isAddingService, setIsAddingService] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [expandedGroup, setExpandedGroup] = useState(null);
    const [newService, setNewService] = useState({
        type: 'airtime', name: '', code: '', price: '', agentPrice: '', vendorPrice: '', apiPrice: '', referralCommission: '', apiProviderId: '', active: true
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const [servicesRes, providersRes] = await Promise.all([
                axios.get('/api/admin/services', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/admin/providers', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setServices(servicesRes.data);
            setProviders(providersRes.data);
        } catch (error) {
            console.error('Failed to fetch services', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateService = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put(`/api/admin/services/${editingService.id}`, editingService, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEditingService(null);
            fetchData();
        } catch (error) {
            alert('Failed to update service');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddService = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.post('/api/admin/services', newService, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsAddingService(false);
            setNewService({ type: 'airtime', name: '', code: '', price: '', agentPrice: '', vendorPrice: '', apiPrice: '', referralCommission: '', apiProviderId: '', active: true });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to create service');
        } finally {
            setSubmitting(false);
        }
    };

    // Group services by type
    const groupedServices = services.reduce((acc, service) => {
        if (!acc[service.type]) acc[service.type] = [];
        acc[service.type].push(service);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Service Management</h1>
                <Button onClick={() => setIsAddingService(true)} className="flex items-center">
                    <Plus size={20} className="mr-2" /> Add Service
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={40} /></div>
            ) : services.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center">
                    <div className="p-4 bg-gray-50 rounded-full mb-4">
                        <Edit3 size={40} className="text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">No Services Configured</h3>
                    <p className="text-gray-500 max-w-md text-center">
                        There are currently no services available in the database. Services will automatically appear here once they are added via the Service Configuration options or by clicking "Add Service".
                    </p>
                </div>
            ) : (
                Object.entries(groupedServices).map(([type, items]) => (
                    <div key={type} className="space-y-3">
                        <button
                            onClick={() => setExpandedGroup(expandedGroup === type ? null : type)}
                            className="w-full flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="uppercase font-bold tracking-wider text-gray-700">{type}</div>
                                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold">{items.length} services</span>
                            </div>
                            <div className="text-gray-400">
                                {expandedGroup === type ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </button>

                        <AnimatePresence>
                            {expandedGroup === type && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-2">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                                                    <tr>
                                                        <th className="px-4 py-3">Service Name</th>
                                                        {type !== 'airtime' && type !== 'electricity' && <th className="px-4 py-3">Plan Code</th>}
                                                        <th className="px-4 py-3">Regular {type === 'airtime' ? '(%)' : '(₦)'}</th>
                                                        <th className="px-4 py-3">Agent {type === 'airtime' ? '(%)' : '(₦)'}</th>
                                                        <th className="px-4 py-3">Vendor {type === 'airtime' ? '(%)' : '(₦)'}</th>
                                                        <th className="px-4 py-3">API Cost {type === 'airtime' ? '(%)' : '(₦)'}</th>
                                                        <th className="px-4 py-3">Ref Comm {type === 'airtime' ? '(%)' : '(₦)'}</th>
                                                        <th className="px-4 py-3">Vendor</th>
                                                        <th className="px-4 py-3">Status</th>
                                                        <th className="px-4 py-3 text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 text-sm">
                                                    {items.map(service => (
                                                        <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{service.name}</td>
                                                            {type !== 'airtime' && type !== 'electricity' && (
                                                                <td className="px-4 py-3 font-mono text-xs text-gray-500">{service.code || '-'}</td>
                                                            )}
                                                            <td className="px-4 py-3 whitespace-nowrap">{service.price.toLocaleString()}</td>
                                                            <td className="px-4 py-3 text-blue-600 font-medium whitespace-nowrap">{service.agentPrice?.toLocaleString() || '-'}</td>
                                                            <td className="px-4 py-3 text-purple-600 font-medium whitespace-nowrap">{service.vendorPrice?.toLocaleString() || '-'}</td>
                                                            <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{service.apiPrice?.toLocaleString() || '-'}</td>
                                                            <td className="px-4 py-3 text-orange-600 font-medium whitespace-nowrap">{service.referralCommission?.toLocaleString() || '-'}</td>
                                                            <td className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">{service.apiProvider?.name || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                {service.active ?
                                                                    <span className="flex items-center text-green-600"><CheckCircle size={14} className="mr-1" /> Active</span> :
                                                                    <span className="flex items-center text-red-500"><XCircle size={14} className="mr-1" /> Inactive</span>
                                                                }
                                                            </td>
                                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                                <button
                                                                    onClick={() => setEditingService(service)}
                                                                    className="p-2 hover:bg-gray-100 rounded-lg inline-flex"
                                                                >
                                                                    <Edit3 size={16} className="text-gray-400 hover:text-primary" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))
            )}

            {/* Add Service Modal */}
            <AnimatePresence>
                {isAddingService && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]"
                        >
                            <h2 className="text-xl font-bold mb-6">Add New Service</h2>
                            <form onSubmit={handleAddService} className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Service Type</label>
                                    <select
                                        className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        value={newService.type}
                                        onChange={e => setNewService({ ...newService, type: e.target.value })}
                                        required
                                    >
                                        <option value="airtime">Airtime</option>
                                        <option value="data">Data</option>
                                        <option value="cable">Cable TV</option>
                                        <option value="electricity">Electricity</option>
                                        <option value="exam">Exam Pins</option>
                                        <option value="smile">Smile</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <Input
                                        label="Service Display Name (e.g. MTN Airtime, DSTV Premium)"
                                        value={newService.name}
                                        onChange={e => setNewService({ ...newService, name: e.target.value })}
                                        required
                                    />
                                </div>
                                {newService.type !== 'airtime' && newService.type !== 'electricity' && (
                                    <div className="col-span-2">
                                        <Input
                                            label="Plan Code"
                                            value={newService.code}
                                            onChange={e => setNewService({ ...newService, code: e.target.value })}
                                        />
                                    </div>
                                )}
                                <Input
                                    label={`Regular Price ${newService.type === 'airtime' ? '(%)' : '(₦)'}`}
                                    type="number"
                                    value={newService.price}
                                    onChange={e => setNewService({ ...newService, price: e.target.value })}
                                    required
                                />
                                <Input
                                    label={`Agent Price ${newService.type === 'airtime' ? '(%)' : '(₦)'}`}
                                    type="number"
                                    value={newService.agentPrice}
                                    onChange={e => setNewService({ ...newService, agentPrice: e.target.value })}
                                />
                                <Input
                                    label={`Vendor Price ${newService.type === 'airtime' ? '(%)' : '(₦)'}`}
                                    type="number"
                                    value={newService.vendorPrice}
                                    onChange={e => setNewService({ ...newService, vendorPrice: e.target.value })}
                                />
                                <Input
                                    label={`API Cost Price ${newService.type === 'airtime' ? '(%)' : '(₦)'}`}
                                    type="number"
                                    value={newService.apiPrice}
                                    onChange={e => setNewService({ ...newService, apiPrice: e.target.value })}
                                />
                                 <Input
                                     label={`Referral Commission ${newService.type === "airtime" || newService.type === "data" ? "(%)" : "(₦)"}`}
                                     type="number"
                                     value={newService.referralCommission}
                                     onChange={e => setNewService({ ...newService, referralCommission: e.target.value })}
                                 />

                                <div className="col-span-2 space-y-2">
                                    <label className="text-sm font-medium text-gray-700">API Provider (Optional)</label>
                                    <select
                                        className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        value={newService.apiProviderId}
                                        onChange={e => setNewService({ ...newService, apiProviderId: e.target.value })}
                                    >
                                        <option value="">Select Provider</option>
                                        {providers.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-2 flex items-center space-x-2 py-2">
                                    <input
                                        type="checkbox"
                                        id="newActive"
                                        checked={newService.active}
                                        onChange={e => setNewService({ ...newService, active: e.target.checked })}
                                        className="w-4 h-4 rounded text-primary focus:ring-primary"
                                    />
                                    <label htmlFor="newActive" className="text-sm font-medium text-gray-700">Make Service Active Immediately</label>
                                </div>

                                <div className="col-span-2 flex space-x-3 pt-4">
                                    <Button type="button" variant="outline" onClick={() => setIsAddingService(false)} className="flex-1">Cancel</Button>
                                    <Button type="submit" loading={submitting} className="flex-1">Add Service</Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingService && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]"
                        >
                            <h2 className="text-xl font-bold mb-6">Edit {editingService.name}</h2>
                            <form onSubmit={handleUpdateService} className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Input
                                        label="Service Display Name"
                                        value={editingService.name}
                                        onChange={e => setEditingService({ ...editingService, name: e.target.value })}
                                    />
                                </div>
                                {editingService.type !== 'airtime' && editingService.type !== 'electricity' && (
                                    <div className="col-span-2">
                                        <Input
                                            label="Plan Code"
                                            value={editingService.code || ''}
                                            onChange={e => setEditingService({ ...editingService, code: e.target.value })}
                                        />
                                    </div>
                                )}
                                <Input
                                    label={`Regular Price ${editingService.type === 'airtime' ? '(%)' : '(₦)'}`}
                                    type="number"
                                    value={editingService.price}
                                    onChange={e => setEditingService({ ...editingService, price: e.target.value })}
                                />
                                <Input
                                    label={`Agent Price ${editingService.type === 'airtime' ? '(%)' : '(₦)'}`}
                                    type="number"
                                    value={editingService.agentPrice || ''}
                                    onChange={e => setEditingService({ ...editingService, agentPrice: e.target.value })}
                                />
                                <Input
                                    label={`Vendor Price ${editingService.type === 'airtime' ? '(%)' : '(₦)'}`}
                                    type="number"
                                    value={editingService.vendorPrice || ''}
                                    onChange={e => setEditingService({ ...editingService, vendorPrice: e.target.value })}
                                />
                                 <Input
                                     label={`Referral Commission ${editingService.type === "airtime" || editingService.type === "data" ? "(%)" : "(₦)"}`}
                                     type="number"
                                     value={editingService.referralCommission || ""}
                                     onChange={e => setEditingService({ ...editingService, referralCommission: e.target.value })}
                                 />
                                <Input
                                    label={`API Cost Price ${editingService.type === 'airtime' ? '(%)' : '(₦)'}`}
                                    type="number"
                                    value={editingService.apiPrice || ''}
                                    onChange={e => setEditingService({ ...editingService, apiPrice: e.target.value })}
                                />

                                <div className="col-span-2 space-y-2">
                                    <label className="text-sm font-medium text-gray-700">API Provider</label>
                                    <select
                                        className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        value={editingService.apiProviderId || ''}
                                        onChange={e => setEditingService({ ...editingService, apiProviderId: e.target.value })}
                                    >
                                        <option value="">Select Provider</option>
                                        {providers.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-2 flex items-center space-x-2 py-2">
                                    <input
                                        type="checkbox"
                                        id="active"
                                        checked={editingService.active}
                                        onChange={e => setEditingService({ ...editingService, active: e.target.checked })}
                                        className="w-4 h-4 rounded text-primary focus:ring-primary"
                                    />
                                    <label htmlFor="active" className="text-sm font-medium text-gray-700">Service is Active</label>
                                </div>

                                <div className="col-span-2 flex space-x-3 pt-4">
                                    <Button type="button" variant="outline" onClick={() => setEditingService(null)} className="flex-1">Cancel</Button>
                                    <Button type="submit" loading={submitting} className="flex-1">Save Changes</Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
