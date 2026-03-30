import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { Device } from '@capacitor/device';
import { useAuth } from "../context/AuthContext";

import { API_URL } from "../utils/config";

const UserOnlyAuth = () => {
  const [mode, setMode] = useState("login"); // Always login
  const [role, setRole] = useState("Employee"); // Always Employee
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

  const [showSessionConfirm, setShowSessionConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError(""); // Clear error when user types
  };

  const handleSubmit = async (e, forceLogout = false) => {
    if (e) e.preventDefault();
    setError(""); // Clear previous errors
    setIsSubmitting(true);

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
        }
      }
    } catch (err) {
    }

    const endpoint = "/v1/app/auth/login";
    const fullUrl = `${API_URL}${endpoint}`;

    try {
      const res = await fetch(fullUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "Employee",
          email: form.email,
          password: form.password,
          deviceId,
          confirmLogout: forceLogout
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setShowSessionConfirm(true);
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        setError(data.message || "Invalid email and password");
        setIsSubmitting(false);
        return;
      }

      if (data.user.role.includes("Super Admin")) {
        setError("Invalid email and password");
        setIsSubmitting(false);
        return;
      }

      // Save credentials for autofill on next app open
      localStorage.setItem("rememberedEmail", form.email);
      localStorage.setItem("rememberedPassword", form.password);

      login(data.user, data.token);

    } catch (error) {
      setError("Server not responding");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4">
      {/* Session Confirmation Modal */}
      {showSessionConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center animate-zoom-in">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Active Session Detected</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              Your account is already logged in on another device. <br />
              <b>Do you want to log out the old device?</b>
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleSubmit(null, true)}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-indigo-100"
              >
                Yes, Logout Other Device
              </button>
              <button
                onClick={() => setShowSessionConfirm(false)}
                className="w-full h-12 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-lg p-7">
        {/* Title */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200 mb-4 transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer">
            <span className="text-2xl">🦊</span>
          </div>
          <h2 className="text-xl font-black text-center text-slate-800 tracking-tight">
            User Portal
          </h2>
          <p className="text-sm text-center text-slate-500 mt-2 font-semibold uppercase">
            Sign in to manage your tasks
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="name@company.com"
              value={form.email}
              onChange={handleChange}
              required
              className={`w-full h-12 rounded-xl border-2 px-4 py-2 transition-all focus:outline-none focus:ring-4 ${error ? "border-red-100 focus:ring-red-50 focus:border-red-300" : "border-slate-100 focus:border-indigo-500 focus:ring-indigo-50"
                }`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                className={`w-full h-12 rounded-xl border-2 px-4 py-2 transition-all focus:outline-none focus:ring-4 ${error ? "border-red-100 focus:ring-red-50 focus:border-red-300" : "border-slate-100 focus:border-indigo-500 focus:ring-indigo-50"
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 focus:outline-none transition-colors"
              >
                {showPassword ? (
                  <AiFillEyeInvisible size={22} />
                ) : (
                  <AiFillEye size={22} />
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold border border-red-100 animate-shake">
              <span className="text-lg">⚠️</span>
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-lg transition-all active:scale-95 shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-3 group"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default UserOnlyAuth;
