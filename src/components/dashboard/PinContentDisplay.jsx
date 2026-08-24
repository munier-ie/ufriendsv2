import React, { useState } from 'react';
import { Copy, Check, Key, Hash, Layers } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Utility to parse exam pin content (handles WAEC, NECO, Data Pins, etc.)
 */
export function parsePinTokens(rawContent) {
    if (!rawContent || typeof rawContent !== 'string') return [];

    // Split by pipe or newline if multiple items
    const blocks = rawContent.split(/\s*\|\s*|\n+/).filter(Boolean);
    const parsed = [];

    for (const block of blocks) {
        const trimmed = block.trim();
        if (!trimmed) continue;

        // 1. Check for explicit PIN / TOKEN and SERIAL labels
        const pinMatch = trimmed.match(/(?:PIN|TOKEN|Pin|Token)\s*[:=\-]?\s*([A-Za-z0-9]+)/i);
        const serialMatch = trimmed.match(/(?:SERIAL|SERIALNO|SERIAL\s*NO|S\/N|Serial|SerialNo|S\/No)\s*[:=\-]?\s*([A-Za-z0-9]+)/i);

        if (pinMatch && serialMatch) {
            parsed.push({
                pin: pinMatch[1],
                serial: serialMatch[1],
                raw: trimmed
            });
            continue;
        }

        // 2. Check if labeled with just PIN e.g. "PIN: 123456789012"
        if (pinMatch && !serialMatch) {
            parsed.push({
                pin: pinMatch[1],
                serial: null,
                raw: trimmed
            });
            continue;
        }

        // 3. Check for comma, slash, or dash separation: e.g. "458129841203, WRN2024192841" or "458129841203 / WRN2024192841"
        const parts = trimmed.split(/[\/,\-]+/).map(s => s.trim()).filter(Boolean);
        if (parts.length === 2) {
            const [p1, p2] = parts;
            // WAEC serials usually start with letters (WRN, WRC, etc.)
            if (/^[A-Za-z]/.test(p2) || p1.length >= p2.length) {
                parsed.push({ pin: p1, serial: p2, raw: trimmed });
            } else if (/^[A-Za-z]/.test(p1)) {
                parsed.push({ pin: p2, serial: p1, raw: trimmed });
            } else {
                parsed.push({ pin: p1, serial: p2, raw: trimmed });
            }
            continue;
        }

        // 4. Default: single pin / token
        parsed.push({
            pin: trimmed.replace(/^(?:PIN|TOKEN)\s*[:=\-]?\s*/i, ''),
            serial: null,
            raw: trimmed
        });
    }

    return parsed;
}

export default function PinContentDisplay({ pinContent, title = "Purchased PIN Details" }) {
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [copiedField, setCopiedField] = useState(null);

    if (!pinContent) return null;

    const tokens = parsePinTokens(pinContent);

    const handleCopy = (text, label, index, field) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setCopiedField(field);
        toast.success(`${label} copied to clipboard`);
        setTimeout(() => {
            setCopiedIndex(null);
            setCopiedField(null);
        }, 2000);
    };

    const handleCopyAll = () => {
        navigator.clipboard.writeText(pinContent);
        toast.success('All PIN details copied to clipboard');
    };

    return (
        <div className="mt-4 bg-gray-900 rounded-xl p-4 text-white space-y-3">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-wider">
                    <Key size={14} className="text-primary-light" />
                    <span>{title}</span>
                </div>
                {tokens.length > 0 && (
                    <button
                        onClick={handleCopyAll}
                        className="text-xs text-primary-light hover:text-white flex items-center gap-1 font-medium transition-colors"
                    >
                        <Copy size={12} />
                        <span>Copy All</span>
                    </button>
                )}
            </div>

            <div className="space-y-3">
                {tokens.map((token, idx) => {
                    const isWaecOrDual = Boolean(token.serial);

                    return (
                        <div 
                            key={idx} 
                            className={`bg-gray-800/80 border border-gray-700/60 rounded-lg p-3 ${tokens.length > 1 ? 'relative' : ''}`}
                        >
                            {tokens.length > 1 && (
                                <div className="text-[11px] font-semibold text-gray-400 mb-2 flex items-center gap-1">
                                    <Layers size={12} /> Token #{idx + 1}
                                </div>
                            )}

                            {isWaecOrDual ? (
                                <div className="space-y-2">
                                    {/* PIN ROW */}
                                    <div className="flex items-center justify-between bg-gray-900/90 rounded-md p-2.5 border border-gray-800">
                                        <div>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">PIN (Use for login)</span>
                                            <span className="font-mono text-base sm:text-lg font-black tracking-widest text-white select-all">
                                                {token.pin}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(token.pin, 'PIN', idx, 'pin')}
                                            className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-md transition-colors flex items-center gap-1 text-xs"
                                            title="Copy PIN"
                                        >
                                            {copiedIndex === idx && copiedField === 'pin' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                            <span className="hidden sm:inline">Copy PIN</span>
                                        </button>
                                    </div>

                                    {/* SERIAL ROW */}
                                    <div className="flex items-center justify-between bg-gray-900/90 rounded-md p-2.5 border border-gray-800">
                                        <div>
                                            <span className="text-[10px] text-yellow-400/90 font-bold uppercase tracking-wider block flex items-center gap-1">
                                                <Hash size={10} /> Serial Number
                                            </span>
                                            <span className="font-mono text-sm sm:text-base font-bold tracking-wider text-yellow-100 select-all">
                                                {token.serial}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(token.serial, 'Serial Number', idx, 'serial')}
                                            className="p-1.5 bg-gray-800 hover:bg-gray-700 text-yellow-400 hover:text-yellow-300 rounded-md transition-colors flex items-center gap-1 text-xs"
                                            title="Copy Serial Number"
                                        >
                                            {copiedIndex === idx && copiedField === 'serial' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                            <span className="hidden sm:inline">Copy Serial</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* SINGLE TOKEN (e.g. NECO, Data Pin) */
                                <div className="flex items-center justify-between bg-gray-900/90 rounded-md p-2.5 border border-gray-800">
                                    <div>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Token / PIN</span>
                                        <span className="font-mono text-base sm:text-lg font-black tracking-widest text-white select-all">
                                            {token.pin}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(token.pin, 'Token/PIN', idx, 'single')}
                                        className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-md transition-colors flex items-center gap-1 text-xs"
                                        title="Copy PIN"
                                    >
                                        {copiedIndex === idx && copiedField === 'single' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                        <span className="hidden sm:inline">Copy</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
