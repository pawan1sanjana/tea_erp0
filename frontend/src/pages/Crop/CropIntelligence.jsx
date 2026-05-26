import React, { useState, useRef, useEffect } from 'react';
import { Leaf, Activity, Shovel, Scissors, Sprout, Droplets, Briefcase, ChevronDown, Check } from 'lucide-react';
import PluckingIntel from './PluckingIntel';
import PruningIntel from './PruningIntel';
import WeedingIntel from './WeedingIntel';
import ManureIntel from './ManureIntel';
import LoppingIntel from './LoppingIntel';
import FoliarApplications from './FoliarIntel';
import OtherWorksIntel from './OtherWorksIntel';

const tasks = [
  { id: 'Plucking', icon: Leaf, colorClass: 'green', label: 'Plucking' },
  { id: 'Pruning', icon: Scissors, colorClass: 'emerald', label: 'Pruning' },
  { id: 'Weeding', icon: Shovel, colorClass: 'sky', label: 'Weeding' },
  { id: 'Manure', icon: Sprout, colorClass: 'amber', label: 'Manure' },
  { id: 'Lopping', icon: Activity, colorClass: 'violet', label: 'Lopping' },
  { id: 'Foliar', icon: Droplets, colorClass: 'cyan', label: 'Foliar' },
  { id: 'Other', icon: Briefcase, colorClass: 'indigo', label: 'Other Works' },
];

// Per-color Tailwind class maps (must be complete strings for Tailwind to include them)
const colorMap = {
  green: { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500', bgLight: 'bg-green-500/10 dark:bg-green-500/20', border: 'border-green-500/30 dark:border-green-500/40', iconInactive: 'bg-green-500/20 dark:bg-green-500/30 text-green-600 dark:text-green-400', hover: 'hover:bg-green-500/10 dark:hover:bg-green-500/15' },
  emerald: { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500', bgLight: 'bg-emerald-500/10 dark:bg-emerald-500/20', border: 'border-emerald-500/30 dark:border-emerald-500/40', iconInactive: 'bg-emerald-500/20 dark:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400', hover: 'hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15' },
  sky: { text: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500', bgLight: 'bg-sky-500/10 dark:bg-sky-500/20', border: 'border-sky-500/30 dark:border-sky-500/40', iconInactive: 'bg-sky-500/20 dark:bg-sky-500/30 text-sky-600 dark:text-sky-400', hover: 'hover:bg-sky-500/10 dark:hover:bg-sky-500/15' },
  amber: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', bgLight: 'bg-amber-500/10 dark:bg-amber-500/20', border: 'border-amber-500/30 dark:border-amber-500/40', iconInactive: 'bg-amber-500/20 dark:bg-amber-500/30 text-amber-600 dark:text-amber-400', hover: 'hover:bg-amber-500/10 dark:hover:bg-amber-500/15' },
  violet: { text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500', bgLight: 'bg-violet-500/10 dark:bg-violet-500/20', border: 'border-violet-500/30 dark:border-violet-500/40', iconInactive: 'bg-violet-500/20 dark:bg-violet-500/30 text-violet-600 dark:text-violet-400', hover: 'hover:bg-violet-500/10 dark:hover:bg-violet-500/15' },
  cyan: { text: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500', bgLight: 'bg-cyan-500/10 dark:bg-cyan-500/20', border: 'border-cyan-500/30 dark:border-cyan-500/40', iconInactive: 'bg-cyan-500/20 dark:bg-cyan-500/30 text-cyan-600 dark:text-cyan-400', hover: 'hover:bg-cyan-500/10 dark:hover:bg-cyan-500/15' },
  indigo: { text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500', bgLight: 'bg-indigo-500/10 dark:bg-indigo-500/20', border: 'border-indigo-500/30 dark:border-indigo-500/40', iconInactive: 'bg-indigo-500/20 dark:bg-indigo-500/30 text-indigo-600 dark:text-indigo-400', hover: 'hover:bg-indigo-500/10 dark:hover:bg-indigo-500/15' },
};

function TaskDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const active = tasks.find(t => t.id === value) || tasks[0];
  const ac = colorMap[active.colorClass];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative min-w-[220px]">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`
          flex items-center gap-2.5 w-full px-3 py-2.5 rounded-2xl
          border-2 ${ac.border} ${ac.bgLight}
          cursor-pointer transition-all duration-200 outline-none
          focus-visible:ring-2 focus-visible:ring-offset-2
        `}
      >
        {/* Icon badge */}
        <span className={`flex items-center justify-center w-8 h-8 rounded-lg ${ac.bg} text-white flex-shrink-0`}>
          <active.icon size={15} />
        </span>

        {/* Label */}
        <span className={`flex-1 text-left text-[11px] font-black uppercase tracking-widest ${ac.text}`}>
          {active.label}
        </span>

        {/* Chevron */}
        <ChevronDown
          size={15}
          className={`flex-shrink-0 transition-transform duration-200 ${ac.text} ${open ? 'rotate-180' : 'rotate-0'}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="
          absolute top-[calc(100%+6px)] left-0 right-0 z-50
          rounded-2xl overflow-hidden
          border border-slate-200 dark:border-slate-700
          bg-white dark:bg-slate-900
          shadow-xl shadow-black/10 dark:shadow-black/40
          animate-[dropIn_0.15s_ease]
        ">
          <style>{`@keyframes dropIn { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }`}</style>

          {tasks.map((t, i) => {
            const selected = t.id === value;
            const c = colorMap[t.colorClass];
            return (
              <button
                key={t.id}
                onClick={() => { onChange(t.id); setOpen(false); }}
                className={`
                  flex items-center gap-2.5 w-full px-3 py-2.5
                  border-none outline-none cursor-pointer
                  transition-colors duration-150 text-left
                  ${i < tasks.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}
                  ${selected ? c.bgLight : `bg-transparent ${c.hover}`}
                `}
              >
                {/* Icon badge */}
                <span className={`
                  flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 transition-all duration-150
                  ${selected ? `${c.bg} text-white` : c.iconInactive}
                `}>
                  <t.icon size={13} />
                </span>

                {/* Label */}
                <span className={`
                  flex-1 text-[11px] font-black uppercase tracking-widest transition-colors duration-150
                  ${selected ? c.text : 'text-slate-500 dark:text-slate-400'}
                `}>
                  {t.label}
                </span>

                {/* Check mark */}
                {selected && (
                  <Check size={13} className={`flex-shrink-0 ${c.text}`} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CropIntelligence() {
  const [taskType, setTaskType] = useState('Plucking');

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-outfit tracking-tight italic">
            Estate Operations
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
            Maintain Daily Field Duties
          </p>
        </div>

        <TaskDropdown value={taskType} onChange={setTaskType} />
      </div>

      <div className="mt-4 relative">
        {taskType === 'Plucking' && <PluckingIntel isEmbedded={true} />}
        {taskType === 'Pruning' && <PruningIntel isEmbedded={true} />}
        {taskType === 'Weeding' && <WeedingIntel isEmbedded={true} />}
        {taskType === 'Manure' && <ManureIntel isEmbedded={true} />}
        {taskType === 'Lopping' && <LoppingIntel isEmbedded={true} />}
        {taskType === 'Foliar' && <FoliarApplications isEmbedded={true} />}
        {taskType === 'Other' && <OtherWorksIntel isEmbedded={true} />}
      </div>
    </div>
  );
}