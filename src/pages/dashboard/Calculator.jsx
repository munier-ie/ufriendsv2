import React, { useState } from 'react';
import CalculatorIcon from 'lucide-react/dist/esm/icons/calculator';
import Delete from 'lucide-react/dist/esm/icons/delete';

export default function Calculator() {
    const [display, setDisplay] = useState('0');
    const [history, setHistory] = useState([]);

    const handleNumber = (num) => {
        setDisplay(prev => prev === '0' ? String(num) : prev + num);
    };

    const handleOperator = (op) => {
        setDisplay(prev => prev + op);
    };

    const handleClear = () => {
        setDisplay('0');
    };

    const handleCalculate = () => {
        try {
            // eslint-disable-next-line no-eval
            const result = eval(display.replace('x', '*').replace('÷', '/'));
            setHistory(prev => [`${display} = ${result}`, ...prev].slice(0, 5));
            setDisplay(String(result));
        } catch (error) {
            setDisplay('Error');
            setTimeout(() => setDisplay('0'), 1000);
        }
    };

    const buttons = [
        'C', '(', ')', '÷',
        '7', '8', '9', 'x',
        '4', '5', '6', '-',
        '1', '2', '3', '+',
        '0', '.', '=',
    ];

    return (
        <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <CalculatorIcon className="mr-2 text-primary" /> Profit Calculator
            </h1>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                {/* Display */}
                <div className="bg-gray-900 p-6 text-right">
                    <div className="text-gray-400 text-sm h-6 mb-1">
                        {history.length > 0 ? history[0] : ''}
                    </div>
                    <div className="text-white text-4xl font-mono tracking-wider overflow-x-auto no-scrollbar">
                        {display}
                    </div>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-4 gap-1 p-4 bg-gray-50">
                    {buttons.map((btn) => (
                        <button
                            key={btn}
                            onClick={() => {
                                if (btn === 'C') handleClear();
                                else if (btn === '=') handleCalculate();
                                else if (['+', '-', 'x', '÷'].includes(btn)) handleOperator(btn);
                                else handleNumber(btn);
                            }}
                            className={`
                                h-16 rounded-xl text-xl font-bold transition-all active:scale-95
                                ${btn === '='
                                    ? 'col-span-2 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/30'
                                    : btn === 'C'
                                        ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                        : ['+', '-', 'x', '÷'].includes(btn)
                                            ? 'bg-primary/10 text-primary hover:bg-primary/20'
                                            : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm border border-gray-200'
                                }
                            `}
                        >
                            {btn}
                        </button>
                    ))}
                </div>
            </div>

            {/* Recent History */}
            {history.length > 0 && (
                <div className="mt-6 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">History</h3>
                        <button onClick={() => setHistory([])} className="text-red-500 hover:bg-red-50 p-1 rounded">
                            <Delete size={14} />
                        </button>
                    </div>
                    <div className="space-y-2">
                        {history.map((item, index) => (
                            <div key={index} className="text-sm text-gray-600 font-mono border-b border-gray-50 pb-1 last:border-0">
                                {item}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
