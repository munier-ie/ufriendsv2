import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Send from 'lucide-react/dist/esm/icons/send';
import User from 'lucide-react/dist/esm/icons/user';
import Bot from 'lucide-react/dist/esm/icons/bot';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import X from 'lucide-react/dist/esm/icons/x';
import Button from '../ui/Button';

export default function ChatConsultant({ isOpen, onClose, whatsappNumber }) {
    const [messages, setMessages] = useState([
        {
            role: 'model',
            parts: [{ text: "Hello! I'm your Ufriends Software Consultant. Tell me about the project you have in mind. Are you looking to build a Mobile App, a Fintech platform, or something else?" }]
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', parts: [{ text: userMsg }] }]);
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/ai-chat/consult', {
                message: userMsg,
                history: messages
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setMessages(prev => [...prev, { role: 'model', parts: [{ text: res.data.reply }] }]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'model',
                parts: [{ text: "I'm sorry, I'm having trouble connecting to my brain right now. Please try again or message us directly on WhatsApp." }]
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleWhatsAppRedirect = () => {
        // Find the last model message which should contain the summary
        const lastBrief = messages.filter(m => m.role === 'model').reverse()[0]?.parts[0].text;
        const text = encodeURIComponent(
            `*Project Brief from Ufriends AI Consultant*\n\n` +
            `${lastBrief || 'I am interested in custom software development.'}`
        );
        window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col h-[600px] overflow-hidden">
                {/* Header */}
                <div className="bg-primary p-4 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Bot size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold">Software Consultant</h3>
                            <p className="text-xs text-white/70">Powered by Ufriends AI</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-lg transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-600'
                                    }`}>
                                    {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                </div>
                                <div className={`p-4 rounded-2xl shadow-sm text-sm whitespace-pre-wrap ${m.role === 'user'
                                        ? 'bg-primary text-white rounded-tr-none'
                                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                    }`}>
                                    {m.parts[0].text}
                                </div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="max-w-[85%] flex gap-2">
                                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                                    <Bot size={16} />
                                </div>
                                <div className="p-4 bg-white border border-gray-100 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                                    <Loader2 size={16} className="animate-spin text-primary" />
                                    <span className="text-sm text-gray-500 italic">Thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Type your message here..."
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button
                            className="bg-primary text-white p-3 rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                        >
                            <Send size={20} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <p className="text-[10px] text-gray-400 max-w-[200px]">
                            Once you're happy with the brief, click send to WhatsApp to talk to an admin.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs font-bold border-green-500 text-green-600 hover:bg-green-50"
                            onClick={handleWhatsAppRedirect}
                        >
                            Send Brief to WhatsApp
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
