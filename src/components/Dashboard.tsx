import React, { useState, useEffect } from 'react';
import { 
  Users, AlertCircle, History, TrendingUp, Bell, Search, 
  ChevronRight, Filter, MoreVertical, ShieldAlert,
  ArrowUpRight, Clock, User
} from 'lucide-react';
import { io } from 'socket.io-client';
import { cn } from '../lib/utils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Alert } from '../types';

const socket = io();

const chartData = [
  { time: '08:00', totalRisk: 4 },
  { time: '10:00', totalRisk: 12 },
  { time: '12:00', totalRisk: 8 },
  { time: '14:00', totalRisk: 18 },
  { time: '16:00', totalRisk: 24 },
  { time: '18:00', totalRisk: 15 },
];

export default function Dashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'alerts'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Initial fetch
    fetch('/api/students').then(res => res.json()).then(setStudents);
    fetch('/api/alerts').then(res => res.json()).then(setAlerts);

    // Socket listeners
    socket.on('new-alert', (alert: Alert) => {
      setAlerts(prev => [alert, ...prev]);
      // Play alert sound logic could go here
    });

    socket.on('students-update', (updatedStudents: Student[]) => {
      setStudents(updatedStudents);
    });

    return () => {
      socket.off('new-alert');
      socket.off('students-update');
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'risk': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans flex">
      {/* Sidebar */}
      <div className="w-64 bg-[#0a0a0a] border-r border-slate-800/50 flex flex-col">
        <div className="p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">MindGuard AI</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavItem active={activeTab === 'overview'} icon={<TrendingUp size={18} />} label="Overview" onClick={() => setActiveTab('overview')} />
          <NavItem active={activeTab === 'students'} icon={<Users size={18} />} label="Student List" onClick={() => setActiveTab('students')} />
          <NavItem active={activeTab === 'alerts'} icon={<Bell size={18} />} label="Alert Logs" onClick={() => setActiveTab('alerts')} />
        </nav>
        <div className="p-4 border-t border-slate-800/50">
          <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
              <User size={14} />
            </div>
            <div>
              <div className="text-xs font-semibold">Counselor_Admin</div>
              <div className="text-[10px] text-slate-500">Live Session Active</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-800/50 flex items-center justify-between px-8 bg-[#0a0a0a]/50 backdrop-blur-md">
          <h1 className="text-xl font-semibold capitalize">{activeTab}</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input 
                placeholder="Search students..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-full pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:border-blue-500 w-64"
              />
            </div>
            <button className="p-2 bg-slate-900 border border-slate-800 rounded-full text-slate-400 hover:text-white transition-colors relative">
              <Bell size={18} />
              {alerts.length > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0a0a0a]" />}
            </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-8 space-y-8 bg-grid-pattern">
          {activeTab === 'overview' && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Live Students" value={students.length.toString()} icon={<Users className="text-blue-500" />} trend="+2 this hour" />
                <StatCard label="Avg. Risk Score" value="24.5" icon={<TrendingUp className="text-emerald-500" />} trend="Down 12%" color="emerald" />
                <StatCard label="Active Alerts" value={alerts.length.toString()} icon={<Bell className="text-amber-500" />} trend={`${alerts.length} unread`} color="amber" />
                <StatCard label="Critical Cases" value={students.filter(s => s.status === 'critical').length.toString()} icon={<AlertCircle className="text-red-500" />} trend="Requires Immediate Action" color="red" />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-[#0a0a0a] border border-slate-800/80 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-lg">Risk Trend Analysis</h3>
                    <select className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-xs">
                      <option>Last 24 Hours</option>
                      <option>Last 7 Days</option>
                    </select>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                          itemStyle={{ color: '#3b82f6' }}
                        />
                        <Area type="monotone" dataKey="totalRisk" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRisk)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[#0a0a0a] border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col">
                  <h3 className="font-semibold text-lg mb-6">Recent Escalations</h3>
                  <div className="flex-1 space-y-4">
                    {alerts.slice(0, 5).map(alert => (
                      <div key={alert.id} className="flex gap-4 p-3 bg-slate-900/40 border border-slate-800/50 rounded-2xl">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          alert.level === 'high' ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                        )}>
                          <AlertCircle size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">
                            {students.find(s => s.id === alert.studentId)?.name || 'Unknown Student'}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock size={10} /> {new Date(alert.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="ml-auto">
                          <div className={cn(
                            "text-xs px-2 py-0.5 rounded-full border",
                            alert.level === 'high' ? "border-red-500/30 text-red-500" : "border-amber-500/30 text-amber-500"
                          )}>
                            {alert.level.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    ))}
                    {alerts.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                        <ShieldAlert className="w-8 h-8 mb-2 opacity-20" />
                        No active alerts
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Student Table/Grid */}
              <div className="bg-[#0a0a0a] border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
                 <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
                    <h3 className="font-semibold text-lg text-white">Student Monitoring Matrix</h3>
                    <button className="text-xs text-blue-400 font-medium flex items-center gap-1 hover:underline">
                      Export Data <ArrowUpRight size={14} />
                    </button>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="bg-slate-900/30 text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                             <th className="px-6 py-4 font-medium">Student Profile</th>
                             <th className="px-6 py-4 font-medium">Academic Info</th>
                             <th className="px-6 py-4 font-medium text-center">Current Risk Status</th>
                             <th className="px-6 py-4 font-medium text-center">Score</th>
                             <th className="px-6 py-4 font-medium text-right">Last Interaction</th>
                             <th className="px-6 py-4 font-medium"></th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-800/50">
                          {students.map(student => (
                            <tr key={student.id} className="hover:bg-slate-900/20 transition-colors group">
                               <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <User size={20} />
                                     </div>
                                     <div className="font-medium text-slate-200">{student.name}</div>
                                  </div>
                               </td>
                               <td className="px-6 py-4 text-slate-400 text-sm">{student.grade} Grade</td>
                               <td className="px-6 py-4 text-center">
                                  <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider", getStatusColor(student.status))}>
                                     {student.status.toUpperCase()}
                                  </span>
                               </td>
                               <td className="px-6 py-4 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="text-lg font-mono">{student.riskScore}%</div>
                                    <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                       <div className={cn("h-full", student.riskScore > 60 ? 'bg-red-500' : 'bg-blue-500')} style={{ width: `${student.riskScore}%` }} />
                                    </div>
                                  </div>
                               </td>
                               <td className="px-6 py-4 text-right text-slate-500 text-xs">
                                  {new Date(student.lastUpdate).toLocaleTimeString()}
                               </td>
                               <td className="px-6 py-4 text-center">
                                  <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-600 hover:text-slate-200 transition-colors">
                                     <ChevronRight size={18} />
                                  </button>
                               </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
            </>
          )}

          {activeTab === 'alerts' && (
             <div className="max-w-4xl mx-auto space-y-4">
                <AnimatePresence>
                  {alerts.map((alert, i) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={alert.id}
                      className={cn(
                        "p-6 rounded-3xl border flex items-start gap-6",
                        alert.level === 'high' ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-900/50 border-slate-800'
                      )}
                    >
                       <div className={cn(
                         "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                         alert.level === 'high' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                       )}>
                          <AlertCircle size={24} />
                       </div>
                       <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-lg">
                              {students.find(s => s.id === alert.studentId)?.name || 'Unknown Student'}
                            </h4>
                            <span className="text-xs text-slate-500">{new Date(alert.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-400 text-sm italic">"{alert.behavioralNotes}"</p>
                          <div className="flex gap-4 pt-4">
                             <DetailItem label="Detected Emotion" value={alert.emotion} />
                             <DetailItem label="Risk Score" value={`${alert.riskScore}%`} />
                             <DetailItem label="NLPSentiment" value={alert.textSentiment} />
                          </div>
                       </div>
                       <div className="flex flex-col gap-2">
                          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl active:scale-95 transition-all">
                             NOTIFY PARENT
                          </button>
                          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl active:scale-95 transition-all">
                             DISMISS
                          </button>
                       </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
             </div>
          )}
        </main>
      </div>
    </div>
  );
}

function NavItem({ active, icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
        active 
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
      )}
    >
      <span className={cn(active ? "text-white" : "text-slate-500 group-hover:text-slate-300")}>{icon}</span>
      {label}
    </button>
  );
}

function StatCard({ label, value, icon, trend, color = 'blue' }: any) {
  const colors: any = {
    blue: 'border-blue-500/20 text-blue-500',
    emerald: 'border-emerald-500/20 text-emerald-500',
    amber: 'border-amber-500/20 text-amber-500',
    red: 'border-red-500/20 text-red-500',
  };

  return (
    <div className="bg-[#0a0a0a] border border-slate-800/80 p-6 rounded-3xl shadow-xl transition-transform hover:-translate-y-1">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-slate-900 border", colors[color])}>
          {icon}
        </div>
        <div className="text-[10px] font-mono text-slate-500 tracking-wider">REALTIME_STAT</div>
      </div>
      <div className="space-y-1">
        <div className="text-3xl font-bold tracking-tight text-white">{value}</div>
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{label}</div>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-800 text-[10px] text-slate-400 flex items-center gap-1 font-medium italic">
        {trend}
      </div>
    </div>
  );
}

function DetailItem({ label, value }: any) {
  return (
    <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl">
      <div className="text-[9px] text-slate-500 uppercase tracking-tighter mb-0.5">{label}</div>
      <div className="text-xs font-bold text-slate-200">{value}</div>
    </div>
  );
}
