import React, { useState, useEffect } from "react";
import { 
  Plus, Target, Flame, Trash2, CheckCircle2,
  Calendar, Award, Sparkles, Check, TrendingUp, 
  Lightbulb, Bot, ChevronRight, AlertCircle, Eye, X
} from "lucide-react";
import { Goal, Habit, Task } from "../types";

interface GoalTrackingProps {
  goals: Goal[];
  habits: Habit[];
  tasks: Task[];
  addGoal: (goal: Omit<Goal, "id" | "createdAt" | "progress">) => Promise<string | undefined>;
  updateGoal: (goalId: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  addHabit: (habitName: string, frequency: 'daily' | 'weekly') => Promise<string | undefined>;
  completeHabitToday: (habitId: string) => Promise<void>;
  deleteHabit: (habitId: string) => Promise<void>;
  preferences?: any;
}

export default function GoalTracking({
  goals,
  habits,
  tasks,
  addGoal,
  updateGoal,
  deleteGoal,
  addHabit,
  completeHabitToday,
  deleteHabit
}: GoalTrackingProps) {
  
  // Toggles & Tab selection
  const [activeSubTab, setActiveSubTab] = useState<'goals' | 'habits'>('goals');
  const [goalFilter, setGoalFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(false);

  // Forms
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTimeframe, setGoalTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [goalTargetDate, setGoalTargetDate] = useState("");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const [habitName, setHabitName] = useState("");
  const [habitFrequency, setHabitFrequency] = useState<'daily' | 'weekly'>('daily');

  // Strategic Advisor insights
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Set default targets based on timeframe selection
  useEffect(() => {
    const now = new Date();
    if (goalTimeframe === 'daily') {
      setGoalTargetDate(now.toISOString().split('T')[0]);
    } else if (goalTimeframe === 'weekly') {
      const currentDay = now.getDay();
      const diff = 7 - (currentDay === 0 ? 7 : currentDay);
      const sunday = new Date(now);
      sunday.setDate(now.getDate() + diff);
      setGoalTargetDate(sunday.toISOString().split('T')[0]);
    } else if (goalTimeframe === 'monthly') {
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setGoalTargetDate(lastDay.toISOString().split('T')[0]);
    }
  }, [goalTimeframe, showAddGoal]);

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim() || !goalTargetDate) return;

    await addGoal({
      title: goalTitle,
      targetDate: new Date(goalTargetDate).toISOString(),
      linkedTasks: selectedTasks,
      timeframe: goalTimeframe
    });

    setGoalTitle("");
    setGoalTargetDate("");
    setSelectedTasks([]);
    setShowAddGoal(false);
    setAiInsights(null); // Clear insights to trigger recalculation
  };

