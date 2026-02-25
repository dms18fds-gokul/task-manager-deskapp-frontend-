import React from "react";

const StatCard = ({ title, count, color, icon }) => {
    return (
        <div className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${color} transition`}>
            <div className="flex items-center justify-between">
                <div className="overflow-hidden">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider truncate" title={title}>{title}</p>
                    <h3 className="text-xl font-bold text-gray-800 mt-1">{count}</h3>
                </div>
                <div className={`p-2 rounded-full bg-opacity-20 ${color.replace('border-', 'bg-')} flex-shrink-0 ml-2`}>
                    {React.cloneElement(icon, { className: "w-8 h-8 text-current" })}
                </div>
            </div>
        </div>
    );
};

export default StatCard;
