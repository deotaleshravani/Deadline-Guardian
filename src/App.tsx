import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useUserData } from "./hooks/useUserData";
import LandingPage from "./components/LandingPage";
import AuthPages from "./components/AuthPages";
import Dashboard from "./components/Dashboard";
import TaskManager from "./components/TaskManager";
import CalendarView from "./components/CalendarView";
import GoalTracking from "./components/GoalTracking";
import HabitTracking from "./components/HabitTracking";
import AnalyticsPage from "./components/AnalyticsPage";
import SettingsPage from "./components/SettingsPage";
import CoachChat from "./components/CoachChat";
import VoiceAssistant from "./components/VoiceAssistant";

import { 
  ShieldAlert, Sparkles, ListTodo, Calendar, Target,
  TrendingUp, Settings, LogOut, Menu, X, Loader2,
  Moon, Sun, MessageSquareCode, Mic, Bot, Sparkle
} from "lucide-react";

function AppContent() {
  const { user, preferences, loading, updatePreferences, loginGuest, logout } = useAuth();
  const { 
    tasks, goals, habits, recommendations, chatMessages, aiSchedule, agentLogs, aiAnalyzing,
    addTask, updateTask, deleteTask, toggleSubtask, requestAISubtasks, addSubtask, removeSubtask, moveSubtask,
    addGoal, updateGoal, deleteGoal, addHabit, completeHabitToday, deleteHabit, 
    dismissRecommendation, triggerAIAnalysis, generateAISchedule, addChatMessage, clearChatHistory
  } = useUserData();

  const [activeTab, setActiveTab] = useState("Dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authView, setAuthView] = useState<'landing' | 'login' | 'signup'>('landing');
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem("dg_theme");
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark'; // default to dark
  });

  // Assistant states
  const [coachOpen, setCoachOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem("dg_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Loader state
  if (loading) {
    return (
      <div className="min-h-screen bg-page-bg text-text-main flex flex-col items-center justify-center gap-5 text-center px-4">
        <Loader2 className="w-12 h-12 animate-spin text-brand" />
        <div className="space-y-1">
          <p className="text-sm font-bold uppercase tracking-widest text-brand">
            Securing Your Focus Space
          </p>
          <p className="text-xs text-text-sub max-w-xs leading-relaxed">
            Preparing your personal AI Accountability companion...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated layouts
  if (!user) {
    if (authView === 'login') {
      return (
        <div className="relative min-h-screen bg-page-bg">
          <button 
            onClick={() => setAuthView('landing')}
            className="absolute top-6 left-6 text-text-sub hover:text-text-main text-sm font-semibold bg-card-bg border border-border-custom px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer z-50 flex items-center gap-1.5"
          >
            ← Back Home
          </button>
          <AuthPages initialMode="login" />
        </div>
      );
    }
    if (authView === 'signup') {
      return (
        <div className="relative min-h-screen bg-page-bg">
          <button 
            onClick={() => setAuthView('landing')}
            className="absolute top-6 left-6 text-text-sub hover:text-text-main text-sm font-semibold bg-card-bg border border-border-custom px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer z-50 flex items-center gap-1.5"
          >
            ← Back Home
          </button>
          <AuthPages initialMode="signup" />
        </div>
      );
    }
    return (
      <LandingPage 
        onStart={async () => {
          try {
            await loginGuest();
          } catch (err) {
            console.error("Frictionless onboarding failed, switching to manual registration:", err);
            setAuthView('signup');
          }
        }} 
        onLogin={() => setAuthView('login')} 
      />
    );
  }

  // Navigation Items
  const navItems = [
    { name: "Dashboard", label: "Dashboard", icon: Sparkles },
    { name: "Tasks", label: "Tasks", icon: ListTodo },
    { name: "Calendar", label: "Calendar", icon: Calendar },
    { name: "Goals", label: "Goals", icon: Target },
    { name: "Analytics", label: "Your Progress", icon: TrendingUp },
    { name: "Settings", label: "Settings", icon: Settings },
  ];

  const renderActiveView = () => {
    switch (activeTab) {
      case "Dashboard":
        return (
          <Dashboard 
            preferences={preferences}
            tasks={tasks}
            goals={goals}
            habits={habits}
            recommendations={recommendations}
            agentLogs={agentLogs}
            aiAnalyzing={aiAnalyzing}
            updateTask={updateTask}
            completeHabitToday={completeHabitToday}
            dismissRecommendation={dismissRecommendation}
            setActiveTab={setActiveTab}
            triggerAIAnalysis={() => triggerAIAnalysis(tasks)}
            openCoachChat={() => setCoachOpen(true)}
          />
        );
      case "Tasks":
        return (
          <TaskManager 
            tasks={tasks}
            addTask={addTask}
            updateTask={updateTask}
            deleteTask={deleteTask}
            toggleSubtask={toggleSubtask}
            requestAISubtasks={requestAISubtasks}
            addSubtask={addSubtask}
            removeSubtask={removeSubtask}
            moveSubtask={moveSubtask}
            aiAnalyzing={aiAnalyzing}
            habits={habits}
            triggerAIAnalysis={() => triggerAIAnalysis(tasks)}
            preferences={preferences}
          />
        );
      case "Calendar":
        return (
          <CalendarView 
            tasks={tasks}
            setActiveTab={setActiveTab}
            aiSchedule={aiSchedule}
            generateAISchedule={generateAISchedule}
            aiAnalyzing={aiAnalyzing}
          />
        );
      case "Goals":
        // HabitTracking is loaded as a clean secondary tab inside GoalTracking for perfect separation of concerns
        return (
          <GoalTracking 
            goals={goals}
            habits={habits}
            tasks={tasks}
            addGoal={addGoal}
            updateGoal={updateGoal}
            deleteGoal={deleteGoal}
            addHabit={addHabit}
            completeHabitToday={completeHabitToday}
            deleteHabit={deleteHabit}
            preferences={preferences}
          />
        );
      case "Analytics":
        return (
          <AnalyticsPage 
            tasks={tasks}
            goals={goals}
            habits={habits}
            preferences={preferences}
          />
        );
      case "Settings":
        return (
          <SettingsPage 
            preferences={preferences}
            updatePreferences={updatePreferences}
          />
        );
      default:
        return (
          <div className="py-12 text-center text-text-sub">
            This module is being updated.
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-page-bg text-text-main flex flex-col md:flex-row relative font-sans w-full antialiased selection:bg-brand selection:text-white">
      
      {/* Mobile Header / Navigation */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-card-bg border-b border-border-custom sticky top-0 z-30 w-full transition-colors duration-250">
        <div className="flex items-center gap-2.5">
          <div className="bg-brand text-white p-2 rounded-xl shadow-sm">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-text-main">
            FocusGuardian
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 bg-page-bg text-text-sub hover:text-text-main border border-border-custom rounded-xl transition-all cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 bg-page-bg text-text-sub hover:text-text-main border border-border-custom rounded-xl transition-all cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Navigation Sidebar (Desktop persistent, Mobile sliding drawer) */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-sidebar-bg border-r border-border-custom p-8 flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen shrink-0 transition-colors duration-250
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="space-y-10">
          {/* Logo brand */}
          <div className="flex items-center gap-3">
            <div className="bg-brand text-white p-2.5 rounded-2xl shadow-md shadow-brand/10">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-text-main block">
                FocusGuardian
              </span>
              <span className="text-[10px] text-text-sub font-semibold tracking-wider uppercase block mt-0.5">
                AI Focus Suite
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.name;

              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setActiveTab(item.name);
                    setMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all cursor-pointer group text-left
                    ${isActive 
                      ? 'bg-brand text-white shadow-lg shadow-brand/15' 
                      : 'text-text-sub hover:text-text-main hover:bg-card-bg/60 border border-transparent hover:border-border-custom/50'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 duration-200 ${isActive ? 'text-white' : 'text-text-sub'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Footer with Theme Toggle */}
        <div className="border-t border-border-custom pt-6 flex flex-col gap-5 mt-auto">
          {/* Theme switcher for desktop */}
          <div className="hidden md:flex items-center justify-between p-3 bg-card-bg border border-border-custom rounded-2xl">
            <span className="text-xs font-semibold text-text-sub">Color Mode</span>
            <button
              onClick={toggleTheme}
              className="p-2 bg-page-bg text-text-sub hover:text-text-main border border-border-custom rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-brand" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>

          {preferences && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-brand text-white shrink-0 shadow-md flex items-center justify-center text-sm font-bold uppercase">
                  {preferences.name?.substring(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-extrabold text-text-main truncate leading-tight">{preferences.name}</h4>
                  <p className="text-xs text-text-sub capitalize leading-none mt-1 font-semibold">
                    {preferences.role}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-card-bg hover:bg-rose-500/10 border border-border-custom hover:border-rose-500/20 rounded-2xl text-xs font-bold text-text-sub hover:text-rose-500 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Disconnect Account
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Panel Content Container */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-7xl mx-auto w-full md:h-screen transition-colors duration-250">
        <div className="max-w-5xl mx-auto space-y-10">
          {renderActiveView()}
        </div>
      </main>

      {/* Floating Auxiliary Tools Panel (Ask AI Coach & Voice Command Assistant) */}
      <div className="fixed bottom-6 right-6 z-30 flex flex-col gap-3">
        {/* Voice Assistant Button */}
        <button
          onClick={() => setVoiceOpen(true)}
          className="p-4 bg-brand hover:bg-brand-hover text-white rounded-full shadow-2xl hover:shadow-brand/20 transition-all cursor-pointer flex items-center justify-center group"
          title="Voice Command Assistant"
        >
          <Mic className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" />
        </button>

        {/* AI Coach Button */}
        <button
          onClick={() => setCoachOpen(true)}
          className="p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-2xl hover:shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center group relative"
          title="Accountability Coach Chat"
        >
          <Bot className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" />
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
          </span>
        </button>
      </div>

      {/* Slide-over Drawer for Coach Chat */}
      {coachOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300" onClick={() => setCoachOpen(false)} />
          
          <div className="relative w-full max-w-md bg-card-bg h-full flex flex-col shadow-2xl border-l border-border-custom animate-slide-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-custom bg-sidebar-bg">
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-500/10 text-emerald-500 p-2 rounded-xl">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-text-main">AI Accountability Coach</h3>
                  <p className="text-[10px] text-emerald-500 font-bold tracking-wider uppercase leading-none mt-0.5">ACTIVE COACHING ENGINE</p>
                </div>
              </div>
              <button 
                onClick={() => setCoachOpen(false)}
                className="p-2 hover:bg-page-bg text-text-sub hover:text-text-main rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-page-bg">
              <CoachChat 
                preferences={preferences}
                tasks={tasks}
                habits={habits}
                chatMessages={chatMessages}
                addChatMessage={addChatMessage}
                clearChatHistory={clearChatHistory}
                updateTask={updateTask}
                completeHabitToday={completeHabitToday}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog for Voice Assistant */}
      {voiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-xs" onClick={() => setVoiceOpen(false)} />
          
          <div className="relative w-full max-w-xl bg-card-bg rounded-3xl overflow-hidden shadow-2xl border border-border-custom p-6 sm:p-8 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-border-custom mb-6">
              <div className="flex items-center gap-2.5">
                <div className="bg-brand/10 text-brand p-2 rounded-xl">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-text-main">Voice Focus Assistant</h3>
                  <p className="text-[10px] text-brand font-bold tracking-wider uppercase leading-none mt-0.5">NATURAL LANGUAGE INTERPRETER</p>
                </div>
              </div>
              <button 
                onClick={() => setVoiceOpen(false)}
                className="p-2 hover:bg-page-bg text-text-sub hover:text-text-main rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <VoiceAssistant 
              tasks={tasks}
              preferences={preferences}
              addTask={addTask}
              updateTask={updateTask}
            />

            <div className="mt-6 pt-4 border-t border-border-custom flex justify-end text-xs text-text-sub">
              Press the mic, say <strong className="text-text-main mx-1">"Create a task tomorrow at 5pm to write code"</strong> or ask for health logs.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
