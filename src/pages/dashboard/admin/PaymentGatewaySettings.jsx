import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { 
    Loader2, CheckCircle, XCircle, Save, Link, 
    Shield, Eye, EyeOff, Settings2, Activity,
    Lock, Zap, CreditCard, Wallet
} from 'lucide-react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';

export default function PaymentGatewaySettings() {
    const [gateways, setGateways] = useState([]);
    const [loading, setLoading] = useState(true);
    const [testingConnection, setTestingConnection] = useState(null); // provider name
    const [connectionStatus, setConnectionStatus] = useState({}); // { [provider]: { success: bool, message: string } }
    const [saving, setSaving] = useState(null); // provider name
    const [visibleFields, setVisibleFields] = useState({}); // { [provider_field]: bool }

    // Configuration for different providers
    const providers = [
        { 
            id: 'PAYMENTPOINT', 
            name: 'PaymentPoint', 
            icon: Wallet,
            color: 'text-blue-600', 
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-100',
            fields: [
                { id: 'apiKey', label: 'API Key', sensitive: true },
                { id: 'apiSecret', label: 'API Secret', sensitive: true },
                { id: 'businessId', label: 'Business ID', sensitive: false }
            ] 
        },
        { 
            id: 'PAYSTACK', 
            name: 'Paystack', 
            icon: Zap,
            color: 'text-teal-600', 
            bgColor: 'bg-teal-50',
            borderColor: 'border-teal-100',
            fields: [
                { id: 'apiKey', label: 'Secret Key (sk_...)', sensitive: true },
                { id: 'secretKey', label: 'Public Key (pk_...)', sensitive: true }
            ] 
        },
        { 
            id: 'MONNIFY', 
            name: 'Monnify', 
            icon: CreditCard,
            color: 'text-orange-600', 
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-100',
            fields: [
                { id: 'apiKey', label: 'API Key', sensitive: true },
                { id: 'secretKey', label: 'Secret Key', sensitive: true },
                { id: 'contractCode', label: 'Contract Code', sensitive: false }
            ] 
        },
        { 
            id: 'PAYVESSEL', 
            name: 'Payvessel', 
            icon: Shield,
            color: 'text-indigo-600', 
            bgColor: 'bg-indigo-50',
            borderColor: 'border-indigo-100',
            fields: [
                { id: 'apiKey', label: 'API Key', sensitive: true },
                { id: 'apiSecret', label: 'API Secret', sensitive: true },
                { id: 'businessId', label: 'Business ID', sensitive: false }
            ] 
        }
    ];

    useEffect(() => {
        fetchGateways();
    }, []);

    const fetchGateways = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/payment-gateways', {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Merge fetched data with default structure
            const merged = providers.map(p => {
                const existing = res.data.gateways.find(g => g.provider === p.id);
                return existing || { provider: p.id, apiKey: '', secretKey: '', apiSecret: '', businessId: '', contractCode: '', active: false };
            });

            setGateways(merged);
        } catch (error) {
            console.error('Failed to fetch gateways', error);
            toast.error('Failed to load gateway settings');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = (providerId, field, value) => {
        setGateways(gateways.map(g =>
            g.provider === providerId ? { ...g, [field]: value } : g
        ));
    };

    const handleSave = async (gateway) => {
        setSaving(gateway.provider);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.post('/api/admin/payment-gateways', gateway, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`${gateway.provider} settings saved successfully`);
        } catch (error) {
            toast.error('Failed to save gateway settings')
        } finally {
            setSaving(null);
        }
    };

    const handleTestConnection = async (gateway) => {
        setTestingConnection(gateway.provider);
        setConnectionStatus({ ...connectionStatus, [gateway.provider]: null });

        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.post('/api/admin/payment-gateways/test-connection', gateway, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setConnectionStatus(prev => ({
                ...prev,
                [gateway.provider]: { success: true, message: res.data.message }
            }));
            toast.success(`${gateway.provider} connection successful`);
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Connection failed';
            setConnectionStatus(prev => ({
                ...prev,
                [gateway.provider]: { success: false, message: errorMsg }
            }));
            toast.error(`${gateway.provider} connection failed: ${errorMsg}`);
        } finally {
            setTestingConnection(null);
        }
    };

    const toggleVisibility = (providerId, fieldId) => {
        const key = `${providerId}_${fieldId}`;
        setVisibleFields(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-gray-500 font-medium">Loading configurations...</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Settings2 className="text-primary" size={24} />
                        Payment Gateways
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Configure secure API keys and connection parameters for global payment providers.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full">
                    <Activity className="text-blue-500 animate-pulse" size={14} />
                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-tight">System Operational</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {gateways.map(gateway => {
                    const config = providers.find(p => p.id === gateway.provider);
                    const Icon = config.icon;

                    return (
                        <div key={gateway.provider} className="group bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300">
                            {/* Header */}
                            <div className={cn("px-8 py-6 flex justify-between items-center border-b border-gray-50", config.bgColor)}>
                                <div className="flex items-center gap-4">
                                    <div className={cn("p-2.5 rounded-2xl bg-white shadow-sm", config.color)}>
                                        <Icon size={24} />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-gray-900">{config.name}</h2>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className={cn("w-1.5 h-1.5 rounded-full", gateway.active ? "bg-green-500" : "bg-gray-300")}></span>
                                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                                                {gateway.active ? 'Operational' : 'Disabled'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={gateway.active}
                                            onChange={(e) => handleUpdate(gateway.provider, 'active', e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-5">
                                    {config.fields.map(field => {
                                        const isVisible = visibleFields[`${gateway.provider}_${field.id}`];
                                        return (
                                            <div key={field.id} className="space-y-1">
                                                <Input
                                                    label={field.label}
                                                    value={gateway[field.id] || ''}
                                                    onChange={(e) => handleUpdate(gateway.provider, field.id, e.target.value)}
                                                    type={field.sensitive && !isVisible ? "password" : "text"}
                                                    containerClassName="w-full"
                                                    className="bg-gray-50/50 border-gray-100 hover:border-gray-200 focus:bg-white"
                                                    rightElement={field.sensitive ? (
                                                        <button 
                                                            type="button"
                                                            onClick={() => toggleVisibility(gateway.provider, field.id)}
                                                            className="text-gray-400 hover:text-primary transition-colors p-1"
                                                        >
                                                            {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    ) : null}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Connection Status Message */}
                                {connectionStatus[gateway.provider] && (
                                    <div className={cn(
                                        "p-4 rounded-2xl text-xs font-medium flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-2",
                                        connectionStatus[gateway.provider].success 
                                            ? "bg-green-50 text-green-700 border border-green-100" 
                                            : "bg-red-50 text-red-700 border border-red-100"
                                    )}>
                                        {connectionStatus[gateway.provider].success ?
                                            <CheckCircle size={14} className="mt-0.5 shrink-0" /> :
                                            <XCircle size={14} className="mt-0.5 shrink-0" />
                                        }
                                        <span>{connectionStatus[gateway.provider].message}</span>
                                    </div>
                                )}

                                <div className="flex gap-4 pt-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1 rounded-xl h-12 text-xs font-bold uppercase tracking-wider"
                                        onClick={() => handleTestConnection(gateway)}
                                        loading={testingConnection === gateway.provider}
                                    >
                                        <Link size={16} className="mr-2" />
                                        Test
                                    </Button>
                                    <Button
                                        className="flex-1 rounded-xl h-12 text-xs font-bold uppercase tracking-wider shadow-lg shadow-primary/20"
                                        onClick={() => handleSave(gateway)}
                                        loading={saving === gateway.provider}
                                    >
                                        <Save size={16} className="mr-2" />
                                        Save
                                    </Button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 flex items-start gap-4">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                    <Lock className="text-amber-500" size={20} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-amber-900 uppercase tracking-tight">Security Protocol</h3>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                        Secret keys are stored using industry-standard encryption. Ensure your callback URLs are correctly configured in each provider's dashboard to maintain seamless transaction verification.
                    </p>
                </div>
            </div>
        </div>
    );
}
