import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
    Download, 
    Printer, 
    Copy, 
    Check, 
    X, 
    Share2, 
    FileText,
    Zap,
    ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import LottieAnimation from './LottieAnimation';
import successAnimation from '../../assets/illustrations/success.json';
import failedAnimation from '../../assets/illustrations/failed.json';
import Logo from '../ui/Logo';
import { parsePinTokens } from '../dashboard/PinContentDisplay';

export default function TransactionModal({
    isOpen,
    transaction,
    slipUrl,
    pdfUrl,
    title = 'Transaction Successful',
    message,
    token,
    pin,
    onClose,
    onPrintReceipt
}) {
    const [copiedField, setCopiedField] = useState(null);
    const receiptPrintRef = useRef(null);

    // Normalize transaction object
    const tx = transaction || {};
    const effectiveSlipUrl = slipUrl || pdfUrl || tx.slipUrl || tx.pdfUrl;
    const effectiveToken = token || tx.token || tx.electricityToken;
    const effectivePin = pin || tx.pin || tx.pinContent;
    const isSuccess = tx.status === 0 || tx.status === 'success' || tx.status === 'completed' || (!tx.status && tx.status !== 2 && tx.status !== 3 && tx.status !== 'failed');

    // Trigger confetti on successful transaction popup
    useEffect(() => {
        if (isOpen && isSuccess) {
            try {
                confetti({
                    particleCount: 60,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#004687', '#1E90FF', '#10B981', '#ffffff']
                });
            } catch (e) {
                // Ignore if canvas-confetti fails or in non-browser context
            }
        }
    }, [isOpen, isSuccess]);

    // Keyboard escape handler
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const copyText = (text, fieldName) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleDownloadSlip = () => {
        if (!effectiveSlipUrl) return;
        const authToken = localStorage.getItem('token');
        const finalUrl = authToken
            ? (effectiveSlipUrl.includes('?') ? `${effectiveSlipUrl}&token=${authToken}` : `${effectiveSlipUrl}?token=${authToken}`)
            : effectiveSlipUrl;
        window.open(finalUrl, '_blank');
    };

    const handlePrint = () => {
        if (onPrintReceipt) {
            onPrintReceipt(tx);
            return;
        }

        const printContent = receiptPrintRef.current ? receiptPrintRef.current.innerHTML : '';
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(el => el.outerHTML)
            .join('\n');

        const printWindow = window.open('', '_blank', 'width=800,height=900');
        if (!printWindow) {
            alert('Popup blocked. Please allow popups to print your receipt.');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Transaction Receipt - ${tx.reference || 'Ufriends IT'}</title>
                    ${styles}
                    <style>
                        body { background: white; padding: 20px; font-family: 'Poppins', sans-serif; }
                        @media print {
                            body { padding: 0; }
                            .no-print { display: none !important; }
                        }
                    </style>
                </head>
                <body>
                    ${printContent}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
            printWindow.onafterprint = () => printWindow.close();
        };
    };

    const formattedAmount = tx.amount != null
        ? Math.abs(Number(tx.amount)).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : null;

    const referenceId = tx.reference || tx.transactionRef || tx.transId || tx.id;
    const recipient = tx.recipient || tx.phone || tx.meterNumber || tx.smartcard || tx.cardNumber;
    const parsedPinList = (effectiveToken || effectivePin) ? parsePinTokens(effectiveToken || effectivePin) : [];
    const hasParsedPins = Array.isArray(parsedPinList) && parsedPinList.length > 0;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 12 }}
                transition={{ type: 'spring', damping: 26, stiffness: 360 }}
                className="relative bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden my-auto text-left"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors focus:outline-none z-10"
                    aria-label="Close"
                >
                    <X size={20} />
                </button>

                <div className="p-6 sm:p-8">
                    {/* Header with Lottie Animation */}
                    <div className="text-center">
                        <div className="w-32 h-32 sm:w-36 sm:h-36 mx-auto -my-2 flex items-center justify-center">
                            <LottieAnimation
                                animationData={isSuccess ? successAnimation : failedAnimation}
                                size={144}
                                loop={true}
                            />
                        </div>

                        {/* Status Badge */}
                        <div className="mt-2">
                            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                isSuccess 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' 
                                    : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isSuccess ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                {isSuccess ? 'Transaction Successful' : 'Transaction Failed'}
                            </span>
                        </div>

                        {/* Amount */}
                        {formattedAmount && (
                            <h2 className="text-3xl font-extrabold text-gray-900 mt-2 tracking-tight">
                                ₦{formattedAmount}
                            </h2>
                        )}

                        {/* Title / Description */}
                        <p className="text-sm text-gray-600 mt-1 font-medium max-w-sm mx-auto">
                            {message || title}
                        </p>
                    </div>

                    {/* Dedicated Token / PIN Card (e.g. Electricity Token or Exam PIN) */}
                    {(hasParsedPins || effectiveToken || effectivePin) && (
                        <div className="mt-5 p-4 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/40 rounded-2xl border-2 border-blue-100 text-center shadow-sm">
                            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#004687] uppercase tracking-wider mb-1.5">
                                <Zap size={14} className="text-yellow-500 fill-yellow-500" />
                                {effectiveToken ? 'Prepaid Electricity Token' : 'PIN & Serial Number'}
                            </div>

                            {hasParsedPins ? (
                                <div className="space-y-2">
                                    {parsedPinList.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-blue-200/80">
                                            <div className="text-left font-mono">
                                                {item.pin && <div className="text-sm sm:text-base font-bold text-gray-900 tracking-wider">PIN: {item.pin}</div>}
                                                {item.serial && <div className="text-xs text-gray-500">S/N: {item.serial}</div>}
                                                {!item.pin && !item.serial && <div className="text-sm font-bold text-gray-900">{item.raw || item}</div>}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => copyText(item.pin || item.raw, `pin-${i}`)}
                                                className="px-3 py-1.5 text-xs font-semibold text-[#004687] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 shrink-0"
                                            >
                                                {copiedField === `pin-${i}` ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                                <span>{copiedField === `pin-${i}` ? 'Copied' : 'Copy'}</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-blue-200/80">
                                    <span className="font-mono text-base sm:text-lg font-bold text-gray-900 select-all break-all text-left">
                                        {effectiveToken || effectivePin}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => copyText(effectiveToken || effectivePin, 'raw-token')}
                                        className="px-3 py-1.5 text-xs font-semibold text-[#004687] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 shrink-0"
                                    >
                                        {copiedField === 'raw-token' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                        <span>{copiedField === 'raw-token' ? 'Copied' : 'Copy'}</span>
                                    </button>
                                </div>
                            )}

                            <p className="text-[11px] text-gray-500 mt-2">
                                This token/PIN has been saved to your transaction history.
                            </p>
                        </div>
                    )}

                    {/* Transaction Details Card */}
                    <div className="mt-5 bg-gray-50/80 rounded-2xl p-4 border border-gray-100 space-y-2.5 text-sm">
                        {tx.serviceName && (
                            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                                <span className="text-gray-500 font-medium">Service</span>
                                <span className="font-bold text-gray-900">{tx.serviceName}</span>
                            </div>
                        )}

                        {tx.planName && (
                            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                                <span className="text-gray-500 font-medium">Plan</span>
                                <span className="font-semibold text-gray-900">{tx.planName}</span>
                            </div>
                        )}

                        {recipient && (
                            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                                <span className="text-gray-500 font-medium">Recipient / Number</span>
                                <span className="font-mono font-semibold text-gray-900">{recipient}</span>
                            </div>
                        )}

                        {referenceId && (
                            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                                <span className="text-gray-500 font-medium">Reference</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-medium text-gray-700 text-xs truncate max-w-[170px] sm:max-w-[220px]">
                                        {referenceId}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => copyText(referenceId, 'ref')}
                                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                                        title="Copy Reference"
                                    >
                                        {copiedField === 'ref' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {tx.date && (
                            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                                <span className="text-gray-500 font-medium">Date & Time</span>
                                <span className="font-medium text-gray-700 text-xs">
                                    {new Date(tx.date).toLocaleString()}
                                </span>
                            </div>
                        )}

                        {tx.balanceBefore != null && tx.balanceAfter != null && (
                            <div className="flex justify-between items-center py-1 text-xs text-gray-500">
                                <span>Wallet Balance</span>
                                <span>₦{Number(tx.balanceBefore).toLocaleString()} → <strong className="text-gray-800">₦{Number(tx.balanceAfter).toLocaleString()}</strong></span>
                            </div>
                        )}
                    </div>

                    {/* Official Slip Download Button (NIN / BVN) */}
                    {effectiveSlipUrl && (
                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={handleDownloadSlip}
                                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                <Download size={16} />
                                <span>Download Official Slip (PDF)</span>
                                <ExternalLink size={14} className="opacity-70" />
                            </button>
                        </div>
                    )}

                    {/* Action Buttons: Print Receipt & Done */}
                    <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="w-full py-3 px-4 border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            <Printer size={16} />
                            <span>Print Receipt</span>
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-3 px-5 bg-gradient-to-r from-[#004687] to-[#1E90FF] text-white font-bold rounded-2xl shadow-lg shadow-[#004687]/20 hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm flex items-center justify-center"
                        >
                            Done
                        </button>
                    </div>
                </div>

                {/* Hidden Clean Printable Receipt */}
                <div style={{ display: 'none' }}>
                    <div ref={receiptPrintRef} className="p-8 max-w-md mx-auto text-gray-800">
                        <div className="text-center pb-6 border-b border-gray-200">
                            <h1 className="text-2xl font-black text-[#004687]">UFRIENDS IT</h1>
                            <p className="text-xs text-gray-500 mt-1">Official Transaction Receipt</p>
                            <p className="text-xs text-gray-400">www.ufriends.com.ng</p>
                        </div>

                        <div className="py-6 text-center">
                            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Amount Paid</p>
                            <h2 className="text-3xl font-extrabold text-gray-900 mt-1">₦{formattedAmount || '0.00'}</h2>
                            <p className="text-sm font-semibold text-emerald-600 mt-1">Status: SUCCESSFUL</p>
                        </div>

                        <div className="space-y-3 py-4 border-t border-b border-gray-200 text-xs">
                            <div className="flex justify-between py-1">
                                <span className="text-gray-500">Service:</span>
                                <span className="font-bold text-gray-900">{tx.serviceName || 'VTU / Identity Service'}</span>
                            </div>
                            {tx.planName && (
                                <div className="flex justify-between py-1">
                                    <span className="text-gray-500">Plan:</span>
                                    <span className="font-bold text-gray-900">{tx.planName}</span>
                                </div>
                            )}
                            {recipient && (
                                <div className="flex justify-between py-1">
                                    <span className="text-gray-500">Beneficiary:</span>
                                    <span className="font-mono font-bold text-gray-900">{recipient}</span>
                                </div>
                            )}
                            {referenceId && (
                                <div className="flex justify-between py-1">
                                    <span className="text-gray-500">Reference:</span>
                                    <span className="font-mono text-gray-700">{referenceId}</span>
                                </div>
                            )}
                            <div className="flex justify-between py-1">
                                <span className="text-gray-500">Date:</span>
                                <span className="text-gray-700">{new Date(tx.date || Date.now()).toLocaleString()}</span>
                            </div>
                            {(effectiveToken || effectivePin) && (
                                <div className="pt-2 border-t border-gray-200">
                                    <span className="text-gray-500 block mb-1 font-bold">TOKEN / PIN:</span>
                                    <span className="font-mono text-sm font-black text-gray-900 block p-2 bg-gray-100 rounded">
                                        {effectiveToken || effectivePin}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="pt-6 text-center text-[10px] text-gray-400">
                            <p>Thank you for choosing Ufriends IT!</p>
                            <p>Need support? Contact support@ufriends.com.ng</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
