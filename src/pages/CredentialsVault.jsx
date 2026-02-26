import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import EmployeeSidebar from "../components/EmployeeSidebar";
import io from "socket.io-client";
import { FaKey, FaPlus, FaTrash, FaChevronDown, FaEnvelope, FaPhone, FaLock, FaHashtag, FaLink, FaShieldAlt, FaEye, FaEyeSlash, FaFolder, FaEdit, FaSync, FaSearch } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { API_URL, getSocketUrl } from "../utils/config";

// --- Constants & Validation Logic ---
const CREDENTIAL_TYPES = [
    { label: "Project Name", icon: <FaFolder />, rule: "Only alphabets allowed (No numbers/special chars)", placeholder: "Project Alpha" },
    { label: "Email", icon: <FaEnvelope />, rule: "Must end with @gmail.com", placeholder: "example@gmail.com" },
    { label: "Phone No", icon: <FaPhone />, rule: "Only numbers, exactly 10 digits", placeholder: "98765 43210" },
    { label: "Password", icon: <FaLock />, rule: "Save in database as encrypted", placeholder: "********" },
    { label: "New Password", icon: <FaLock />, rule: "Save in database as encrypted", placeholder: "********" },
    { label: "Social Media", icon: <FaHashtag />, rule: "Only alphabets allowed", placeholder: "Facebook" },
    { label: "URL", icon: <FaLink />, rule: "Must be in valid URL format", placeholder: "https://example.com" },
    { label: "Recovery Email", icon: <FaShieldAlt />, rule: "Must end with @gmail.com", placeholder: "recovery@gmail.com" },
    { label: "Recovery Phone", icon: <FaShieldAlt />, rule: "Only numbers, exactly 10 digits", placeholder: "98765 43210" },
];

const getValidationStatus = (title, value) => {
    if (!title || !value) return { isValid: true, message: "" }; // Don't show error if empty, just show rule

    const lowerTitle = title.toLowerCase();

    if (lowerTitle === "email" || lowerTitle === "recovery email") {
        if (!value.endsWith("@gmail.com")) {
            return { isValid: false, message: "Email must end with @gmail.com" };
        }
    } else if (lowerTitle === "phone no" || lowerTitle === "phone" || lowerTitle === "recovery phone") {
        if (!/^\d{5} \d{5}$/.test(value)) {
            return { isValid: false, message: "Must be exactly 10 digits (99999 99999)" };
        }
    } else if (lowerTitle === "social media" || lowerTitle === "project name") {
        if (!/^[a-zA-Z\s]+$/.test(value)) {
            return { isValid: false, message: "Only alphabets allowed" };
        }
    } else if (lowerTitle === "url" || lowerTitle === "website") {
        try {
            new URL(value);
        } catch (_) {
            return { isValid: false, message: "Invalid URL format (include http:// or https://)" };
        }
    } else if (lowerTitle === "new password") {
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordRegex.test(value)) {
            return { isValid: false, message: "Must be at least 8 chars, containing 1 letter and 1 number" };
        }
    }
    // Password has no content validation, just encryption note
    return { isValid: true, message: "" };
};

const getRuleForTitle = (title) => {
    const matchedType = CREDENTIAL_TYPES.find(t => t.label.toLowerCase() === title.toLowerCase());
    return matchedType ? matchedType.rule : "";
};

const getPlaceholderForTitle = (title) => {
    const matchedType = CREDENTIAL_TYPES.find(t => t.label.toLowerCase() === title.toLowerCase());
    return matchedType ? matchedType.placeholder : "Enter value";
};

