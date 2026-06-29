import React, { useState, useEffect } from "react";
import { 
  Plus, Flame, Trash2, Check, TrendingUp, Sparkles, 
  Lightbulb, Loader2, Calendar, Target, Award, Play, 
  HelpCircle, CheckCircle2, ChevronRight, BarChart3, 
  RotateCcw, ShieldCheck, Activity, Brain, BookmarkCheck
} from "lucide-react";
import { Habit, Task, UserPreferences } from "../types";

interface HabitTrackingProps {
  habits: Habit[];
  tasks: Task[];
  preferences?: UserPreferences;
  addHabit: (habitName: string, frequency: 'daily' | 'weekly') => Promise<string | undefined>;
  completeHabitToday: (habitId: string) => Promise<void>;
  deleteHabit: (habitId: string) => Promise<void>;
}

export default function HabitTracking({
  habits,
  tasks,
  preferences,
  addHabit,
  completeHabitToday,
  deleteHabit
}: HabitTrackingProps) {
  
  // Toggles & form states
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [habitName, setHabitName] = useState("");
  const [habitFrequency, setHabitFrequency] = useState<'daily' | 'weekly'>('daily');

  // AI Habit Insights States
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Suggested habits list (examples from user instructions + highly relevant ones)
  const suggestedHabits = [
    { name: "Study Daily", frequency: "daily" as const, category: "Cognitive", desc: "Spend dedicated time studying core materials or programming." },
    { name: "Exercise", frequency: "daily" as const, category: "Physical", desc: "Physical pacing, stretch, or cardio workout to flush cortisol." },
    { name: "Reading", frequency: "weekly" as const, category: "Growth", desc: "Read technical documentation or industry articles." },
    { name: "Daily Standup Review", frequency: "daily" as const, category: "Work", desc: "Review active deadlines, clear logs, and plan tomorrow." },
    { name: "Deep Work Sprint", frequency: "daily" as const, category: "Cognitive", desc: "Execute a single 90-minute hyper-focused block." }
  ];

  // Fetch insights automatically on mount or when habits change
  useEffect(() => {
    if (habits.length > 0) {
      fetchHabitInsights(false);
    }
  }, [habits]);

  const handleHabitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) return;

    await addHabit(habitName, habitFrequency);
    setHabitName("");
    setHabitFrequency('daily');
    setShowAddHabit(false);
  };

  const handleAddSuggested = async (name: string, freq: 'daily' | 'weekly') => {
    await addHabit(name, freq);
  };

  // Generate strategic insights & personalized habit recommendations
  const isFetchingInsights = React.useRef(false);

  const fetchHabitInsights = async (force: boolean = false) => {
    if (isFetchingInsights.current) return;
    isFetchingInsights.current = true;
    setLoadingInsights(true);

    const habitsChecksum = habits.map(h => `${h.id}:${h.streak}:${h.history?.length || 0}`).join("|");
    const cachedChecksum = localStorage.getItem("deadline_guardian_habits_checksum");
    const cachedData = localStorage.getItem("deadline_guardian_habits_data");

    if (!force && cachedChecksum === habitsChecksum && cachedData) {
      setAiInsights(cachedData);
      setLoadingInsights(false);
      isFetchingInsights.current = false;
      return;
    }

    try {
      const response = await fetch("/api/habit-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habits, tasks, preferences })
      });
      if (!response.ok) throw new Error("Failed to load insights");
      const data = await response.json();
      setAiInsights(data.insights);
      localStorage.setItem("deadline_guardian_habits_checksum", habitsChecksum);
      localStorage.setItem("deadline_guardian_habits_data", data.insights);
    } catch (err) {
      console.error(err);
      const fallback = `### 🔥 Habit Streak & Success Analysis
Maintaining daily habits is the ultimate safeguard against procrastination. Building a small 3-day momentum allows your brain to transition into effortless execution mode.

### 🧠 Personalized AI Habit Recommendations
1. **📚 Study Daily & Review (Daily)**: Allocate exactly 30 minutes every morning to review technical materials or work on core projects.
2. **💪 Active Pacing & Exercise (Daily)**: Commit to 15-20 minutes of physical movement to clear cognitive fatigue.
3. **📖 Structured Reading Blocks (Weekly)**: Set a weekend habit to read 1-2 chapters of industry literature.

### ⚡ Daily Consistency Micro-Directives
- **Micro-Commits**: If you don't feel like completing a habit, do it for just 2 minutes. A 2-minute session prevents your streak from resetting.
- **Stacking**: Anchor your new habit immediately after an existing, solid routine.`;
      setAiInsights(fallback);
      localStorage.setItem("deadline_guardian_habits_checksum", habitsChecksum);
      localStorage.setItem("deadline_guardian_habits_data", fallback);
    } finally {
      setLoadingInsights(false);
      isFetchingInsights.current = false;
    }
  };

  // Helper: Get array of the last 7 days of the week (YYYY-MM-DD format)
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        dateStr: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString(undefined, { weekday: 'short' }),
        dayNum: date.getDate()
      });
    }
    return days;
  };

  const last7Days = getLast7Days();

  // Helper: Calculate habit completion percentage / success rate over last 7 days
  const calculateSuccessRate = (habit: Habit) => {
    if (!habit.history || habit.history.length === 0) return 0;
    const completedInLast7 = last7Days.filter(day => habit.history.includes(day.dateStr)).length;
    return Math.round((completedInLast7 / 7) * 100);
  };

  // ----------------------------------------------------
  // METRICS & ANALYTICS COMPUTATIONS
  // ----------------------------------------------------
  const totalHabits = habits.length;
  
  // Calculate aggregate success rate across all habits
  const aggregateSuccessRate = totalHabits > 0
    ? Math.round(habits.reduce((acc, h) => acc + calculateSuccessRate(h), 0) / totalHabits)
    : 0;

  // Maximum active streak
  const maxActiveStreak = totalHabits > 0
    ? Math.max(...habits.map(h => h.streak || 0))
    : 0;

  // Total logged completions in all time
  const totalCompletionsAllTime = habits.reduce((acc, h) => acc + (h.history?.length || 0), 0);

  // Custom Inline Markdown Parser for bold, italics, and code markers
  const parseInlineMarkdown = (text: string) => {
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic text-slate-300">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-400 font-mono text-[11px] border border-slate-800">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  // Custom Markdown parser for high-fidelity rendering
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("###")) {
        return <h4 key={idx} className="text-white font-extrabold text-sm mt-5 mb-2 first:mt-0 flex items-center gap-1.5 border-b border-slate-800 pb-1 uppercase tracking-wide">{parseInlineMarkdown(trimmed.replace("###", "").trim())}</h4>;
      }
      if (trimmed.startsWith("##")) {
        return <h3 key={idx} className="text-white font-black text-base mt-6 mb-3 first:mt-0 border-l-2 border-indigo-500 pl-2">{parseInlineMarkdown(trimmed.replace("##", "").trim())}</h3>;
      }
      if (trimmed.startsWith("#")) {
        return <h2 key={idx} className="text-white font-black text-lg mt-7 mb-4">{parseInlineMarkdown(trimmed.replace("#", "").trim())}</h2>;
      }
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        const content = trimmed.substring(1).trim();
        return (
          <li key={idx} className="text-xs text-slate-300 ml-4 list-disc mb-1.5 leading-relaxed">
            {parseInlineMarkdown(content)}
          </li>
        );
      }
      if (/^\d+\./.test(trimmed)) {
        const content = trimmed.replace(/^\d+\./, "").trim();
        return (
          <li key={idx} className="text-xs text-slate-300 ml-4 list-decimal mb-2 leading-relaxed">
            {parseInlineMarkdown(content)}
          </li>
        );
      }
      if (trimmed === "") return <div key={idx} className="h-2" />;
      return <p key={idx} className="text-xs text-slate-300 leading-relaxed mb-2">{parseInlineMarkdown(trimmed)}</p>;
    });
  };

  return (
    <div className="space-y-8 pb-12 font-sans selection:bg-indigo-500 selection:text-white" id="habit-tracking-module">
      
      {/* 1. Header block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 border border-slate-850 p-6 sm:p-8 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[150px] h-[150px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            Atomic Habit Stack
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Habit Tracking & Streaks Console
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Construct unbreakable cognitive, physical, and developmental routines. Monitor daily completion streaks, visualize success metrics over time, and tap into AI habit architectural strategies.
          </p>
        </div>

        <button 
          onClick={() => setShowAddHabit(true)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-5 py-3 rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 z-10"
        >
          <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
          Build Habit
        </button>
      </div>

      {/* 2. Interactive Habits Analytics Deck (Bento Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Metric 1: Peak Active Streak */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Peak Active Streak</span>
            <div className="bg-amber-500/10 text-amber-400 p-2 rounded-xl border border-amber-500/10">
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white">{maxActiveStreak}d</span>
              <span className="text-xs text-slate-500 font-mono font-bold">Consecutive</span>
            </div>
            {/* Streak trend indicator bar */}
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850 mt-3">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, maxActiveStreak * 10)}%` }}
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-550 leading-relaxed">
            Your single highest running habit streak across all registered protocols.
          </p>
        </div>

        {/* Metric 2: Habits Success Rate */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">7-Day Success Rate</span>
            <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-xl border border-emerald-500/10">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white">{aggregateSuccessRate}%</span>
              <span className="text-xs text-slate-500 font-mono font-bold">Last 7d avg</span>
            </div>
            {/* Success percentage tracker */}
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850 mt-3">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${aggregateSuccessRate}%` }}
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-550 leading-relaxed">
            Average frequency of active completion boxes checked off in the past week.
          </p>
        </div>

        {/* Metric 3: Total Logged All-Time */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Aggregate Completions</span>
            <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-xl border border-indigo-500/10">
              <BookmarkCheck className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white">{totalCompletionsAllTime}</span>
              <span className="text-xs text-slate-500 font-mono font-bold">Total logs</span>
            </div>
            {/* Minimal tracker progress bar */}
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850 mt-3">
              <div 
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, totalCompletionsAllTime * 4)}%` }}
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-550 leading-relaxed">
            Every atomic check-off is stored permanently to build structural momentum logs.
          </p>
        </div>

        {/* Metric 4: Habit Density Ratio */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Habit Density</span>
            <div className="bg-rose-500/10 text-rose-400 p-2 rounded-xl border border-rose-500/10">
              <Brain className="w-4 h-4 text-rose-400" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white">{totalHabits}</span>
              <span className="text-xs text-slate-500 font-mono font-bold">Routines</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850 mt-3">
              <div 
                className="bg-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, totalHabits * 20)}%` }}
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-550 leading-relaxed">
            The total volume of consistent behavioral rules added to your daily guard system.
          </p>
        </div>

      </div>

      {/* 3. AI Habit Recommendations & strategic Architectural Analysis */}
      <div className="bg-slate-900 border border-indigo-500/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-850/60 mb-5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-amber-500 to-indigo-500 p-2 rounded-xl text-slate-950">
              <Sparkles className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-amber-500 font-bold uppercase tracking-wider block">Cognitive Habits Strategy</span>
              <h3 className="font-extrabold text-white text-sm">Personalized AI Habit Builder & Recommendations</h3>
            </div>
          </div>

          <button 
            onClick={() => fetchHabitInsights(true)}
            disabled={loadingInsights}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-md shrink-0"
          >
            {loadingInsights ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Architecting habits...
              </>
            ) : (
              <>
                <Brain className="w-3.5 h-3.5" />
                {aiInsights ? "Re-evaluate Habits" : "Analyze and Recommend Protocols"}
              </>
            )}
          </button>
        </div>

        {/* AI Output Content */}
        {loadingInsights ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 bg-slate-950/40 rounded-xl border border-slate-850/40">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-slate-450 text-xs font-mono">Running Habits Cognitive Diagnostic Engine...</p>
          </div>
        ) : aiInsights ? (
          <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-850 font-sans space-y-4 animate-fadeIn">
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider pb-2 border-b border-slate-900 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verified Habit Architecture Blueprint
            </div>
            <div className="space-y-1 prose prose-invert max-w-none">
              {renderMarkdown(aiInsights)}
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/30 border border-dashed border-slate-850/80 p-8 rounded-xl text-center space-y-2">
            <Lightbulb className="w-8 h-8 text-amber-500/50 mx-auto animate-pulse" />
            <h4 className="font-bold text-white text-xs">Analyze Your Performance Loop</h4>
            <p className="text-slate-500 text-[11px] leading-relaxed max-w-md mx-auto">
              Our AI evaluates your active study list, deadlines, and current roles to recommend custom, frictionless micro-habits. Tap the recommendation button to unlock deep insights.
            </p>
          </div>
        )}
      </div>

      {/* 4. Main workspace columns (Active Habits vs Suggested Starters) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Habit Registry, Check-off & History Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-850">
            <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              Active Routines ({habits.length})
            </h3>
            <span className="text-slate-400 text-xs font-mono">Check off daily loops</span>
          </div>

          {habits.length === 0 ? (
            <div className="bg-slate-900 border border-slate-850 p-12 text-center rounded-2xl shadow-lg">
              <Flame className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <h4 className="font-bold text-white text-sm">No overarching habits active</h4>
              <p className="text-slate-500 text-xs mt-1.5 leading-relaxed max-w-xs mx-auto">
                Select one of the quick starter templates on the right or tap "Build Habit" above to initiate consistent streaks.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {habits.map(habit => {
                const todayStr = new Date().toISOString().split('T')[0];
                const isCompletedToday = habit.history?.includes(todayStr);
                const successRate = calculateSuccessRate(habit);

                return (
                  <div key={habit.id} className="bg-slate-900 border border-slate-850 rounded-2xl p-5 hover:border-slate-800 transition-all shadow-lg space-y-4">
                    
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-slate-100 text-base">{habit.name}</h4>
                          <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-400">
                            {habit.frequency}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px]">
                          Streak: <strong className="text-amber-400 font-bold">{habit.streak || 0} days</strong> • Completion rate: <strong className="text-emerald-400 font-bold">{successRate}%</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Interactive check button */}
                        <button
                          disabled={isCompletedToday}
                          onClick={() => completeHabitToday(habit.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                            isCompletedToday 
                              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 shadow-inner' 
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                          }`}
                        >
                          {isCompletedToday ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              Checked!
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 stroke-[3]" />
                              Complete Today
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => deleteHabit(habit.id)}
                          className="text-slate-500 hover:text-rose-400 p-2 rounded-lg hover:bg-slate-950 transition-all cursor-pointer"
                          title="Delete Protocol"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Streak Calendar / Grid (Last 7 Days Tracker) */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        <span>Consistency Grid</span>
                        <span className="text-slate-400">Past 7 days completions</span>
                      </div>
                      
                      <div className="grid grid-cols-7 gap-2.5">
                        {last7Days.map((day, dIdx) => {
                          const completed = habit.history?.includes(day.dateStr);
                          const isToday = day.dateStr === todayStr;

                          return (
                            <div 
                              key={dIdx} 
                              className={`p-2.5 rounded-xl flex flex-col items-center gap-1.5 transition-all border ${
                                completed 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                  : isToday
                                  ? 'bg-slate-900 border-amber-500/30 text-slate-400'
                                  : 'bg-slate-900/50 border-slate-850 text-slate-500'
                              }`}
                            >
                              <span className="text-[9px] uppercase font-mono font-black">{day.dayName}</span>
                              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[8px] font-bold ${
                                completed
                                  ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                  : isToday
                                  ? 'bg-slate-950 border-amber-500/40 text-amber-500 animate-pulse'
                                  : 'bg-slate-950 border-slate-800'
                              }`}>
                                {completed && <Check className="w-2.5 h-2.5 stroke-[4] text-slate-950" />}
                              </div>
                              <span className="text-[10px] font-mono font-bold leading-none">{day.dayNum}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Column: Instant Starter Templates (Examples required by user) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-850">
            <h3 className="font-extrabold text-white text-base flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-amber-500" />
              Starter Templates
            </h3>
            <span className="bg-slate-950 text-slate-450 px-2 py-0.5 border border-slate-850 rounded text-[9px] font-mono font-bold">
              Fast Track
            </span>
          </div>

          <div className="space-y-4">
            <p className="text-slate-400 text-xs leading-relaxed">
              Unlock consistency instantly with one-click templates configured with smart timeframes:
            </p>

            {suggestedHabits.map((item, index) => {
              // Check if habit already exists
              const alreadyExists = habits.some(h => h.name.toLowerCase() === item.name.toLowerCase());

              return (
                <div key={index} className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-800 transition-all space-y-3 shadow-lg">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-mono font-bold uppercase text-amber-400 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                        {item.category}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 uppercase">{item.frequency}</span>
                    </div>
                    <h4 className="font-bold text-slate-200 text-sm">{item.name}</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">{item.desc}</p>
                  </div>

                  <button
                    disabled={alreadyExists}
                    onClick={() => handleAddSuggested(item.name, item.frequency)}
                    className={`w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      alreadyExists 
                        ? 'bg-slate-950 border border-slate-850 text-slate-550 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                    }`}
                  >
                    {alreadyExists ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        In Dashboard
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        Add Routine
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* CREATE CUSTOM HABIT MODAL */}
      {showAddHabit && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-850">
              <h3 className="font-extrabold text-lg text-white flex items-center gap-1.5">
                <Flame className="w-5 h-5 text-amber-500" />
                Build Custom Habit
              </h3>
              <button onClick={() => setShowAddHabit(false)} className="text-slate-500 hover:text-white font-bold bg-slate-950/40 p-1 rounded-lg">✕</button>
            </div>

            <form onSubmit={handleHabitSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">Habit Protocol Name *</label>
                <input
                  type="text"
                  required
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  placeholder="e.g. Study Daily, Exercise, Reading"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm text-white focus:outline-none placeholder-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">Log Frequency</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setHabitFrequency('daily')}
                    className={`py-2.5 border rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                      habitFrequency === 'daily'
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-850 text-slate-450 hover:border-slate-800'
                    }`}
                  >
                    Daily routine
                  </button>
                  <button
                    type="button"
                    onClick={() => setHabitFrequency('weekly')}
                    className={`py-2.5 border rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                      habitFrequency === 'weekly'
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-850 text-slate-450 hover:border-slate-800'
                    }`}
                  >
                    Weekly routine
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowAddHabit(false)}
                  className="px-4 py-2.5 bg-slate-950 text-slate-300 border border-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-850 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold cursor-pointer shadow-lg"
                >
                  Create Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
