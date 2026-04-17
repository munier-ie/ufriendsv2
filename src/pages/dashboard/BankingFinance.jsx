import React, { useState } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import Landmark from 'lucide-react/dist/esm/icons/landmark';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import Banknote from 'lucide-react/dist/esm/icons/banknote';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function BankingFinance() {
    const { globalSettings } = useOutletContext();
    const [activeTab, setActiveTab] = useState('pos');

    // POS Form State
    const [posProvider, setPosProvider] = useState('Moniepoint POS');
    const [posType, setPosType] = useState('Keypad (Traditions)');

    // Loan Form State
    const [loanAmount, setLoanAmount] = useState('');
    const [loanDuration, setLoanDuration] = useState('');
    const [moniepointAccount, setMoniepointAccount] = useState('');

    const providers = ['Moniepoint POS', 'Opay POS', 'Kolomoni POS', 'Nomba POS', 'Palmpay POS', 'FCMB POS'];
    const posTypes = ['Keypad (Traditions)', 'Android (Smart)', 'Mini POS'];

    const getPosImage = () => {
        if (posType === 'Keypad (Traditions)') return '/assets/nin/pos.jpg';
        if (posType === 'Android (Smart)') return '/assets/nin/pos1.jpg';
        if (posType === 'Mini POS') return '/assets/nin/pos3.jpg';
        return '/assets/nin/pos.jpg';
    };

    const getWhatsappNumber = (type) => {
        let contact = '';
        if (type === 'pos') {
            contact = globalSettings?.posWhatsappNumber || globalSettings?.contactWhatsapp || '';
        } else if (type === 'loan') {
            contact = globalSettings?.loanWhatsappNumber || globalSettings?.contactWhatsapp || '';
        }

        if (!contact) {
            return '2348000000000'; // Default fallback, admin needs to configure this in Site Settings
        }
        return String(contact).replace(/\D/g,'');
    };

    const handlePosSubmit = (e) => {
        try {
            if (e) e.preventDefault();
            const whatsapp = getWhatsappNumber('pos');
            
            let template = globalSettings?.posMessageTemplate;
            if (!template) {
                template = 'Hi Admin, I would like to request a POS terminal.\n\nProvider: {{provider}}\nType: {{type}}';
            }

            let message = String(template)
                .replace(/\{\{provider\}\}/g, String(posProvider))
                .replace(/\{\{type\}\}/g, String(posType));

            const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
        } catch (error) {
            toast.error('Error generating request URL: ' + error.message)
        }
    };

    const handleLoanSubmit = (e) => {
        try {
            if (e) e.preventDefault();
            
            if (!loanAmount || !loanDuration || !moniepointAccount) {
                toast.error('Please fill out all loan details before proceeding.')
                return;
            }

            const whatsapp = getWhatsappNumber('loan');
            
            let template = globalSettings?.loanMessageTemplate;
            if (!template) {
                template = 'Hi Admin, I want to request a loan.\n\nAmount: ₦{{amount}}\nDuration: {{duration}}\nMoniepoint Account: {{account}}';
            }

            let message = String(template)
                .replace(/\{\{amount\}\}/g, String(loanAmount))
                .replace(/\{\{duration\}\}/g, String(loanDuration))
                .replace(/\{\{account\}\}/g, String(moniepointAccount));

            const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
        } catch (error) {
            toast.error('Error generating request URL: ' + error.message)
        }
    };

    const tabs = [
        { id: 'pos', label: 'POS Request', icon: CreditCard },
        { id: 'loan', label: 'Loan Request', icon: Banknote }
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            <div className="flex items-center space-x-3 mb-8">
                <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-xl shadow-lg border border-white/20">
                    <Landmark size={28} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Banking & Finance</h1>
                    <p className="text-gray-500 text-sm mt-1">Request POS terminals or apply for a loan</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 overflow-x-auto pb-2 border-b border-gray-200 no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center space-x-2 px-6 py-3 border-b-2 whitespace-nowrap transition-all ${
                            activeTab === tab.id
                                ? 'border-primary text-primary bg-primary/5'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <tab.icon size={18} />
                        <span className="font-medium">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Form Area */}
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-6 md:p-8 border border-gray-100">
                <AnimatePresence mode="wait">
                    {activeTab === 'pos' ? (
                        <motion.div 
                            key="pos-form"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-gray-700">POS Provider</label>
                                        <select
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[44px] focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                                            value={posProvider}
                                            onChange={(e) => setPosProvider(e.target.value)}
                                            required
                                        >
                                            {providers.map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-gray-700">POS Type</label>
                                        <select
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[44px] focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                                            value={posType}
                                            onChange={(e) => setPosType(e.target.value)}
                                            required
                                        >
                                            {posTypes.map(pt => (
                                                <option key={pt} value={pt}>{pt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-6">
                                        <h4 className="text-sm font-semibold text-blue-900 mb-1">How it works</h4>
                                        <p className="text-xs text-blue-800 tracking-wide leading-relaxed">
                                            Upon clicking "Request POS", you will be redirected to our Admin via WhatsApp with your selected POS details to complete the process.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <span className="text-xs font-medium text-gray-400 mb-4 uppercase tracking-widest text-center">Sample Preview</span>
                                    <div className="w-full max-w-[200px] aspect-square rounded-2xl bg-white shadow-sm overflow-hidden flex items-center justify-center border border-gray-200">
                                        {/* Display specific sample image based on POS logic */}
                                        {posProvider === 'Moniepoint POS' ? (
                                            <img src={getPosImage()} alt={posType} className="max-h-[160px] object-contain max-w-full p-2" />
                                        ) : (
                                            <img src="/assets/nin/pos.jpg" alt="Generic POS" className="max-h-[160px] object-contain max-w-full p-2" />
                                        )}
                                    </div>
                                    <span className="text-sm font-bold text-gray-700 mt-4 text-center">{posProvider} - {posType}</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <Button
                                    type="button"
                                    onClick={handlePosSubmit}
                                    className="w-full py-4 text-lg font-bold bg-[#25D366] hover:bg-[#128C7E] shadow-lg shadow-[#25D366]/20 text-white"
                                >
                                    Request POS via WhatsApp
                                </Button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="loan-form"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input
                                    label="Loan Amount (₦)"
                                    type="number"
                                    placeholder="e.g. 50000"
                                    value={loanAmount}
                                    onChange={(e) => setLoanAmount(e.target.value)}
                                    required
                                />

                                <Input
                                    label="Duration"
                                    placeholder="e.g. 1 Month, 2 Weeks"
                                    value={loanDuration}
                                    onChange={(e) => setLoanDuration(e.target.value)}
                                    required
                                />

                                <div className="md:col-span-2">
                                    <Input
                                        label="Moniepoint Account Number"
                                        placeholder="e.g. 8012345678"
                                        type="number"
                                        value={moniepointAccount}
                                        onChange={(e) => setMoniepointAccount(e.target.value)}
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-2 ml-1">The requested loan will be processed using this Moniepoint account.</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-6">
                                <h4 className="text-sm font-bold text-gray-700 mb-2">Loan Requirements</h4>
                                <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                                    <li>Loans are only disbursed to active Moniepoint accounts.</li>
                                    <li>Terms and interest rates will be discussed and agreed upon via WhatsApp.</li>
                                    <li>Submission of accurate KYC documents may be required.</li>
                                </ul>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <Button
                                    type="button"
                                    onClick={handleLoanSubmit}
                                    className="w-full py-4 text-lg font-bold bg-[#25D366] hover:bg-[#128C7E] shadow-lg shadow-[#25D366]/20 text-white"
                                >
                                    Apply For Loan via WhatsApp
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
