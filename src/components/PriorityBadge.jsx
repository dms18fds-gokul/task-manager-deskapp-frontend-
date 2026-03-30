import React from "react";
import { FaExclamationCircle } from "react-icons/fa";

const PriorityBadge = ({ priority }) => {
    const getPriorityConfig = (p) => {
        switch (p) {
            case "Very High":
                return {
                    style: "bg-rose-50 text-rose-600 border-rose-100",
                    label: "Very High"
                };
            case "High":
                return {
                    style: "bg-orange-50 text-orange-600 border-orange-100",
                    label: "High"
                };
            case "Medium":
                return {
                    style: "bg-amber-50 text-amber-600 border-amber-100",
                    label: "Medium"
                };
            case "Low":
                return {
                    style: "bg-blue-50 text-blue-600 border-blue-100",
                    label: "Low"
                };
            case "Very Low":
                return {
                    style: "bg-gray-50 text-gray-600 border-gray-100",
                    label: "Very Low"
                };
            default:
                return {
                    style: "bg-gray-50 text-gray-600 border-gray-100",
                    label: p || "Medium"
                };
        }
    };

    const currentConfig = getPriorityConfig(priority);

    return (
        <div className="inline-block relative">
            <div
                className={`flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold shadow-sm border transition-all duration-200 outline-none w-max ${currentConfig.style} cursor-default`}
            >
                {(priority === "High" || priority === "Very High") && <FaExclamationCircle className="text-[10px]" />}
                <span>{currentConfig.label}</span>
            </div>
        </div>
    );
};

export default PriorityBadge;
