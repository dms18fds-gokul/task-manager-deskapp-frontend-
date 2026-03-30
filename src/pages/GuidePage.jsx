import React, { useState } from 'react';
import EmployeeSidebar from '../components/EmployeeSidebar';
import { BookOpen } from 'lucide-react';

const GuidePage = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-slate-50 font-sans relative">
            {/* Desktop Sidebar */}
            <EmployeeSidebar className="hidden md:flex" />

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
                    {/* Sidebar container */}
                    <div className="absolute inset-y-0 left-0 z-50">
                        <EmployeeSidebar className="flex h-full shadow-2xl" onClose={() => setIsSidebarOpen(false)} />
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center md:hidden z-10 sticky top-0">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                        <h1 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Guide</h1>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                </header>

                <main className="flex-1 overflow-auto p-4 sm:p-8 md:p-12 custom-scrollbar text-slate-800 bg-white shadow-inner">
                    <article className="max-w-4xl mx-auto space-y-12 pb-16">
                        
                        <header className="border-b border-slate-200 pb-8 mt-4">
                            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-4 uppercase">Task Manager – User Guide</h1>
                            <p className="text-base md:text-lg text-slate-600 leading-relaxed border-t pt-4 font-semibold">
                                This application is designed to help you organize your daily work in a simple and efficient way. Please follow the guidelines below to use it smoothly.
                            </p>
                        </header>

                        <section>
                            <h2 className="text-xl md:text-2xl font-bold border-b-2 border-indigo-100 pb-2 mb-6 text-slate-900 uppercase tracking-wide">Task Types</h2>
                            <p className="text-slate-600 font-medium mb-6">We have 4 types of tasks:</p>
                            
                            <div className="space-y-8">
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-colors">
                                    <h3 className="text-lg md:text-xl font-bold text-indigo-700 mb-3 flex items-center gap-2">
                                        <span className="bg-indigo-600 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs">1</span>
                                        Main Task
                                    </h3>
                                    <p className="text-slate-600 mb-2 font-medium">Main tasks are your primary work items.</p>
                                    <ul className="list-disc list-outside ml-5 text-slate-600 space-y-2">
                                        <li>These are usually professional tasks like: Video Creation, Poster Design, or Development Work.</li>
                                        <li>Any task that takes more than <strong>20 minutes</strong> can be added as a Main Task.</li>
                                    </ul>
                                </div>

                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-colors">
                                    <h3 className="text-lg md:text-xl font-bold text-indigo-700 mb-3 flex items-center gap-2">
                                        <span className="bg-indigo-600 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs">2</span>
                                        Quick Task
                                    </h3>
                                    <p className="text-slate-600 mb-2 font-medium">Quick tasks are short, intermediate tasks that come in between your main work.</p>
                                    <ul className="list-disc list-outside ml-5 text-slate-600 space-y-2">
                                        <li>Examples: Sending an email, preparing a quick document, small requests from team members.</li>
                                        <li>These tasks usually take around <strong>10–15 minutes</strong> (can extend slightly if needed).</li>
                                    </ul>
                                </div>

                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-colors">
                                    <h3 className="text-lg md:text-xl font-bold text-indigo-700 mb-3 flex items-center gap-2">
                                        <span className="bg-indigo-600 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs">3</span>
                                        Meeting
                                    </h3>
                                    <p className="text-slate-600 mb-2 font-medium">Use this form for all types of discussions.</p>
                                    <ul className="list-disc list-outside ml-5 text-slate-600 space-y-2">
                                        <li>Includes: Meetings with managers, calls, internal team discussions.</li>
                                        <li>Only <strong>one person needs to create the meeting</strong> and select participants. It will be reflected for others automatically.</li>
                                        <li>Meeting time is entered <strong>manually</strong>.</li>
                                    </ul>
                                </div>

                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-colors">
                                    <h3 className="text-lg md:text-xl font-bold text-indigo-700 mb-3 flex items-center gap-2">
                                        <span className="bg-indigo-600 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs">4</span>
                                        Recurring Task
                                    </h3>
                                    <p className="text-slate-600 mb-2 font-medium">Recurring tasks are for regular activities you do daily.</p>
                                    <ul className="list-disc list-outside ml-5 text-slate-600 space-y-2">
                                        <li>You can create it once and reuse it every day.</li>
                                        <li>Designed to save time and make your workflow easier.</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl md:text-2xl font-bold border-b-2 border-indigo-100 pb-2 mb-6 text-slate-900 uppercase tracking-wide">Time Tracking</h2>
                            <ul className="list-disc list-outside ml-5 text-slate-600 space-y-3 font-medium">
                                <li><strong className="text-indigo-600">Main Task, Quick Task, and Recurring Task</strong> → Time is calculated automatically</li>
                                <li><strong className="text-indigo-600">Meeting</strong> → Time is entered manually</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl md:text-2xl font-bold border-b-2 border-indigo-100 pb-2 mb-6 text-slate-900 uppercase tracking-wide">Important Guidelines</h2>
                            <ol className="list-decimal list-outside ml-5 text-slate-600 space-y-5">
                                <li>
                                    <strong className="text-slate-800">Always create or accept a task before starting work.</strong>
                                    <p className="mt-1 font-medium">Please ensure the task is created or assigned and accepted before you begin.</p>
                                </li>
                                <li>
                                    <strong className="text-slate-800">Update task status properly.</strong>
                                    <p className="mt-1 font-medium">Before going for lunch or leaving for the day:<br/>Mark the task as <span className="text-indigo-600">Completed</span> or <span className="text-indigo-600">On Hold</span>.</p>
                                </li>
                                <li>
                                    <strong className="text-slate-800">Only one task should be In Progress at a time.</strong>
                                    <p className="mt-1 font-medium">If you start another task:<br/>Put the current task on <span className="text-indigo-600">Hold</span>, then start the new one.</p>
                                </li>
                                <li>
                                    <strong className="text-slate-800">Need help?</strong>
                                    <p className="mt-1 font-medium">If you have any doubts or questions, feel free to reach out to the Development Team.</p>
                                </li>
                            </ol>
                        </section>

                        <section className="bg-indigo-50 border-l-4 border-indigo-600 p-6 flex flex-col mt-12 text-indigo-900 rounded-r-2xl">
                            <strong className="block mb-2 text-indigo-900 text-lg uppercase tracking-wider">Note</strong>
                            <p className="mb-4 font-medium italic">This application is built to make your work easier and more organized. Please use it regularly to maintain a clear and accurate workflow.</p>
                            <p className="font-bold">Thank you 😊</p>
                        </section>

                    </article>
                </main>
            </div>
        </div>
    );
};

export default GuidePage;
