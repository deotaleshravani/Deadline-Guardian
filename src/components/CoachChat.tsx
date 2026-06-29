import { useState, useRef, useEffect } from "react";
import { 
  Send, Sparkles, UserCheck, MessageSquare, Trash2,
  Loader2, CheckCircle2, Flame, AlertCircle, Clock, 
  Check, HelpCircle, ArrowRight, Hourglass, BarChart3, 
  Star, Heart, Target, ChevronRight, Zap, RefreshCw
} from "lucide-react";
import { Message, Task, Habit } from "../types";

interface CoachChatProps {
  preferences: any;
  tasks: Task[];
  habits: Habit[];
  chatMessages: Message[];
  addChatMessage: (text: string, role: "user" | "model") => Promise<any>;
  clearChatHistory: () => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  completeHabitToday: (habitId: string) => Promise<void>;
}

export default function CoachChat({ 
  preferences, 
  tasks, 
  habits,
  chatMessages,
  addChatMessage,
  clearChatHistory,
  updateTask,
  completeHabitToday
}: CoachChatProps) {
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "hub">("hub"); // "hub" first for active intervention, then "chat"
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Compute messages to display (inject a default greeting if database is empty)
  const displayMessages = chatMessages.length > 0 ? chatMessages : [
    {
      id: "welcome-coach",
      role: "model" as const,
      text: `Hi ${preferences?.name || "Guardian User"}. I am your AI Accountability Coach & Mentor. I have reviewed your focus areas, habit streaks, and active deadlines. I don't let deadlines slide. Let's look at your progress, identify incomplete work, and lock in focus actions right now!`,
      timestamp: new Date().toISOString()
    }
  ];

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
        return <h4 key={idx} className="text-white font-extrabold text-sm mt-4 mb-2 first:mt-0 flex items-center gap-1.5 border-b border-slate-800 pb-1 uppercase tracking-wide">{parseInlineMarkdown(trimmed.replace("###", "").trim())}</h4>;
      }
      if (trimmed.startsWith("##")) {
        return <h3 key={idx} className="text-white font-black text-base mt-5 mb-2.5 first:mt-0 border-l-2 border-indigo-500 pl-2">{parseInlineMarkdown(trimmed.replace("##", "").trim())}</h3>;
      }
      if (trimmed.startsWith("#")) {
        return <h2 key={idx} className="text-white font-black text-lg mt-6 mb-3">{parseInlineMarkdown(trimmed.replace("#", "").trim())}</h2>;
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
      return <p key={idx} className="text-xs text-slate-300 leading-relaxed mb-1">{parseInlineMarkdown(trimmed)}</p>;
    });
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages, sending]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || sending) return;

    setInputText("");
    setSending(true);

    // If we're on the hub on mobile, automatically switch to chat so the user can see the conversation!
    setActiveTab("chat");

    try {
      // 1. Persist user message to Firestore
      await addChatMessage(textToSend, "user");

      // Build chat history for API payload from current state + the new user message
      const historyPayload = [
        ...chatMessages.map(m => ({ role: m.role, text: m.text })),
        { role: "user", text: textToSend }
      ];

      // 2. Fetch Coach response from endpoint
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyPayload,
          context: {
            userPreferences: preferences,
            tasks,
            habits
          }
        })
      });

      if (!response.ok) throw new Error("Coach chat failed");
      const data = await response.json();

      // 3. Persist response to Firestore
      await addChatMessage(
        data.text || "I am right here beside you. Let's stay focused on the task at hand.", 
        "model"
      );
    } catch (err) {
      console.error("Coach response error:", err);
      
      // Persist fallback offline message to Firestore
      await addChatMessage(
        `I am having a slight network slowdown, but as your Personal Productivity Mentor, I urge you: stop overthinking, block out all distractions, and write or study for just five minutes. Let me know what you commit to right now!`,
        "model"
      );
    } finally {
      setSending(false);
    }
  };

  const handleSuggestionClick = (suggestionText: string) => {
    handleSendMessage(suggestionText);
  };

  // Filter tasks & calculate remaining hours
  const incompleteTasks = tasks.filter(t => t.status !== "completed");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const now = new Date();

  // Overdue and postponed tasks
  const overdueTasks = incompleteTasks.filter(t => new Date(t.deadline).getTime() < now.getTime());
  const highlyPostponedTasks = incompleteTasks.filter(t => (t.postponementsCount || 0) >= 2);

  // Consistency Rating
  const completedHabitsToday = habits.filter(h => {
    const todayStr = new Date().toISOString().split('T')[0];
    return h.lastCompleted === todayStr || h.history?.includes(todayStr);
  });
  const totalHabits = habits.length;
  const consistencyRating = totalHabits > 0 
    ? Math.round((completedHabitsToday.length / totalHabits) * 100) 
    : 100;

  // Custom mentoring interventions
  const interventions: string[] = [];
  if (overdueTasks.length > 0) {
    interventions.push(`🚨 You have ${overdueTasks.length} overdue task(s) that need immediate action.`);
  }
  if (highlyPostponedTasks.length > 0) {
    interventions.push(`⏳ "${highlyPostponedTasks[0].title}" has been postponed ${highlyPostponedTasks[0].postponementsCount} times. This indicates high avoidance behavior!`);
  }
  if (habits.some(h => h.streak > 0 && h.lastCompleted !== new Date().toISOString().split('T')[0])) {
    const streakHabit = habits.find(h => h.streak > 0 && h.lastCompleted !== new Date().toISOString().split('T')[0]);
    if (streakHabit) {
      interventions.push(`🔥 Keep consistency alive! Your ${streakHabit.streak}-day streak for "${streakHabit.name}" is waiting for completion today.`);
    }
  }

  // Handle Quick Coaching Nudge clicks
  const triggerNudge = (type: "habit" | "task" | "general", title: string, estimateText?: string) => {
    let text = "";
    if (type === "habit") {
      text = `Have I completed today's study or habit session for "${title}" yet? I'd like to check-in and get some accountability coaching.`;
    } else if (type === "task") {
      text = `I need help finishing "${title}". ${estimateText ? `I estimate I still need ${estimateText} of work.` : ""} Can you follow up on my incomplete subtasks and suggest the best next action?`;
    } else {
      text = `Give me an accountability consistency rating review and evaluate my pending tasks workload today.`;
    }
    handleSendMessage(text);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-10rem)] min-h-[550px] font-sans selection:bg-indigo-500 selection:text-white" id="accountability-coach-container">
      
      {/* LEFT PANE/TAB: AI Accountability Dashboard (Mentor Hub) */}
      <div className={`flex-1 flex-col bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-xl ${
        activeTab === "hub" ? "flex" : "hidden lg:flex lg:max-w-[380px]"
      }`}>
        {/* Hub Header */}
        <div className="bg-slate-950 border-b border-slate-850 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-rose-500 to-indigo-600 p-1.5 rounded-lg text-white">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">Accountability Hub</span>
              <h3 className="font-extrabold text-xs text-white">Mentor Intelligence</h3>
            </div>
          </div>

          <button 
            onClick={() => setActiveTab("chat")}
            className="lg:hidden bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-2.5 py-1 rounded-md flex items-center gap-0.5 cursor-pointer transition-all"
          >
            Chat
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Hub Content */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 bg-slate-900/40">
          
          {/* Consistency Meter */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850/80 space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[100px] h-[100px] bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Consistency Score</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-white tracking-tight">{consistencyRating}%</span>
                  <span className="text-[8px] text-indigo-400 font-bold uppercase font-mono bg-indigo-500/10 border border-indigo-500/15 px-1 py-0.5 rounded">
                    {consistencyRating >= 80 ? "Elite" : consistencyRating >= 50 ? "Steady" : "Action"}
                  </span>
                </div>
              </div>
              
              <div className="w-24 bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800 shrink-0">
                <div 
                  className="bg-indigo-500 h-full transition-all duration-500"
                  style={{ width: `${consistencyRating}%` }}
                />
              </div>
            </div>
          </div>

          {/* Coach Interventions & Active Warnings */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Diagnostics</span>
            
            {interventions.length === 0 ? (
              <div className="bg-slate-950/20 border border-slate-850/40 p-2.5 rounded-lg text-center">
                <p className="text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Schedules in perfect alignment
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {interventions.map((item, idx) => (
                  <div key={idx} className="bg-slate-950/40 border border-slate-850/60 p-2.5 rounded-lg flex items-start gap-2 transition-colors text-[10px] text-slate-300 leading-normal">
                    <span className="text-rose-400 shrink-0 select-none font-bold">!</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Incomplete Work & Estimates */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Pending Tasks</span>
              <span className="text-[9px] text-slate-500 font-mono font-semibold">{incompleteTasks.length} total</span>
            </div>

            {incompleteTasks.length === 0 ? (
              <div className="bg-slate-950/20 border border-slate-850/40 p-2.5 rounded-lg text-center text-[10px] text-slate-500 italic">
                All work completed
              </div>
            ) : (
              <div className="space-y-2">
                {incompleteTasks.slice(0, 3).map(task => {
                  const estMinutes = task.estimatedTime || 60;
                  const hoursRemaining = parseFloat((estMinutes * (1 - (task.progress || 0) / 100) / 60).toFixed(1));
                  const progress = task.progress || 0;
                  const postponements = task.postponementsCount || 0;

                  return (
                    <div key={task.id} className="bg-slate-950/50 p-3 rounded-xl border border-slate-850/80 hover:border-slate-800 transition-all space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[11px] font-bold text-slate-200 truncate">{task.title}</h4>
                          <span className="text-[9px] text-slate-500 block">
                            {hoursRemaining}h remaining • <span className="text-indigo-400 font-semibold">{progress}% done</span>
                          </span>
                        </div>
                        {postponements > 0 && (
                          <span className="bg-rose-500/10 text-rose-400 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border border-rose-500/10 whitespace-nowrap">
                            Postponed {postponements}x
                          </span>
                        )}
                      </div>

                      <div className="w-full bg-slate-900/60 h-1 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-350 ${
                            postponements >= 2 ? 'bg-rose-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-900/20">
                        <button 
                          onClick={async () => {
                            const nextProgress = Math.min(progress + 20, 100);
                            await updateTask(task.id, {
                              progress: nextProgress,
                              status: nextProgress === 100 ? 'completed' : 'in_progress'
                            });
                          }}
                          className="text-[10px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          +20% Progress
                        </button>
                        <span className="text-slate-700 text-[9px]">•</span>
                        <button 
                          onClick={() => triggerNudge("task", task.title, `${hoursRemaining} hours`)}
                          className="text-indigo-400 text-[10px] font-semibold hover:text-indigo-300 transition-colors flex items-center gap-0.5 cursor-pointer"
                        >
                          <Zap className="w-2.5 h-2.5" />
                          Coach Me
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Consistency & Habit Streaks */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Habit Streaks</span>

            {habits.length === 0 ? (
              <div className="bg-slate-950/20 border border-slate-850/40 p-2.5 rounded-lg text-center text-[10px] text-slate-500 italic">
                No tracking habits yet
              </div>
            ) : (
              <div className="space-y-1.5">
                {habits.map(habit => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const completedToday = habit.lastCompleted === todayStr || habit.history?.includes(todayStr);

                  return (
                    <div key={habit.id} className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-850/60 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <div className={`p-1 rounded shrink-0 ${
                          completedToday ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-900 text-slate-500'
                        }`}>
                          <Flame className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-[11px] font-bold text-slate-200 truncate">{habit.name}</h5>
                          <span className="text-[9px] text-amber-400 font-bold font-mono">
                            🔥 {habit.streak} days
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-1.5 shrink-0">
                        <button 
                          onClick={() => triggerNudge("habit", habit.name)}
                          className="bg-slate-900 hover:bg-slate-850 border border-slate-800 p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Ask Coach about this habit"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>

                        <button 
                          onClick={async () => {
                            if (completedToday) return;
                            await completeHabitToday(habit.id);
                          }}
                          disabled={completedToday}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5 transition-all ${
                            completedToday 
                              ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/10' 
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                          }`}
                        >
                          {completedToday ? <Check className="w-2.5 h-2.5" /> : null}
                          {completedToday ? "Done" : "Log"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* RIGHT PANE/TAB: The Live Mentor Chat */}
      <div className={`flex-1 flex-col bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-xl ${
        activeTab === "chat" ? "flex" : "hidden lg:flex"
      }`}>
        
        {/* Chat Header */}
        <div className="bg-slate-950 border-b border-slate-850 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-rose-500 to-amber-500 p-2 rounded-xl text-white">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">Accountability Coach</span>
              <h3 className="font-extrabold text-sm text-white">Guardian Coach AI</h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle back to hub on mobile */}
            <button 
              onClick={() => setActiveTab("hub")}
              className="lg:hidden bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold text-xs px-3 py-1.5 rounded-lg transition-all"
            >
              ← Open Dashboard
            </button>

            {chatMessages.length > 0 && (
              <button
                onClick={clearChatHistory}
                title="Clear entire chat history"
                className="flex items-center gap-1.5 text-slate-500 hover:text-rose-400 border border-slate-850 hover:border-rose-950 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer bg-slate-900"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            )}

            <div className="hidden sm:flex items-center gap-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Live Telemetry Coached
            </div>
          </div>
        </div>

        {/* Message Feed Workspace */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/60">
          {displayMessages.map((m) => {
            const isModel = m.role === 'model';
            return (
              <div 
                key={m.id} 
                className={`flex items-start gap-3 max-w-[85%] ${
                  isModel ? 'mr-auto' : 'ml-auto flex-row-reverse'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  isModel ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-950 border border-slate-800 text-slate-400'
                }`}>
                  {isModel ? <UserCheck className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                </div>

                <div className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  isModel 
                    ? 'bg-slate-950 border border-slate-850 text-slate-100' 
                    : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                }`}>
                  {isModel ? renderMarkdown(m.text) : m.text}
                </div>
              </div>
            );
          })}
          {sending && (
            <div className="flex items-start gap-3 max-w-[80%] mr-auto">
              <div className="bg-indigo-500/10 text-indigo-400 p-1.5 rounded-lg shrink-0">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-950 border border-slate-850 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-500 italic">
                Coach is designing a motivational response...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Dynamic Accountability Mentorship Suggestions */}
        <div className="bg-slate-950/40 border-t border-slate-850 py-2">
          <div className="flex gap-2 px-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none">
            {[
              "Have you completed today's study session?",
              "Review my active streaks and consistency rating",
              "Help me plan out my incomplete work",
              "What should be my next action right now?",
            ].map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSuggestionClick(s)}
                className="bg-slate-900 hover:bg-slate-850 border border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Input Message Controls */}
        <div className="bg-slate-950 border-t border-slate-850 p-4">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Tell your Coach about your goals, progress or challenges..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2.5 sm:px-4 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
