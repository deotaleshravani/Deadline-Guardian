import React, { useState, useEffect, useRef } from "react";
import { 
  Mic, MicOff, Play, CheckCircle2, AlertTriangle, Calendar, 
  Sparkles, ListPlus, Terminal, Volume2, VolumeX, RotateCcw,
  Loader2, ArrowRight, ShieldAlert, Sparkle, Command, HelpCircle, Check, Info, ChevronRight
} from "lucide-react";
import { Task, UserPreferences } from "../types";

// Speech Recognition Type setup
type SpeechRecognitionResultList = any;
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent {
  error: string;
}
interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface VoiceAssistantProps {
  tasks: Task[];
  preferences?: UserPreferences;
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => Promise<string | undefined>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
}

export default function VoiceAssistant({
  tasks,
  preferences,
  addTask,
  updateTask
}: VoiceAssistantProps) {
  
  // States
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [audioFeedback, setAudioFeedback] = useState(true);
  
  // Parsed Output States
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [lastParams, setLastParams] = useState<any>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

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

  // High-fidelity markdown block renderer
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("###")) {
        return <h4 key={idx} className="text-white font-extrabold text-sm mt-4 mb-2 first:mt-0 flex items-center gap-1.5 border-b border-slate-800 pb-1 uppercase tracking-wide">{parseInlineMarkdown(trimmed.replace("###", "").trim())}</h4>;
      }
      if (trimmed.startsWith("##")) {
        return <h3 key={idx} className="text-white font-extrabold text-base mt-5 mb-2.5 first:mt-0 border-l-2 border-indigo-500 pl-2">{parseInlineMarkdown(trimmed.replace("##", "").trim())}</h3>;
      }
      if (trimmed.startsWith("#")) {
        return <h2 key={idx} className="text-white font-black text-lg mt-6 mb-3">{parseInlineMarkdown(trimmed.replace("#", "").trim())}</h2>;
      }
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const content = trimmed.substring(2).trim();
        return (
          <li key={idx} className="text-slate-300 text-xs sm:text-sm ml-5 list-disc mb-1.5 leading-relaxed">
            {parseInlineMarkdown(content)}
          </li>
        );
      }
      if (/^\d+\./.test(trimmed)) {
        const content = trimmed.replace(/^\d+\./, "").trim();
        return (
          <li key={idx} className="text-slate-300 text-xs sm:text-sm ml-5 list-decimal mb-2 leading-relaxed">
            {parseInlineMarkdown(content)}
          </li>
        );
      }
      if (trimmed === "") return <div key={idx} className="h-3" />;
      return <p key={idx} className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-2">{parseInlineMarkdown(trimmed)}</p>;
    });
  };

  // Command logs
  const [logs, setLogs] = useState<{ id: string; input: string; action: string; time: string; success: boolean }[]>([]);

  // Auxiliary displays matching commands
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [urgentDeadlines, setUrgentDeadlines] = useState<Task[]>([]);
  const [generatedPlan, setGeneratedPlan] = useState<string[]>([]);

  // Web Speech API references
  const recognitionRef = useRef<any>(null);

  // Suggested voice commands
  const suggestedVoicePrompts = [
    { label: "Add study daily", cmd: "Add task Study Daily due tomorrow priority high category student" },
    { label: "Check deadlines", cmd: "Check deadlines and list overdue tasks" },
    { label: "Show schedule", cmd: "Show schedule and review active blocks" },
    { label: "Mark complete", cmd: `Mark task complete ${tasks.find(t => t.status !== "completed")?.title || "homework"}` },
    { label: "Generate plan", cmd: "Generate plan to complete study assignments" }
  ];

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      const rec = new SpeechRecognitionClass();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        setVoiceText("Listening... Speak clearly.");
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceText(transcript);
        processVoiceCommand(transcript);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        setVoiceText(`Error: ${event.error}. Please try typing your command below!`);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Text-To-Speech (TTS) Voice Readback
  const speakVoice = (text: string) => {
    if (!audioFeedback) return;
    try {
      // Cancel any ongoing speaking
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95; // professional pacing
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("Speech synthesis not supported or blocked", err);
    }
  };

  const startSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        // Recognition already running or state error
        recognitionRef.current.stop();
      }
    } else {
      alert("Speech Recognition API is not supported in this browser. Please use the high-fidelity simulator below to type or click commands!");
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Main NLP processor using our AI Endpoint
  const processVoiceCommand = async (inputStr: string) => {
    if (!inputStr.trim()) return;
    setParsing(true);
    setLastAction(null);
    setLastParams(null);
    setAiExplanation(null);
    
    // Clear subdisplays
    setScheduleData([]);
    setUrgentDeadlines([]);
    setGeneratedPlan([]);

    try {
      const response = await fetch("/api/voice-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceInput: inputStr, tasks, preferences })
      });

      if (!response.ok) throw new Error("Voice command route failed");
      const data = await response.json();

      const action = data.action;
      const params = data.parameters || {};
      const explanation = data.explanation || "Command processed.";

      setLastAction(action);
      setLastParams(params);
      setAiExplanation(explanation);
      speakVoice(explanation);

      let commandSuccess = true;

      // EXECUTE THE STRUCTURAL ACTIONS
      if (action === "add_task") {
        const newTaskData = {
          title: params.title || "New Voice Task",
          description: "Created via voice command parsing engine.",
          deadline: params.deadline || new Date().toISOString().split('T')[0],
          priority: params.priority || "medium",
          category: params.category || "student",
          status: "pending" as const,
          subtasks: [],
          estimatedTime: params.estimatedTime || 120
        };
        await addTask(newTaskData);
      } 
      else if (action === "mark_complete") {
        const targetTitle = (params.title || "").toLowerCase();
        // find best matching uncompleted task
        const matched = tasks.find(t => 
          t.status !== "completed" && 
          t.title.toLowerCase().includes(targetTitle)
        );
        if (matched) {
          await updateTask(matched.id, {
            status: "completed",
            progress: 100
          });
        } else {
          commandSuccess = false;
        }
      } 
      else if (action === "show_schedule") {
        // Prepare beautiful simulated hourly blocks based on user's tasks
        const active = tasks.filter(t => t.status !== "completed");
        const hourly = [
          { time: "09:00 AM", item: "Core Focus Block: Daily Review & Standing Goals" },
          { time: "10:30 AM", item: active[0] ? `Execute: ${active[0].title}` : "Open Study & Deep Research" },
          { time: "02:00 PM", item: active[1] ? `Progress Block: ${active[1].title}` : "System Administration / Backlog Clearing" },
          { time: "04:30 PM", item: "Accountability Check & AI Habit Integration Review" }
        ];
        setScheduleData(hourly);
      } 
      else if (action === "check_deadlines") {
        // Prepare urgent deadline lists
        const sorted = [...tasks]
          .filter(t => t.status !== "completed")
          .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        setUrgentDeadlines(sorted.slice(0, 4));
      } 
      else if (action === "generate_plan") {
        // Generate beautiful structured checklist plan
        const activeTitles = tasks.filter(t => t.status !== "completed").map(t => t.title);
        const plan = [
          `1. Morning Micro-Commitment: Review ${activeTitles[0] || 'core files'} for 15 minutes.`,
          `2. Eliminate Startup Friction: Pre-open environment editors or files.`,
          `3. Run a 50-minute Deep Focus Block on ${activeTitles[1] || 'high priority deadlines'}.`,
          `4. Execute daily 'Study Daily' and 'Exercise' habits to release cortisol.`,
          `5. Submit evening progress reports to clear the Deadline Guardian log.`
        ];
        setGeneratedPlan(plan);
      }

      // Add to session log
      setLogs(prev => [
        {
          id: Math.random().toString(),
          input: inputStr,
          action,
          time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
          success: commandSuccess
        },
        ...prev
      ]);

    } catch (err) {
      console.error(err);
      const errExp = "Unable to route voice command parameters. Please check your spelling and try again.";
      setAiExplanation(errExp);
      speakVoice(errExp);
    } finally {
      setParsing(false);
    }
  };

  const handleManualCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voiceText.trim()) return;
    processVoiceCommand(voiceText);
  };

  return (
    <div className="space-y-8 pb-12 font-sans selection:bg-indigo-500 selection:text-white" id="voice-productivity-assistant">
      
      {/* 1. Header display */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 border border-slate-850 p-6 sm:p-8 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[150px] h-[150px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-indigo-500/15 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <Mic className="w-3.5 h-3.5 text-indigo-400" />
            Vocal Command Console
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Voice Productivity Assistant
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Convert standard vocal directives into system actions. Manage active tasks, check deadlines, review day schedules, and generate deep work study plans using natural speech inputs.
          </p>
        </div>

        {/* Audio feedback toggler */}
        <button 
          onClick={() => {
            setAudioFeedback(!audioFeedback);
            // Cancel voice immediately if turned off
            if (audioFeedback) window.speechSynthesis.cancel();
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer border transition-all shrink-0 z-10 ${
            audioFeedback 
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
              : 'bg-slate-950 border-slate-850 text-slate-500'
          }`}
          title="Toggle Assistant Speech Audio"
        >
          {audioFeedback ? (
            <>
              <Volume2 className="w-4 h-4 text-amber-500" />
              Voice Response On
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4" />
              Voice Response Off
            </>
          )}
        </button>
      </div>

      {/* 2. Visual Audio Capture Workspace & Waveform */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        
        {/* BIG MIC BUTTON / LIVE LISTENING AREA */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-850 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 relative overflow-hidden">
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-extrabold uppercase tracking-wider block">Voice Capture Capture</span>
            {isListening && (
              <span className="inline-flex items-center gap-1 bg-rose-500/20 text-rose-400 px-2.5 py-0.5 border border-rose-500/20 rounded-full text-[10px] font-bold uppercase font-mono animate-pulse">
                Recording Active
              </span>
            )}
          </div>

          <div className="flex flex-col items-center justify-center py-6 space-y-5 text-center">
            
            {/* Interactive microphone globe button */}
            <button
              onClick={isListening ? stopSpeechRecognition : startSpeechRecognition}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                isListening 
                  ? 'bg-gradient-to-tr from-rose-600 to-rose-400 hover:scale-105 shadow-[0_0_24px_rgba(244,63,94,0.4)]' 
                  : 'bg-indigo-600 hover:bg-indigo-500 hover:scale-105 shadow-xl'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-10 h-10 text-white" />
                  {/* Bouncing radial waves for active speech visualizer */}
                  <div className="absolute inset-0 rounded-full border border-rose-500 animate-ping opacity-75" />
                  <div className="absolute -inset-4 rounded-full border border-rose-500/40 animate-ping opacity-40" />
                </>
              ) : (
                <Mic className="w-10 h-10 text-white" />
              )}
            </button>

            <div className="space-y-1.5 max-w-sm">
              <h3 className="font-extrabold text-white text-base">
                {isListening ? "Listening to voice directive..." : "Tap to Speak Command"}
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Click the microphone globe and say commands like <span className="text-amber-400 font-bold">"Add task Complete calculus chapter"</span> or <span className="text-amber-400 font-bold">"Check deadlines"</span>.
              </p>
            </div>

            {/* Simulated bouncing speech waves */}
            <div className="flex items-center gap-1 h-6">
              {[...Array(9)].map((_, idx) => (
                <div 
                  key={idx} 
                  className={`w-1 bg-indigo-500 rounded-full transition-all duration-150 ${
                    isListening ? 'animate-bounce h-5' : 'h-1 bg-slate-800'
                  }`}
                  style={{ 
                    animationDelay: `${idx * 0.1}s`,
                    animationDuration: `${0.4 + (idx % 3) * 0.2}s`
                  }}
                />
              ))}
            </div>

          </div>

          {/* Fallback Command Input box */}
          <form onSubmit={handleManualCommandSubmit} className="space-y-3 pt-4 border-t border-slate-850">
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <span>Command Console Dictation</span>
              <span>Manual Sandbox input</span>
            </div>
            
            <div className="flex gap-2.5">
              <input
                type="text"
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                placeholder="Or type a vocal command here (e.g., 'Add task study daily tomorrow')"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm text-white focus:outline-none placeholder-slate-500 font-mono"
              />
              <button
                type="submit"
                disabled={parsing || !voiceText.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs px-5 py-3 rounded-xl flex items-center gap-1 cursor-pointer transition-all shrink-0"
              >
                {parsing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    Run command
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

        </div>

        {/* RECENT VOICE ACTIVITY LOG & SUGGESTIONS */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
          
          <div className="space-y-4">
            <span className="text-xs text-slate-400 font-extrabold uppercase tracking-wider block">Simulator Sandbox Chips</span>
            
            <div className="space-y-2.5">
              <p className="text-slate-400 text-xs leading-relaxed">
                Click a preset to quickly execute voice commands in this sandboxed environment:
              </p>

              <div className="flex flex-col gap-2">
                {suggestedVoicePrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setVoiceText(p.cmd);
                      processVoiceCommand(p.cmd);
                    }}
                    className="text-left bg-slate-950 border border-slate-850 hover:border-indigo-500/40 p-2.5 rounded-xl text-[11px] text-slate-300 font-mono flex items-center justify-between cursor-pointer group transition-all"
                  >
                    <span className="truncate max-w-[200px]">{p.cmd}</span>
                    <ChevronRight className="w-3 h-3 text-slate-500 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Session history log */}
          <div className="pt-4 border-t border-slate-850 space-y-3">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Session Activity Logs</span>
            
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <p className="text-slate-500 text-[10px] italic">No vocal sessions logged in this session yet.</p>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="bg-slate-950/40 p-2 border border-slate-850/60 rounded-lg flex items-center justify-between gap-2">
                    <div className="truncate text-[10px] font-mono text-slate-400">
                      <span className="text-slate-500">[{log.time}]</span> "{log.input}"
                    </div>
                    <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                      log.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {log.action}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 3. Dynamic Interactive Feedback Workspace */}
      {(parsing || aiExplanation) && (
        <div className="bg-slate-900 border border-indigo-500/10 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden animate-fadeIn">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-3 pb-4 border-b border-slate-850 mb-5">
            <div className="bg-gradient-to-tr from-amber-500 to-indigo-500 p-2 rounded-xl text-slate-950">
              <Sparkles className="w-5 h-5 text-slate-950 stroke-[2]" />
            </div>
            <div>
              <span className="text-[9px] font-mono text-amber-500 font-bold uppercase tracking-wider block">AI Companion Feedback</span>
              <h3 className="font-extrabold text-white text-base">Deadline Guardian Vocal Response</h3>
            </div>
          </div>

          {parsing ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-slate-450 text-xs font-mono">Decoding voice transcription parameters...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Spoken bubble response */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 flex items-start gap-3.5">
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-2.5 rounded-xl text-indigo-400 shrink-0">
                  <Volume2 className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="max-h-[300px] overflow-y-auto pr-2 font-sans">
                    {renderMarkdown(aiExplanation || "")}
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 border-t border-slate-850/60 pt-2 mt-2">Audio feedback verbalized. Check task registers to verify execution.</p>
                </div>
              </div>

              {/* ACTION EXECUTION FEEDBACKS */}
              {lastAction === "add_task" && lastParams && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-500/15 p-2 rounded-lg text-emerald-400">
                      <ListPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-wider block">Structural Action Executed</span>
                      <h4 className="font-bold text-white text-sm">Created Task: "{lastParams.title}"</h4>
                      <p className="text-slate-400 text-xs mt-0.5">
                        Priority: <strong className="text-amber-400 font-bold uppercase">{lastParams.priority}</strong> • Category: <strong className="capitalize text-indigo-400">{lastParams.category}</strong> • Deadline: <strong className="text-white">{lastParams.deadline}</strong>
                      </p>
                    </div>
                  </div>
                  <span className="bg-emerald-500/15 text-emerald-400 px-3 py-1 border border-emerald-500/20 rounded-full text-xs font-bold uppercase">Registered</span>
                </div>
              )}

              {lastAction === "mark_complete" && lastParams && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-500/15 p-2 rounded-lg text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-wider block">Structural Action Executed</span>
                      <h4 className="font-bold text-white text-sm">Task Completed Successfully</h4>
                      <p className="text-slate-400 text-xs mt-0.5">
                        Matched tasks with title keywords: <strong className="text-emerald-400 font-bold">"{lastParams.title}"</strong>. Checked off as completed!
                      </p>
                    </div>
                  </div>
                  <span className="bg-emerald-500/15 text-emerald-400 px-3 py-1 border border-emerald-500/20 rounded-full text-xs font-bold uppercase">Checked Off</span>
                </div>
              )}

              {/* Dynamic Schedule View Panel */}
              {lastAction === "show_schedule" && scheduleData.length > 0 && (
                <div className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-850">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-900">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-amber-500" />
                      Visualized Daily Hour-By-Hour Schedule
                    </h4>
                    <span className="text-[10px] font-mono text-indigo-400">Guardian Pacing System</span>
                  </div>

                  <div className="divide-y divide-slate-900">
                    {scheduleData.map((item, idx) => (
                      <div key={idx} className="py-3 flex items-start gap-4">
                        <span className="text-xs font-mono font-black text-amber-400 w-20 shrink-0">{item.time}</span>
                        <div className="space-y-0.5">
                          <p className="text-xs text-slate-200 font-semibold">{item.item}</p>
                          <span className="text-[9px] text-slate-500 font-mono">Hour study buffer lock active</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Deadline Risk Panel */}
              {lastAction === "check_deadlines" && urgentDeadlines.length > 0 && (
                <div className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-850">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-900">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-500" />
                      Audit Report: Active Deadline Hazards
                    </h4>
                    <span className="text-[10px] font-mono text-rose-400">Risk Assessment Analysis</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {urgentDeadlines.map((task) => (
                      <div key={task.id} className="bg-slate-900 border border-slate-850 rounded-xl p-3 flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h5 className="font-bold text-white text-xs">{task.title}</h5>
                          <p className="text-slate-450 text-[10px]">
                            Deadline: <strong className="text-rose-400">{task.deadline}</strong>
                          </p>
                        </div>
                        <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                          task.priority === 'high' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {task.priority} Priority
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic generated work plan */}
              {lastAction === "generate_plan" && generatedPlan.length > 0 && (
                <div className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-850">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-900">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      Actionable Focus Blueprint
                    </h4>
                    <span className="text-[10px] font-mono text-emerald-400">Interactive Tasks Planner</span>
                  </div>

                  <div className="space-y-2.5">
                    {generatedPlan.map((step, idx) => (
                      <div key={idx} className="bg-slate-900/55 p-3 rounded-xl border border-slate-850/60 flex items-start gap-3">
                        <div className="bg-indigo-500/10 text-indigo-400 p-1 rounded-lg shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-xs text-slate-300 leading-normal">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
}
