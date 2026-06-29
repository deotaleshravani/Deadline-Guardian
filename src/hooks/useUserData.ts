import { useState, useEffect } from "react";
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  deleteField
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { Task, SubTask, Goal, Habit, AIRecommendation, Message, AISchedule, AgentLog } from "../types";

export function useUserData() {
  const { user, preferences, updatePreferences } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [aiSchedule, setAiSchedule] = useState<AISchedule | null>(null);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  // Sync collections in real-time when authenticated
  useEffect(() => {
    if (!user) {
      setTasks([]);
      setGoals([]);
      setHabits([]);
      setRecommendations([]);
      setChatMessages([]);
      setAiSchedule(null);
      setAgentLogs([]);
      setLoading(false);
      return;
    }

    if (user.uid.startsWith("offline-")) {
      return;
    }

    setLoading(true);

    // 1. Sync Tasks
    const tasksQuery = query(collection(db, "users", user.uid, "tasks"), orderBy("deadline", "asc"));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const tasksList: Task[] = [];
      snapshot.forEach((docSnap) => {
        tasksList.push({ id: docSnap.id, ...docSnap.data() } as Task);
      });
      setTasks(tasksList);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/tasks`);
    });

    // 2. Sync Goals
    const goalsQuery = query(collection(db, "users", user.uid, "goals"), orderBy("targetDate", "asc"));
    const unsubscribeGoals = onSnapshot(goalsQuery, (snapshot) => {
      const goalsList: Goal[] = [];
      snapshot.forEach((docSnap) => {
        goalsList.push({ id: docSnap.id, ...docSnap.data() } as Goal);
      });
      setGoals(goalsList);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/goals`);
    });

    // 3. Sync Habits
    const habitsQuery = query(collection(db, "users", user.uid, "habits"), orderBy("name", "asc"));
    const unsubscribeHabits = onSnapshot(habitsQuery, (snapshot) => {
      const habitsList: Habit[] = [];
      snapshot.forEach((docSnap) => {
        habitsList.push({ id: docSnap.id, ...docSnap.data() } as Habit);
      });
      setHabits(habitsList);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/habits`);
    });

    // 4. Sync AI Recommendations
    const recsQuery = query(collection(db, "users", user.uid, "recommendations"), orderBy("createdAt", "desc"));
    const unsubscribeRecs = onSnapshot(recsQuery, (snapshot) => {
      const recsList: AIRecommendation[] = [];
      snapshot.forEach((docSnap) => {
        recsList.push({ id: docSnap.id, ...docSnap.data() } as AIRecommendation);
      });
      setRecommendations(recsList);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/recommendations`);
    });

    // 5. Sync Chat History (AI History)
    const chatQuery = query(collection(db, "users", user.uid, "chatHistory"), orderBy("timestamp", "asc"));
    const unsubscribeChat = onSnapshot(chatQuery, (snapshot) => {
      const chatList: Message[] = [];
      snapshot.forEach((docSnap) => {
        chatList.push({ id: docSnap.id, ...docSnap.data() } as Message);
      });
      setChatMessages(chatList);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/chatHistory`);
      setLoading(false);
    });

    // 6. Sync AI Schedule
    const scheduleDocRef = doc(db, "users", user.uid, "aiSchedule", "current");
    const unsubscribeSchedule = onSnapshot(scheduleDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setAiSchedule({ id: docSnap.id, ...docSnap.data() } as AISchedule);
      } else {
        setAiSchedule(null);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}/aiSchedule/current`);
    });

    // 7. Sync Agent Logs
    const logsQuery = query(collection(db, "users", user.uid, "agentLogs"), orderBy("timestamp", "desc"));
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const logsList: AgentLog[] = [];
      snapshot.forEach((docSnap) => {
        logsList.push({ id: docSnap.id, ...docSnap.data() } as AgentLog);
      });
      setAgentLogs(logsList);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/agentLogs`);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeGoals();
      unsubscribeHabits();
      unsubscribeRecs();
      unsubscribeChat();
      unsubscribeSchedule();
      unsubscribeLogs();
    };
  }, [user]);

  // Sync collections locally when in offline mode
  useEffect(() => {
    if (!user) return;
    
    if (user.uid.startsWith("offline-")) {
      const getOrSeed = <T>(key: string, defaultValue: T): T => {
        const stored = localStorage.getItem(`dg_${user.uid}_${key}`);
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch (e) {
            console.error("Local storage read error, returning default:", e);
          }
        }
        localStorage.setItem(`dg_${user.uid}_${key}`, JSON.stringify(defaultValue));
        return defaultValue;
      };

      const now = new Date();
      const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const inOneDay = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const inFiveDays = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const seedTasks: Task[] = [
        {
          id: "task-1",
          title: "Finish Quarterly Financial Projections",
          description: "Analyze Q3 growth metrics and present model estimates to the executive team.",
          deadline: inTwoDays,
          priority: "high",
          category: "professional",
          status: "in_progress",
          progress: 60,
          estimatedTime: 120,
          postponementsCount: 0,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          subtasks: [
            { id: "sub-1-1", title: "Gather current expenditure files", completed: true },
            { id: "sub-1-2", title: "Formulate baseline Q3 projections", completed: true },
            { id: "sub-1-3", title: "Synthesize draft review deck", completed: false }
          ],
          deadlineRisk: "Medium Risk",
          deadlineRiskExplanation: "Task has moderate effort remaining (120 min) and is due in 48 hours. Historical focus habits suggest a 15% probability of postponement.",
          deadlineRiskActions: [
            "Block 45 minutes this afternoon for raw projection review.",
            "Complete the Synthesize draft review deck subtask before signing off."
          ],
          aiPriorityScore: 82,
          aiPriorityLevel: "High"
        },
        {
          id: "task-2",
          title: "Refactor Authentication Flow",
          description: "Implement highly resilient guest mode fallback to secure zero-friction evaluations.",
          deadline: inOneDay,
          priority: "high",
          category: "professional",
          status: "in_progress",
          progress: 15,
          estimatedTime: 180,
          postponementsCount: 1,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          subtasks: [
            { id: "sub-2-1", title: "Incorporate robust fallback credentials", completed: true },
            { id: "sub-2-2", title: "Implement fully synchronized offline localStorage states", completed: false },
            { id: "sub-2-3", title: "Perform complete integration testing across browsers", completed: false }
          ],
          deadlineRisk: "Critical Risk",
          deadlineRiskExplanation: "This critical task is due in less than 24 hours. The progress is only 15% and has already been postponed once. Highly susceptible to immediate procrastination.",
          deadlineRiskActions: [
            "Use the voice coach right now to start a 25-minute Pomodoro block.",
            "Do not check any messaging apps until the offline synchronization logic compiles."
          ],
          aiPriorityScore: 95,
          aiPriorityLevel: "Critical"
        }
      ];

      const seedGoals: Goal[] = [
        { id: "goal-1", title: "Elevate Deep Focus Habits", progress: 45, targetDate: inFiveDays, linkedTasks: [], createdAt: now.toISOString() },
        { id: "goal-2", title: "Minimize Procrastination Triggers", progress: 80, targetDate: inFiveDays, linkedTasks: [], createdAt: now.toISOString() }
      ];

      const seedHabits: Habit[] = [
        { id: "habit-1", name: "30-min deep focus blocks", frequency: "daily", streak: 5, history: [now.toISOString().split('T')[0]], createdAt: now.toISOString() },
        { id: "habit-2", name: "Weekly agenda auditing", frequency: "weekly", streak: 2, history: [], createdAt: now.toISOString() }
      ];

      const seedLogs: AgentLog[] = [
        {
          id: "log-1",
          timestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
          actionType: "task_created",
          title: "Priority Allocated",
          description: "Allocated optimized focus blocks for 'Finish Quarterly Financial Projections'.",
          severity: "success",
          taskId: "task-1"
        },
        {
          id: "log-2",
          timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
          actionType: "procrastination_detected",
          title: "Deadline Risk Warning",
          description: "Risk warning dispatched for 'Refactor Authentication Flow' due to imminent deadline and low progress.",
          severity: "warning",
          taskId: "task-2"
        }
      ];

      const seedRecs: AIRecommendation[] = [
        {
          id: "rec-1",
          type: "risk",
          title: "Tackle Refactor Authentication Flow Now",
          description: "The AI Coach has flagged this task as 'Critical Risk' due to your upcoming deadline. Start a 30-minute block immediately.",
          taskId: "task-2",
          status: "active",
          createdAt: now.toISOString()
        }
      ];

      setTasks(getOrSeed("tasks", seedTasks));
      setGoals(getOrSeed("goals", seedGoals));
      setHabits(getOrSeed("habits", seedHabits));
      setRecommendations(getOrSeed("recommendations", seedRecs));
      setChatMessages(getOrSeed("chatMessages", []));
      setAiSchedule(getOrSeed("aiSchedule", null));
      setAgentLogs(getOrSeed("agentLogs", seedLogs));
      setLoading(false);
    }
  }, [user]);

  // Proactive AI Agent Logs Helper
  const addAgentLog = async (
    actionType: AgentLog['actionType'],
    title: string,
    description: string,
    severity: AgentLog['severity'] = 'info',
    taskId?: string
  ) => {
    if (!user) return;
    
    const logItem: AgentLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      actionType,
      title,
      description,
      severity,
      taskId: taskId || ""
    };

    if (user.uid.startsWith("offline-")) {
      const updatedLogs = [logItem, ...agentLogs];
      setAgentLogs(updatedLogs);
      localStorage.setItem(`dg_${user.uid}_agentLogs`, JSON.stringify(updatedLogs));
      return;
    }

    const logColRef = collection(db, "users", user.uid, "agentLogs");
    const newDocRef = doc(logColRef);
    logItem.id = newDocRef.id;
    try {
      await setDoc(newDocRef, logItem);
    } catch (err) {
      console.error("Error writing agent log:", err);
    }
  };

  // Autonomous Agent Core Processing Pipeline
  const runAutonomousAgentPipeline = async (taskId: string, currentTask: Task) => {
    if (!user || !preferences) return;

    // Step 1: Log Detection
    await addAgentLog(
      'task_created',
      `Autonomous Agent Active`,
      `Initializing proactive accountability track for task: "${currentTask.title}".`,
      'info',
      taskId
    );

    // Step 2: Auto Subtask Generation (if empty)
    let finalTaskState = { ...currentTask };
    if (!currentTask.subtasks || currentTask.subtasks.length === 0) {
      await addAgentLog(
        'subtasks_generated',
        `Breaking Down Task`,
        `Autonomously generating actionable micro-steps to defeat startup friction for "${currentTask.title}".`,
        'info',
        taskId
      );

      try {
        const res = await fetch("/api/generate-subtasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: currentTask.title,
            description: currentTask.description,
            category: currentTask.category
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.subtasks && Array.isArray(data.subtasks)) {
            const generated: SubTask[] = data.subtasks.map((st: any, idx: number) => ({
              id: `ai-${Date.now()}-${idx}`,
              title: st.title,
              completed: false,
              estimatedMinutes: st.estimatedMinutes || 30
            }));

            finalTaskState.subtasks = generated;
            finalTaskState.progress = 0;
            finalTaskState.status = 'pending';

            if (user.uid.startsWith("offline-")) {
              setTasks(prev => {
                const updated = prev.map(t => t.id === taskId ? finalTaskState : t);
                localStorage.setItem(`dg_${user.uid}_tasks`, JSON.stringify(updated));
                return updated;
              });
            } else {
              await updateDoc(doc(db, "users", user.uid, "tasks", taskId), {
                subtasks: generated,
                progress: 0,
                status: 'pending'
              });
            }

            await addAgentLog(
              'subtasks_generated',
              `Friction-Free Breakdown Created`,
              `Autonomously created ${generated.length} sequential subtasks for "${currentTask.title}".`,
              'success',
              taskId
            );
          }
        }
      } catch (err) {
        console.error("Proactive subtasks error:", err);
      }
    }

    // Step 3: Analyze Task & Predict Risks
    await addAgentLog(
      'task_analyzed',
      `Analyzing Workload Risks`,
      `Calculating priority score and threat levels based on your study history and focus preferences.`,
      'info',
      taskId
    );

    const latestTasksList = tasks.map(t => t.id === taskId ? finalTaskState : t);
    if (!latestTasksList.some(t => t.id === taskId)) {
      latestTasksList.push(finalTaskState);
    }

    try {
      const res = await fetch("/api/analyze-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: latestTasksList,
          userPreferences: preferences,
          habits: habits
        })
      });

      if (res.ok) {
        const data = await res.json();

        if (typeof data.productivityScore === "number") {
          await updatePreferences({ productivityScore: data.productivityScore });
        }

        if (data.taskAnalyses && Array.isArray(data.taskAnalyses)) {
          const matchingAnalysis = data.taskAnalyses.find((ta: any) => ta.taskId === taskId);
          if (matchingAnalysis) {
            finalTaskState = {
              ...finalTaskState,
              riskLevel: matchingAnalysis.riskLevel,
              riskAnalysis: matchingAnalysis.riskAnalysis,
              deadlineRisk: matchingAnalysis.deadlineRisk || "Safe",
              deadlineRiskExplanation: matchingAnalysis.deadlineRiskExplanation || "",
              deadlineRiskActions: matchingAnalysis.deadlineRiskActions || [],
              suggestedSchedule: matchingAnalysis.suggestedSchedule,
              aiPriorityScore: matchingAnalysis.priorityScore || null,
              aiPriorityLevel: matchingAnalysis.priorityLevel || null,
              aiPriorityReasoning: matchingAnalysis.priorityReasoning || null
            };

            if (user.uid.startsWith("offline-")) {
              setTasks(prev => {
                const updated = prev.map(t => t.id === taskId ? finalTaskState : t);
                localStorage.setItem(`dg_${user.uid}_tasks`, JSON.stringify(updated));
                return updated;
              });
            } else {
              await updateDoc(doc(db, "users", user.uid, "tasks", taskId), {
                riskLevel: matchingAnalysis.riskLevel,
                riskAnalysis: matchingAnalysis.riskAnalysis,
                deadlineRisk: matchingAnalysis.deadlineRisk || "Safe",
                deadlineRiskExplanation: matchingAnalysis.deadlineRiskExplanation || "",
                deadlineRiskActions: matchingAnalysis.deadlineRiskActions || [],
                suggestedSchedule: matchingAnalysis.suggestedSchedule,
                aiPriorityScore: matchingAnalysis.priorityScore || null,
                aiPriorityLevel: matchingAnalysis.priorityLevel || null,
                aiPriorityReasoning: matchingAnalysis.priorityReasoning || null
              });
            }

            const prioritySeverity = (matchingAnalysis.priorityLevel === 'Critical' || matchingAnalysis.priorityLevel === 'High') ? 'alert' : 'success';
            await addAgentLog(
              'priority_assigned',
              `Priority Assigned: ${matchingAnalysis.priorityLevel || 'Medium'}`,
              `Calculated score: ${matchingAnalysis.priorityScore || 50}/100. ${matchingAnalysis.priorityReasoning || ""}`,
              prioritySeverity,
              taskId
            );

            if (matchingAnalysis.deadlineRisk && matchingAnalysis.deadlineRisk !== "Safe") {
              await addAgentLog(
                'risk_predicted',
                `Predicted Risk: ${matchingAnalysis.deadlineRisk}`,
                `Threat evaluation: ${matchingAnalysis.riskAnalysis || "Deadlines overlapping with schedule capacity."}`,
                'warning',
                taskId
              );
            }
          }
        }
      }
    } catch (err) {
      console.error("Proactive analysis error:", err);
    }

    // Step 4: Proactive Weekly Scheduling
    await addAgentLog(
      'schedule_updated',
      `Optimizing Calendar Workload`,
      `Autonomously generating study blocks and mindful breaks to fit your daily focus energy.`,
      'info',
      taskId
    );

    try {
      const start = new Date().toISOString().split('T')[0];
      const res = await fetch("/api/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: latestTasksList,
          userPreferences: preferences,
          startDate: start
        })
      });

      if (res.ok) {
        const data = await res.json();
        const scheduleData = {
          generatedAt: new Date().toISOString(),
          startDate: start,
          endDate: new Date(new Date(start).getTime() + 6 * 24 * 3600 * 1000).toISOString().split('T')[0],
          items: data.items || [],
          overloadScore: data.overloadScore || 50,
          analysis: data.analysis || ""
        };

        if (user.uid.startsWith("offline-")) {
          const offlineSchedule = { id: "current", ...scheduleData };
          setAiSchedule(offlineSchedule);
          localStorage.setItem(`dg_${user.uid}_aiSchedule`, JSON.stringify(offlineSchedule));
        } else {
          const scheduleDocRef = doc(db, "users", user.uid, "aiSchedule", "current");
          await setDoc(scheduleDocRef, scheduleData);
        }

        await addAgentLog(
          'auto_rescheduled',
          `Weekly Calendar Re-Optimized`,
          `Study blocks and intervals distributed. Overall workload density at ${data.overloadScore || 50}%.`,
          'success',
          taskId
        );
      }
    } catch (err) {
      console.error("Proactive scheduling error:", err);
    }
  };

  // Task Operations
  const addTask = async (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
    if (!user) return;
    const nowIso = new Date().toISOString();

    if (user.uid.startsWith("offline-")) {
      const newId = `task-${Math.random().toString(36).substr(2, 9)}`;
      const fullTask: Task = {
        ...task,
        id: newId,
        createdAt: nowIso,
        updatedAt: nowIso,
        subtasks: task.subtasks || [],
        postponementsCount: 0
      };
      const updated = [fullTask, ...tasks];
      setTasks(updated);
      localStorage.setItem(`dg_${user.uid}_tasks`, JSON.stringify(updated));
      setTimeout(() => {
        runAutonomousAgentPipeline(newId, fullTask);
      }, 100);
      return newId;
    }

    const taskColRef = collection(db, "users", user.uid, "tasks");
    
    const newDocRef = doc(taskColRef);
    const fullTask: Task = {
      ...task,
      id: newDocRef.id,
      createdAt: nowIso,
      updatedAt: nowIso,
      subtasks: task.subtasks || [],
      postponementsCount: 0
    };
    
    try {
      await setDoc(newDocRef, fullTask);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/tasks/${newDocRef.id}`);
    }
    
    // Autonomously trigger the entire agent pipeline
    setTimeout(() => {
      runAutonomousAgentPipeline(newDocRef.id, fullTask);
    }, 100);

    return newDocRef.id;
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!user) return;

    // Auto-detect if user is postponing the deadline
    const currentTask = tasks.find(t => t.id === taskId);
    let postponementsCount = currentTask?.postponementsCount || 0;
    let isPostponed = false;
    if (currentTask && updates.deadline) {
      const prevTime = new Date(currentTask.deadline).getTime();
      const newTime = new Date(updates.deadline).getTime();
      if (newTime > prevTime + 60000) {
        postponementsCount += 1;
        updates.postponementsCount = postponementsCount;
        isPostponed = true;
      }
    }

    const updatedWithTimestamp = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (user.uid.startsWith("offline-")) {
      const updatedTaskObj = currentTask ? { ...currentTask, ...updatedWithTimestamp } : (updatedWithTimestamp as Task);
      const updatedTasks = tasks.map(t => t.id === taskId ? updatedTaskObj : t);
      setTasks(updatedTasks);
      localStorage.setItem(`dg_${user.uid}_tasks`, JSON.stringify(updatedTasks));

      if (currentTask) {
        if (isPostponed) {
          await addAgentLog(
            'procrastination_detected',
            `Procrastination Alert: Postponement`,
            `Detected extended deadline for "${currentTask.title}" (${postponementsCount} total). Triggering emergency reschedule support.`,
            'warning',
            taskId
          );
          setTimeout(() => {
            runAutonomousAgentPipeline(taskId, updatedTaskObj);
          }, 100);
        } else if (updates.status || updates.deadline || updates.priority || updates.title) {
          triggerAIAnalysis(updatedTasks);
        }
      }
      return;
    }

    const docRef = doc(db, "users", user.uid, "tasks", taskId);
    try {
      await updateDoc(docRef, updatedWithTimestamp);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/tasks/${taskId}`);
    }
    
    if (currentTask) {
      const updatedTaskObj = { ...currentTask, ...updatedWithTimestamp };
      if (isPostponed) {
        await addAgentLog(
          'procrastination_detected',
          `Procrastination Alert: Postponement`,
          `Detected extended deadline for "${currentTask.title}" (${postponementsCount} total). Triggering emergency reschedule support.`,
          'warning',
          taskId
        );
        setTimeout(() => {
          runAutonomousAgentPipeline(taskId, updatedTaskObj);
        }, 100);
      } else if (updates.status || updates.deadline || updates.priority || updates.title) {
        const updatedTasks = tasks.map(t => t.id === taskId ? updatedTaskObj : t);
        triggerAIAnalysis(updatedTasks);
      }
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!user) return;
    const currentTask = tasks.find(t => t.id === taskId);

    if (user.uid.startsWith("offline-")) {
      if (currentTask) {
        await addAgentLog(
          'coaching',
          `Task Deleted`,
          `Task "${currentTask.title}" removed. Auto-balancing agenda schedule now.`,
          'info'
        );
      }
      const updatedTasks = tasks.filter(t => t.id !== taskId);
      setTasks(updatedTasks);
      localStorage.setItem(`dg_${user.uid}_tasks`, JSON.stringify(updatedTasks));
      
      const relatedRecs = recommendations.filter(r => r.taskId === taskId);
      const remainingRecs = recommendations.filter(r => r.taskId !== taskId);
      setRecommendations(remainingRecs);
      localStorage.setItem(`dg_${user.uid}_recommendations`, JSON.stringify(remainingRecs));

      triggerAIAnalysis(updatedTasks);
      return;
    }

    try {
      const docRef = doc(db, "users", user.uid, "tasks", taskId);
      await deleteDoc(docRef);
      
      if (currentTask) {
        await addAgentLog(
          'coaching',
          `Task Deleted`,
          `Task "${currentTask.title}" removed. Auto-balancing agenda schedule now.`,
          'info'
        );
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/tasks/${taskId}`);
    }
    
    const relatedRecs = recommendations.filter(r => r.taskId === taskId);
    for (const rec of relatedRecs) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "recommendations", rec.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/recommendations/${rec.id}`);
      }
    }

    const updatedTasks = tasks.filter(t => t.id !== taskId);
    triggerAIAnalysis(updatedTasks);
  };

  const calculateTaskProgressFromSubtasks = (subtasksList: SubTask[]) => {
    if (subtasksList.length === 0) return 0;
    const completedCount = subtasksList.filter(s => s.completed).length;
    return Math.round((completedCount / subtasksList.length) * 100);
  };

  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = task.subtasks.map(s => 
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );

    const isNowCompleted = !task.subtasks.find(s => s.id === subtaskId)?.completed;
    const subtaskTitle = task.subtasks.find(s => s.id === subtaskId)?.title || "Subtask";
    const newProgress = calculateTaskProgressFromSubtasks(updatedSubtasks);

    await updateTask(taskId, { 
      subtasks: updatedSubtasks,
      progress: newProgress,
      status: newProgress === 100 ? 'completed' : newProgress > 0 ? 'in_progress' : 'pending'
    });
    updateLinkedGoalsProgress(taskId, updatedSubtasks);

    await addAgentLog(
      'progress_monitored',
      isNowCompleted ? `Subtask Done` : `Subtask Restored`,
      isNowCompleted 
        ? `Autonomously logged progress for "${task.title}": Checked "${subtaskTitle}". Progress is at ${newProgress}%.`
        : `Autonomously logged progress for "${task.title}": Unchecked "${subtaskTitle}". Progress is at ${newProgress}%.`,
      isNowCompleted ? 'success' : 'info',
      taskId
    );

    if (newProgress === 100 && isNowCompleted) {
      await addAgentLog(
        'coaching',
        `🏆 Task Mastered!`,
        `Fabulous accountability! You completed "${task.title}". The scheduler has locked in this win and optimized remaining workload.`,
        'success',
        taskId
      );
    }
  };

  // Add Manual Subtask
  const addSubtask = async (taskId: string, title: string, estimatedMinutes: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newSubtask: SubTask = {
      id: `man-${Date.now()}`,
      title,
      completed: false,
      estimatedMinutes
    };

    const updatedSubtasks = [...(task.subtasks || []), newSubtask];
    const newProgress = calculateTaskProgressFromSubtasks(updatedSubtasks);

    await updateTask(taskId, { 
      subtasks: updatedSubtasks,
      progress: newProgress,
      status: newProgress === 100 ? 'completed' : newProgress > 0 ? 'in_progress' : 'pending'
    });
    updateLinkedGoalsProgress(taskId, updatedSubtasks);
  };

  // Remove Manual Subtask
  const removeSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = (task.subtasks || []).filter(s => s.id !== subtaskId);
    const newProgress = calculateTaskProgressFromSubtasks(updatedSubtasks);

    await updateTask(taskId, { 
      subtasks: updatedSubtasks,
      progress: newProgress,
      status: newProgress === 100 ? 'completed' : newProgress > 0 ? 'in_progress' : 'pending'
    });
    updateLinkedGoalsProgress(taskId, updatedSubtasks);
  };

  // Move Subtask Up/Down (Recommended Order Customization)
  const moveSubtask = async (taskId: string, index: number, direction: 'up' | 'down') => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = [...(task.subtasks || [])];
    if (direction === 'up' && index > 0) {
      const temp = updatedSubtasks[index];
      updatedSubtasks[index] = updatedSubtasks[index - 1];
      updatedSubtasks[index - 1] = temp;
    } else if (direction === 'down' && index < updatedSubtasks.length - 1) {
      const temp = updatedSubtasks[index];
      updatedSubtasks[index] = updatedSubtasks[index + 1];
      updatedSubtasks[index + 1] = temp;
    } else {
      return;
    }

    await updateTask(taskId, { subtasks: updatedSubtasks });
  };

  // Break Down Task via AI Endpoint
  const requestAISubtasks = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !user) return;

    setAiAnalyzing(true);
    try {
      const res = await fetch("/api/generate-subtasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          category: task.category
        })
      });

      if (!res.ok) throw new Error("API call failed");
      const data = await res.json();

      if (data.subtasks && Array.isArray(data.subtasks)) {
        const generated: SubTask[] = data.subtasks.map((st: any, idx: number) => ({
          id: `ai-${Date.now()}-${idx}`,
          title: st.title,
          completed: false,
          estimatedMinutes: st.estimatedMinutes || 30
        }));

        await updateTask(taskId, { 
          subtasks: generated,
          progress: 0,
          status: 'pending'
        });
        updateLinkedGoalsProgress(taskId, generated);
      }
    } catch (err) {
      console.error("Error getting AI subtasks:", err);
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Trigger Full AI Urgency / Schedule / Procrastination Analysis
  const triggerAIAnalysis = async (tasksList = tasks) => {
    if (!user || !preferences || tasksList.length === 0) return;

    if (user.uid.startsWith("offline-")) {
      setAiAnalyzing(true);
      try {
        const res = await fetch("/api/analyze-tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tasks: tasksList,
            userPreferences: preferences,
            habits: habits
          })
        });

        if (!res.ok) throw new Error("Analysis failed");
        const data = await res.json();

        if (typeof data.productivityScore === "number") {
          await updatePreferences({ productivityScore: data.productivityScore });
        }

        let updatedTasksList = [...tasksList];
        if (data.taskAnalyses && Array.isArray(data.taskAnalyses)) {
          updatedTasksList = tasksList.map(t => {
            const ta = data.taskAnalyses.find((a: any) => a.taskId === t.id);
            if (ta) {
              return {
                ...t,
                riskLevel: ta.riskLevel,
                riskAnalysis: ta.riskAnalysis,
                deadlineRisk: ta.deadlineRisk || "Safe",
                deadlineRiskExplanation: ta.deadlineRiskExplanation || "",
                deadlineRiskActions: ta.deadlineRiskActions || [],
                suggestedSchedule: ta.suggestedSchedule,
                aiPriorityScore: ta.priorityScore || null,
                aiPriorityLevel: ta.priorityLevel || null,
                aiPriorityReasoning: ta.priorityReasoning || null
              };
            }
            return t;
          });
          setTasks(updatedTasksList);
          localStorage.setItem(`dg_${user.uid}_tasks`, JSON.stringify(updatedTasksList));
        }

        if (data.recommendations && Array.isArray(data.recommendations)) {
          let updatedRecs = [...recommendations];
          for (const r of data.recommendations) {
            const exists = updatedRecs.some(rec => rec.title === r.title);
            if (!exists) {
              updatedRecs.push({
                id: `rec-${Math.random().toString(36).substr(2, 9)}`,
                type: r.type,
                title: r.title,
                description: r.description,
                taskId: r.taskId || null,
                status: "active",
                createdAt: new Date().toISOString()
              });
            }
          }
          setRecommendations(updatedRecs);
          localStorage.setItem(`dg_${user.uid}_recommendations`, JSON.stringify(updatedRecs));
        }
      } catch (err) {
        console.error("Error triggering local offline AI analysis:", err);
      } finally {
        setAiAnalyzing(false);
      }
      return;
    }

    setAiAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: tasksList,
          userPreferences: preferences,
          habits: habits
        })
      });

      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();

      // Update Productivity Score in User Settings
      if (typeof data.productivityScore === "number") {
        await updatePreferences({ productivityScore: data.productivityScore });
      }

      // Update Individual Task Analysis Fields
      if (data.taskAnalyses && Array.isArray(data.taskAnalyses)) {
        for (const ta of data.taskAnalyses) {
          const matchingTask = tasksList.find(t => t.id === ta.taskId);
          if (matchingTask) {
            const taskDocRef = doc(db, "users", user.uid, "tasks", ta.taskId);
            try {
              await updateDoc(taskDocRef, {
                riskLevel: ta.riskLevel,
                riskAnalysis: ta.riskAnalysis,
                deadlineRisk: ta.deadlineRisk || "Safe",
                deadlineRiskExplanation: ta.deadlineRiskExplanation || "",
                deadlineRiskActions: ta.deadlineRiskActions || [],
                suggestedSchedule: ta.suggestedSchedule,
                aiPriorityScore: ta.priorityScore || null,
                aiPriorityLevel: ta.priorityLevel || null,
                aiPriorityReasoning: ta.priorityReasoning || null
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/tasks/${ta.taskId}`);
            }
          }
        }
      }

      // Sync AI Recommendations
      if (data.recommendations && Array.isArray(data.recommendations)) {
        const recsColRef = collection(db, "users", user.uid, "recommendations");
        
        for (const r of data.recommendations) {
          const exists = recommendations.some(rec => rec.title === r.title);
          if (!exists) {
            const newRecRef = doc(recsColRef);
            try {
              await setDoc(newRecRef, {
                id: newRecRef.id,
                type: r.type,
                title: r.title,
                description: r.description,
                taskId: r.taskId || null,
                status: "active",
                createdAt: new Date().toISOString()
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/recommendations/${newRecRef.id}`);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error triggering AI analysis:", err);
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Goal Operations
  const addGoal = async (goal: Omit<Goal, "id" | "createdAt" | "progress">) => {
    if (!user) return;

    if (user.uid.startsWith("offline-")) {
      const newId = `goal-${Math.random().toString(36).substr(2, 9)}`;
      const newGoal: Goal = {
        ...goal,
        id: newId,
        progress: 0,
        createdAt: new Date().toISOString()
      };
      const updated = [...goals, newGoal];
      setGoals(updated);
      localStorage.setItem(`dg_${user.uid}_goals`, JSON.stringify(updated));
      return newId;
    }

    const goalColRef = collection(db, "users", user.uid, "goals");
    const newDocRef = doc(goalColRef);
    const newGoal: Goal = {
      ...goal,
      id: newDocRef.id,
      progress: 0,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(newDocRef, newGoal);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/goals/${newDocRef.id}`);
    }
    return newDocRef.id;
  };

  const updateGoal = async (goalId: string, updates: Partial<Goal>) => {
    if (!user) return;

    if (user.uid.startsWith("offline-")) {
      const updatedGoals = goals.map(g => g.id === goalId ? { ...g, ...updates } : g);
      setGoals(updatedGoals);
      localStorage.setItem(`dg_${user.uid}_goals`, JSON.stringify(updatedGoals));
      return;
    }

    try {
      const docRef = doc(db, "users", user.uid, "goals", goalId);
      const cleanUpdates: any = {};
      Object.entries(updates).forEach(([key, val]) => {
        if (val === undefined) {
          cleanUpdates[key] = deleteField();
        } else {
          cleanUpdates[key] = val;
        }
      });
      await updateDoc(docRef, cleanUpdates);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/goals/${goalId}`);
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (!user) return;

    if (user.uid.startsWith("offline-")) {
      const updatedGoals = goals.filter(g => g.id !== goalId);
      setGoals(updatedGoals);
      localStorage.setItem(`dg_${user.uid}_goals`, JSON.stringify(updatedGoals));
      return;
    }

    try {
      const docRef = doc(db, "users", user.uid, "goals", goalId);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/goals/${goalId}`);
    }
  };

  // Auto-Update Goal progress based on linked tasks completion
  const updateLinkedGoalsProgress = async (taskId: string, subtasksState: any[]) => {
    if (!user) return;
    
    const linkedGoals = goals.filter(g => g.linkedTasks?.includes(taskId));
    if (linkedGoals.length === 0) return;

    for (const goal of linkedGoals) {
      const linkedTasksList = tasks.map(t => t.id === taskId ? { ...t, subtasks: subtasksState } : t)
                                   .filter(t => goal.linkedTasks.includes(t.id));
      
      let totalWeight = 0;
      let completedWeight = 0;

      for (const t of linkedTasksList) {
        if (t.status === "completed") {
          completedWeight += 100;
          totalWeight += 100;
        } else {
          const totalSub = t.subtasks?.length || 0;
          if (totalSub === 0) {
            totalWeight += 100;
          } else {
            const completedSub = t.subtasks.filter(s => s.completed).length;
            completedWeight += (completedSub / totalSub) * 100;
            totalWeight += 100;
          }
        }
      }

      const percentage = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
      await updateGoal(goal.id, { progress: percentage });
    }
  };

  // Habit Operations
  const addHabit = async (habitName: string, frequency: 'daily' | 'weekly') => {
    if (!user) return;

    if (user.uid.startsWith("offline-")) {
      const newId = `habit-${Math.random().toString(36).substr(2, 9)}`;
      const newHabit: Habit = {
        id: newId,
        name: habitName,
        frequency,
        streak: 0,
        history: [],
        createdAt: new Date().toISOString()
      };
      const updated = [...habits, newHabit];
      setHabits(updated);
      localStorage.setItem(`dg_${user.uid}_habits`, JSON.stringify(updated));
      return newId;
    }

    const habitColRef = collection(db, "users", user.uid, "habits");
    const newDocRef = doc(habitColRef);
    const newHabit: Habit = {
      id: newDocRef.id,
      name: habitName,
      frequency,
      streak: 0,
      history: [],
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(newDocRef, newHabit);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/habits/${newDocRef.id}`);
    }
    return newDocRef.id;
  };

  const completeHabitToday = async (habitId: string) => {
    if (!user) return;
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const todayStr = new Date().toISOString().split('T')[0];
    if (habit.history.includes(todayStr)) return; // already completed today

    const updatedHistory = [...habit.history, todayStr];
    let newStreak = habit.streak + 1;

    if (user.uid.startsWith("offline-")) {
      const updatedHabits = habits.map(h => h.id === habitId ? { ...h, lastCompleted: todayStr, history: updatedHistory, streak: newStreak } : h);
      setHabits(updatedHabits);
      localStorage.setItem(`dg_${user.uid}_habits`, JSON.stringify(updatedHabits));
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid, "habits", habitId), {
        lastCompleted: todayStr,
        history: updatedHistory,
        streak: newStreak
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/habits/${habitId}`);
    }
  };

  const deleteHabit = async (habitId: string) => {
    if (!user) return;

    if (user.uid.startsWith("offline-")) {
      const updatedHabits = habits.filter(h => h.id !== habitId);
      setHabits(updatedHabits);
      localStorage.setItem(`dg_${user.uid}_habits`, JSON.stringify(updatedHabits));
      return;
    }

    try {
      await deleteDoc(doc(db, "users", user.uid, "habits", habitId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/habits/${habitId}`);
    }
  };

  // Dismiss Recommendation
  const dismissRecommendation = async (recId: string) => {
    if (!user) return;

    if (user.uid.startsWith("offline-")) {
      const updatedRecs = recommendations.map(r => r.id === recId ? { ...r, status: "dismissed" as any } : r);
      setRecommendations(updatedRecs);
      localStorage.setItem(`dg_${user.uid}_recommendations`, JSON.stringify(updatedRecs));
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid, "recommendations", recId), {
        status: "dismissed"
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/recommendations/${recId}`);
    }
  };

  // Chat History Message Operation (AI History)
  const addChatMessage = async (text: string, role: "user" | "model") => {
    if (!user) return;

    if (user.uid.startsWith("offline-")) {
      const newId = `msg-${Math.random().toString(36).substr(2, 9)}`;
      const newMessage: Message = {
        id: newId,
        role,
        text,
        timestamp: new Date().toISOString()
      };
      const updated = [...chatMessages, newMessage];
      setChatMessages(updated);
      localStorage.setItem(`dg_${user.uid}_chatMessages`, JSON.stringify(updated));
      return newId;
    }

    const chatColRef = collection(db, "users", user.uid, "chatHistory");
    const newDocRef = doc(chatColRef);
    const newMessage: Message = {
      id: newDocRef.id,
      role,
      text,
      timestamp: new Date().toISOString()
    };
    try {
      await setDoc(newDocRef, newMessage);
      return newDocRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/chatHistory/${newDocRef.id}`);
    }
  };

  const clearChatHistory = async () => {
    if (!user) return;

    if (user.uid.startsWith("offline-")) {
      setChatMessages([]);
      localStorage.setItem(`dg_${user.uid}_chatMessages`, JSON.stringify([]));
      return;
    }

    for (const msg of chatMessages) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "chatHistory", msg.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/chatHistory/${msg.id}`);
      }
    }
  };

  // Generate AI-Optimized Daily/Weekly Schedule
  const generateAISchedule = async (startDateStr?: string) => {
    if (!user || !preferences) return;

    if (user.uid.startsWith("offline-")) {
      setAiAnalyzing(true);
      try {
        const start = startDateStr || new Date().toISOString().split('T')[0];
        const res = await fetch("/api/generate-schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tasks,
            userPreferences: preferences,
            startDate: start
          })
        });

        if (!res.ok) throw new Error("Schedule generation failed");
        const data = await res.json();

        const scheduleData = {
          id: "current",
          generatedAt: new Date().toISOString(),
          startDate: start,
          endDate: new Date(new Date(start).getTime() + 6 * 24 * 3600 * 1000).toISOString().split('T')[0],
          items: data.items || [],
          overloadScore: data.overloadScore || 50,
          analysis: data.analysis || ""
        };

        setAiSchedule(scheduleData);
        localStorage.setItem(`dg_${user.uid}_aiSchedule`, JSON.stringify(scheduleData));
      } catch (err) {
        console.error("Error generating local offline AI schedule:", err);
      } finally {
        setAiAnalyzing(false);
      }
      return;
    }

    setAiAnalyzing(true);
    try {
      const start = startDateStr || new Date().toISOString().split('T')[0];
      const res = await fetch("/api/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks,
          userPreferences: preferences,
          startDate: start
        })
      });

      if (!res.ok) throw new Error("Schedule generation failed");
      const data = await res.json();

      // Save schedule to Firestore
      const scheduleDocRef = doc(db, "users", user.uid, "aiSchedule", "current");
      await setDoc(scheduleDocRef, {
        generatedAt: new Date().toISOString(),
        startDate: start,
        endDate: new Date(new Date(start).getTime() + 6 * 24 * 3600 * 1000).toISOString().split('T')[0],
        items: data.items || [],
        overloadScore: data.overloadScore || 50,
        analysis: data.analysis || ""
      });
    } catch (err) {
      console.error("Error generating AI schedule:", err);
    } finally {
      setAiAnalyzing(false);
    }
  };

  return {
    tasks,
    goals,
    habits,
    recommendations,
    chatMessages,
    aiSchedule,
    agentLogs,
    loading,
    aiAnalyzing,
    addTask,
    updateTask,
    deleteTask,
    toggleSubtask,
    requestAISubtasks,
    addSubtask,
    removeSubtask,
    moveSubtask,
    triggerAIAnalysis,
    generateAISchedule,
    addGoal,
    updateGoal,
    deleteGoal,
    addHabit,
    completeHabitToday,
    deleteHabit,
    dismissRecommendation,
    addChatMessage,
    clearChatHistory,
    addAgentLog
  };
}
