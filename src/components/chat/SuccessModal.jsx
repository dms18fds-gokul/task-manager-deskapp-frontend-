
import React, { useEffect, useState } from 'react';
import { Check, ArrowRight, X } from 'lucide-react';

export default function SuccessModal({ isOpen, onClose, message = "Operation Completed Successfully" }) {
    const [timeLeft, setTimeLeft] = useState(20);

    useEffect(() => {
        if (!isOpen) return;
        setTimeLeft(20);
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onClose();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1E1F22] rounded-xl shadow-2xl w-full max-w-sm border border-green-500/20 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">

                {/* Success Header */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-700 p-6 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

                    <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg ring-4 ring-white/10 animate-in zoom-in duration-300">
                        <Check className="h-8 w-8 text-white stroke-[3px]" />
                    </div>
                    <h3 className="text-xl font-bold text-white relative z-10">Success!</h3>
                </div>

                <div className="p-6">
                    <p className="text-gray-300 text-center mb-6 text-base font-medium">
                        {message}
                    </p>

                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-lg bg-[#2B2D31] hover:bg-[#35373C] text-white font-semibold transition-all border border-white/5 hover:border-white/10 flex items-center justify-center gap-2 group"
                    >
                        <span>Continue</span>
                        <ArrowRight size={18} className="text-gray-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </button>

                    <dov className="mt-4 flex items-center justify-center gap-2">
                        <div className="h-1 w-full bg-[#2B2D31] rounded-full overflow-hidden max-w-[120px]">
                            <div
                                className="h-full bg-green-500/50 transition-all duration-1000 ease-linear rounded-full"
                                style={{ width: `${(timeLeft / 20) * 100}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono tabular-nums">{timeLeft}s</span>
                    </dov>
                </div>
            </div>
        </div>
    );
}
