import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Printer from 'lucide-react/dist/esm/icons/printer';
import Download from 'lucide-react/dist/esm/icons/download';
import X from 'lucide-react/dist/esm/icons/x';
import Logo from '../ui/Logo';
import Button from '../ui/Button';

/**
 * Receipt Component for Transactions
 * Provides a professional, printable receipt for transaction records.
 */
export default function Receipt({ transaction, onClose }) {
    const receiptRef = useRef();

    const handlePrint = () => {
        const printContent = receiptRef.current.innerHTML;
        // Get all styles from the main document to preserve Tailwind classes
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(el => el.outerHTML)
            .join('\n');

        const printStyles = `
            <style>
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                        background: white !important;
                    }
                    /* Force background colors to print */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print { display: none !important; }
                }
                body { background: white; min-height: 100vh; font-family: 'Inter', sans-serif; }
                #print-section { padding: 40px; max-width: 800px; margin: 0 auto; }
            </style>
        `;

        const newWin = window.open('', '_blank');
        newWin.document.write(`
            <html>
                <head>
                    <title>Receipt - ${transaction.reference}</title>
                    ${styles}
                    ${printStyles}
                </head>
                <body class="bg-white">
                    <div id="print-section">
                        ${printContent}
                    </div>
                    <script>
                        window.onload = () => {
                            setTimeout(() => {
                                window.print();
                                window.close();
                            }, 250);
                        };
                    </script>
                </body>
            </html>
        `);
        newWin.document.close();
    };

    if (!transaction) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider pl-2">Transaction Receipt</span>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Receipt Content */}
                <div className="flex-1 overflow-y-auto p-8" ref={receiptRef}>
                    <div className="receipt-header text-center space-y-2">
                        <div className="flex justify-center mb-2 logo-container">
                            <Logo className="w-16 h-16" />
                        </div>
                        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tighter">UFRIENDS INFORMATION TECHNOLOGY</h1>
                        <p className="text-sm text-gray-500 font-medium">Website: <span className="text-primary font-bold">www.ufriends.com.ng</span></p>
                    </div>

                    <table className="receipt-table mt-8 w-full border-collapse border border-gray-200">
                        <tbody>
                            <tr>
                                <th className="bg-gray-50/80 p-3 border border-gray-200 text-left text-xs font-bold uppercase text-gray-600 w-1/3">PACKAGE</th>
                                <td className="p-3 border border-gray-200 text-sm font-bold text-gray-800">{transaction.serviceName}</td>
                            </tr>
                            {transaction.pinContent && (
                                <tr>
                                    <th className="bg-gray-50/80 p-3 border border-gray-200 text-left text-xs font-bold uppercase text-gray-600">TOKEN / PIN</th>
                                    <td className="p-3 border border-gray-200 text-sm font-mono font-black text-primary break-all tracking-wider">{transaction.pinContent}</td>
                                </tr>
                            )}
                            <tr>
                                <th className="bg-gray-50/80 p-3 border border-gray-200 text-left text-xs font-bold uppercase text-gray-600">PRICE</th>
                                <td className="p-3 border border-gray-200 text-sm font-bold text-gray-800">₦{Math.abs(transaction.amount).toLocaleString()}</td>
                            </tr>
                            <tr>
                                <th className="bg-gray-50/80 p-3 border border-gray-200 text-left text-xs font-bold uppercase text-gray-600">STATUS</th>
                                <td className={`p-3 border border-gray-200 text-sm font-black uppercase ${transaction.status === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {transaction.status === 0 ? 'SUCCESSFUL' : 'FAILED'}
                                </td>
                            </tr>
                            <tr>
                                <th className="bg-gray-50/80 p-3 border border-gray-200 text-left text-xs font-bold uppercase text-gray-600">Transaction ID</th>
                                <td className="p-3 border border-gray-200 text-sm font-mono text-gray-600">{transaction.reference}</td>
                            </tr>
                            <tr>
                                <th className="bg-gray-50/80 p-3 border border-gray-200 text-left text-xs font-bold uppercase text-gray-600">ORDER DATE</th>
                                <td className="p-3 border border-gray-200 text-sm font-medium text-gray-800">
                                    {new Date(transaction.date).toLocaleDateString('en-GB', {
                                        weekday: 'short',
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                    ; {new Date(transaction.date).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                    })}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="mt-12 text-center no-print">
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-[0.2em]">Thank you for choosing Ufriends IT</p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3 no-print">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className="flex-1 rounded-2xl"
                    >
                        Close
                    </Button>
                    <Button
                        onClick={handlePrint}
                        className="flex-1 rounded-2xl gap-2 shadow-lg shadow-primary/20"
                    >
                        <Printer size={18} /> Print Receipt
                    </Button>
                </div>
            </motion.div>
        </motion.div>
    );
}
