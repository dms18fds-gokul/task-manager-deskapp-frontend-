import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { FaChevronDown } from "react-icons/fa";

const StatusBadge = ({ status, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef(null);
    const menuRef = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (buttonRef.current && !buttonRef.current.contains(event.target) &&
                menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const handleScroll = () => {
            if (isOpen) setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            window.addEventListener("scroll", handleScroll, true);
            window.addEventListener("resize", handleScroll);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", handleScroll, true);
            window.removeEventListener("resize", handleScroll);
        };
    }, [isOpen]);

    const toggleDropdown = (e) => {
        e.stopPropagation();
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 8,
                left: rect.left
            });
        }
        setIsOpen(!isOpen);
    };

    const getStatusConfig = (s) => {
        switch (s) {
            case "In Progress":
                return {
                    style: "bg-blue-50 text-blue-700 hover:bg-blue-100 ring-1 ring-blue-700/10",
                    label: "In Progress"
                };
            case "Hold":
                return {
                    style: "bg-amber-50 text-amber-700 hover:bg-amber-100 ring-1 ring-amber-700/10",
                    label: "Hold"
                };
            case "Completed":
                return {
                    style: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-1 ring-emerald-700/10",
                    label: "Completed"
                };
            default:
                return {
                    style: "bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-gray-600/10",
                    label: s
                };
        }
    };

    const currentConfig = getStatusConfig(status);

    const handleSelect = (newStatus) => {
        onChange(newStatus);
        setIsOpen(false);
    };

    return (
        <div className="inline-block relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={toggleDropdown}
                className={`group flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 outline-none w-30 ${currentConfig.style}`}
            >
                <span className="truncate">{currentConfig.label}</span>
                <FaChevronDown className={`text-[10px] opacity-50 transition-transform duration-200 group-hover:opacity-100 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && createPortal(
                <div
                    ref={menuRef}
                    style={{
                        position: 'fixed',
                        top: position.top,
                        left: position.left,
                        zIndex: 9999
                    }}
                    className="w-32 bg-white rounded-lg shadow-xl border border-gray-100 py-1 animate-fade-in-down"
                >
                    {["In Progress", "Hold", "Completed"].map((opt) => {
                        if (opt === status) return null;
                        const config = getStatusConfig(opt);
                        return (
                            <button
                                key={opt}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelect(opt);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2`}
                            >
                                <span className={`w-2 h-2 rounded-full ${opt === "In Progress" ? "bg-blue-500" : opt === "Hold" ? "bg-amber-500" : "bg-emerald-500"}`}></span>
                                {opt}
                            </button>
                        );
                    })}
                </div>,
                document.body
            )}
        </div>
    );
};

export default StatusBadge;
