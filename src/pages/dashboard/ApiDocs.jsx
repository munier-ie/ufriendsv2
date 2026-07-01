import React, { useState } from 'react';
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
    FileText,
    UserCheck,
    Terminal
} from 'lucide-react';

/**
 * API Documentation Component
 * Provides comprehensive API documentation for vendor accounts
 * with interactive examples and security best practices
 */
const ApiDocs = () => {
    const [activeSection, setActiveSection] = useState('getting-started');
    const [copiedCode, setCopiedCode] = useState('');
    const [isSandboxMode, setIsSandboxMode] = useState(() => {
        return localStorage.getItem('isSandboxMode') === 'true';
    });

    useEffect(() => {
        localStorage.setItem('isSandboxMode', isSandboxMode);
    }, [isSandboxMode]);

    // Copy code snippet to clipboard
    const copyToClipboard = (code, id) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(id);
        setTimeout(() => setCopiedCode(''), 2000);
    };

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ufriends.com.ng';

    // Navigation items
    const sections = [
        { id: 'getting-started', label: 'Getting Started', icon: Book },
        { id: 'sdks', label: 'Official SDKs', icon: Terminal },
        { id: 'sandbox', label: 'Sandbox Mode', icon: Tv },
        { id: 'authentication', label: 'Authentication', icon: Key },
        { id: 'services', label: 'Services API', icon: Code },
        { id: 'identity', label: 'Identity API', icon: UserCheck },
        { id: 'wallet', label: 'Wallet API', icon: CreditCard },
        { id: 'webhooks', label: 'Webhooks', icon: Zap },
        { id: 'errors', label: 'Error Codes', icon: AlertCircle },
    ];

    // API Endpoints Documentation
    const servicesEndpoints = [
        {
            category: 'List Plans',
            icon: FileText,
            color: 'text-blue-600',
            endpoints: [
                {
                    method: 'GET',
                    path: '/api/v1/services/:type',
                    description: 'Get all active plans for airtime, data, cable, electricity, or exam.',
                    requestBody: null,
                    response: {
                        success: true,
                        services: [
                            {
                                id: 42,
                                name: "MTN 1GB (SME)",
                                type: "data",
                                provider: "MTN",
                                code: "SME1GB",
                                price: 290,
                                active: true
                            }
                        ]
                    }
                }
            ]
        },
        {
            category: 'Verify Customer',
            icon: CheckCircle,
            color: 'text-indigo-600',
            endpoints: [
                {
                    method: 'POST',
                    path: '/api/v1/services/verify',
                    description: 'Verify Cable TV IUC or Electricity Meter before purchase.',
                    requestBody: {
                        type: "cable",
                        provider: "dstv",
                        number: "1234567890"
                    },
                    response: {
                        success: true,
                        valid: true,
                        customerName: "JOHN DOE",
                        accessToken: "eyJhbGciOiJIUzI1NiIs..."
                    }
                }
            ]
        },
        {
            category: 'Purchase Service',
            icon: Wifi,
            color: 'text-green-600',
            endpoints: [
                {
                    method: 'POST',
                    path: '/api/v1/services/purchase',
                    description: 'Purchase any service (Airtime, Data, Cable, Power, Exam). No PIN required.',
                    requestBody: {
                        serviceId: 10,
                        recipient: "08012345678",
                        amount: 500,
                        networkType: "VTU"
                    },
                    response: {
                        success: true,
                        reference: "3f4a1b2c-a1b2...",
                        serviceName: "MTN Airtime",
                        amount: 500,
                        newBalance: 9500,
                        status: "success",
                        token: "3948-2910-4829-1928"
                    }
                }
            ]
        }
    ];

    const identityEndpoints = [
        {
            category: 'BVN Verification',
            icon: UserCheck,
            color: 'text-blue-600',
            endpoints: [
                {
                    method: 'POST',
                    path: '/api/v1/identity/bvn',
                    description: 'Generate a verified BVN slip (auto-refunds on failure).',
                    requestBody: {
                        bvn: "12345678901",
                        slipType: "regular"
                    },
                    response: {
                        success: true,
                        reference: "BVN-API-4A3B2C1D...",
                        newBalance: 9560,
                        report: {
                            firstName: "JOHN",
                            lastName: "DOE",
                            pdfUrl: "https://ufriends.com.ng/api/reports/bvn/..."
                        }
                    }
                }
            ]
        },
        {
            category: 'NIN Verification',
            icon: FileText,
            color: 'text-green-600',
            endpoints: [
                {
                    method: 'POST',
                    path: '/api/v1/identity/nin',
                    description: 'Generate a verified NIN slip by NIN number or phone number.',
                    requestBody: {
                        nin: "12345678901",
                        lookupMethod: "nin",
                        slipType: "regular"
                    },
                    response: {
                        success: true,
                        reference: "NIN-API-5C4D3E2F...",
                        newBalance: 9460,
                        report: {
                            firstName: "JANE",
                            lastName: "DOE",
                            pdfUrl: "https://ufriends.com.ng/api/reports/nin/..."
                        }
                    }
                }
            ]
        }
    ];

    const walletEndpoints = [
        {
            category: 'Wallet Balance',
            icon: CreditCard,
            color: 'text-orange-600',
            endpoints: [
                {
                    method: 'GET',
                    path: '/api/v1/wallet/balance',
                    description: 'Get current wallet balance and virtual account details.',
                    requestBody: null,
                    response: {
                        success: true,
                        wallet: 9710.00,
                        refWallet: 250.00,
                        total: 9960.00,
                        virtualAccount: {
                            bankName: "Palmpay",
                            accountNumber: "8101234567",
                            accountName: "JOHN DOE"
                        }
                    }
                }
            ]
        },
        {
            category: 'Transactions',
            icon: Database,
            color: 'text-purple-600',
            endpoints: [
                {
                    method: 'GET',
                    path: '/api/v1/wallet/transactions?limit=20&status=0',
                    description: 'List your transaction history (paginated).',
                    requestBody: null,
                    response: {
                        success: true,
                        transactions: [
                            {
                                reference: "3f4a1b2c-...",
                                serviceName: "MTN Airtime",
                                amount: -500,
                                status: 0,
                                newBalance: 9500,
                                date: "2026-06-24T12:00:00Z"
                            }
                        ],
                        pagination: { total: 142, limit: 20, offset: 0 }
                    }
                }
            ]
        }
    ];

    const codeExamples = {
        javascript: `// Node.js - Fetch Example
const fetch = require('node-fetch');

async function checkBalance() {
    const response = await fetch('${API_BASE_URL}/api/v1/wallet/balance', {
        headers: {
            'Authorization': 'Bearer YOUR_API_KEY'
        }
    });
    const data = await response.json();
    console.log('Balance:', data.wallet);
}

checkBalance();`,
        php: `<?php
// PHP cURL Example
$ch = curl_init('${API_BASE_URL}/api/v1/wallet/balance');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer YOUR_API_KEY'
]);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
echo "Balance: ₦" . $data['wallet'];
?>`,
        curl: `# cURL Example
curl ${API_BASE_URL}/api/v1/wallet/balance \\
  -H "Authorization: Bearer YOUR_API_KEY"`
    };

    // Render section content
    const renderSectionContent = () => {
        switch (activeSection) {
            case 'getting-started':
                return <GettingStartedSection />;
            case 'sdks':
                return <SdkSection />;
            case 'sandbox':
                return <SandboxSection />;
            case 'authentication':
                return <AuthenticationSection isSandboxMode={isSandboxMode} codeExamples={codeExamples} copyToClipboard={copyToClipboard} copiedCode={copiedCode} />;
            case 'services':
                return <EndpointsSection title="Services API" endpoints={servicesEndpoints} copyToClipboard={copyToClipboard} copiedCode={copiedCode} icon={<Code className="text-blue-600" />} />;
            case 'identity':
                return <EndpointsSection title="Identity API" endpoints={identityEndpoints} copyToClipboard={copyToClipboard} copiedCode={copiedCode} icon={<UserCheck className="text-green-600" />} />;
            case 'wallet':
                return <EndpointsSection title="Wallet API" endpoints={walletEndpoints} copyToClipboard={copyToClipboard} copiedCode={copiedCode} icon={<CreditCard className="text-orange-600" />} />;
            case 'webhooks':
                return <WebhooksSection copyToClipboard={copyToClipboard} copiedCode={copiedCode} />;
            case 'errors':
                return <ErrorCodesSection />;
            default:
                return null;
        }
    };

    return (
        <div className="p-4 sm:p-6 pb-24">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                            <Book className="text-white" size={28} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Ufriends API v1</h1>
                                <span className={`px-3 py-1 ${isSandboxMode ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'} text-xs font-bold rounded-full uppercase tracking-wide`}>
                                    {isSandboxMode ? 'Sandbox' : 'Live'}
                                </span>
                            </div>
                            <p className="text-gray-600 mt-1">Integrate VTU, NIN/BVN slips, and Wallet services into your app.</p>
                        </div>
                    </div>
                    
                    {/* Sandbox Toggle */}
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Tv className={isSandboxMode ? "text-purple-600" : "text-gray-400"} size={20} />
                            <div>
                                <span className="text-sm font-semibold text-gray-800 block">Sandbox Mode</span>
                                <span className="text-xs text-gray-500">Toggle to update endpoint examples below</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsSandboxMode(!isSandboxMode)}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${isSandboxMode ? 'bg-purple-600' : 'bg-gray-200'}`}
                        >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isSandboxMode ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar Navigation */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sticky top-6">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Navigation</h2>
                            <nav className="space-y-1">
                                {sections.map((section) => {
                                    const Icon = section.icon;
                                    return (
                                        <button
                                            key={section.id}
                                            onClick={() => setActiveSection(section.id)}
                                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeSection === section.id
                                                    ? 'bg-blue-50 text-blue-700 font-semibold'
                                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                }`}
                                        >
                                            <Icon size={18} className={activeSection === section.id ? 'text-blue-600' : 'text-gray-400'} />
                                            <span>{section.label}</span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
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
        <h2 className="text-2xl font-bold text-gray-800 border-b pb-4">Getting Started</h2>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-4">
            <Zap className="text-blue-500 mt-1 flex-shrink-0" />
            <div>
                <h4 className="font-semibold text-blue-900">Vendor Access Only</h4>
                <p className="text-blue-800 text-sm mt-1">The Ufriends v1 API is available exclusively to Vendor accounts. If you are on a User or Agent plan, please upgrade your account to generate an API key.</p>
            </div>
        </div>

        <div className="space-y-4 mt-8">
            <h3 className="text-xl font-semibold text-gray-800">Integration Checklist</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 p-5 rounded-xl">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold mb-3">1</div>
                    <h4 className="font-semibold text-gray-900">Get Your API Key</h4>
                    <p className="text-gray-600 text-sm mt-1">Visit your Profile page or call <code>/api/auth/api-key</code> to retrieve your bearer token.</p>
                </div>
                <div className="border border-gray-200 p-5 rounded-xl">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold mb-3">2</div>
                    <h4 className="font-semibold text-gray-900">Fund Your Wallet</h4>
                    <p className="text-gray-600 text-sm mt-1">All API purchases are deducted directly from your main wallet balance.</p>
                </div>
                <div className="border border-gray-200 p-5 rounded-xl">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold mb-3">3</div>
                    <h4 className="font-semibold text-gray-900">Configure Webhooks</h4>
                    <p className="text-gray-600 text-sm mt-1">Register an HTTPS callback URL to receive real-time notifications when transactions succeed or fail.</p>
                </div>
                <div className="border border-gray-200 p-5 rounded-xl">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold mb-3">4</div>
                    <h4 className="font-semibold text-gray-900">Go Live</h4>
                    <p className="text-gray-600 text-sm mt-1">Start routing your customers' VTU and Identity requests through the API.</p>
                </div>
            </div>
        </div>

        <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Base URL</h3>
            <div className="bg-gray-900 p-4 rounded-xl flex items-center justify-between">
                <code className="text-green-400 font-mono">https://ufriends.com.ng/api/v1</code>
            </div>
        </div>
    </div>
);