// --- Sub-Component for each Row ---
const CredentialRow = ({ pair, onChange, onRemove, showRemove }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelectType = (type) => {
        onChange(pair.id, 'key', type.label);
        setIsDropdownOpen(false);
    };

    const validation = getValidationStatus(pair.key, pair.value);
    const rule = getRuleForTitle(pair.key);
    const placeholder = getPlaceholderForTitle(pair.key);
    const isPassword = pair.key.toLowerCase() === "password" || pair.key.toLowerCase() === "new password";

    const handleValueChange = (e) => {
        let inputValue = e.target.value;
        const lowerTitle = pair.key ? pair.key.toLowerCase().trim() : "";

        // Phone Validation Logic: numbers only, format as 99999 99999
        if (["phone no", "phone", "recovery phone"].includes(lowerTitle)) {
            // Remove non-numeric characters
            let numbers = inputValue.replace(/[^0-9]/g, "");

            // Limit to 10 digits
            if (numbers.length > 10) {
                numbers = numbers.slice(0, 10);
            }

            // specific formatting "99999 99999"
            if (numbers.length > 5) {
                inputValue = `${numbers.slice(0, 5)} ${numbers.slice(5)}`;
            } else {
                inputValue = numbers;
            }
        } else if (lowerTitle === "social media" || lowerTitle === "project name") {
            // Alphabets only (allowing spaces for project names if desired, but restriction says "no numbers or special characters")
            // Assuming spaces are allowed in a Project Name, but if truly strict like Social Media:
            inputValue = inputValue.replace(/[^a-zA-Z\s]/g, "");
        }

        onChange(pair.id, 'value', inputValue);
    };

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative group transition-all hover:border-indigo-200 hover:shadow-md">
            {/* Remove Button */}
            {showRemove && !pair.isExisting && (
                <button
                    onClick={() => onRemove(pair.id)}
                    className="absolute top-3 right-3 text-gray-300 hover:text-red-500 p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all z-10"
                    title="Remove entry"
                >
                    <FaTrash size={14} />
                </button>
            )}

            <div className="space-y-4">
                {/* Title Input with Dropdown (Combobox) */}
                <div className="relative" ref={dropdownRef}>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                        Title
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={pair.key}
                            onChange={(e) => onChange(pair.id, 'key', e.target.value)}
                            onFocus={() => { if (!pair.isExisting) setIsDropdownOpen(true); }}
                            disabled={pair.isExisting}
                            placeholder="Select or type..."
                            className={`w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none transition-all text-sm placeholder-gray-400
                                ${pair.isExisting ? "bg-gray-100/70 text-gray-500 cursor-not-allowed border-transparent" : "focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-800"}`}
                        />
                        {!pair.isExisting && (
                            <div
                                className="absolute right-0 top-0 h-full px-3 flex items-center cursor-pointer text-gray-400 hover:text-indigo-600"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <FaChevronDown size={12} />
                            </div>
                        )}
                    </div>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-100 max-h-60 overflow-y-auto animate-fade-in-down scrollbar-hide">
                            <ul className="py-1">
                                {CREDENTIAL_TYPES.filter(t => t.label.toLowerCase().includes(pair.key.toLowerCase())).map((type) => (
                                    <li
                                        key={type.label}
                                        onClick={() => handleSelectType(type)}
                                        className="px-4 py-2 hover:bg-indigo-50 cursor-pointer flex items-center gap-3 text-sm text-gray-700 hover:text-indigo-700 transition-colors"
                                    >
                                        <span className="text-gray-400">{type.icon}</span>
                                        <span className="font-medium">{type.label}</span>
                                    </li>
                                ))}
                                {CREDENTIAL_TYPES.filter(t => t.label.toLowerCase().includes(pair.key.toLowerCase())).length === 0 && (
                                    <li className="px-4 py-3 text-xs text-gray-400 text-center">
                                        No matching presets
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Value Input */}
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                        Value
                    </label>
                    <div className="relative">
                        <input
                            type={isPassword && !showPassword ? "password" : "text"}
                            value={pair.value}
                            onChange={handleValueChange}
                            disabled={pair.isExisting}
                            placeholder={placeholder}
                            className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg outline-none transition-all text-sm placeholder-gray-400
                                ${pair.isExisting ? "bg-gray-100/70 text-gray-500 cursor-not-allowed border-transparent" : (!validation.isValid ? "border-red-300 focus:border-red-500 bg-white" : "border-gray-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 text-gray-800")}`}
                        />
                        {isPassword && !pair.isExisting && (
                            <button
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors focus:outline-none"
                                type="button"
                            >
                                {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                            </button>
                        )}
                    </div>

                    {/* Validation/Rule Note */}
                    <div className="mt-1.5 ml-1 min-h-[1.25em]">
                        {!validation.isValid ? (
                            <p className="text-xs text-red-500 font-medium animate-pulse">
                                {validation.message}
                            </p>
                        ) : rule ? (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
                                {rule}
                            </p>
                        ) : (
                            <p className="text-xs text-gray-400">&nbsp;</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const CredentialCard = ({ credential, onOpenModal, onUpdateModal }) => {
    // Graceful fallback for older data that doesn't have an items array
    const itemsToDisplay = credential.items && credential.items.length > 0
        ? credential.items
        : [{ key: credential.title, value: credential.value }];

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col h-48 group">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 text-gray-600">
                        <FaFolder size={18} />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex justify-between items-start gap-2">
                            <h3 className="text-gray-900 font-bold text-[1.1rem] truncate" title={credential.title}>
                                {credential.title}
                            </h3>
                            {credential.vaultType && (
                                <span className={`px-2 py-0.5 font-bold text-[9px] uppercase tracking-wide rounded border leading-none flex-shrink-0 ${credential.vaultType === "Service"
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    }`}>
                                    {credential.vaultType}
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-gray-500 font-medium mt-0.5">
                            {itemsToDisplay.length} {itemsToDisplay.length === 1 ? 'Entry' : 'Entries'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium mt-0.5 truncate w-full" title={(() => {
                            const creator = credential.createdBy;
                            if (!creator) return 'Unknown';
                            const dept = creator.role && creator.role.length > 0 ? creator.role.join(', ') : 'Unknown Dept';
                            return `${creator.name}  ${dept} (${creator.employeeId || 'No ID'})`;
                        })()}>
                            {credential.createdBy?.name || 'Unknown'}  {credential.createdBy?.role && credential.createdBy.role.length > 0 ? credential.createdBy.role[0] : 'Unknown Dept'} ({credential.createdBy?.employeeId || 'No ID'})
                        </span>
                    </div>
                </div>
            </div>

            <div className="p-5 flex-1 flex flex-col gap-3 overflow-hidden relative">
                {itemsToDisplay.slice(0, 3).map((item, idx) => {
                    const isPassword = item.key?.toLowerCase() === "password";
                    return (
                        <div key={idx} className="flex justify-between items-center bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg group/item hover:border-indigo-100 transition-colors">
                            <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wide truncate w-1/3 pr-2" title={item.key || "Unknown"}>{item.key || "Unknown"}</span>
                            <span className="text-[13px] text-gray-900 font-medium truncate w-2/3 text-right" title={item.value}>
                                {isPassword ? "••••••••" : item.value}
                            </span>
                        </div>
                    );
                })}

                {itemsToDisplay.length > 3 && (
                    <div className="flex justify-center mt-1">
                        <span className="text-[11px] font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-md">
                            +{itemsToDisplay.length - 3} more
                        </span>
                    </div>
                )}
            </div>

            <div className="p-5 pt-0 mt-auto flex gap-3">
                <button
                    onClick={() => onOpenModal(credential)}
                    className="flex-1 py-2.5 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-all shadow-sm flex items-center justify-center gap-2"
                >
                    View Details
                </button>
            </div>
        </div>
    );
};

const CredentialsVault = () => {
    const [user, setUser] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [savedCredentials, setSavedCredentials] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCredential, setSelectedCredential] = useState(null);
    const [updatingCredential, setUpdatingCredential] = useState(null);
    const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);

    // Search State
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
    const searchDropdownRef = useRef(null);

    // Filter State
    const [filterType, setFilterType] = useState("All Vaults");

    // Admin Dropdown States
    const [selectedEmployeeName, setSelectedEmployeeName] = useState("All Employees");
    const [selectedDepartment, setSelectedDepartment] = useState("All Departments");
    const [selectedEmployeeId, setSelectedEmployeeId] = useState("All IDs");

    // Filtered search results
    const [searchResults, setSearchResults] = useState([]);

    // Derived unique options for admin dropdowns
    const employeeNames = ["All Employees", ...new Set(savedCredentials.map(c => c.createdBy?.name).filter(Boolean))];
    const departments = ["All Departments", ...new Set(savedCredentials.map(c => c.createdBy?.role?.[0]).filter(Boolean))];
    const employeeIds = ["All IDs", ...new Set(savedCredentials.map(c => c.createdBy?.employeeId).filter(Boolean))];

    const resetFilters = () => {
        setFilterType("All Vaults");
        setSelectedEmployeeName("All Employees");
        setSelectedDepartment("All Departments");
        setSelectedEmployeeId("All IDs");
        setSearchTerm("");
    };

    // Document click for closing search dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target)) {
                setIsSearchDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Effect to handle searching
    useEffect(() => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            return;
        }

        const lowerTerm = searchTerm.toLowerCase();
        const results = [];

        savedCredentials.forEach(cred => {
            // Graceful fallback for older data that doesn't have an items array
            const itemsToDisplay = cred.items && cred.items.length > 0
                ? cred.items
                : [{ key: cred.title, value: cred.value }];

            itemsToDisplay.forEach(item => {
                // EXCLUDE passwords from search results and do not show them
                if (item.key && item.key.toLowerCase() !== "password") {
                    if (item.value && item.value.toLowerCase().includes(lowerTerm)) {
                        results.push({
                            credentialId: cred._id,
                            credentialTitle: cred.title,
                            key: item.key,
                            value: item.value,
                            vaultType: cred.vaultType
                        });
                    } else if (item.key.toLowerCase().includes(lowerTerm)) {
                        // Also match on key if requested, though prompt says "values from the database... Only the field (box) that contains the searched text should be displayed."
                        results.push({
                            credentialId: cred._id,
                            credentialTitle: cred.title,
                            key: item.key,
                            value: item.value,
                            vaultType: cred.vaultType
                        });
                    }
                }
            });
        });

        // Deduplicate or limit if needed, for now just show all matches
        setSearchResults(results);
    }, [searchTerm, savedCredentials]);

    // Password Reveal State
    const [revealedPasswords, setRevealedPasswords] = useState({}); // { [credentialId_itemIdx]: true }
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [pendingRevealTarget, setPendingRevealTarget] = useState(null); // { credId, itemIdx }
    const [authPassword, setAuthPassword] = useState("");
    const [showAuthPassword, setShowAuthPassword] = useState(false); // New state for input toggle
    const [authError, setAuthError] = useState("");
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    // State for the form
    const [vaultType, setVaultType] = useState("User Vault");
    const [credentialPairs, setCredentialPairs] = useState([{ id: 1, key: "", value: "", isExisting: false }]);

    const handleUpdateModalClick = (credential) => {
        setUpdatingCredential(credential);
        setShowUpdateConfirm(true);
    };

    const handleConfirmUpdate = () => {
        setShowUpdateConfirm(false);
        setIsFormOpen(true);
        setVaultType(updatingCredential.vaultType || "User Vault");

        // Parse existing items
        const prefilledPairs = (updatingCredential.items || []).map(item => ({
            id: Date.now() + Math.random(),
            key: item.key,
            value: item.value,
            isExisting: true
        }));

        // Push a blank entry at the end for new data
        setCredentialPairs([...prefilledPairs, { id: Date.now(), key: "", value: "", isExisting: false }]);
    };

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        let currentUser = null;
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            setUser(currentUser);
        }
        fetchCredentials();

        // Connect to web socket
        const socket = io(getSocketUrl(), {
            withCredentials: true,
        });

        // Listen for new credentials added anywhere
        socket.on("credentialAdded", (newCredential) => {
            // Check if user is admin OR if this user is the creator
            // (Admins see everything, users see only what they create)
            const isAdmin = currentUser?.role === "Super Admin" || (Array.isArray(currentUser?.role) && currentUser.role.includes("Super Admin"));
            const isCreator = newCredential.createdBy?._id === currentUser?._id;

            if (isAdmin || isCreator) {
                setSavedCredentials(prev => {
                    // Prevent duplicates if optimistic update already added it
                    if (prev.find(c => c._id === newCredential._id)) return prev;
                    return [newCredential, ...prev];
                });
            }
        });

        return () => socket.disconnect();
    }, []);

    const fetchCredentials = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/credentials?_t=${Date.now()}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setSavedCredentials(data);
            }
        } catch (error) {
            console.error("Failed to fetch credentials", error);
        } finally {
            setIsLoading(false);
        }
    };

    const addCredentialPair = () => {
        const lastPair = credentialPairs[credentialPairs.length - 1];
        if (lastPair.key.trim() !== "" && lastPair.value.trim() !== "") {
            setCredentialPairs([...credentialPairs, { id: Date.now(), key: "", value: "" }]);
        }
    };

    const removeCredentialPair = (id) => {
        if (credentialPairs.length > 1) {
            setCredentialPairs(credentialPairs.filter(pair => pair.id !== id));
        }
    };

    const handlePairChange = (id, field, value) => {
        setCredentialPairs(credentialPairs.map(pair =>
            pair.id === id ? { ...pair, [field]: value } : pair
        ));
    };

    // Helper: Check if entire form is valid
    const isFormValid = credentialPairs.every(pair => {
        const validStatus = getValidationStatus(pair.key, pair.value);
        return pair.key && pair.value && validStatus.isValid;
    });

    const handleRevealRequest = (credId, itemIdx) => {
        if (revealedPasswords[`${credId}_${itemIdx}`]) {
            // Already revealed, toggle it off
            setRevealedPasswords(prev => ({ ...prev, [`${credId}_${itemIdx}`]: false }));
            return;
        }

        // Not revealed, ask for authentication
        setPendingRevealTarget({ credId, itemIdx });
        setAuthPassword("");
        setAuthError("");
        setShowAuthModal(true);
    };

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setAuthError("");

        if (!authPassword) {
            setAuthError("Please enter your password");
            return;
        }

        setIsAuthenticating(true);
        try {
            // We need to verify the user's password. We use the /api/auth/login endpoint to verify.
            const res = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email: user.email, password: authPassword })
            });

            if (res.ok) {
                // Success! Reveal the password
                setRevealedPasswords(prev => ({
                    ...prev,
                    [`${pendingRevealTarget.credId}_${pendingRevealTarget.itemIdx}`]: true
                }));
                setShowAuthModal(false);
                setPendingRevealTarget(null);
            } else {
                setAuthError("Incorrect password. Please try again.");
            }
        } catch (error) {
            console.error("Auth error:", error);
            setAuthError("An error occurred during verification.");
        } finally {
            setIsAuthenticating(false);
        }
    };

    if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    const isAdmin = user.role === "Super Admin" || (Array.isArray(user.role) && user.role.includes("Super Admin"));

    return (
        <div className="flex min-h-screen bg-gray-100 font-sans relative overflow-hidden">
            {/* Desktop Sidebar */}
            {isAdmin ? (
                <Sidebar className="hidden md:flex" />
            ) : (
                <EmployeeSidebar className="hidden md:flex" />
            )}

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsSidebarOpen(false)}></div>
                    <div className="absolute inset-y-0 left-0 z-50">
                        {isAdmin ? (
                            <Sidebar className="flex h-full shadow-xl" />
                        ) : (
                            <EmployeeSidebar className="flex h-full shadow-xl" />
                        )}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* Header (Mobile toggle) */}
                <header className="bg-white shadow-sm p-4 flex justify-between items-center md:hidden z-10">
                    <h1 className="text-xl font-bold text-gray-800">{isAdmin ? "AdminPanel" : "UserPanel"}</h1>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="text-gray-600 focus:outline-none p-2 rounded hover:bg-gray-100"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
                        </svg>
                    </button>
                </header>

                <main className="flex-1 p-6 overflow-y-auto scrollbar-hide">
                    <div className="mb-6 flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <FaKey className="text-indigo-600" />
                                Credentials Vault
                            </h1>
                            <p className="text-gray-500 mt-2">Manage and view credentials securely.</p>
                        </div>
                        <button
                            onClick={() => setIsFormOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <FaPlus />
                            Add New Credential
                        </button>
                    </div>

                    {/* Filter Navbar */}
                    <div className="mb-6 bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row items-center gap-4">

                        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                            {isAdmin && (
                                <>
                                    <div className="relative">
                                        <select
                                            value={selectedEmployeeName}
                                            onChange={(e) => setSelectedEmployeeName(e.target.value)}
                                            className="appearance-none w-40 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-sm"
                                        >
                                            {employeeNames.map(name => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                            <FaChevronDown size={12} />
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <select
                                            value={selectedDepartment}
                                            onChange={(e) => setSelectedDepartment(e.target.value)}
                                            className="appearance-none w-44 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-sm"
                                        >
                                            {departments.map(dept => (
                                                <option key={dept} value={dept}>{dept}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                            <FaChevronDown size={12} />
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <select
                                            value={selectedEmployeeId}
                                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                            className="appearance-none w-36 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-sm"
                                        >
                                            {employeeIds.map(id => (
                                                <option key={id} value={id}>{id}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                            <FaChevronDown size={12} />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Vault Type Dropdown (for both Admin and User) */}
                            <div className="relative">
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="appearance-none w-40 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-sm"
                                >
                                    <option value="All Vaults">All Vaults</option>
                                    <option value="User Vault">User Vault</option>
                                    <option value="Service">Service</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                    <FaChevronDown size={12} />
                                </div>
                            </div>
                        </div>

                        {/* Search and Reset Actions */}
                        <div className="flex items-center gap-3 w-full xl:w-auto xl:ml-auto">
                            {/* Search Bar with Dropdown Container */}
                            <div className="relative flex-1 xl:w-80" ref={searchDropdownRef}>
                                <div className="relative w-full">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaSearch className="text-gray-400" size={14} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search values..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setIsSearchDropdownOpen(true);
                                        }}
                                        onFocus={() => {
                                            if (searchTerm.trim()) setIsSearchDropdownOpen(true);
                                        }}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all shadow-sm"
                                    />
                                </div>

                                {/* Search Dropdown */}
                                {isSearchDropdownOpen && searchTerm.trim() && (
                                    <div className="absolute z-[60] mt-2 w-full left-0 bg-white rounded-xl shadow-xl border border-gray-100 max-h-44 overflow-y-auto scrollbar-hide animate-fade-in-up">
                                        {searchResults.length > 0 ? (
                                            <div className="py-2">
                                                <div className="px-4 py-2 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10 backdrop-blur-sm">
                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Search Results</span>
                                                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">{searchResults.length}</span>
                                                </div>
                                                <ul className="divide-y divide-gray-100 list-none m-0 p-0">
                                                    {searchResults.map((result, idx) => (
                                                        <li
                                                            key={`${result.credentialId}_${idx}`}
                                                            className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group m-0 flex flex-col gap-2"
                                                            onClick={() => {
                                                                const cred = savedCredentials.find(c => c._id === result.credentialId);
                                                                if (cred) {
                                                                    setSelectedCredential(cred);
                                                                    setRevealedPasswords({});
                                                                    setIsSearchDropdownOpen(false);
                                                                }
                                                            }}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider truncate flex-1">{result.credentialTitle}</span>
                                                                {result.vaultType && (
                                                                    <span className={`text-[9px] font-bold uppercase tracking-wide rounded border px-1.5 py-0.5 flex-shrink-0
                                                                        ${result.vaultType === 'Service' ? 'text-indigo-600 bg-indigo-50 border-indigo-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}
                                                                    `}>
                                                                        {result.vaultType}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 shadow-sm group-hover:bg-white group-hover:border-indigo-200 group-hover:shadow-md transition-all">
                                                                <p className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-wider">{result.key}</p>
                                                                <p className="text-sm font-medium text-gray-900 break-all">{result.value}</p>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : (
                                            <div className="p-6 text-center text-gray-500">
                                                <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                                    <FaSearch className="text-gray-300" size={20} />
                                                </div>
                                                <p className="text-sm font-semibold text-gray-700">No matches found</p>
                                                <p className="text-[11px] font-medium text-gray-400 mt-1 uppercase tracking-wider">Passwords are excluded</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Reset Button */}
                            <button
                                onClick={resetFilters}
                                className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors shadow-sm focus:outline-none"
                                title="Reset Filters"
                            >
                                <FaSync size={14} />
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : savedCredentials.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 text-indigo-500 mb-4">
                                <FaKey size={32} />
                            </div>
                            <h2 className="text-lg font-bold text-gray-800 mb-2">No Credentials Found</h2>
                            <p>You haven't added any credentials to your vault yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
                            {savedCredentials
                                .filter(cred => filterType === "All Vaults" || cred.vaultType === filterType)
                                .filter(cred => {
                                    if (!isAdmin) return true;

                                    const matchName = selectedEmployeeName === "All Employees" || cred.createdBy?.name === selectedEmployeeName;
                                    const matchDept = selectedDepartment === "All Departments" || cred.createdBy?.role?.[0] === selectedDepartment;
                                    const matchId = selectedEmployeeId === "All IDs" || cred.createdBy?.employeeId === selectedEmployeeId;

                                    return matchName && matchDept && matchId;
                                })
                                .map((cred) => (
                                    <CredentialCard
                                        key={cred._id}
                                        credential={cred}
                                        onOpenModal={(c) => {
                                            setSelectedCredential(c);
                                            // Reset revealed passwords when opening a new modal
                                            setRevealedPasswords({});
                                        }}
                                        onUpdateModal={handleUpdateModalClick}
                                    />
                                ))}
                            {savedCredentials
                                .filter(cred => filterType === "All Vaults" || cred.vaultType === filterType)
                                .filter(cred => {
                                    if (!isAdmin) return true;

                                    const matchName = selectedEmployeeName === "All Employees" || cred.createdBy?.name === selectedEmployeeName;
                                    const matchDept = selectedDepartment === "All Departments" || cred.createdBy?.role?.[0] === selectedDepartment;
                                    const matchId = selectedEmployeeId === "All IDs" || cred.createdBy?.employeeId === selectedEmployeeId;

                                    return matchName && matchDept && matchId;
                                }).length === 0 && (
                                    <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 text-gray-400 mb-4">
                                            <FaSearch size={32} />
                                        </div>
                                        <h2 className="text-lg font-bold text-gray-800 mb-2">No Matching Credentials</h2>
                                        <p>There are no credentials matching your current filters and search.</p>
                                    </div>
                                )}
                        </div>
                    )}
                </main>

                {/* Off-canvas Side Panel */}
                {isFormOpen && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
                            onClick={() => setIsFormOpen(false)}
                        ></div>

                        {/* Slide-in Panel */}
                        <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right transform transition-transform z-50">
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white shadow-sm">
                                <h2 className="text-lg font-semibold text-gray-800">New Credential</h2>
                                <button
                                    onClick={() => setIsFormOpen(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
                                >
                                    <IoClose size={24} />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-gray-50/50">

                                {/* Vault Type Selection */}
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 ml-1">
                                        Vault Type
                                    </label>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setVaultType("User Vault")}
                                            className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-all flex items-center justify-center gap-2 ${vaultType === "User Vault"
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm"
                                                : "bg-white text-gray-500 border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/50"
                                                }`}
                                        >
                                            <div className={`w-3 h-3 rounded-full border-2 ${vaultType === "User Vault" ? "border-emerald-600 bg-emerald-600" : "border-gray-300"}`}></div>
                                            User Vault
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setVaultType("Service")}
                                            className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-all flex items-center justify-center gap-2 ${vaultType === "Service"
                                                ? "bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm"
                                                : "bg-white text-gray-500 border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/50"
                                                }`}
                                        >
                                            <div className={`w-3 h-3 rounded-full border-2 ${vaultType === "Service" ? "border-indigo-600 bg-indigo-600" : "border-gray-300"}`}></div>
                                            Service
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {credentialPairs.map((pair) => (
                                        <CredentialRow
                                            key={pair.id}
                                            pair={pair}
                                            onChange={handlePairChange}
                                            onRemove={removeCredentialPair}
                                            showRemove={credentialPairs.length > 1}
                                        />
                                    ))}
                                </div>

                                {/* Add New Pair Button */}
                                <button
                                    onClick={addCredentialPair}
                                    className={`w-full py-3.5 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 font-medium transition-all duration-200 ${credentialPairs[credentialPairs.length - 1].key && credentialPairs[credentialPairs.length - 1].value
                                        ? "border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm cursor-pointer"
                                        : "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed opacity-70"
                                        }`}
                                    disabled={!credentialPairs[credentialPairs.length - 1].key || !credentialPairs[credentialPairs.length - 1].value}
                                >
                                    <FaPlus className={`transition-transform duration-200 ${credentialPairs[credentialPairs.length - 1].key && credentialPairs[credentialPairs.length - 1].value ? "text-indigo-600" : "text-gray-400"}`} size={14} />
                                    Add Another Entry
                                </button>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-6 border-t border-gray-100 bg-white flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                                <button
                                    onClick={() => { setIsFormOpen(false); setUpdatingCredential(null); setCredentialPairs([{ id: Date.now(), key: "", value: "", isExisting: false }]); setVaultType("User Vault"); }}
                                    className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    className={`px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-all shadow-sm flex-[2] flex justify-center items-center gap-2
                                        ${isFormValid ? "bg-indigo-600 hover:bg-indigo-700 hover:shadow-md" : "bg-gray-400 cursor-not-allowed"}`}
                                    onClick={async () => {
                                        if (isFormValid) {
                                            try {
                                                const token = localStorage.getItem("token");
                                                const isUpdating = !!updatingCredential;
                                                const method = isUpdating ? "PUT" : "POST";
                                                const url = isUpdating
                                                    ? `${API_URL}/credentials/${updatingCredential._id}`
                                                    : `${API_URL}/credentials/batch`;

                                                const res = await fetch(url, {
                                                    method,
                                                    headers: {
                                                        "Content-Type": "application/json",
                                                        "Authorization": `Bearer ${token}`
                                                    },
                                                    body: JSON.stringify({
                                                        credentials: credentialPairs,
                                                        vaultType
                                                    })
                                                });

                                                if (res.ok) {
                                                    const newCredData = await res.json();

                                                    // Immediately push an optimistic or returned credential to the front of the list
                                                    // Fallback to a constructed object if backend just returns a basic message
                                                    const resultCred = newCredData.credential || {
                                                        _id: newCredData.credentialId || Date.now().toString(),
                                                        title: credentialPairs[0]?.key || "New Credential",
                                                        vaultType: vaultType,
                                                        items: credentialPairs,
                                                        createdBy: {
                                                            name: user.name,
                                                            employeeId: user.employeeId,
                                                            role: user.role
                                                        },
                                                        createdAt: new Date().toISOString()
                                                    };

                                                    if (isUpdating) {
                                                        setSavedCredentials(prev => prev.map(c => c._id === resultCred._id ? resultCred : c));
                                                    } else {
                                                        setSavedCredentials(prev => [resultCred, ...prev]);
                                                    }

                                                    setIsFormOpen(false);
                                                    setCredentialPairs([{ id: Date.now(), key: "", value: "", isExisting: false }]);
                                                    setVaultType("User Vault");
                                                    setUpdatingCredential(null);

                                                    // Still do a background fetch to ensure perfect sync
                                                    fetchCredentials();

                                                    setShowSuccessPopup(true);
                                                } else {
                                                    const errorData = await res.json();
                                                    alert(`Failed to save: ${errorData.message || "Unknown error"}`);
                                                }
                                            } catch (error) {
                                                console.error("Error saving credentials:", error);
                                                alert("An error occurred while saving credentials.");
                                            }
                                        }
                                    }}
                                    disabled={!isFormValid}
                                >
                                    {updatingCredential ? "Update Credentials" : "Save Credentials"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Update Confirm Modal */}
                {showUpdateConfirm && updatingCredential && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
                        <div className="relative bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 transform transition-all text-center animate-fade-in-up">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
                                <FaEdit size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Update Credential</h3>
                            <p className="text-gray-500 mb-6">Are you sure you want to update this credentials bundle?</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowUpdateConfirm(false); setUpdatingCredential(null); }}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
                                >
                                    No
                                </button>
                                <button
                                    onClick={handleConfirmUpdate}
                                    className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                                >
                                    Yes
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Success Popup (Centered) */}
                {showSuccessPopup && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
                        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 transform transition-all text-center animate-fade-in-up">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Success!</h3>
                            <p className="text-gray-500 mb-6">Your credentials have been saved securely in the vault.</p>
                            <button
                                onClick={() => setShowSuccessPopup(false)}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {/* View Details Modal */}
                {selectedCredential && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                            onClick={() => setSelectedCredential(null)}
                        ></div>

                        {/* Modal Container */}
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg z-10 flex flex-col max-h-[85vh] animate-fade-in-up">

                            {/* Header */}
                            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 text-gray-700 shadow-sm flex items-center justify-center flex-shrink-0">
                                        <FaFolder size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-[1.15rem] font-bold text-gray-900 leading-tight">
                                                {selectedCredential.title}
                                            </h2>
                                            {selectedCredential.vaultType && (
                                                <span className={`px-2 py-0.5 font-bold text-[9px] uppercase tracking-wide rounded border leading-none ${selectedCredential.vaultType === "Service"
                                                    ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                                                    : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                    }`}>
                                                    {selectedCredential.vaultType}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-gray-500 font-semibold mt-0.5 uppercase tracking-wide">
                                            {((selectedCredential.items && selectedCredential.items.length) || 1)} Entries
                                        </p>
                                        <div className="flex flex-col mt-1">
                                            <p className="text-[11px] text-gray-500 font-medium truncate max-w-[300px]">
                                                {selectedCredential.createdBy?.name || 'Unknown'} ({selectedCredential.createdBy?.employeeId || 'No ID'})
                                            </p>
                                            <p className="text-[10px] text-gray-400 font-medium truncate max-w-[300px]">
                                                {selectedCredential.createdBy?.role && selectedCredential.createdBy.role.length > 0 ? selectedCredential.createdBy.role[0] : 'Unknown Dept'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">

                                </div>
                            </div>

                            {/* Scrollable Content Area */}
                            <div className="px-6 py-5 overflow-y-auto scrollbar-hide flex-1 bg-white">
                                <div className="space-y-4">
                                    {((selectedCredential.items && selectedCredential.items.length > 0) ? selectedCredential.items : [{ key: selectedCredential.title, value: selectedCredential.value }]).map((item, idx) => {
                                        const isPassword = item.key?.toLowerCase() === "password";
                                        const isRevealed = revealedPasswords[`${selectedCredential._id}_${idx}`];

                                        return (
                                            <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col group hover:border-gray-300 transition-colors">
                                                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{item.key || "Unknown"}</span>
                                                <div className="flex justify-between items-center gap-4">
                                                    <span className={`text-[15px] break-all ${isPassword && isRevealed ? 'font-mono text-gray-800' : 'font-medium text-gray-900'} ${isPassword && !isRevealed ? 'tracking-[0.2em] mt-1' : ''}`}>
                                                        {isPassword && !isRevealed ? '••••••••••••' : item.value}
                                                    </span>
                                                    {isPassword && (
                                                        <button
                                                            onClick={() => handleRevealRequest(selectedCredential._id, idx)}
                                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors focus:outline-none flex-shrink-0"
                                                            title={isRevealed ? "Hide Password" : "Show Password"}
                                                        >
                                                            {isRevealed ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-between rounded-b-xl">
                                <button
                                    onClick={() => {
                                        setSelectedCredential(null);
                                        handleUpdateModalClick(selectedCredential);
                                    }}
                                    className="h-8 px-3 flex items-center justify-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 hover:border-emerald-200 hover:bg-emerald-100 rounded-lg transition-all font-semibold text-xs shadow-sm focus:outline-none"
                                    title="Update"
                                >
                                    <FaSync size={14} /> Update
                                </button>
                                <button
                                    onClick={() => setSelectedCredential(null)}
                                    className="px-6 py-2 bg-gray-900 border border-transparent rounded-lg text-sm font-semibold text-white hover:bg-gray-800 transition-colors shadow-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Authentication Modal for Revealing Password */}
                {showAuthModal && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                            onClick={() => !isAuthenticating && setShowAuthModal(false)}
                        ></div>
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm z-10 animate-fade-in-up overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <FaShieldAlt className="text-indigo-600" /> Security Check
                                    </h3>
                                    <button
                                        onClick={() => setShowAuthModal(false)}
                                        disabled={isAuthenticating}
                                        className="text-gray-400 hover:text-gray-700 transition-colors"
                                    >
                                        <IoClose size={20} />
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={handleAuthSubmit} className="p-6">
                                <p className="text-sm text-gray-600 mb-5">
                                    Are you <span className="font-semibold text-gray-800">{user.email}</span>? Please enter your login password to reveal this credential.
                                </p>

                                <div className="space-y-1 relative">
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                                        Your Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showAuthPassword ? "text" : "password"}
                                            value={authPassword}
                                            onChange={(e) => setAuthPassword(e.target.value)}
                                            placeholder="Enter your account password"
                                            className={`w-full px-4 py-2.5 pr-12 bg-gray-50 border rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm
                                                ${authError ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-indigo-500"}`}
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowAuthPassword(!showAuthPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-indigo-600 transition-colors focus:outline-none"
                                        >
                                            {showAuthPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                                        </button>
                                    </div>
                                    {authError && <p className="text-xs text-red-500 mt-1 font-medium">{authError}</p>}
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowAuthModal(false)}
                                        disabled={isAuthenticating}
                                        className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isAuthenticating || !authPassword}
                                        className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isAuthenticating ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Verifying...
                                            </>
                                        ) : "Reveal Password"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CredentialsVault;
