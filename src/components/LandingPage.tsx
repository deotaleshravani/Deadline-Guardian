import { ShieldAlert, Target, Sparkles, Calendar, CheckSquare, Zap, ChevronRight, BookOpen, Briefcase, Rocket } from "lucide-react";

interface LandingPageProps {
  onStart: () => void;
  onLogin: () => void;
}

export default function LandingPage({ onStart, onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-tr from-rose-500 to-amber-500 p-2 rounded-xl shadow-lg">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <span className="font-sans font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Deadline Guardian
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onLogin}
            className="text-slate-300 hover:text-white font-medium text-sm transition-colors cursor-pointer px-4 py-2"
          >
            Sign In
          </button>
          <button 
            onClick={onStart}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-all shadow-md hover:shadow-indigo-500/25 cursor-pointer"
          >
            Launch Companion
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-16 overflow-hidden max-w-7xl mx-auto text-center">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 -translate-x-1/2 w-[300px] h-[300px] bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Active AI Accountability Companion
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-sans font-bold tracking-tight text-white mb-6 leading-[1.1]">
            Never let another deadline slip in silence.
          </h1>
          
          <p className="text-slate-400 text-lg sm:text-xl font-normal leading-relaxed mb-10">
            Meet the active AI accountability partner that doesn't just send passive warnings. 
            It predicts procrastination, breaks projects down, schedules peak-focus sessions, 
            and guides you to completion.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onStart}
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-base px-8 py-4 rounded-xl shadow-xl shadow-indigo-600/20 hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              Get Started Free 
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={onLogin}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white font-semibold text-base px-8 py-4 rounded-xl border border-slate-850 hover:border-slate-800 transition-all cursor-pointer"
            >
              Access Account
            </button>
          </div>
        </div>
      </section>

      {/* Grid: Target Audiences */}
      <section className="px-6 py-16 max-w-7xl mx-auto border-t border-slate-900 relative">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center text-white mb-12">
          Tailored coaching for your specific focus
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Students Card */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 hover:border-slate-800 transition-all hover:bg-slate-900/60 group">
            <div className="bg-indigo-500/10 text-indigo-400 p-3.5 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">For Students</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Tackle term papers, exam preps, and lab submissions. Breaks overwhelming tasks into bite-sized checkpoints and coordinates study slots around lectures.
            </p>
          </div>

          {/* Professionals Card */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 hover:border-slate-800 transition-all hover:bg-slate-900/60 group">
            <div className="bg-rose-500/10 text-rose-400 p-3.5 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">For Professionals</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Plan quarterly reports, design wireframes, and prep client presentations. Auto-schedules focus blocks inside peak-productivity hours before meetings interfere.
            </p>
          </div>

          {/* Entrepreneurs Card */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 hover:border-slate-800 transition-all hover:bg-slate-900/60 group">
            <div className="bg-amber-500/10 text-amber-400 p-3.5 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
              <Rocket className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">For Entrepreneurs</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Organize pitches, launch timelines, product milestones, and critical vendor invoices. Aligns long-term business goals with daily execution pipelines.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Pillars (Active accountability vs Passive alarm) */}
      <section className="px-6 py-20 bg-slate-950 max-w-7xl mx-auto border-t border-slate-900">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-rose-500 text-xs font-bold tracking-wider uppercase mb-2 block">
              The Anti-Procrastination Engine
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-6">
              Active planning beats passive alerts.
            </h2>
            <p className="text-slate-400 text-base leading-relaxed mb-8">
              A regular calendar app watches you miss deadlines with cold indifference. Deadline Guardian uses advanced generative AI to understand your habits and actively guide you through tasks.
            </p>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="bg-rose-500/10 text-rose-400 p-2.5 rounded-lg h-fit">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Risk Prediction</h4>
                  <p className="text-slate-400 text-sm">AI evaluates task descriptions, due dates, and your habits to predict exactly when a deadline is in danger.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-lg h-fit">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">The 5-Minute Procrastination Breaker</h4>
                  <p className="text-slate-400 text-sm">Generate micro-sessions designed to get you past initial friction and trigger deep flow states easily.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-indigo-500/10 text-indigo-400 p-2.5 rounded-lg h-fit">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Goal Alignment</h4>
                  <p className="text-slate-400 text-sm">Connect daily check-offs to long-term career or study objectives, updating progress dynamically.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent rounded-3xl blur-2xl" />
            <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-xs font-mono text-slate-400">HIGH RISK DEADLINE ALERT</span>
                </div>
                <span className="text-xs text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded">Urgent Action Required</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Pitch Deck Final Draft</h3>
              <p className="text-xs text-slate-400 mb-4 font-mono">Due in: 14 hours | Estimated effort: 6.5 hours</p>
              
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-4">
                <p className="text-sm text-slate-300 italic">
                  "Guardian AI Prediction: Delaying beyond 1:00 PM will reduce completion success by 45%. You are at risk of a late submission. Proposing an immediate focus sprint."
                </p>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                  <span>Phase 1: Structure key narrative slides (45 min)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                  <span>Phase 2: Finalize financials & competitor charts (60 min)</span>
                </div>
              </div>

              <button 
                onClick={onStart}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                Lock in suggested AI schedule
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            <span className="font-bold text-white">Deadline Guardian</span>
          </div>
          <p className="text-slate-500 text-xs">
            © 2026 Deadline Guardian. Empowered by server-side Gemini 3.5. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