// SDKs Section
const SdkSection = () => (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 border-b pb-4 flex items-center gap-2">
            <Terminal className="text-blue-600" />
            Official SDKs
        </h2>

        <p className="text-gray-700">
            Speed up your integration process by using one of our official SDKs. These libraries handle authentication, request formatting, and response parsing automatically.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-[#3c873a]/10 rounded-xl flex items-center justify-center mb-4">
                    <span className="text-xl font-bold text-[#3c873a]">JS</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Node.js SDK</h3>
                <p className="text-gray-600 text-sm mb-6">Complete async/await wrapper for Node.js backend applications.</p>
                <div className="space-y-3">
                    <a 
                        href="/sdks/ufriends-node-sdk.js" 
                        download
                        className="w-full flex items-center justify-center gap-2 bg-[#3c873a] text-white py-2.5 rounded-lg font-medium hover:bg-[#3c873a]/90 transition-colors"
                    >
                        <Code size={18} /> Download Node.js SDK
                    </a>
                </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-[#4F5D95]/10 rounded-xl flex items-center justify-center mb-4">
                    <span className="text-xl font-bold text-[#4F5D95]">PHP</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">PHP SDK</h3>
                <p className="text-gray-600 text-sm mb-6">Lightweight cURL-based SDK suitable for modern PHP frameworks and native apps.</p>
                <div className="space-y-3">
                    <a 
                        href="/sdks/ufriends-php-sdk.php" 
                        download
                        className="w-full flex items-center justify-center gap-2 bg-[#4F5D95] text-white py-2.5 rounded-lg font-medium hover:bg-[#4F5D95]/90 transition-colors"
                    >
                        <Code size={18} /> Download PHP SDK
                    </a>
                </div>
            </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl mt-8">
            <h4 className="font-semibold text-blue-900 mb-2">Sandbox Mode Support</h4>
            <p className="text-blue-800 text-sm mb-3">Both SDKs include built-in support for Sandbox mode. Simply pass <code>true</code> as the last parameter to any purchase or identity verification method.</p>
            <code className="block bg-white p-3 rounded-lg border border-blue-100 text-sm font-mono text-gray-800">
                // Example (Node.js)<br/>
                await client.purchaseService(params, true);
            </code>
        </div>
    </div>
);

// Sandbox Section
const SandboxSection = () => (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 border-b pb-4 flex items-center gap-2">
            <Tv className="text-purple-600" />
            Sandbox / Test Mode
        </h2>

        <p className="text-gray-700">
            Ufriends provides a comprehensive Sandbox Mode to help you test your integration safely <strong>without deducting real money from your wallet.</strong>
        </p>

        <div className="bg-purple-50 border border-purple-200 p-5 rounded-xl mt-4">
            <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                <Zap size={18} /> How to Use Sandbox Mode
            </h4>
            <p className="text-purple-800 text-sm mb-3">
                Ufriends uses dedicated API keys for Sandbox mode. To simulate a transaction, simply use your <strong>Test API Key</strong> 
                (which starts with <code>sk_test_</code>) in the Authorization header instead of your Live key.
            </p>
            <code className="block bg-white p-3 rounded-lg border border-purple-100 text-sm font-mono text-gray-800">
                Authorization: Bearer sk_test_...
            </code>
        </div>

        <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Supported Endpoints</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 p-4 rounded-xl">
                    <code className="text-sm font-mono text-blue-600 font-bold block mb-1">/services/purchase</code>
                    <p className="text-gray-500 text-xs">Simulates a successful Airtime, Data, Cable, or Electricity purchase. Webhook event <code>transaction.success</code> will be fired with <code>isTest: true</code>.</p>
                </div>
                <div className="border border-gray-200 p-4 rounded-xl">
                    <code className="text-sm font-mono text-indigo-600 font-bold block mb-1">/services/verify</code>
                    <p className="text-gray-500 text-xs">Simulates a successful IUC/Meter verification, returning a mock customer name.</p>
                </div>
                <div className="border border-gray-200 p-4 rounded-xl">
                    <code className="text-sm font-mono text-purple-600 font-bold block mb-1">/identity/bvn</code>
                    <p className="text-gray-500 text-xs">Simulates BVN slip generation. Returns a mock PDF URL and fires <code>identity.bvn.success</code>.</p>
                </div>
                <div className="border border-gray-200 p-4 rounded-xl">
                    <code className="text-sm font-mono text-green-600 font-bold block mb-1">/identity/nin</code>
                    <p className="text-gray-500 text-xs">Simulates NIN slip generation. Returns a mock PDF URL and fires <code>identity.nin.success</code>.</p>
                </div>
            </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 p-5 rounded-xl mt-6 flex items-start gap-3">
            <AlertCircle className="text-yellow-600 mt-0.5 flex-shrink-0" size={20} />
            <div>
                <h4 className="font-semibold text-yellow-900 text-sm">Testing Webhooks</h4>
                <p className="text-yellow-800 text-sm mt-1">
                    Sandbox mode still fires webhooks so you can test your listeners. Look for the <code>"isTest": true</code> flag in the webhook payload to differentiate test events from live events.
                </p>
            </div>
        </div>
    </div>
);

// Authentication Section
const AuthenticationSection = ({ isSandboxMode, codeExamples, copyToClipboard, copiedCode }) => {
    const [selectedLang, setSelectedLang] = useState('javascript');

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-4">Authentication</h2>

            <p className="text-gray-700">
                All requests to the <code>/api/v1/*</code> endpoints must include your API key as a Bearer token in the Authorization header. 
                <strong> No transaction PIN is required</strong> for API calls; the API key acts as your full authorization.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">HTTP Header</h3>
                <code className="block text-gray-800 font-mono text-sm bg-white border p-3 rounded-lg">
                    Authorization: Bearer {isSandboxMode ? 'sk_test_...' : 'YOUR_API_KEY'}
                </code>
            </div>

            <div className="mt-8 space-y-4">
                <h3 className="text-xl font-semibold text-gray-800">Code Examples</h3>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex bg-gray-50 border-b border-gray-200">
                        {['javascript', 'php', 'curl'].map((lang) => (
                            <button
                                key={lang}
                                onClick={() => setSelectedLang(lang)}
                                className={`px-4 py-3 text-sm font-medium transition-colors ${selectedLang === lang
                                        ? 'bg-white text-blue-600 border-b-2 border-blue-600 -mb-[1px]'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                {lang.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <div className="relative bg-gray-900">
                        <pre className="p-4 overflow-x-auto text-gray-300 text-sm font-mono leading-relaxed">
                            {codeExamples[selectedLang]}
                        </pre>
                        <button
                            onClick={() => copyToClipboard(codeExamples[selectedLang], `auth-${selectedLang}`)}
                            className="absolute top-3 right-3 p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors"
                        >
                            {copiedCode === `auth-${selectedLang}` ? <CheckCircle size={16} className="text-green-400" /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-start gap-3 mt-6">
                <AlertCircle className="text-yellow-600 mt-0.5 flex-shrink-0" size={20} />
                <div className="text-sm text-yellow-800">
                    <strong>Rate Limits:</strong> Vendor accounts are limited to <strong>300 requests per minute</strong>. Exceeding this will result in a <code>429 Too Many Requests</code> response.
                </div>
            </div>
        </div>
    );
};

// Endpoints Section (Reusable)
const EndpointsSection = ({ title, endpoints, copyToClipboard, copiedCode, icon }) => {
    const [expandedEndpoint, setExpandedEndpoint] = useState(null);

    const toggleEndpoint = (categoryIndex, endpointIndex) => {
        const key = `${categoryIndex}-${endpointIndex}`;
        setExpandedEndpoint(expandedEndpoint === key ? null : key);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-4 flex items-center gap-3">
                {icon} {title}
            </h2>

            <div className="space-y-6">
                {endpoints.map((category, categoryIndex) => {
                    const Icon = category.icon;
                    return (
                        <div key={categoryIndex} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex items-center space-x-3">
                                <Icon className={category.color} size={20} />
                                <h3 className="text-lg font-semibold text-gray-800">{category.category}</h3>
                            </div>

                            <div className="divide-y divide-gray-100 bg-white">
                                {category.endpoints.map((endpoint, endpointIndex) => {
                                    const key = `${categoryIndex}-${endpointIndex}`;
                                    const isExpanded = expandedEndpoint === key;

                                    return (
                                        <div key={endpointIndex} className="p-0">
                                            <button
                                                onClick={() => toggleEndpoint(categoryIndex, endpointIndex)}
                                                className="w-full text-left p-5 hover:bg-gray-50 transition-colors focus:outline-none"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="flex items-center space-x-3 mb-1">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${endpoint.method === 'POST' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'
                                                                }`}>
                                                                {endpoint.method}
                                                            </span>
                                                            <code className="text-[15px] font-mono text-gray-800 font-semibold">{endpoint.path}</code>
                                                        </div>
                                                        <p className="text-gray-500 text-sm mt-2">{endpoint.description}</p>
                                                    </div>
                                                    <div className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                        ▼
                                                    </div>
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div className="p-5 bg-gray-50 border-t border-gray-100 space-y-6">
                                                    {endpoint.requestBody && (
                                                        <div>
                                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Request Body</h4>
                                                            <div className="relative">
                                                                <pre className="bg-gray-900 text-gray-300 p-4 rounded-xl overflow-x-auto text-sm font-mono">
                                                                    {JSON.stringify(endpoint.requestBody, null, 2)}
                                                                </pre>
                                                                <button
                                                                    onClick={() => copyToClipboard(JSON.stringify(endpoint.requestBody, null, 2), `req-${key}`)}
                                                                    className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors"
                                                                >
                                                                    {copiedCode === `req-${key}` ? <CheckCircle size={16} className="text-green-400" /> : <Copy size={16} />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div>
                                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Response Example</h4>
                                                        <div className="relative">
                                                            <pre className="bg-gray-900 text-gray-300 p-4 rounded-xl overflow-x-auto text-sm font-mono">
                                                                {JSON.stringify(endpoint.response, null, 2)}
                                                            </pre>
                                                            <button
                                                                onClick={() => copyToClipboard(JSON.stringify(endpoint.response, null, 2), `res-${key}`)}
                                                                className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors"
                                                            >
                                                                {copiedCode === `res-${key}` ? <CheckCircle size={16} className="text-green-400" /> : <Copy size={16} />}
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
        timestamp: '2026-06-24T12:00:00Z',
        data: {
            reference: "3f4a1b2c-a1b2-...",
            serviceName: "MTN Airtime",
            amount: 500,
            recipient: "08012345678",
            newBalance: 9500,
            status: 0
        }
    };

    const verificationCode = `const crypto = require('crypto');

app.post('/webhook', express.json(), (req, res) => {
    const signature = req.headers['x-ufriends-signature'];
    const expected = crypto
        .createHmac('sha256', process.env.WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');
    
    if (signature !== expected) {
        return res.status(401).send('Invalid signature');
    }
    
    const { event, data } = req.body;
    console.log('Verified Webhook:', event, data.reference);
    
    res.status(200).send('OK');
});`;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-4">Webhooks</h2>

            <p className="text-gray-700">
                Register an HTTPS URL to receive real-time push notifications. Payloads are signed with HMAC-SHA256.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                <div className="border border-gray-200 p-4 rounded-xl">
                    <code className="text-sm font-mono text-blue-600 font-bold block mb-1">transaction.success</code>
                    <p className="text-gray-500 text-xs">Fired when a purchase succeeds.</p>
                </div>
                <div className="border border-gray-200 p-4 rounded-xl">
                    <code className="text-sm font-mono text-red-600 font-bold block mb-1">transaction.failed</code>
                    <p className="text-gray-500 text-xs">Fired when a purchase fails (wallet refunded).</p>
                </div>
                <div className="border border-gray-200 p-4 rounded-xl">
                    <code className="text-sm font-mono text-green-600 font-bold block mb-1">identity.nin.success</code>
                    <p className="text-gray-500 text-xs">Fired when a NIN slip is generated.</p>
                </div>
                <div className="border border-gray-200 p-4 rounded-xl">
                    <code className="text-sm font-mono text-purple-600 font-bold block mb-1">identity.bvn.success</code>
                    <p className="text-gray-500 text-xs">Fired when a BVN slip is generated.</p>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Payload Structure</h3>
                <div className="relative">
                    <pre className="bg-gray-900 text-gray-300 p-4 rounded-xl overflow-x-auto text-sm font-mono">
                        {JSON.stringify(webhookExample, null, 2)}
                    </pre>
                </div>
            </div>



            <div className="space-y-4 mt-6">
                <h3 className="text-lg font-semibold text-gray-800">Signature Verification (Node.js)</h3>
                <div className="relative">
                    <pre className="bg-gray-900 text-gray-300 p-4 rounded-xl overflow-x-auto text-sm font-mono">
                        {verificationCode}
                    </pre>
                    <button
                        onClick={() => copyToClipboard(verificationCode, 'webhook-verify')}
                        className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors"
                    >
                        {copiedCode === 'webhook-verify' ? <CheckCircle size={16} className="text-green-400" /> : <Copy size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Error Codes Section
const ErrorCodesSection = () => {
    const errorCodes = [
        { code: 200, status: 'Success', description: 'Request completed successfully (check payload.success)', color: 'text-green-600' },
        { code: 400, status: 'Bad Request', description: 'Validation error, insufficient funds, or business rule failure', color: 'text-orange-600' },
        { code: 401, status: 'Unauthorized', description: 'Missing or invalid API key', color: 'text-red-600' },
        { code: 403, status: 'Forbidden', description: 'Account suspended or not a Vendor tier', color: 'text-red-600' },
        { code: 404, status: 'Not Found', description: 'Transaction or resource not found', color: 'text-orange-600' },
        { code: 429, status: 'Too Many Requests', description: 'Rate limit exceeded (300/min)', color: 'text-red-600' },
        { code: 500, status: 'Server Error', description: 'Internal system error', color: 'text-red-600' },
        { code: 503, status: 'Unavailable', description: 'Provider service is currently down', color: 'text-orange-600' },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-4">Error Codes</h2>

            <p className="text-gray-700">
                The API uses standard HTTP status codes. For <code>400</code> errors, a JSON payload is returned with a specific message explaining why the request failed (e.g. "Insufficient wallet balance").
            </p>

            <div className="border border-gray-200 rounded-xl overflow-hidden mt-6">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-semibold">
                        <tr>
                            <th className="px-5 py-3 border-b">Code</th>
                            <th className="px-5 py-3 border-b">Status</th>
                            <th className="px-5 py-3 border-b">Description</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {errorCodes.map((error, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-5 py-4">
                                    <span className={`font-mono font-bold ${error.color}`}>{error.code}</span>
                                </td>
                                <td className="px-5 py-4 font-medium text-gray-800">{error.status}</td>
                                <td className="px-5 py-4 text-gray-600">{error.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mt-6">
                <h4 className="font-semibold text-blue-900 text-sm">Failed Transactions & Refunds</h4>
                <p className="text-blue-800 text-sm mt-1">If a purchase request returns a <code>400 Bad Request</code> and you see a <code>reference</code> in the payload, the transaction failed at the provider level and your wallet was automatically refunded.</p>
            </div>
        </div>
    );
};

export default ApiDocs;
