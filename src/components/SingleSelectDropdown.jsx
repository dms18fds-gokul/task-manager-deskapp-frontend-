import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown, FaCheck } from 'react-icons/fa';

const SingleSelectDropdown = ({ label, options, value, onChange, placeholder = "Select...", Icon }) => {
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
        onChange(optionValue);
        setIsOpen(false);
    };

    // Derived display text
    const selectedOption = options.find(opt => opt.value === value);
    const displayText = selectedOption ? selectedOption.label : placeholder;

    return (
        <div className="relative" ref={dropdownRef}>
            {label && <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-white text-left"
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {Icon && <Icon className="text-gray-400" size={16} />}
                    <span className={`truncate block ${value ? 'text-gray-700' : 'text-gray-500'}`}>
                        {displayText}
                    </span>
                </div>
                <FaChevronDown className={`text-gray-400 text-xs transition-transform duration-200 flex-shrink-0 ml-2 ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg max-h-60 overflow-y-auto overflow-x-hidden scrollbar-hide">
                    {options.map((option) => {
                        const isSelected = value === option.value;
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

export default SingleSelectDropdown;
