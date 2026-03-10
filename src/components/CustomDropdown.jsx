import React, { useState, useEffect, useRef } from 'react';
import { FaChevronDown, FaChevronUp, FaPlus, FaTrash, FaSearch } from 'react-icons/fa';

const CustomDropdown = ({ options, value, onChange, placeholder, allowAdd = false, onAdd, multiple = false, onDelete, className, disabled = false, searchable = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newItem, setNewItem] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);
    const triggerInputRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setIsAdding(false);
                setNewItem("");
                setSearchTerm("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus input when adding
    useEffect(() => {
        if (isAdding && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isAdding]);

    const handleAddSubmit = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (newItem.trim()) {
            onAdd(newItem.trim());
            setNewItem("");
            setIsAdding(false);
            if (!multiple) setIsOpen(false);
        }
    };

    const handleOptionClick = (option) => {
        // Handle both string and object options
        const optionValue = typeof option === 'object' ? option.value : option;

        if (multiple) {
            const currentValues = Array.isArray(value) ? value : [];
            const newValues = currentValues.includes(optionValue)
                ? currentValues.filter(v => v !== optionValue)
                : [...currentValues, optionValue];
            onChange(newValues);
            setSearchTerm("");
        } else {
            onChange(optionValue);
            setIsOpen(false);
            setSearchTerm("");
        }
    };

    const isSelected = (option) => {
        const optionValue = typeof option === 'object' ? option.value : option;
        if (multiple) {
            return Array.isArray(value) && value.includes(optionValue);
        }
        return value === optionValue;
    };

    const displayValue = () => {
        if (multiple) {
            if (!value || value.length === 0) return "";
            return value.map(v => {
                const opt = options.find(o => (typeof o === 'object' ? o.value === v : o === v));
                return opt ? (typeof opt === 'object' ? (opt.label || opt.value) : opt) : v;
            }).join(", ");
        }
        if (!value) return "";
        const selectedOption = options.find(opt => (typeof opt === 'object' ? opt.value === value : opt === value));
        return selectedOption ? (typeof selectedOption === 'object' ? (selectedOption.label || selectedOption.value) : selectedOption) : value;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <div
                className={`w-full px-3 py-2 rounded flex justify-between items-center ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500 border border-gray-200' : `bg-gray-50 cursor-pointer border ${className || 'border-gray-200'}`}`}
                onClick={() => {
                    if (disabled) return;
                    if (!isAdding) {
                        setIsOpen(!isOpen);
                        if (!isOpen && searchable && triggerInputRef.current) {
                            setTimeout(() => triggerInputRef.current.focus(), 0);
                        }
                    }
                }}
            >
                {searchable ? (
                    <div className="flex items-center w-full">
                        <FaSearch className="text-gray-400 text-xs shrink-0 mr-2" />
                        <input
                            ref={triggerInputRef}
                            type="text"
                            className="w-full bg-transparent outline-none text-gray-800 text-sm placeholder:text-gray-400"
                            placeholder={placeholder || "Search..."}
                            value={isOpen ? searchTerm : displayValue()}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                if (!isOpen) setIsOpen(true);
                                if (e.target.value === "") {
                                    onChange("");
                                }
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(true);
                            }}
                            onFocus={() => {
                                if (!isOpen) {
                                    setSearchTerm(displayValue());
                                    setIsOpen(true);
                                }
                            }}
                        />
                    </div>
                ) : (
                    <span className={`block truncate ${(!value || (multiple && value.length === 0)) ? 'text-gray-400' : 'text-gray-800'}`}>
                        {displayValue() || placeholder}
                    </span>
                )}
                {!searchable && (
                    isOpen ? <FaChevronUp className="text-gray-500 text-xs shrink-0 ml-2" /> : <FaChevronDown className="text-gray-500 text-xs shrink-0 ml-2" />
                )}
            </div>
            {isOpen && (
                <div className="absolute top-full left-0 z-50 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-[200px] overflow-y-auto custom-scrollbar">
                    {options.filter((option) => {
                        if (!searchable || !searchTerm) return true;
                        const label = typeof option === 'object' ? (option.label || option.value) : option;
                        return label?.toString().toLowerCase().includes(searchTerm.toLowerCase());
                    }).map((option, index) => {
                        const isObj = typeof option === 'object';
                        const label = isObj ? (option.label || option.value) : option;
                        const canDelete = isObj && option.canDelete;

                        return (
                            <div
                                key={index}
                                className={`px-3 py-2 text-[13px] hover:bg-indigo-50 cursor-pointer text-gray-700 flex items-center justify-between group ${isSelected(option) ? 'bg-indigo-50 font-semibold text-indigo-700' : ''}`}
                                onClick={() => handleOptionClick(option)}
                            >
                                <div className="flex items-center gap-2 flex-1 truncate">
                                    <span>{label}</span>
                                    {isSelected(option) && <span className="text-indigo-600">✓</span>}
                                </div>
                                {canDelete && onDelete && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(option);
                                        }}
                                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                                        title="Remove Option"
                                    >
                                        <FaTrash size={12} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                    {allowAdd && (
                        <div className="border-t border-gray-100 p-2">
                            {!isAdding ? (
                                <div
                                    className="px-2 py-2 text-indigo-600 hover:bg-indigo-50 cursor-pointer flex items-center gap-2 font-medium rounded"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsAdding(true);
                                    }}
                                >
                                    <FaPlus className="text-xs" /> Add New
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={newItem}
                                        onChange={(e) => setNewItem(e.target.value)}
                                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded outline-none focus:border-indigo-500"
                                        placeholder="Enter new..."
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddSubmit(e);
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddSubmit}
                                        className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 text-center"
                                    >
                                        Add
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomDropdown;
