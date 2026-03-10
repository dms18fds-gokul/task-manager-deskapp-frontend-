import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { Device } from '@capacitor/device';
import { useAuth } from "../context/AuthContext";

import { API_URL } from "../utils/config";

const Auth = () => {
  const [mode, setMode] = useState("login"); // login | signup
  const [role, setRole] = useState("Employee");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");
    return {
      email: savedEmail || "",
      password: savedPassword || "",
    };
  });
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError(""); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors

    let deviceId = "UNKNOWN_DEVICE";
    try {
      if (window.electronAPI) {
        deviceId = await window.electronAPI.getDeviceId();
      } else {
        deviceId = "Desktop Device";
        try {
          const info = await Device.getId();
          if (info && info.identifier) {
            deviceId = `Desktop Device: ${info.identifier.substring(0, 8)}`;
          }
        } catch (e) {
          // Default to 'Desktop Device' if getid fails
        }
      }
    } catch (err) {
      console.warn("Could not fetch hardware ID", err);
    }

    // Direct app clients to the secure device-bound API
    const endpoint = mode === "login" ? "/v1/app/auth/login" : "/auth/signup";
    const fullUrl = `${API_URL}${endpoint}`;

    try {
      const res = await fetch(fullUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          email: form.email,
          password: form.password,
          deviceId // Injected for device binding requirements
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid email and password");
        return;
      }

      if (mode === "login") {
        const isSuperAdmin = data.user.role.includes("Super Admin");

        if (role === "Super Admin" && !isSuperAdmin) {
          setError("Invalid email and password");
          return;
        }

        if (role === "Employee" && isSuperAdmin) {
          setError("Invalid email and password");
          return;
        }

        // Save credentials for autofill on next app open
        localStorage.setItem("rememberedEmail", form.email);
        localStorage.setItem("rememberedPassword", form.password);

        login(data.user, data.token);
      } else {
        alert("Signup successful! Please login."); // Keep alert for success or change to toast? User only mentioned Login errors.
        setMode("login");
      }

    } catch (error) {
      console.error("API Error:", error);
      setError("Server not responding");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-800">
          {mode === "login" ? "Welcome Back 👋" : "Create Account 🚀"}
        </h2>
        <p className="text-sm text-center text-gray-500 mt-1">
          {mode === "login"
            ? "Sign in to continue"
            : "Fill the details to get started"}
        </p>

        {/* Role Selector */}
        <div className="flex justify-center gap-4 mt-6">
          {["Employee", "Super Admin"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setRole(item);
                if (item === "Super Admin" || item === "Employee") setMode("login");
                setError(""); // Clear error on role switch
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition
                ${role === item
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email address"
            value={form.email}
            onChange={handleChange}
            required
            className={`w-full rounded-lg border px-4 py-2 focus:ring-2 focus:outline-none ${error ? "border-red-300 focus:ring-red-200" : "border-gray-300 focus:ring-indigo-500"
              }`}
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              className={`w-full rounded-lg border px-4 py-2 focus:ring-2 focus:outline-none ${error ? "border-red-300 focus:ring-red-200" : "border-gray-300 focus:ring-indigo-500"
                }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-600 focus:outline-none"
            >
              {showPassword ? (
                <AiFillEyeInvisible size={20} />
              ) : (
                <AiFillEye size={20} />
              )}
            </button>
          </div>

          {/* Error Message - Moved below inputs */}
          {error && (
            <div className="mt-2 mb-2 text-red-500 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            {mode === "login" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        {/* Switch */}
        <p className="text-center text-sm text-gray-600 mt-6">
          {mode === "login" ? (
            <>
              {role !== "Super Admin" && role !== "Employee" && (
                <>
                  Don’t have an account?{" "}
                  <button
                    onClick={() => { setMode("signup"); setError(""); }}
                    className="text-indigo-600 font-medium hover:underline"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => { setMode("login"); setError(""); }}
                className="text-indigo-600 font-medium hover:underline"
              >
                Sign In
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default Auth;
