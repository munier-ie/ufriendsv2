import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Check from 'lucide-react/dist/esm/icons/check';
import Code from 'lucide-react/dist/esm/icons/code';
import Terminal from 'lucide-react/dist/esm/icons/terminal';
import Bot from 'lucide-react/dist/esm/icons/bot';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Button from '../../components/ui/Button';
import ChatConsultant from '../../components/dashboard/ChatConsultant';

export default function Reseller() {
    const [options, setOptions] = useState([]);
    const [whatsappNumber, setWhatsappNumber] = useState('2347026417709');
    const [loading, setLoading] = useState(true);
    const [isChatOpen, setIsChatOpen] = useState(false);

    const [selection, setSelection] = useState({
        softwareType: '',
        language: '',
        details: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/user/software-options', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setOptions(res.data.options || []);
                setWhatsappNumber(res.data.whatsappNumber || '2347026417709');
            } catch (error) {
                console.error('Error fetching software options:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const softwareTypes = options.filter(opt => opt.category === 'Software Type');
    const languages = options.filter(opt => opt.category === 'Programming Language');

    const handleWhatsAppRedirect = () => {
        const text = encodeURIComponent(
            `I am interested in Custom Software Development:\n\n` +
            `Type: ${selection.softwareType || 'Not specified'}\n` +
            `Technology: ${selection.language || 'Not specified'}\n` +
            `Details: ${selection.details || 'No additional details provided'}`
        );
        window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
    };

    const features = [
        'Your Own Domain Name (e.g., www.yourname.com)',
        'Custom Branding & Logo',
        'Admin Dashboard to Manage Users',
        'Set Your Own Prices & Profits',
        'Automated Service Delivery',
        'Payment Gateway Integration',
        '1 Year Free Hosting & SSL',
        'Android Mobile App Included'
    ];

    const pricing = [
        {
            title: 'Starter Reseller',
            price: '₦25,000',
            features: features.slice(0, 5)
        },
        {
            title: 'Pro Reseller',
            price: '₦50,000',
            features: features,
            recommended: true
        }
    ];

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-gray-900 mb-4 flex justify-center items-center">
                    <Globe className="mr-3 text-primary" size={32} /> Own A VTU Website
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    Start your own profitable telecommunications business today. We provide you with a complete VTU portal white-labeled with your brand.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {pricing.map((plan, idx) => (
                    <div
                        key={idx}
                        className={`bg-white rounded-2xl shadow-xl overflow-hidden border-2 relative flex flex-col ${plan.recommended ? 'border-primary scale-105 z-10' : 'border-gray-100'
                            }`}
                    >
                        {plan.recommended && (
                            <div className="bg-primary text-white text-center py-1 text-sm font-bold uppercase tracking-wider">
                                Most Popular
                            </div>
                        )}
                        <div className="p-8 text-center border-b border-gray-100">
                            <h3 className="text-xl font-bold text-gray-700 mb-2">{plan.title}</h3>
                            <div className="text-4xl font-extrabold text-gray-900">{plan.price}</div>
                        </div>
                        <div className="p-8 flex-1">
                            <ul className="space-y-4">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start">
                                        <Check className="text-green-500 mr-2 flex-shrink-0" size={20} />
                                        <span className="text-gray-600">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="p-8 bg-gray-50 mt-auto">
                            <a
                                href={`https://wa.me/${whatsappNumber}?text=I%20am%20interested%20in%20getting%20my%20own%20VTU%20website`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Button className="w-full py-4 text-lg font-bold" variant={plan.recommended ? 'default' : 'outline'}>
                                    Get Started
                                </Button>
                            </a>
                        </div>
                    </div>
                ))}
            </div>

            {/* Custom Development Card */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-primary/20 overflow-hidden">
                <div className="bg-primary/5 p-8 border-b border-primary/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                            <Code className="mr-3 text-primary" size={28} /> Custom Software Development
                        </h2>
                        <p className="text-gray-600">
                            Need something unique? We build custom fintech applications, wallet systems, and e-commerce platforms.
                        </p>
                    </div>
                    <Button
                        onClick={() => setIsChatOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 py-6 px-8 shadow-xl shadow-primary/20 scale-105 animate-pulse"
                    >
                        <Bot size={24} />
                        <div className="text-left">
                            <div className="text-[10px] uppercase font-bold opacity-80 leading-none">Try AI</div>
                            <div className="text-lg font-bold leading-none">Consult AI Expert</div>
                        </div>
                        <Sparkles size={18} className="text-yellow-300" />
                    </Button>
                </div>

                <div className="p-8">
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Or Quick Inquiry</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Service Type</label>
                                <select
                                    className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    value={selection.softwareType}
                                    onChange={(e) => setSelection({ ...selection, softwareType: e.target.value })}
                                >
                                    <option value="">Select Software Type</option>
                                    {softwareTypes.map(opt => <option key={opt.id} value={opt.name}>{opt.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                    <Terminal size={16} className="mr-1" /> Preferred Technology
                                </label>
                                <select
                                    className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    value={selection.language}
                                    onChange={(e) => setSelection({ ...selection, language: e.target.value })}
                                >
                                    <option value="">Select Technology</option>
                                    {languages.map(opt => <option key={opt.id} value={opt.name}>{opt.name}</option>)}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Project Brief / Details</label>
                                <textarea
                                    rows="1"
                                    className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                                    placeholder="Briefly describe what you want us to build..."
                                    value={selection.details}
                                    onChange={(e) => setSelection({ ...selection, details: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="md:col-span-2">
                                <Button
                                    variant="outline"
                                    className="w-full py-4 text-gray-700 font-bold border-gray-200 hover:bg-gray-50"
                                    onClick={handleWhatsAppRedirect}
                                >
                                    Submit Quick Inquiry
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Consultant Modal */}
            <ChatConsultant
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                whatsappNumber={whatsappNumber}
            />
        </div>
    );
}
