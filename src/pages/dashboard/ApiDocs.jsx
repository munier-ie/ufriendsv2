import { useState } from 'react';
import {
    Book,
    Code,
    Key,
    Zap,
    AlertCircle,
    Copy,
    CheckCircle,
    Wifi,
    Database,
    CreditCard,
    Tv,
    FileText
} from 'lucide-react';

/**
 * API Documentation Component
 * Provides comprehensive API documentation for vendor accounts
 * with interactive examples and security best practices
 */
const ApiDocs = () => {
    const [activeSection, setActiveSection] = useState('getting-started');
    const [copiedCode, setCopiedCode] = useState('');

    // Copy code snippet to clipboard
    const copyToClipboard = (code, id) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(id);
        setTimeout(() => setCopiedCode(''), 2000);
    };

    // API Base URL from environment or default
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.ufriends.com';

    // Navigation items
    const sections = [
        { id: 'getting-started', label: 'Getting Started', icon: Book },
        { id: 'authentication', label: 'Authentication', icon: Key },
        { id: 'endpoints', label: 'API Endpoints', icon: Code },
        { id: 'webhooks', label: 'Webhooks', icon: Zap },
        { id: 'errors', label: 'Error Codes', icon: AlertCircle },
    ];

    // API Endpoints Documentation
    const endpoints = [
        {
            category: 'Airtime',
            icon: Wifi,
            color: 'text-blue-600',
            endpoints: [
                {
                    method: 'POST',
                    path: '/api/airtime/purchase',
                    description: 'Purchase airtime for a phone number',
                    requestBody: {
                        network: 'mtn',
                        phoneNumber: '08012345678',
                        amount: 100,
                        pin: '1234'
                    },
                    response: {
                        status: 0,
                        message: 'Airtime purchase successful',
                        data: {
                            reference: 'TXN-1234567890',
                            network: 'mtn',
                            phoneNumber: '08012345678',
                            amount: 100,
                            balance: 9900
                        }
                    }
                }
            ]
        },
        {
            category: 'Data',
            icon: Database,
            color: 'text-green-600',
            endpoints: [
                {
                    method: 'POST',
                    path: '/api/data/purchase',
                    description: 'Purchase data bundle for a phone number',
                    requestBody: {
                        network: 'mtn',
                        phoneNumber: '08012345678',
                        planId: 123,
                        pin: '1234'
                    },
                    response: {
                        status: 0,
                        message: 'Data purchase successful',
                        data: {
                            reference: 'TXN-1234567891',
                            network: 'mtn',
                            phoneNumber: '08012345678',
                            plan: '1GB MTN Data',
                            balance: 8900
                        }
                    }
                }
            ]
        },
        {
            category: 'Cable',
            icon: Tv,
            color: 'text-purple-600',
            endpoints: [
                {
                    method: 'POST',
                    path: '/api/cable/purchase',
                    description: 'Purchase cable TV subscription',
                    requestBody: {
                        provider: 'dstv',
                        smartCardNumber: '1234567890',
                        packageId: 456,
                        pin: '1234'
                    },
                    response: {
                        status: 0,
                        message: 'Cable subscription successful',
                        data: {
                            reference: 'TXN-1234567892',
                            provider: 'dstv',
                            smartCardNumber: '1234567890',
                            package: 'DStv Compact',
                            balance: 6400
                        }
                    }
                }
            ]
        },
        {
            category: 'Wallet',
            icon: CreditCard,
            color: 'text-orange-600',
            endpoints: [
                {
                    method: 'GET',
                    path: '/api/wallet/balance',
                    description: 'Get current wallet balance',
                    requestBody: null,
                    response: {
                        status: 0,
                        balance: 10000,
                        referralWallet: 500
                    }
                }
            ]
        }
    ];

    // Code examples for different languages
    const codeExamples = {
        javascript: `// Airtime Purchase Example
const axios = require('axios');

const purchaseAirtime = async () => {
    try {
        const response = await axios.post(
            '${API_BASE_URL}/api/airtime/purchase',
            {
                network: 'mtn',
                phoneNumber: '08012345678',
                amount: 100,
                pin: '1234'
            },
            {
                headers: {
                    'Authorization': 'Bearer YOUR_API_KEY',
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('Success:', response.data);
    } catch (error) {
        console.error('Error:', error.response.data);
    }
};

purchaseAirtime();`,
        python: `# Airtime Purchase Example
import requests

def purchase_airtime():
    url = '${API_BASE_URL}/api/airtime/purchase'
    headers = {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    }
    payload = {
        'network': 'mtn',
        'phoneNumber': '08012345678',
        'amount': 100,
        'pin': '1234'
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        print('Success:', response.json())
    except requests.exceptions.RequestException as e:
        print('Error:', e)

purchase_airtime()`,
        php: `<?php
// Airtime Purchase Example

$apiKey = 'YOUR_API_KEY';
$url = '${API_BASE_URL}/api/airtime/purchase';

$data = array(
    'network' => 'mtn',
    'phoneNumber' => '08012345678',
    'amount' => 100,
    'pin' => '1234'
);

$options = array(
    'http' => array(
        'header'  => "Content-type: application/json\\r\\n" .
                     "Authorization: Bearer $apiKey\\r\\n",
        'method'  => 'POST',
        'content' => json_encode($data)
    )
);

$context  = stream_context_create($options);
$result = file_get_contents($url, false, $context);

if ($result === FALSE) {
    die('Error occurred');
}

echo 'Success: ' . $result;
?>`,
        curl: `# Airtime Purchase Example
curl -X POST ${API_BASE_URL}/api/airtime/purchase \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "network": "mtn",
    "phoneNumber": "08012345678",
    "amount": 100,
    "pin": "1234"
  }'`
    };

    // Render section content
    const renderSectionContent = () => {
        switch (activeSection) {
            case 'getting-started':
                return <GettingStartedSection />;
            case 'authentication':
                return <AuthenticationSection codeExamples={codeExamples} copyToClipboard={copyToClipboard} copiedCode={copiedCode} />;
            case 'endpoints':
                return <EndpointsSection endpoints={endpoints} copyToClipboard={copyToClipboard} copiedCode={copiedCode} />;
            case 'webhooks':
                return <WebhooksSection copyToClipboard={copyToClipboard} copiedCode={copiedCode} />;
            case 'errors':
                return <ErrorCodesSection />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                            <Book className="text-white" size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">API Documentation</h1>
                            <p className="text-gray-600">Complete guide to integrating with Ufriends API</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar Navigation */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-lg p-4 sticky top-6">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Navigation</h2>
                            <nav className="space-y-2">
                                {sections.map((section) => {
                                    const Icon = section.icon;
                                    return (
                                        <button
                                            key={section.id}
                                            onClick={() => setActiveSection(section.id)}
                                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeSection === section.id
                                                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
                                                    : 'text-gray-700 hover:bg-gray-100'
                                                }`}
                                        >
                                            <Icon size={20} />
                                            <span className="font-medium">{section.label}</span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
                            {renderSectionContent()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Getting Started Section
const GettingStartedSection = () => (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
            <Book className="text-blue-600" />
            <span>Getting Started</span>
        </h2>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <p className="text-blue-900 font-medium">Welcome to Ufriends API! This documentation will help you integrate our VTU services into your application.</p>
        </div>

        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Quick Start Guide</h3>

            <div className="space-y-3">
                <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                    <div>
                        <h4 className="font-semibold text-gray-800">Get Your API Key</h4>
                        <p className="text-gray-600">Navigate to your Profile → API Access section to view and copy your API key.</p>
                    </div>
                </div>

                <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                    <div>
                        <h4 className="font-semibold text-gray-800">Set Up Authentication</h4>
                        <p className="text-gray-600">Include your API key in the Authorization header of all requests.</p>
                    </div>
                </div>

                <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                    <div>
                        <h4 className="font-semibold text-gray-800">Make Your First Request</h4>
                        <p className="text-gray-600">Start with a simple balance check to verify your integration.</p>
                    </div>
                </div>

                <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">4</div>
                    <div>
                        <h4 className="font-semibold text-gray-800">Configure Webhooks (Optional)</h4>
                        <p className="text-gray-600">Set up webhooks to receive real-time transaction notifications.</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
            <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Security Best Practices</h4>
            <ul className="list-disc list-inside text-yellow-800 space-y-1">
                <li>Never expose your API key in client-side code</li>
                <li>Always use HTTPS for API requests</li>
                <li>Store API keys securely using environment variables</li>
                <li>Implement rate limiting on your end to avoid hitting our limits</li>
                <li>Rotate your API keys periodically</li>
            </ul>
        </div>

        <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-800">Base URL</h3>
            <code className="block bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                {import.meta.env.VITE_API_BASE_URL || 'https://api.ufriends.com'}
            </code>
        </div>

        <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-800">Rate Limits</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-700">Regular User</h4>
                    <p className="text-2xl font-bold text-blue-600">60/min</p>
                    <p className="text-sm text-gray-600">requests per minute</p>
                </div>
                <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-700">Agent Account</h4>
                    <p className="text-2xl font-bold text-purple-600">120/min</p>
                    <p className="text-sm text-gray-600">requests per minute</p>
                </div>
                <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-700">Vendor Account</h4>
                    <p className="text-2xl font-bold text-green-600">300/min</p>
                    <p className="text-sm text-gray-600">requests per minute</p>
                </div>
            </div>
        </div>
    </div>
);

// Authentication Section
const AuthenticationSection = ({ codeExamples, copyToClipboard, copiedCode }) => {
    const [selectedLang, setSelectedLang] = useState('javascript');

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
                <Key className="text-blue-600" />
                <span>Authentication</span>
            </h2>

            <p className="text-gray-700">
                All API requests must be authenticated using your API key in the Authorization header.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Header Format</h3>
                <code className="block bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                    Authorization: Bearer YOUR_API_KEY
                </code>
            </div>

            <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-800">Code Examples</h3>

                <div className="flex space-x-2 border-b border-gray-200">
                    {['javascript', 'python', 'php', 'curl'].map((lang) => (
                        <button
                            key={lang}
                            onClick={() => setSelectedLang(lang)}
                            className={`px-4 py-2 font-medium transition-colors ${selectedLang === lang
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:text-gray-800'
                                }`}
                        >
                            {lang.toUpperCase()}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <pre className="bg-gray-900 text-gray-100 p-6 rounded-xl overflow-x-auto">
                        <code className="text-sm font-mono">{codeExamples[selectedLang]}</code>
                    </pre>
                    <button
                        onClick={() => copyToClipboard(codeExamples[selectedLang], `auth-${selectedLang}`)}
                        className="absolute top-4 right-4 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                        title="Copy code"
                    >
                        {copiedCode === `auth-${selectedLang}` ? (
                            <CheckCircle size={20} className="text-green-400" />
                        ) : (
                            <Copy size={20} className="text-gray-300" />
                        )}
                    </button>
                </div>
            </div>

            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <h4 className="font-semibold text-red-900 mb-2">🔒 Security Warning</h4>
                <p className="text-red-800">
                    Your API key grants full access to your account. Keep it secure and never share it publicly or commit it to version control.
                </p>
            </div>
        </div>
    );
};

// Endpoints Section
const EndpointsSection = ({ endpoints, copyToClipboard, copiedCode }) => {
    const [expandedEndpoint, setExpandedEndpoint] = useState(null);

    const toggleEndpoint = (categoryIndex, endpointIndex) => {
        const key = `${categoryIndex}-${endpointIndex}`;
        setExpandedEndpoint(expandedEndpoint === key ? null : key);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
                <Code className="text-blue-600" />
                <span>API Endpoints</span>
            </h2>

            <div className="space-y-6">
                {endpoints.map((category, categoryIndex) => {
                    const Icon = category.icon;
                    return (
                        <div key={categoryIndex} className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className={`bg-gray-50 px-6 py-4 flex items-center space-x-3`}>
                                <Icon className={category.color} size={24} />
                                <h3 className="text-xl font-semibold text-gray-800">{category.category}</h3>
                            </div>

                            <div className="divide-y divide-gray-200">
                                {category.endpoints.map((endpoint, endpointIndex) => {
                                    const key = `${categoryIndex}-${endpointIndex}`;
                                    const isExpanded = expandedEndpoint === key;

                                    return (
                                        <div key={endpointIndex} className="p-6">
                                            <button
                                                onClick={() => toggleEndpoint(categoryIndex, endpointIndex)}
                                                className="w-full text-left"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-3 mb-2">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${endpoint.method === 'POST' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                                                }`}>
                                                                {endpoint.method}
                                                            </span>
                                                            <code className="text-sm font-mono text-gray-700">{endpoint.path}</code>
                                                        </div>
                                                        <p className="text-gray-600 text-sm">{endpoint.description}</p>
                                                    </div>
                                                    <div className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                        ▼
                                                    </div>
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div className="mt-4 space-y-4">
                                                    {endpoint.requestBody && (
                                                        <div>
                                                            <h4 className="font-semibold text-gray-800 mb-2">Request Body</h4>
                                                            <div className="relative">
                                                                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                                                                    <code className="text-sm font-mono">{JSON.stringify(endpoint.requestBody, null, 2)}</code>
                                                                </pre>
                                                                <button
                                                                    onClick={() => copyToClipboard(JSON.stringify(endpoint.requestBody, null, 2), `req-${key}`)}
                                                                    className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                                                                >
                                                                    {copiedCode === `req-${key}` ? (
                                                                        <CheckCircle size={16} className="text-green-400" />
                                                                    ) : (
                                                                        <Copy size={16} className="text-gray-300" />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div>
                                                        <h4 className="font-semibold text-gray-800 mb-2">Response</h4>
                                                        <div className="relative">
                                                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                                                                <code className="text-sm font-mono">{JSON.stringify(endpoint.response, null, 2)}</code>
                                                            </pre>
                                                            <button
                                                                onClick={() => copyToClipboard(JSON.stringify(endpoint.response, null, 2), `res-${key}`)}
                                                                className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                                                            >
                                                                {copiedCode === `res-${key}` ? (
                                                                    <CheckCircle size={16} className="text-green-400" />
                                                                ) : (
                                                                    <Copy size={16} className="text-gray-300" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Webhooks Section
const WebhooksSection = ({ copyToClipboard, copiedCode }) => {
    const webhookExample = {
        event: 'transaction.success',
        data: {
            reference: 'TXN-1234567890',
            type: 'airtime',
            amount: 100,
            phoneNumber: '08012345678',
            status: 'success',
            timestamp: '2026-02-10T09:00:00Z'
        }
    };

    const verificationCode = `const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
    const hash = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
    
    return hash === signature;
}

// Usage in your webhook handler
app.post('/webhook', (req, res) => {
    const signature = req.headers['x-ufriends-signature'];
    const isValid = verifyWebhook(req.body, signature, YOUR_WEBHOOK_SECRET);
    
    if (!isValid) {
        return res.status(401).send('Invalid signature');
    }
    
    // Process webhook
    console.log('Webhook received:', req.body);
    res.status(200).send('OK');
});`;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
                <Zap className="text-blue-600" />
                <span>Webhooks</span>
            </h2>

            <p className="text-gray-700">
                Webhooks allow you to receive real-time notifications about transactions and events in your account.
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <h4 className="font-semibold text-blue-900 mb-2">📍 Configuration</h4>
                <p className="text-blue-800">
                    Configure your webhook URL in Profile → API Access → Webhook Configuration. Make sure your endpoint is publicly accessible and uses HTTPS.
                </p>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-800">Webhook Events</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-xl p-4">
                        <code className="text-sm font-mono text-blue-600 font-semibold">transaction.success</code>
                        <p className="text-gray-600 text-sm mt-1">Fired when a transaction completes successfully</p>
                    </div>
                    <div className="border border-gray-200 rounded-xl p-4">
                        <code className="text-sm font-mono text-red-600 font-semibold">transaction.failed</code>
                        <p className="text-gray-600 text-sm mt-1">Fired when a transaction fails</p>
                    </div>
                    <div className="border border-gray-200 rounded-xl p-4">
                        <code className="text-sm font-mono text-yellow-600 font-semibold">transaction.pending</code>
                        <p className="text-gray-600 text-sm mt-1">Fired when a transaction is processing</p>
                    </div>
                    <div className="border border-gray-200 rounded-xl p-4">
                        <code className="text-sm font-mono text-purple-600 font-semibold">wallet.credited</code>
                        <p className="text-gray-600 text-sm mt-1">Fired when your wallet is credited</p>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-800">Webhook Payload Example</h3>
                <div className="relative">
                    <pre className="bg-gray-900 text-gray-100 p-6 rounded-xl overflow-x-auto">
                        <code className="text-sm font-mono">{JSON.stringify(webhookExample, null, 2)}</code>
                    </pre>
                    <button
                        onClick={() => copyToClipboard(JSON.stringify(webhookExample, null, 2), 'webhook-payload')}
                        className="absolute top-4 right-4 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                        {copiedCode === 'webhook-payload' ? (
                            <CheckCircle size={20} className="text-green-400" />
                        ) : (
                            <Copy size={20} className="text-gray-300" />
                        )}
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-800">Webhook Verification</h3>
                <p className="text-gray-700">
                    All webhooks are signed with HMAC-SHA256. Verify the signature before processing the webhook.
                </p>
                <div className="relative">
                    <pre className="bg-gray-900 text-gray-100 p-6 rounded-xl overflow-x-auto">
                        <code className="text-sm font-mono">{verificationCode}</code>
                    </pre>
                    <button
                        onClick={() => copyToClipboard(verificationCode, 'webhook-verify')}
                        className="absolute top-4 right-4 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                        {copiedCode === 'webhook-verify' ? (
                            <CheckCircle size={20} className="text-green-400" />
                        ) : (
                            <Copy size={20} className="text-gray-300" />
                        )}
                    </button>
                </div>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                <h4 className="font-semibold text-yellow-900 mb-2">⚡ Best Practices</h4>
                <ul className="list-disc list-inside text-yellow-800 space-y-1">
                    <li>Always verify webhook signatures</li>
                    <li>Respond with 200 OK quickly (process asynchronously)</li>
                    <li>Implement idempotency (same webhook may be sent multiple times)</li>
                    <li>Use HTTPS for your webhook URL</li>
                    <li>Log all webhook events for debugging</li>
                </ul>
            </div>
        </div>
    );
};

// Error Codes Section
const ErrorCodesSection = () => {
    const errorCodes = [
        { code: 200, status: 'Success', description: 'Request completed successfully', color: 'text-green-600' },
        { code: 400, status: 'Bad Request', description: 'Invalid request parameters or missing required fields', color: 'text-orange-600' },
        { code: 401, status: 'Unauthorized', description: 'Invalid or missing API key', color: 'text-red-600' },
        { code: 403, status: 'Forbidden', description: 'API key valid but insufficient permissions', color: 'text-red-600' },
        { code: 404, status: 'Not Found', description: 'Endpoint or resource does not exist', color: 'text-orange-600' },
        { code: 429, status: 'Too Many Requests', description: 'Rate limit exceeded', color: 'text-yellow-600' },
        { code: 500, status: 'Internal Server Error', description: 'Server error, please contact support', color: 'text-red-600' },
        { code: 503, status: 'Service Unavailable', description: 'Temporary service outage or maintenance', color: 'text-yellow-600' },
    ];

    const applicationErrors = [
        { code: 1001, message: 'Insufficient wallet balance', description: 'Your wallet balance is too low to complete this transaction' },
        { code: 1002, message: 'Invalid transaction PIN', description: 'The provided transaction PIN is incorrect' },
        { code: 1003, message: 'Service temporarily unavailable', description: 'The requested service is currently unavailable' },
        { code: 1004, message: 'Invalid phone number format', description: 'Phone number must be 11 digits starting with 0' },
        { code: 1005, message: 'Invalid network provider', description: 'The specified network provider is not supported' },
        { code: 1006, message: 'Transaction already processed', description: 'This transaction reference has already been processed' },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
                <AlertCircle className="text-blue-600" />
                <span>Error Codes</span>
            </h2>

            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-800">HTTP Status Codes</h3>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Code</th>
                                <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                                <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {errorCodes.map((error, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="border border-gray-200 px-4 py-3">
                                        <code className={`font-bold ${error.color}`}>{error.code}</code>
                                    </td>
                                    <td className="border border-gray-200 px-4 py-3 font-medium text-gray-800">{error.status}</td>
                                    <td className="border border-gray-200 px-4 py-3 text-gray-600">{error.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-800">Application Error Codes</h3>
                <p className="text-gray-700">
                    These error codes are returned in the response body when status is non-zero.
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Code</th>
                                <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Message</th>
                                <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {applicationErrors.map((error, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="border border-gray-200 px-4 py-3">
                                        <code className="font-bold text-red-600">{error.code}</code>
                                    </td>
                                    <td className="border border-gray-200 px-4 py-3 font-medium text-gray-800">{error.message}</td>
                                    <td className="border border-gray-200 px-4 py-3 text-gray-600">{error.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Error Response Format</h4>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                    <code className="text-sm font-mono">{`{
  "status": 1,
  "message": "Insufficient wallet balance",
  "errorCode": 1001
}`}</code>
                </pre>
            </div>
        </div>
    );
};

export default ApiDocs;
