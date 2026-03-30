import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import SingleSelectDropdown from "../components/SingleSelectDropdown";
import { FaUserTie, FaEye, FaEyeSlash, FaBriefcase, FaChevronDown } from "react-icons/fa";
import { API_URL } from "../utils/config";

const EmployeeManagement = () => {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [mode, setMode] = useState("add"); // "add" or "edit"
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [employees, setEmployees] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = React.useRef(null);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        employeeId: "",
        role: [],
        designation: "",
        workType: "",
        joiningDate: "",
        password: "",
    });

    const [userRole, setUserRole] = useState([]);
    const [userDesignation, setUserDesignation] = useState("");

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                const usr = JSON.parse(storedUser);
                setUserRole(Array.isArray(usr.role) ? usr.role : [usr.role]);
                setUserDesignation(usr.designation || "");
            } catch (e) { }
        }
    }, []);

    const isAdminOrSuperAdmin = userRole.includes("Super Admin") || userRole.includes("Admin");
    const isTechLead = userDesignation.toLowerCase().includes("lead");
    const canAddOptions = isAdminOrSuperAdmin || isTechLead;

    // Fetch next employee ID
    const fetchNextId = async () => {
        try {
            const res = await fetch(`${API_URL}/employee/nextid`);
            if (res.ok) {
                const data = await res.json();
                setFormData((prev) => ({ ...prev, employeeId: data.nextId }));
            }
        } catch (error) {
        }
    };

    const [options, setOptions] = useState({
        department: [],
        designation: [],
        workType: []
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newOption, setNewOption] = useState({ category: "", value: "" });

    // Fetch options on mount
    useEffect(() => {
        fetchOptions();
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const res = await fetch(`${API_URL}/employee/all?includeInactiveProfiles=true`);
            if (res.ok) {
                const data = await res.json();
                setEmployees(data);
            }
        } catch (error) {
        }
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/options/all`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setOptions(data);
            }
        } catch (error) {
        }
    };

    const handleAddOption = async () => {
        if (!newOption.value.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/options/add`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(newOption)
            });

            if (res.ok) {
                await fetchOptions(); // Refresh options
                setIsModalOpen(false);
                setNewOption({ category: "", value: "" });
            } else {
                const data = await res.json();
                alert(data.message);
            }
        } catch (error) {
            alert("Failed to add option");
        }
    };

    const openAddModal = (category) => {
        setNewOption({ category, value: "" });
        setIsModalOpen(true);
    };

    useEffect(() => {
        if (location.pathname === "/employee/add") {
            setMode("add");
            setFormData({
                name: "",
                email: "",
                employeeId: "",
                role: [],
                designation: "",
                workType: "",
                joiningDate: "",
                password: "",
            });
            fetchNextId();
        } else if (location.pathname === "/employee/edit-role") {
            setMode("edit");
            setFormData({
                name: "",
                email: "",
                employeeId: "",
                role: [],
                designation: "",
                workType: "",
                joiningDate: "",
                password: "",
            });
        }
    }, [location]);

    // Manual fetch handler
    const handleFetch = async () => {
        if (!formData.employeeId) {
            alert("Please enter a valid Employee ID");
            return;
        }

        // Extract ID if using the "EMP001 - Name - Role" format from dropdown
        let searchId = formData.employeeId;
        if (searchId.includes(" – ")) {
            searchId = searchId.split(" – ")[0].trim();
        } else if (searchId.includes(" - ")) {
            searchId = searchId.split(" - ")[0].trim();
        }

        if (searchId.length < 3) {
            alert("Please enter a valid Employee ID");
            return;
        }

        try {
            const res = await fetch(`${API_URL}/employee/${searchId}`);
            if (res.ok) {
                const data = await res.json();
                setFormData((prev) => ({
                    ...prev,
                    name: data.name,
                    email: data.email,
                    employeeId: data.employeeId,
                    role: Array.isArray(data.role) ? data.role : [data.role],
                    designation: data.designation || "",
                    workType: data.workType || "",
                    password: data.password || "", // Populate with hashed DB password
                }));
            } else {
                alert("Employee not found");
            }
        } catch (error) {
            alert("Error fetching details");
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "name") {
            // Allow only alphabets and spaces
            if (/^[a-zA-Z\s]*$/.test(value)) {
                setFormData({ ...formData, [name]: value.toUpperCase() });
            }
        } else if (name === "employeeId") {
            setFormData({ ...formData, [name]: value });
            if (mode === "edit") {
                setIsDropdownOpen(true);
            }
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const [error, setError] = useState("");
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    // Auto-close modal after 30 seconds
    useEffect(() => {
        let timer;
        if (showSuccessModal) {
            timer = setTimeout(() => {
                setShowSuccessModal(false);
            }, 30000); // 30 seconds
        }
        return () => clearTimeout(timer);
    }, [showSuccessModal]);

    const validateForm = () => {
        // 1. Validate Name (Alphabets only)
        const nameRegex = /^[a-zA-Z\s]+$/;
        if (!formData.name.trim()) return "Full Name is required.";
        if (!nameRegex.test(formData.name)) return "Full Name should contain only alphabets.";

        // 2. Validate Email
        if (!formData.email.trim()) return "Email Address is required.";
        if (!formData.email.endsWith("@gmail.com")) return "Email must be a valid @gmail.com address.";

        // 3. Validate Password (Add mode only or if changed)
        if (mode === "add" || formData.password) {
            if (!formData.password) return "Password is required.";
            // const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).+$/;
            // if (!passwordRegex.test(formData.password)) return "Password must contain alphabets, numbers, and special characters.";
        }

        // 4. Validate Dropdowns
        if (formData.role.length === 0) return "Please select at least one Department.";
        if (!formData.designation) return "Please select a Role.";
        if (!formData.workType) return "Please select a Work Type.";

        // 5. Validate Date (Add mode)
        if (mode === "add" && !formData.joiningDate) return "Joining Date is required.";

        return ""; // No error
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(""); // Clear previous errors

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);

        const endpoint = mode === "add" ? "/employee/add" : "/employee/update";
        const method = mode === "add" ? "POST" : "PATCH";

        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || "Something went wrong");
                return;
            }

            // Show Success Modal instead of Alert
            setSuccessMessage(data.message);
            setShowSuccessModal(true);

            if (mode === "add") {
                setFormData({
                    name: "",
                    email: "",
                    employeeId: "",
                    role: [],
                    designation: "", // Keep default if needed or reset
                    workType: "",
                    joiningDate: "",
                    password: "",
                });
                fetchNextId(); // Fetch next ID for the next entry
            }
        } catch (error) {
            setError("Server error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100 font-sans relative">
            {/* Desktop Sidebar */}
            <Sidebar className="hidden md:flex" />

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
                    {/* Sidebar container */}
                    <div className="absolute inset-y-0 left-0 z-50">
                        <Sidebar className="flex h-full shadow-2xl" onClose={() => setIsSidebarOpen(false)} />
                    </div>
                </div>
            )}

            <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center md:hidden z-10 sticky top-0">
                    <h1 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Employees</h1>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                </header>

                <main className="flex-1 p-4 sm:p-8 overflow-y-auto w-full max-w-full overflow-x-hidden">
                    <div className="w-full max-w-full sm:max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            {mode === "add" ? "Add New Employee" : "Edit Employee Role"}
                        </h2>
                        <p className="text-gray-500 mb-8">
                            {mode === "add"
                                ? "Register a new employee into the system."
                                : "Enter Employee ID and click fetch to edit details."}
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-200 animate-pulse">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Employee ID</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1" ref={dropdownRef}>
                                        <input
                                            type="text"
                                            name="employeeId"
                                            value={formData.employeeId}
                                            onChange={handleChange}
                                            onFocus={() => mode === "edit" && setIsDropdownOpen(true)}
                                            placeholder={mode === "edit" ? "Search by ID, Name or Role..." : "EMP001"}
                                            required={mode === "edit"} // Only required in edit mode
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                            readOnly={mode === "add"} // Read-only in add mode
                                            autoComplete="off"
                                        />
                                        {mode === "edit" && isDropdownOpen && employees.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                                                {employees
                                                    .filter((emp) => {
                                                        const query = formData.employeeId.toLowerCase();
                                                        const rolesStr = Array.isArray(emp.role) ? emp.role.join(", ") : (emp.role || "");
                                                        const searchString = `${emp.employeeId} - ${emp.name} - ${rolesStr}`.toLowerCase();
                                                        return searchString.includes(query);
                                                    })
                                                    .map((emp) => {
                                                        const rolesStr = Array.isArray(emp.role) ? emp.role.join(", ") : (emp.role || "No Role");
                                                        const displayText = `${emp.employeeId} – ${emp.name} – ${rolesStr}`;
                                                        return (
                                                            <div
                                                                key={emp._id}
                                                                className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer text-gray-700 flex flex-col border-b border-gray-50 last:border-0"
                                                                onClick={() => {
                                                                    setFormData({ ...formData, employeeId: displayText });
                                                                    setIsDropdownOpen(false);
                                                                }}
                                                            >
                                                                <div className="text-sm font-bold text-gray-800">{emp.employeeId} – {emp.name}</div>
                                                                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{rolesStr}</div>
                                                            </div>
                                                        );
                                                    })}
                                                {employees.filter((emp) => {
                                                    const query = formData.employeeId.toLowerCase();
                                                    const rolesStr = Array.isArray(emp.role) ? emp.role.join(", ") : (emp.role || "");
                                                    return `${emp.employeeId} - ${emp.name} - ${rolesStr}`.toLowerCase().includes(query);
                                                }).length === 0 && (
                                                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                            No employees found
                                                        </div>
                                                    )}
                                            </div>
                                        )}
                                    </div>
                                    {mode === "edit" && (
                                        <button
                                            type="button"
                                            onClick={handleFetch}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium whitespace-nowrap"
                                        >
                                            Fetch Details
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Full Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="John Doe"
                                        required
                                        className={`w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none`}
                                    />
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="john@example.com"
                                        required
                                        className={`w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none`}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder={mode === "add" ? "Enter password" : "Enter new password to update"}
                                        required={mode === "add"}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    >
                                        {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Must contain alphabets, numbers, and special characters.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-semibold text-gray-700">Department</label>
                                    {canAddOptions && (
                                        <button
                                            type="button"
                                            onClick={() => openAddModal("department")}
                                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                        >
                                            + Add New
                                        </button>
                                    )}
                                </div>
                                <MultiSelectDropdown
                                    options={options.department || []}
                                    value={formData.role}
                                    onChange={(newRoles) => setFormData({ ...formData, role: newRoles })}
                                    placeholder="Select Designations"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-semibold text-gray-700">Role</label>
                                    {canAddOptions && (
                                        <button
                                            type="button"
                                            onClick={() => openAddModal("designation")}
                                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                        >
                                            + Add New
                                        </button>
                                    )}
                                </div>
                                <SingleSelectDropdown
                                    options={options.designation || []}
                                    value={formData.designation}
                                    onChange={(val) => setFormData({ ...formData, designation: val })}
                                    placeholder="Select Role"
                                    Icon={FaUserTie}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-semibold text-gray-700">Work Type</label>
                                    {canAddOptions && (
                                        <button
                                            type="button"
                                            onClick={() => openAddModal("workType")}
                                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                        >
                                            + Add New
                                        </button>
                                    )}
                                </div>
                                <SingleSelectDropdown
                                    options={options.workType || []}
                                    value={formData.workType}
                                    onChange={(val) => setFormData({ ...formData, workType: val })}
                                    placeholder="Select Work Type"
                                    Icon={FaBriefcase}
                                />
                            </div>

                            {mode === "add" && (
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Joining Date</label>
                                    <input
                                        type="date"
                                        name="joiningDate"
                                        value={formData.joiningDate}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                    />
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98]"
                                >
                                    {loading ? "Processing..." : (mode === "add" ? "Register Employee" : "Update Details")}
                                </button>
                            </div>
                        </form>
                    </div>
                </main>
            </div >

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in p-4">
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-[400px] text-center transform transition-all scale-100">
                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Success!</h3>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            {successMessage}
                        </p>
                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-1 active:scale-95 w-full"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}


            {/* Modal for Adding New Option */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-96">
                        <h3 className="text-xl font-bold mb-4 capitalize">Add New {newOption.category === 'department' ? 'Department' : newOption.category === 'designation' ? 'Role' : 'Work Type'}</h3>
                        <input
                            type="text"
                            value={newOption.value}
                            onChange={(e) => setNewOption({ ...newOption, value: e.target.value })}
                            placeholder="Enter new value"
                            className="w-full px-4 py-2 border rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                            autoFocus
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddOption}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default EmployeeManagement;
