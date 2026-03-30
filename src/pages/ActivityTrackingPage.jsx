import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import axios from 'axios';
import { API_URL } from '../config';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { Activity, Globe, Clock, User, Search, Monitor, LayoutDashboard, History, Maximize2, X } from 'lucide-react';

const ActivityTrackingPage = () => {
  const [users, setUsers] = useState([]);
  const [userStatuses, setUserStatuses] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Track which section is in full-screen modal mode ('chart', 'timeline', 'table', or null)
  const [expandedSection, setExpandedSection] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchUserStatuses();
    const intervalId = setInterval(fetchUserStatuses, 30000); // Poll status every 30 seconds
    return () => clearInterval(intervalId);
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/employee/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const fetchUserStatuses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/track/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserStatuses(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch user statuses", err);
    }
  };

  const fetchActivityData = async (userId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [logsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/track/logs/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/track/stats/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setLogs(logsRes.data.data);
      setStats(statsRes.data.data);
    } catch (err) {
      console.error("Failed to fetch activity data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    fetchActivityData(user._id);
  };

  const filteredUsers = users.filter((u) => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#14b8a6', '#f43f5e'];

  // --- Reusable Render Blocks for Grid & Fullscreen Modal --- //

  const renderChart = () => (
    <div className="w-full h-full relative min-h-[250px]">
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-medium">Analyzing data...</div>
      ) : stats.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-medium">No browsing data available.</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="_id" 
              tick={{fontSize: expandedSection ? 12 : 10, fill: '#94a3b8', fontWeight: 600}} 
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              height={expandedSection ? 50 : 30}
              tickFormatter={(val) => val.length > 20 ? val.substring(0, 20) + '...' : val}
            />
            <YAxis 
              tick={{fontSize: expandedSection ? 12 : 10, fill: '#94a3b8', fontWeight: 600}} 
              tickLine={false} 
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', fontWeight: '600' }}
              labelStyle={{ fontWeight: '800', color: '#1e293b', marginBottom: '6px', fontSize: '13px' }}
              itemStyle={{color: '#4f46e5', fontSize: '14px', fontWeight: 'bold'}}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={expandedSection ? 80 : 45}>
              {stats.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );

  const renderTimeline = () => (
    <div className="h-full overflow-y-auto pr-4 relative custom-scrollbar">
      {loading ? (
        <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">Fetching stream...</div>
      ) : logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">Waiting for activity...</div>
      ) : (
        <div className="space-y-5 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-slate-100 pb-10">
          {logs.slice(0, expandedSection ? 100 : 50).map((log, idx) => (
            <div key={idx} className="relative flex gap-4 items-start group">
              <div className={`absolute left-[7px] top-1.5 w-[10px] h-[10px] rounded-full border-2 border-white ring-4 ring-white z-10 transition-colors ${idx === 0 ? 'bg-indigo-500 w-[12px] h-[12px] left-[6px]' : 'bg-slate-200 group-hover:bg-indigo-400'}`}></div>
              <div className="flex-1 ml-6 min-w-0 bg-slate-50/50 hover:bg-slate-50 p-4 rounded-xl border border-transparent hover:border-slate-200 transition-all cursor-default">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2 sm:gap-4 mb-2">
                  <div className="text-sm font-bold text-slate-700 break-words leading-relaxed" title={log.title}>
                    {log.title || 'Untitled Page'}
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-400 whitespace-nowrap pt-0.5">
                    {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <a href={log.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-indigo-500 hover:text-indigo-700 hover:underline break-all opacity-80 group-hover:opacity-100 transition-opacity">
                  {expandedSection ? log.url : new URL(log.url).hostname.replace('www.', '')}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTable = () => (
    <div className="h-full overflow-auto custom-scrollbar">
        {logs.length === 0 && !loading ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
            No browsing history recorded for this user.
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-md shadow-sm">
              <tr>
                <th className="px-6 py-4 text-[10px] md:text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-200/80 w-[200px]">Timestamp</th>
                <th className="px-6 py-4 text-[10px] md:text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-200/80 w-[30%]">Page Interface</th>
                <th className="px-6 py-4 text-[10px] md:text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-200/80">Session URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log, idx) => (
                <tr key={idx} className="hover:bg-indigo-50/40 transition-colors group">
                  <td className="px-6 py-4 text-xs font-bold text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString([], {
                      month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })}
                  </td>
                  <td className={`px-6 py-4 text-sm font-semibold text-slate-800 ${expandedSection ? 'whitespace-normal' : 'max-w-sm xl:max-w-md truncate'}`}>
                    {log.title || <span className="text-slate-400 italic font-medium">No Title Provided</span>}
                  </td>
                  <td className={`px-6 py-4 text-sm ${expandedSection ? 'whitespace-normal break-all' : 'max-w-sm xl:max-w-lg truncate'}`}>
                    <a href={log.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:text-indigo-800 hover:underline transition-colors flex items-center gap-1.5 w-fit">
                      {log.url}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] font-sans relative">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden md:flex shadow-xl z-20" />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>
          {/* Sidebar container */}
          <div className="absolute inset-y-0 left-0 z-50 transform transition-transform shadow-2xl">
            <Sidebar className="flex h-full border-r border-slate-700" onClose={() => setIsSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        
        {/* Mobile Header Wrapper */}
        <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center md:hidden z-10 sticky top-0">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight uppercase">History</h1>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar relative">
            
          {/* Header Section */}
          <div className="hidden md:flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3 uppercase">
                <div className="bg-indigo-100 p-2.5 rounded-xl shadow-inner border border-indigo-200 ">
                  <Monitor className="w-7 h-7 text-indigo-600" />
                </div>
                Browser Tab History
              </h1>
              <p className="text-slate-500 mt-3 font-medium ml-1">Monitor your team's real-time browser activity, most visited domains, and complete usage footprint.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 md:gap-8 h-full min-h-0">
            
            {/* 1. Left Sidebar: Employee Roster */}
            <div className="xl:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200/60 flex flex-col overflow-hidden h-full">
              <div className="p-5 border-b border-slate-100 bg-white/50 backdrop-blur-sm z-10">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Select Employee</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">No employees found.</div>
                ) : (
                  filteredUsers.map((user) => {
                    const statusInfo = userStatuses.find(s => s._id === user._id) || { status: 'Offline', lastSeen: null };
                    const isActive = statusInfo.status === 'Active';

                    return (
                      <div
                        key={user._id}
                        onClick={() => handleUserSelect(user)}
                        className={`group p-3 cursor-pointer rounded-xl flex items-center gap-3.5 transition-all duration-200 ${
                          selectedUser?._id === user._id 
                            ? 'bg-indigo-50/80 shadow-sm ring-1 ring-indigo-200' 
                            : 'hover:bg-slate-50 border border-transparent hover:border-slate-100'
                        }`}
                      >
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
                          selectedUser?._id === user._id 
                            ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-200/50' 
                            : 'bg-slate-100 text-slate-600 group-hover:bg-white group-hover:shadow-sm group-hover:text-indigo-600'
                        }`}>
                          {user.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-semibold truncate leading-tight ${selectedUser?._id === user._id ? 'text-indigo-900' : 'text-slate-700'}`}>
                            {user.name}
                          </div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                            {Array.isArray(user.role) ? user.role.join(", ") : user.role || 'N/A'}
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-slate-500 font-semibold tracking-wide">{user.employeeId}</span>
                            <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-full border border-slate-100 shadow-sm shrink-0">
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-slate-300'}`}></span>
                              <span className={`text-[9px] font-extrabold tracking-wider uppercase ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {isActive ? 'Online' : 'Offline'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. Main Dashboard Area */}
            <div className="xl:col-span-3 flex flex-col h-full min-h-0 space-y-6 md:space-y-8">
              
              {!selectedUser ? (
                /* Empty State */
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200/60 flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <div className="w-24 h-24 bg-gradient-to-tr from-indigo-50 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 shrink-0 shadow-inner ring-8 ring-indigo-50/50">
                      <History className="w-10 h-10 text-indigo-400/80" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-3">Select a Team Member</h2>
                    <p className="text-slate-500 leading-relaxed font-medium">
                      Choose an employee from the roster on the left to instantly view their live browser activity, most visited domains, and complete usage timeline.
                    </p>
                  </div>
                </div>
              ) : (
                /* Loaded State */
                <>
                  {/* Top Stats Row: Charts & Timeline */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8 h-auto lg:h-[45%] shrink-0">
                    
                    {/* Bar Chart Card */}
                    <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col hover:shadow-md transition-shadow relative group/card">
                      <div className="flex items-center justify-between mb-6 shrink-0">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest">
                            <Globe className="w-4 h-4 text-indigo-500" /> Top Domains
                          </h3>
                          {stats.length > 0 && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50/80 px-2.5 py-1 rounded-md uppercase tracking-wider">Top {stats.length}</span>}
                        </div>
                        {stats.length > 0 && (
                          <button 
                            onClick={() => setExpandedSection('chart')} 
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover/card:opacity-100 focus:opacity-100"
                            title="Expand Chart"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="flex-1 w-full min-h-0 relative">
                        {renderChart()}
                      </div>
                    </div>

                    {/* Timeline Tracker Card */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200/60 flex flex-col overflow-hidden relative hover:shadow-md transition-shadow group/card">
                      <div className="p-6 border-b border-slate-100 bg-white z-10 shrink-0 flex justify-between items-center">
                        <h3 className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest">
                          <Activity className="w-4 h-4 text-emerald-500" /> Live Feed
                        </h3>
                        {logs.length > 0 && (
                          <button 
                            onClick={() => setExpandedSection('timeline')} 
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover/card:opacity-100 focus:opacity-100"
                            title="Expand Feed"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="flex-1 overflow-hidden relative">
                         {renderTimeline()}
                      </div>
                    </div>

                  </div>

                  {/* Bottom History Table */}
                  <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col min-h-0 hover:shadow-md transition-shadow group/card mb-6">
                    <div className="p-4 md:p-6 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-4">
                        <h3 className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest">
                          <Clock className="w-4 h-4 text-slate-400" /> Trace History Logs
                        </h3>
                        <div className="hidden sm:flex text-[10px] font-bold tracking-wider text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 items-center gap-2 uppercase">
                          <Monitor className="w-3 h-3 text-indigo-400" /> 
                          {logs[0]?.deviceId ? `Agent: ${logs[0]?.deviceId}` : 'Agent Not Synced'}
                        </div>
                      </div>
                      {logs.length > 0 && (
                        <button 
                          onClick={() => setExpandedSection('table')} 
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors md:opacity-0 md:group-hover/card:opacity-100 focus:opacity-100"
                          title="Expand Table"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                       {renderTable()}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* --- FULLSCREEN MODALS OVERLAY --- */}
      {expandedSection && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
          <div className="bg-white w-full h-full max-w-[1600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-3">
                {expandedSection === 'chart' && <><Globe className="text-indigo-500 w-6 h-6"/> Top Visited Domains</>}
                {expandedSection === 'timeline' && <><Activity className="text-emerald-500 w-6 h-6"/> Full Live Feed History</>}
                {expandedSection === 'table' && <><Clock className="text-slate-500 w-6 h-6"/> Comprehensive Trace History Logs</>}
              </h2>
              <button 
                onClick={() => setExpandedSection(null)} 
                className="p-2.5 bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 rounded-xl text-slate-500 hover:text-rose-600 transition-all focus:outline-none focus:ring-2 focus:ring-rose-200 shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-hidden p-6 md:p-10 bg-white">
              {expandedSection === 'chart' && renderChart()}
              {expandedSection === 'timeline' && (
                <div className="w-full max-w-4xl mx-auto h-full overflow-hidden border border-slate-200 rounded-xl p-6 bg-slate-50/30">
                  {renderTimeline()}
                </div>
              )}
              {expandedSection === 'table' && (
                <div className="w-full h-full border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                  {renderTable()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ActivityTrackingPage;
