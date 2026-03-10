    import React from 'react';
import { FaProjectDiagram } from "react-icons/fa";

const TableLoader = () => (
    <div className="flex flex-col items-center justify-center p-20 w-full animate-pulse-subtle">
        <div className="relative w-20 h-20">
            {/* Outer Gradient Ring */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 border-r-purple-500 border-b-pink-500 animate-spin-gradient"></div>
            {/* Inner Ring */}
            <div className="absolute inset-2 rounded-full border-4 border-gray-100 border-t-emerald-400 animate-spin-gradient" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
            {/* Center Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
                <FaProjectDiagram className="text-indigo-600 text-xl animate-bounce" />
            </div>
        </div>
    </div>
);

export default TableLoader;
