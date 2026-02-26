import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown, FaCheck } from 'react-icons/fa';

const MultiSelectDropdown = ({ label, options, value = [], onChange, placeholder = "Select..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue) => {
        let newValue;
        if (value.includes(optionValue)) {
            newValue = value.filter(v => v !== optionValue);
        } else {
            newValue = [...value, optionValue];
        }
        onChange(newValue);
    };

    // Derived display text
    const selectedLabels = options
        .filter(opt => value.includes(opt.value))
        .map(opt => opt.label);

    return (
        <div className="relative" ref={dropdownRef}>
            {label && <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-white text-left"
            >
                <div className="flex items-center gap-2 overflow-hidden flex-wrap">
                    {selectedLabels.length > 0 ? (
                        selectedLabels.map((label, index) => {
                            // Unique light pastel colors
                            const colors = [
                                "bg-blue-100 text-blue-700 border-blue-200",
                                "bg-green-100 text-green-700 border-green-200",
                                "bg-purple-100 text-purple-700 border-purple-200",
                                "bg-yellow-100 text-yellow-700 border-yellow-200",
                                "bg-pink-100 text-pink-700 border-pink-200",
                                "bg-indigo-100 text-indigo-700 border-indigo-200",
                                "bg-red-100 text-red-700 border-red-200",
                                "bg-teal-100 text-teal-700 border-teal-200",
                            ];
                            const colorClass = colors[index % colors.length];

                            return (
                                <span key={index} className={`px-2 py-0.5 rounded text-xs border ${colorClass} font-medium`}>
                                    {label}
                                </span>
                            );
                        })
                    ) : (
                        <span className="text-gray-500">{placeholder}</span>
                    )}
                </div>
                <FaChevronDown className={`text-gray-400 text-xs transition-transform duration-200 flex-shrink-0 ml-2 ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg max-h-60 overflow-y-auto overflow-x-hidden scrollbar-hide">
                    {options.map((option) => {
                        const isSelected = value.includes(option.value);
                        return (
                            <div
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between ${isSelected ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-700'
                                    }`}
                            >
                                <span className="truncate">{option.label}</span>
                                {isSelected && <FaCheck className="text-indigo-600 text-xs" />}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MultiSelectDropdown;
