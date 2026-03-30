import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { FaChevronDown, FaChevronUp, FaPlus, FaTrash, FaSearch } from 'react-icons/fa';

const CustomDropdown = forwardRef(({ options, value, onChange, placeholder, allowAdd = false, onAdd, multiple = false, onDelete, className, disabled = false, searchable = false, variant = "default" }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newItem, setNewItem] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);
    const triggerInputRef = useRef(null);

    useImperativeHandle(ref, () => ({
        focus: () => {
            if (triggerInputRef.current) {
                triggerInputRef.current.focus();
            }
        },
        open: () => setIsOpen(true),
        close: () => setIsOpen(false)
    }));

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
        <div className={`relative ${className || ''}`} ref={dropdownRef}>
            <div
                className={`w-full flex justify-between items-center transition-all duration-200 
                    ${variant === "bare" ? "bg-transparent border-none px-0 py-0" :
                        (disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400 border-gray-200 px-4 py-3 rounded-xl border' :
                            `bg-gray-50/50 cursor-pointer border px-4 py-3 rounded-xl ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm bg-white' : 'border-gray-300 hover:border-gray-400'}`)}`}
                onMouseDown={(e) => {
                    if (disabled || e.button !== 0) return;
                    if (!isAdding) {
                        setIsOpen(!isOpen);
                        if (!isOpen && searchable && triggerInputRef.current) {
                            setTimeout(() => triggerInputRef.current.focus(), 0);
                        }
                    }
                }}
                onClick={(e) => {
                    if (disabled) return;
                    if (!isAdding) {
                        setIsOpen(true);
                    }
                }}
            >
                {searchable ? (
                    <div className="flex items-center w-full gap-2">
                        <FaSearch className="text-gray-400 text-xs shrink-0" />
                        <input
                            ref={triggerInputRef}
                            type="text"
                            className="w-full bg-transparent outline-none text-gray-800 text-sm placeholder:text-gray-400 placeholder:font-normal font-medium"
                            placeholder={placeholder || "Search..."}
                            value={isOpen ? searchTerm : (typeof displayValue() === 'string' ? displayValue() : "")}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                if (!isOpen) setIsOpen(true);
                                if (e.target.value === "") {
                                    onChange("");
                                }
                            }}
                            onMouseDown={(e) => {
                                if (e.button !== 0) return;
                                e.stopPropagation();
                                setSearchTerm("");
                                setIsOpen(true);
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(true);
                            }}
                            onFocus={() => {
                                if (!isOpen) {
                                    setSearchTerm("");
                                    setIsOpen(true);
                                }
                            }}
                        />
                        {!isOpen && typeof displayValue() !== 'string' && (
                            <div className="absolute inset-0 px-9 py-3 flex items-center pointer-events-none">
                                {options.find(opt => (typeof opt === 'object' ? opt.value === value : opt === value))?.customLabel}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={`flex-1 truncate text-sm ${(!value || (multiple && value.length === 0)) ? 'text-gray-400 font-normal' : 'text-gray-800 font-medium'}`}>
                        {(() => {
                            const selectedOption = options.find(opt => (typeof opt === 'object' ? opt.value === value : opt === value));
                            if (selectedOption && typeof selectedOption === 'object' && selectedOption.customLabel) {
                                return selectedOption.customLabel;
                            }
                            return displayValue() || placeholder;
                        })()}
                    </div>
                )}
                {!searchable && (
                    <div className="ml-2 shrink-0">
                        {isOpen ? <FaChevronUp className="text-gray-400 text-[10px]" /> : <FaChevronDown className="text-gray-400 text-[10px]" />}
                    </div>
                )}
            </div>
            {isOpen && (
                <div className="absolute top-full left-0 z-50 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-[160px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-200">
                    {allowAdd && (
                        <div className="border-b border-gray-100 p-2 sticky top-0 bg-white z-10 w-full">
                            {!isAdding ? (
                                <div
                                    className="text-indigo-600 hover:bg-indigo-50 cursor-pointer flex items-center gap-2 font-medium rounded"
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
                                        className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 placeholder-gray-400 font-normal text-gray-800"
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
                    {(() => {
                        const uniqueMap = new Map();

                        options.forEach((option) => {
                            const label = typeof option === 'object' ? (option.label || option.value) : option;

                            // Apply search filter if active
                            if (searchable && searchTerm && !label?.toString().toLowerCase().includes(searchTerm.toLowerCase())) {
                                return; // Skip if it doesn't match search
                            }

                            // If we haven't seen this label, or the new one can be deleted and the old one cannot, update it.
                            if (!uniqueMap.has(label)) {
                                uniqueMap.set(label, option);
                            } else {
                                const existing = uniqueMap.get(label);
                                const existingCanDelete = typeof existing === 'object' && existing.canDelete;
                                const newCanDelete = typeof option === 'object' && option.canDelete;

                                if (!existingCanDelete && newCanDelete) {
                                    uniqueMap.set(label, option);
                                }
                            }
                        });

                        return Array.from(uniqueMap.values());
                    })().map((option, index) => {
                        const isObj = typeof option === 'object';
                        const label = isObj ? (option.label || option.value) : option;
                        const canDelete = isObj && option.canDelete;

                        return (
                            <div
                                key={index}
                                className={`px-4 py-2.5 text-sm hover:bg-indigo-50/50 cursor-pointer text-gray-700 flex items-center justify-between group ${isSelected(option) ? 'bg-indigo-50 font-bold text-indigo-700' : ''}`}
                                onClick={() => handleOptionClick(option)}
                            >
                                <div className="flex items-center gap-3 flex-1 truncate">
                                    {multiple && (
                                        <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${isSelected(option) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300 group-hover:border-indigo-400'}`}>
                                            {isSelected(option) && <span className="text-white text-[10px]">✓</span>}
                                        </div>
                                    )}
                                    <span className={isSelected(option) ? 'text-indigo-700 font-bold' : 'text-gray-700 font-medium'}>
                                        {isObj && option.customLabel ? option.customLabel : label}
                                    </span>
                                    {(!multiple && isSelected(option)) && <span className="text-indigo-600 ml-auto">✓</span>}
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
                </div>
            )}
        </div>
    );
});

export default CustomDropdown;
