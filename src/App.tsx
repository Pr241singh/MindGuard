/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Kiosk from './components/Kiosk';
import Dashboard from './components/Dashboard';
import { ShieldCheck, LayoutDashboard, Monitor } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [view, setView] = useState<'kiosk' | 'dashboard'>('kiosk');

  return (
    <div className="min-h-screen">
      {/* Navigation Toggle (For Demo Purposes) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-[100] scale-90 md:scale-100">
        <button 
          onClick={() => setView('kiosk')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
            view === 'kiosk' ? "bg-white text-black shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          <Monitor size={16} />
          Student Kiosk
        </button>
        <button 
          onClick={() => setView('dashboard')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
            view === 'dashboard' ? "bg-white text-black shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          <LayoutDashboard size={16} />
          Admin Dashboard
        </button>
      </div>

      {view === 'kiosk' ? <Kiosk /> : <Dashboard />}
    </div>
  );
}

