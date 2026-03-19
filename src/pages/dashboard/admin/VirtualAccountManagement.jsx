import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Landmark from 'lucide-react/dist/esm/icons/landmark';
import Search from 'lucide-react/dist/esm/icons/search';
import Input from '../../../components/ui/Input';

export default function VirtualAccountManagement() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [total, setTotal] = useState(0);

    useEffect(() => {
        fetchAccounts();
    }, [search]);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get(`/api/admin/virtual-accounts?search=${search}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAccounts(res.data.accounts);
            setTotal(res.data.total);
        } catch (error) {
            console.error('Failed to fetch virtual accounts', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Landmark className="w-6 h-6 mr-2 text-indigo-600" />
                Virtual Accounts ({total})
            </h1>

            <div className="flex w-full md:w-1/3">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                        placeholder="Search account, bank or user..."
                        className="pl-10"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Account Name</th>
                                    <th className="px-6 py-3">Account Number</th>
                                    <th className="px-6 py-3">Bank Name</th>
                                    <th className="px-6 py-3">User</th>
                                    <th className="px-6 py-3">Provider</th>
                                    <th className="px-6 py-3">Created At</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {accounts.map(acc => (
                                    <tr key={acc.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium">{acc.accountName || 'N/A'}</td>
                                        <td className="px-6 py-4 font-mono">{acc.accountNumber}</td>
                                        <td className="px-6 py-4">{acc.bankName || 'N/A'}</td>
                                        <td className="px-6 py-4 text-xs">
                                            <div>{acc.user?.firstName} {acc.user?.lastName}</div>
                                            <div className="text-gray-500">{acc.user?.email}</div>
                                        </td>
                                        <td className="px-6 py-4">{acc.provider}</td>
                                        <td className="px-6 py-4 text-gray-500">{new Date(acc.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                                {accounts.length === 0 && (
                                    <tr><td colSpan="6" className="text-center py-8 text-gray-500">No virtual accounts found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