  const handleHabitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) return;

    await addHabit(habitName, habitFrequency);
    setHabitName("");
    setHabitFrequency('daily');
    setShowAddHabit(false);
  };

  const handleTaskLinkToggle = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleManualProgressChange = async (goalId: string, progress: number) => {
    await updateGoal(goalId, { 
      progress,
      completedAt: progress >= 100 ? new Date().toISOString() : undefined
    });
  };

  // Generate Strategic Advisor Insights
  const fetchGoalInsights = async () => {
    setLoadingInsights(true);
    try {
      const response = await fetch("/api/goal-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals, habits, tasks })
      });
      if (!response.ok) throw new Error("Insights failed");
      const data = await response.json();
      setAiInsights(data.insights);
    } catch (err) {
      console.error(err);
      setAiInsights(`### 🏆 Strategic Diagnostics
Your Accountability Advisor is checking your progress variables:
- Ensure active study tasks are connected to your overarching goals.
- Break massive deadlines into atomic weekly habit triggers.

### 📈 Pacing Recommendations
- Establish high-frequency daily routines instead of massive bursts.
- Set aside Sundays to adjust goals and resolve pending risk warnings.`);
    } finally {
      setLoadingInsights(false);
    }
  };

  // Critical Stats
  const filteredGoals = goalFilter === 'all' ? goals : goals.filter(g => g.timeframe === goalFilter);
  const totalGoalsCount = filteredGoals.length;
  const completedGoalsCount = filteredGoals.filter(g => g.progress >= 100).length;
  const achievementRate = totalGoalsCount > 0 ? Math.round((completedGoalsCount / totalGoalsCount) * 100) : 0;

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

  // Custom Markdown renderer for insights
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("###")) {
        return <h4 key={idx} className="text-text-main font-black text-sm mt-5 mb-2 first:mt-0 flex items-center gap-1.5 border-b border-border-custom pb-1 uppercase tracking-wide">{parseInlineMarkdown(trimmed.replace("###", "").trim())}</h4>;
      }
      if (trimmed.startsWith("##")) {
        return <h3 key={idx} className="text-text-main font-extrabold text-base mt-6 mb-3 first:mt-0 border-l-2 border-brand pl-2">{parseInlineMarkdown(trimmed.replace("##", "").trim())}</h3>;
      }
      if (trimmed.startsWith("#")) {
        return <h2 key={idx} className="text-text-main font-black text-lg mt-7 mb-4">{parseInlineMarkdown(trimmed.replace("#", "").trim())}</h2>;
      }
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        const content = trimmed.substring(1).trim();
        return (
          <li key={idx} className="text-xs text-text-sub ml-4 list-disc mb-1.5 leading-relaxed">
            {parseInlineMarkdown(content)}
          </li>
        );
      }
      if (/^\d+\./.test(trimmed)) {
        const content = trimmed.replace(/^\d+\./, "").trim();
        return (
          <li key={idx} className="text-xs text-text-sub ml-4 list-decimal mb-2 leading-relaxed">
            {parseInlineMarkdown(content)}
          </li>
        );
      }
      if (trimmed === "") return <div key={idx} className="h-2" />;
      return <p key={idx} className="text-xs text-text-sub leading-relaxed mb-2">{parseInlineMarkdown(trimmed)}</p>;
    });
  };

  return (
    <div className="space-y-8 pb-12 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-border-custom">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-main tracking-tight">
            Milestones & Goals
          </h1>
          <p className="text-base text-text-sub max-w-2xl">
            Translate macro vision boards into granular, trackable deliverables and continuous routines.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveSubTab(activeSubTab === 'goals' ? 'habits' : 'goals')}
            className="px-5 py-3 bg-card-bg hover:bg-sidebar-bg text-text-main border border-border-custom rounded-2xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2"
          >
            {activeSubTab === 'goals' ? 'Manage Daily Habits' : 'Manage Milestones'}
          </button>
          
          <button
            onClick={() => activeSubTab === 'goals' ? setShowAddGoal(true) : setShowAddHabit(true)}
            className="px-5 py-3 bg-brand hover:bg-brand-hover text-white rounded-2xl text-sm font-bold transition-all cursor-pointer shadow-sm shadow-brand/10"
          >
            {activeSubTab === 'goals' ? 'Create New Goal' : 'Create New Habit'}
          </button>
        </div>
      </div>

      {/* Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Main Content Pane */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Subtabs Header */}
          <div className="flex items-center justify-between bg-card-bg border border-border-custom px-6 py-4 rounded-3xl shadow-xs">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveSubTab('goals')}
                className={`text-sm font-extrabold transition-all cursor-pointer ${
                  activeSubTab === 'goals' ? 'text-brand' : 'text-text-sub hover:text-text-main'
                }`}
              >
                Milestones & Goals
              </button>
              <div className="border-r border-border-custom" />
              <button
                onClick={() => setActiveSubTab('habits')}
                className={`text-sm font-extrabold transition-all cursor-pointer ${
                  activeSubTab === 'habits' ? 'text-brand' : 'text-text-sub hover:text-text-main'
                }`}
              >
                Daily Habits
              </button>
            </div>

            {activeSubTab === 'goals' && (
              <div className="flex items-center gap-1 bg-page-bg border border-border-custom rounded-xl p-1 text-xs">
                {(['all', 'daily', 'weekly', 'monthly'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setGoalFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg font-bold capitalize cursor-pointer transition-all ${
                      goalFilter === filter ? 'bg-card-bg text-brand shadow-sm' : 'text-text-sub hover:text-text-main'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            )}
          </div>

          {activeSubTab === 'goals' ? (
            <div className="space-y-4">
              {filteredGoals.length === 0 ? (
                <div className="text-center py-16 bg-card-bg border border-border-custom rounded-3xl space-y-3">
                  <Target className="w-12 h-12 text-text-sub mx-auto opacity-40 animate-pulse" />
                  <h3 className="font-extrabold text-text-main text-lg">No milestones mapped</h3>
                  <p className="text-text-sub text-xs max-w-sm mx-auto">
                    Choose to map an overarching study goal or personal landmark. Link tasks to establish automatic pacing metrics.
                  </p>
                </div>
              ) : (
                filteredGoals.map((goal) => {
                  // Resolve linked tasks progress if available
                  let progressValue = goal.progress || 0;
                  const goalTasks = tasks.filter(t => goal.linkedTasks?.includes(t.id));
                  if (goalTasks.length > 0) {
                    const finished = goalTasks.filter(t => t.status === 'completed').length;
                    progressValue = Math.round((finished / goalTasks.length) * 100);
                  }

                  return (
                    <div 
                      key={goal.id} 
                      className="p-6 bg-card-bg border border-border-custom rounded-3xl shadow-xs hover:shadow-md transition-all space-y-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] bg-brand/10 text-brand px-2.5 py-0.5 rounded-full font-bold uppercase font-mono">
                              {goal.timeframe} Limit
                            </span>
                            {progressValue >= 100 && (
                              <span className="text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase">
                                Achieved
                              </span>
                            )}
                          </div>
                          <h3 className="font-extrabold text-lg text-text-main leading-snug">{goal.title}</h3>
                          <p className="text-xs text-text-sub font-semibold">
                            Boundary: {new Date(goal.targetDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>

                        <button 
                          onClick={() => deleteGoal(goal.id)}
                          className="p-2.5 bg-page-bg hover:bg-rose-500/10 border border-border-custom hover:border-rose-500/25 text-text-sub hover:text-rose-500 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Associated Tasks Checklist Status */}
                      {goalTasks.length > 0 && (
                        <div className="space-y-2 bg-page-bg/50 border border-border-custom/50 p-4 rounded-2xl">
                          <span className="text-[10px] font-bold text-text-sub uppercase tracking-wider block">Connected Tasks ({goalTasks.filter(t => t.status === 'completed').length}/{goalTasks.length})</span>
                          <div className="space-y-1.5">
                            {goalTasks.map(t => (
                              <div key={t.id} className="flex items-center gap-2 text-xs">
                                <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'completed' ? 'bg-emerald-500' : 'bg-brand'}`} />
                                <span className={`truncate ${t.status === 'completed' ? 'line-through text-text-sub opacity-50' : 'text-text-main font-semibold'}`}>
                                  {t.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Manual Progression Controller if no tasks linked */}
                      {goalTasks.length === 0 && (
                        <div className="space-y-2 bg-page-bg/40 p-4 rounded-2xl">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-text-sub uppercase tracking-wider">Manual Progression</span>
                            <span className="font-extrabold text-brand font-mono">{progressValue}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={progressValue} 
                            onChange={(e) => handleManualProgressChange(goal.id, parseInt(e.target.value))}
                            className="w-full accent-brand bg-card-bg rounded-lg h-1.5 appearance-none cursor-pointer"
                          />
                        </div>
                      )}

                      {/* Progression Bar */}
                      {goalTasks.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-text-sub uppercase tracking-wider">Overall Progression</span>
                            <span className="font-black text-brand font-mono">{progressValue}%</span>
                          </div>
                          <div className="w-full bg-page-bg rounded-full h-2.5 border border-border-custom/40">
                            <div 
                              className="bg-brand h-full rounded-full transition-all duration-300"
                              style={{ width: `${progressValue}%` }}
                            />
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {habits.length === 0 ? (
                <div className="text-center py-16 bg-card-bg border border-border-custom rounded-3xl space-y-3">
                  <Flame className="w-12 h-12 text-text-sub mx-auto opacity-40 animate-pulse" />
                  <h3 className="font-extrabold text-text-main text-lg">No habits created</h3>
                  <p className="text-text-sub text-xs max-w-sm mx-auto">
                    Commit to repeatable routines. Log habit instances daily or weekly to strengthen discipline score variables.
                  </p>
                </div>
              ) : (
                habits.map((habit) => {
                  // Streak and completed checks
                  const todayStr = new Date().toISOString().split('T')[0];
                  const hasDoneToday = habit.history?.includes(todayStr);

                  return (
                    <div 
                      key={habit.id} 
                      className="p-5 bg-card-bg border border-border-custom rounded-3xl shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-5"
                    >
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full font-bold uppercase font-mono">
                            {habit.frequency} Target
                          </span>
                          <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                            <Flame className="w-3 h-3 text-amber-500" />
                            {habit.streak || 0} Streak
                          </span>
                        </div>
                        <h4 className="font-extrabold text-base text-text-main truncate leading-tight">{habit.name}</h4>
                        <p className="text-xs text-text-sub font-semibold">
                          Total Logged Days: {habit.history?.length || 0} times
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => completeHabitToday(habit.id)}
                          className={`p-3 border rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer ${
                            hasDoneToday
                              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500'
                              : 'bg-page-bg border-border-custom text-text-sub hover:border-text-sub/30 hover:text-text-main'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                          <span>{hasDoneToday ? 'Ticked Off' : 'Tick Off'}</span>
                        </button>
                        
                        <button 
                          onClick={() => deleteHabit(habit.id)}
                          className="p-3 bg-page-bg hover:bg-rose-500/10 border border-border-custom hover:border-rose-500/25 text-text-sub hover:text-rose-500 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>

        {/* Right Sidebar: Strategic Advisor Insights */}
        <div className="space-y-6">
          <div className="bg-card-bg border border-border-custom rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border-custom">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-brand" />
                <h3 className="font-extrabold text-lg text-text-main">Advisor Insights</h3>
              </div>
              <button
                onClick={fetchGoalInsights}
                disabled={loadingInsights}
                className="p-2 bg-page-bg hover:bg-sidebar-bg border border-border-custom rounded-xl text-brand transition-all cursor-pointer"
                title="Refresh Strategic Insights"
              >
                <Sparkles className={`w-4 h-4 ${loadingInsights ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingInsights ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <Sparkles className="w-8 h-8 text-brand animate-spin" />
                <p className="text-xs text-text-sub font-semibold">Running multi-variable progress analysis...</p>
              </div>
            ) : aiInsights ? (
              <div className="prose prose-sm dark:prose-invert space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {renderMarkdown(aiInsights)}
              </div>
            ) : (
              <div className="text-center py-12 text-text-sub space-y-3">
                <Lightbulb className="w-10 h-10 text-text-sub mx-auto opacity-35" />
                <p className="text-sm font-semibold">Awaiting strategic diagnostics</p>
                <p className="text-xs max-w-xs mx-auto mb-4">Click below to trigger the AI Advisor to scan your habit triggers, task completed velocity, and deadline risks.</p>
                <button
                  onClick={fetchGoalInsights}
                  className="px-4 py-2.5 bg-brand text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer hover:bg-brand-hover transition-all"
                >
                  Analyze Goals & Pacing
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 1. Add Goal Modal */}
      {showAddGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-xs" onClick={() => setShowAddGoal(false)} />
          <div className="relative w-full max-w-lg bg-card-bg rounded-3xl overflow-hidden shadow-2xl border border-border-custom p-6 sm:p-8 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-border-custom mb-6">
              <h3 className="font-extrabold text-xl text-text-main">Map Overarching Goal</h3>
              <button onClick={() => setShowAddGoal(false)} className="p-1 hover:bg-page-bg text-text-sub rounded-xl"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleGoalSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-sub uppercase tracking-wider">Goal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Master Advanced Data Structures"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-page-bg border border-border-custom rounded-xl text-sm text-text-main outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-sub uppercase tracking-wider">Timeframe Type</label>
                  <select
                    value={goalTimeframe}
                    onChange={(e) => setGoalTimeframe(e.target.value as any)}
                    className="w-full px-4 py-3 bg-page-bg border border-border-custom rounded-xl text-sm text-text-main font-bold cursor-pointer outline-none"
                  >
                    <option value="daily">Daily Target</option>
                    <option value="weekly">Weekly Target</option>
                    <option value="monthly">Monthly Target</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-sub uppercase tracking-wider">Target Date Limit</label>
                  <input
                    type="date"
                    required
                    value={goalTargetDate}
                    onChange={(e) => setGoalTargetDate(e.target.value)}
                    className="w-full px-4 py-3 bg-page-bg border border-border-custom rounded-xl text-sm text-text-main cursor-pointer outline-none"
                  />
                </div>
              </div>

              {/* Link Tasks Checklist */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-text-sub uppercase tracking-wider block">Link Outstanding Tasks (For automated progression)</label>
                <div className="max-h-36 overflow-y-auto border border-border-custom rounded-2xl p-3 space-y-2 bg-page-bg">
                  {tasks.filter(t => t.status !== 'completed').length === 0 ? (
                    <p className="text-xs text-text-sub italic">No pending tasks available to link.</p>
                  ) : (
                    tasks.filter(t => t.status !== 'completed').map(task => (
                      <div 
                        key={task.id} 
                        onClick={() => handleTaskLinkToggle(task.id)}
                        className="flex items-center gap-2.5 p-2 bg-card-bg border border-border-custom rounded-xl cursor-pointer hover:border-brand/40 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task.id)}
                          onChange={() => {}} // handled by div click
                          className="w-4 h-4 text-brand rounded border-border-custom cursor-pointer"
                        />
                        <span className="font-semibold text-text-main truncate">{task.title}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-border-custom flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddGoal(false)}
                  className="px-5 py-3 bg-page-bg hover:bg-sidebar-bg border border-border-custom text-text-sub rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-3 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm shadow-brand/10"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Habit Modal */}
      {showAddHabit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-xs" onClick={() => setShowAddHabit(false)} />
          <div className="relative w-full max-w-lg bg-card-bg rounded-3xl overflow-hidden shadow-2xl border border-border-custom p-6 sm:p-8 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-border-custom mb-6">
              <h3 className="font-extrabold text-xl text-text-main">Establish Continuous Routine</h3>
              <button onClick={() => setShowAddHabit(false)} className="p-1 hover:bg-page-bg text-text-sub rounded-xl"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleHabitSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-sub uppercase tracking-wider">Habit/Routine Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Code for 30 minutes, Morning workout..."
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  className="w-full px-4 py-3 bg-page-bg border border-border-custom rounded-xl text-sm text-text-main outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-sub uppercase tracking-wider">Required Frequency</label>
                <select
                  value={habitFrequency}
                  onChange={(e) => setHabitFrequency(e.target.value as any)}
                  className="w-full px-4 py-3 bg-page-bg border border-border-custom rounded-xl text-sm text-text-main font-bold cursor-pointer outline-none"
                >
                  <option value="daily">Daily Habit Trigger</option>
                  <option value="weekly">Weekly Routine Trigger</option>
                </select>
              </div>

              <div className="pt-4 border-t border-border-custom flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddHabit(false)}
                  className="px-5 py-3 bg-page-bg hover:bg-sidebar-bg border border-border-custom text-text-sub rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-3 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm shadow-brand/10"
                >
                  Establish Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
