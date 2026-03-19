import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ShoppingBag, Copy, CheckCircle, AlertCircle } from 'lucide-react';

export default function Pins() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [purchaseLoading, setPurchaseLoading] = useState(false);
    const [selectedService, setSelectedService] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [purchasedPin, setPurchasedPin] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:3000/api/pins/services', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setServices(response.data);
        } catch (err) {
            console.error('Error fetching pin services:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async () => {
        if (!selectedService) return;
        setPurchaseLoading(true);
        setError('');
        setPurchasedPin(null);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('http://localhost:3000/api/pins/purchase',
                {
                    serviceId: selectedService.id,
                    quantity: 1 // Only 1 for now to keep it simple, or implement quantity loop in backend
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setPurchasedPin(response.data.pin);
            // Refresh balance or services if needed
        } catch (err) {
            setError(err.response?.data?.error || 'Purchase failed');
        } finally {
            setPurchaseLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('PIN copied to clipboard!');
    };

    return (
        <div className="space-y-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
                        <ShoppingBag size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Buy Data/Recharge PINs</h2>
                        <p className="text-sm text-gray-500">Instant delivery of scratch card PINs</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2">
                        <AlertCircle size={20} />
                        <p>{error}</p>
                    </div>
                )}

                {purchasedPin && (
                    <div className="bg-green-50 border border-green-200 p-6 rounded-xl mb-8 text-center">
                        <div className="flex justify-center mb-4">
                            <CheckCircle size={48} className="text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-green-800 mb-2">Purchase Successful!</h3>
                        <p className="text-green-700 mb-4">Here is your PIN:</p>

                        <div className="bg-white border-2 border-dashed border-green-300 p-4 rounded-lg inline-flex items-center gap-4">
                            <span className="text-3xl font-mono font-bold tracking-wider text-gray-800">{purchasedPin.content}</span>
                            <button
                                onClick={() => copyToClipboard(purchasedPin.content)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                title="Copy PIN"
                            >
                                <Copy size={20} className="text-gray-500" />
                            </button>
                        </div>
                        {purchasedPin.serialNumber && (
                            <p className="mt-2 text-sm text-gray-500">Serial: {purchasedPin.serialNumber}</p>
                        )}
                        <button
                            onClick={() => setPurchasedPin(null)}
                            className="mt-6 text-green-700 font-medium hover:underline"
                        >
                            Buy Another
                        </button>
                    </div>
                )}

                {!purchasedPin && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            <p>Loading services...</p>
                        ) : services.length === 0 ? (
                            <p className="text-gray-500 text-center col-span-3">No PIN services available at the moment.</p>
                        ) : (
                            services.map((service) => (
                                <div
                                    key={service.id}
                                    onClick={() => setSelectedService(service)}
                                    className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${selectedService?.id === service.id
                                            ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200'
                                            : 'border-gray-100 hover:border-indigo-200 hover:shadow-md'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-gray-900">{service.name}</h3>
                                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs uppercase font-bold">
                                            {service.provider}
                                        </span>
                                    </div>
                                    <p className="text-indigo-600 font-bold text-xl mb-1">₦{service.price}</p>
                                    {service.availableQty !== undefined && (
                                        <p className={`text-xs ${service.availableQty > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {service.availableQty > 0 ? `${service.availableQty} Available` : 'Out of Stock'}
                                        </p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {!purchasedPin && selectedService && (
                    <div className="mt-8 border-t pt-6">
                        <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg mb-6">
                            <div>
                                <p className="text-sm text-gray-500">Selected Plan</p>
                                <p className="font-bold text-lg">{selectedService.name}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Price</p>
                                <p className="font-bold text-xl text-indigo-600">₦{selectedService.price}</p>
                            </div>
                        </div>

                        <button
                            onClick={handlePurchase}
                            disabled={purchaseLoading || (selectedService.availableQty !== undefined && selectedService.availableQty <= 0)}
                            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {purchaseLoading ? 'Processing...' : 'Pay & View PIN'}
                        </button>
                    </div>
                )}

            </motion.div>
        </div>
    );
}
