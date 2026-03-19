import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Plus, Trash2, Loader2, CheckCircle, Tag, Search, CreditCard, Wifi } from 'lucide-react';

export default function PinStockManagement() {
    const [activeTab, setActiveTab] = useState('airtime'); // 'airtime' or 'data'
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState(null);
    const [filterNetwork, setFilterNetwork] = useState('');

    const networks = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'];

    useEffect(() => {
        fetchStock();
    }, [activeTab, filterNetwork]);

    const fetchStock = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const endpoint = activeTab === 'airtime' ? '/api/admin/services/pins/airtime-stock' : '/api/admin/services/pins/data-stock';
            const url = filterNetwork ? `${endpoint}?network=${filterNetwork}` : endpoint;

            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStock(res.data.stock || []);
        } catch (error) {
            console.error('Failed to fetch PIN stock', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            alert('Please select a CSV file first');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('adminToken');
            const endpoint = activeTab === 'airtime'
                ? '/api/admin/services/pins/upload-airtime'
                : '/api/admin/services/pins/upload-data';

            await axios.post(endpoint, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            alert(`${activeTab.toUpperCase()} PINs uploaded successfully`);
            setFile(null);
            document.getElementById('file-upload').value = ''; // Reset input
            fetchStock();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to upload PINs');
        } finally {
            setUploading(false);
        }
    };

    // Calculate summary statistics
    const totalPins = stock.length;
    const stockByNetwork = networks.reduce((acc, net) => {
        acc[net] = stock.filter(p => p.network === net).length;
        return acc;
    }, {});


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                        PIN Stock Management
                    </h1>
                    <p className="text-gray-600 mt-1">Manage and upload your Airtime and Data PIN inventory.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 border-b border-gray-200">
                <button
                    onClick={() => { setActiveTab('airtime'); setFilterNetwork(''); }}
                    className={`pb-4 px-4 font-semibold text-lg transition-colors border-b-2 ${activeTab === 'airtime' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center space-x-2"><CreditCard size={20} /><span>Airtime PINs</span></div>
                </button>
                <button
                    onClick={() => { setActiveTab('data'); setFilterNetwork(''); }}
                    className={`pb-4 px-4 font-semibold text-lg transition-colors border-b-2 ${activeTab === 'data' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center space-x-2"><Wifi size={20} /><span>Data PINs</span></div>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Upload Section - Left Column */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 lg:col-span-1 h-fit">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <Upload className="mr-2 text-primary" size={24} />
                        Upload {activeTab === 'airtime' ? 'Airtime' : 'Data'} PINs
                    </h2>

                    <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm leading-relaxed">
                        <p className="font-semibold mb-2">CSV Format Required:</p>
                        {activeTab === 'airtime' ? (
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>network:</strong> MTN, GLO, AIRTEL, 9MOBILE</li>
                                <li><strong>pin:</strong> The actual PIN code</li>
                                <li><strong>amount:</strong> Value of the airtime PIN</li>
                            </ul>
                        ) : (
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>network:</strong> MTN, GLO, AIRTEL, 9MOBILE</li>
                                <li><strong>pin:</strong> The actual PIN code</li>
                                <li><strong>dataName:</strong> Description (e.g., 1.5GB)</li>
                            </ul>
                        )}
                    </div>

                    <form onSubmit={handleFileUpload} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select CSV File</label>
                            <input
                                type="file"
                                id="file-upload"
                                accept=".csv"
                                onChange={(e) => setFile(e.target.files[0])}
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-colors"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={uploading || !file}
                            className="w-full flex items-center justify-center bg-primary text-white py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {uploading ? <Loader2 className="animate-spin mr-2" size={20} /> : <Plus className="mr-2" size={20} />}
                            {uploading ? 'Uploading...' : 'Upload PINs'}
                        </button>
                    </form>
                </div>

                {/* Stock Overview - Right Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {networks.map(net => (
                            <div key={net} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                                <span className="text-sm font-semibold text-gray-500">{net}</span>
                                <span className="text-2xl font-bold text-gray-900">{stockByNetwork[net] || 0}</span>
                            </div>
                        ))}
                    </div>

                    {/* Stock Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800">Available Stock ({totalPins})</h3>
                            <select
                                value={filterNetwork}
                                onChange={(e) => setFilterNetwork(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary"
                            >
                                <option value="">All Networks</option>
                                {networks.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>

                        <div className="flex-1 overflow-auto">
                            {loading ? (
                                <div className="flex h-full items-center justify-center">
                                    <Loader2 className="animate-spin text-primary" size={40} />
                                </div>
                            ) : stock.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <Tag size={48} className="mb-4 opacity-50" />
                                    <p>No available PINs in stock for this network.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="bg-white sticky top-0 shadow-sm">
                                        <tr>
                                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Network</th>
                                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">PIN Info</th>
                                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date Added</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {stock.slice(0, 100).map((item) => ( // Render max 100 for performance
                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-3 font-semibold text-gray-700">{item.network}</td>
                                                <td className="px-6 py-3">
                                                    <div className="font-mono text-sm">{item.pin.replace(/.(?=.{4})/g, '*')}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {activeTab === 'airtime' ? `Amount: ₦${item.amount}` : `Plan: ${item.dataName}`}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-500">
                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            {stock.length > 100 && (
                                <div className="p-3 text-center text-xs text-gray-500 bg-gray-50">
                                    Showing top 100 available pins. Use filters to narrow down.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
