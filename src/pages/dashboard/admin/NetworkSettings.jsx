import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Signal from 'lucide-react/dist/esm/icons/signal';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Switch from '../../../components/ui/Switch'; // Assuming Switch component exists or I'll implement inline if not

export default function NetworkSettings() {
    const [networks, setNetworks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null); // network name

    useEffect(() => {
        fetchNetworks();
    }, []);

    const fetchNetworks = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/config/networks', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNetworks(res.data.networks);
        } catch (error) {
            console.error('Failed to fetch networks', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (networkName, field, value) => {
        // Optimistic UI update
        const updatedNetworks = networks.map(n =>
            n.network === networkName ? { ...n, [field]: value } : n
        );
        setNetworks(updatedNetworks);
        setUpdating(networkName);

        try {
            const token = localStorage.getItem('adminToken');
            await axios.put(`/api/admin/config/networks/${networkName}`,
                { [field]: value },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error) {
            console.error('Failed to update network', error);
            // Revert on error
            fetchNetworks();
            alert('Failed to update setting');
        } finally {
            setUpdating(null);
        }
    };

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;

    const networkColors = {
        'MTN': 'bg-yellow-500',
        'GLO': 'bg-green-600',
        'AIRTEL': 'bg-red-600',
        '9MOBILE': 'bg-green-800'
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Network Configuration</h1>
                <p className="text-gray-500">Manage service availability for each network provider</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {networks.map(network => (
                    <div key={network.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className={`${networkColors[network.network] || 'bg-gray-600'} px-6 py-4 flex justify-between items-center text-white`}>
                            <div className="flex items-center space-x-2">
                                <Signal className="w-5 h-5" />
                                <h2 className="font-bold text-lg">{network.network}</h2>
                                {updating === network.network && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium">{network.active ? 'Active' : 'Disabled'}</span>
                                <Toggle
                                    checked={network.active}
                                    onChange={(checked) => handleToggle(network.network, 'active', checked)}
                                    color="text-white"
                                />
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            {!network.active && (
                                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center mb-4">
                                    <AlertCircle className="w-4 h-4 mr-2" />
                                    All services for {network.network} are currently disabled.
                                </div>
                            )}

                            <div className="space-y-4 opacity-100 transition-opacity duration-200" style={{ opacity: network.active ? 1 : 0.5 }}>
                                <ServiceToggle
                                    label="SME Data"
                                    checked={network.smeDataEnabled}
                                    onChange={(v) => handleToggle(network.network, 'smeDataEnabled', v)}
                                    disabled={!network.active}
                                />
                                <ServiceToggle
                                    label="Gifting Data"
                                    checked={network.giftingEnabled}
                                    onChange={(v) => handleToggle(network.network, 'giftingEnabled', v)}
                                    disabled={!network.active}
                                />
                                <ServiceToggle
                                    label="Corporate Data"
                                    checked={network.corporateEnabled}
                                    onChange={(v) => handleToggle(network.network, 'corporateEnabled', v)}
                                    disabled={!network.active}
                                />
                                <ServiceToggle
                                    label="VTU Airtime"
                                    checked={network.vtuEnabled}
                                    onChange={(v) => handleToggle(network.network, 'vtuEnabled', v)}
                                    disabled={!network.active}
                                />
                                <ServiceToggle
                                    label="Share & Sell"
                                    checked={network.shareSellEnabled}
                                    onChange={(v) => handleToggle(network.network, 'shareSellEnabled', v)}
                                    disabled={!network.active}
                                />
                                <ServiceToggle
                                    label="Data Coupons"
                                    checked={network.couponEnabled}
                                    onChange={(v) => handleToggle(network.network, 'couponEnabled', v)}
                                    disabled={!network.active}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Simple Toggle Component since Switch might not be available or needs context
function Toggle({ checked, onChange, disabled }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={`${checked ? 'bg-green-500' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
            <span
                className={`${checked ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    );
}

function ServiceToggle({ label, checked, onChange, disabled }) {
    return (
        <div className="flex items-center justify-between py-1">
            <span className="text-gray-700 font-medium">{label}</span>
            <Toggle checked={checked} onChange={onChange} disabled={disabled} />
        </div>
    );
}
