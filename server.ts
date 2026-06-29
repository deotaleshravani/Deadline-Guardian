import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const app = express();

app.use(express.json());

// Lazy-loaded Gemini AI client helper to avoid crashes on startup if key is missing
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set. AI features will operate with demo fallback data.");
      throw new Error("GEMINI_API_KEY is not configured. Please add it in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Endpoint 1: Analyze Tasks and Deadlines
app.post("/api/analyze-tasks", async (req, res) => {
  try {
    const { tasks, userPreferences, habits } = req.body;
    
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.json({
        productivityScore: 70,
        analysis: "Your agenda is currently empty! Add some high-priority deadlines or tasks to unlock AI-powered schedule optimization and risk prediction.",
        taskAnalyses: [],
        recommendations: []
      });
    }

    const prompt = `
You are the "Deadline Guardian" AI Accountability Partner, Task Prioritization, and Deadline Risk Predictor Engine. 
Your goal is to evaluate the user's workload, identify potential procrastination traps, and calculate precise deadline risk assessments for every task.

For EACH task, analyze the following 5 dimensions to perform a comprehensive risk assessment:
1. DEADLINE: How close the task's deadline is to the current time (the deadline string: ${new Date().toISOString()}).
2. REMAINING WORK: The actual subtasks left to do, their complexity, and the task's remaining description.
3. ESTIMATED EFFORT: The estimated duration (estimatedTime in minutes).
4. USER PROGRESS: The overall completion status (status: pending, in_progress, completed), progress percentage, and completed vs. total subtasks count.
5. USER COMPLETION HISTORY: The user's historical productivityScore (${userPreferences?.productivityScore || 75}/100) and habit streaks/history.

Output one of the following four Risk Levels for each task:
- "Safe": Task is either completed, or has ample time remaining with low effort, high progress, and excellent user productivity patterns.
- "Medium Risk": Moderately tight deadline, or moderate effort required. Needs proactive scheduling.
- "High Risk": Near deadline, or large effort remaining, low progress, or history of postponements.
- "Critical Risk": Extremely urgent deadline (due within 24-48 hours) with substantial remaining work, or overdue.

Respond with a JSON object strictly conforming to the following structure:
{
  "productivityScore": number, // an integer from 0 to 100 representing how well the overall schedule is optimized
  "analysis": "A concise, supportive but firm coach summary of the user's workload, highlighting where procrastination is most likely to happen and what overall adjustment is needed.",
  "taskAnalyses": [
    {
      "taskId": "string matching the task's id",
      "riskLevel": "low" | "medium" | "high", // Map 'Safe' -> 'low', 'Medium Risk' -> 'medium', 'High Risk' | 'Critical Risk' -> 'high' for backward compatibility
      "deadlineRisk": "Safe" | "Medium Risk" | "High Risk" | "Critical Risk",
      "deadlineRiskExplanation": "A detailed explanation of why the task is at this risk level, specifically explaining how the deadline, remaining subtasks, estimated effort, current progress, and user's completion history factored into your prediction.",
      "deadlineRiskActions": [
        "At least 2 highly specific, actionable, supportive actions the user should take right now to mitigate the risk and finish on time."
      ],
      "riskAnalysis": "A short, sharp, action-oriented warning explaining why this task is at risk (e.g. 'This 10-hour research paper is due in 24 hours. Procrastination risk is critical.')",
      "priorityScore": number, // an integer from 0 to 100
      "priorityLevel": "Critical" | "High" | "Medium" | "Low",
      "priorityReasoning": "A concise, specific sentence explaining the score based on its deadline, base importance, estimated duration, postponements, and productivity history.",
      "suggestedSchedule": [
        {
          "date": "YYYY-MM-DD",
          "time": "HH:MM",
          "durationMinutes": number,
          "actionablePlan": "Specific goal for this block (e.g. 'Draft the outline and first page.')"
        }
      ]
    }
  ],
  "recommendations": [
    {
      "type": "risk" | "schedule" | "procrastination" | "action",
      "title": "A short, engaging recommendation header",
      "description": "Specific, active direction on what the user should do right now (e.g., 'Block out 9:00 AM tomorrow to complete the wireframe before meetings drain your energy.')",
      "taskId": "string matching the relevant task's id"
    }
  ]
}

User preferences:
- Name: ${userPreferences?.name || "Guardian User"}
- Role: ${userPreferences?.role || "professional"} (student, professional, entrepreneur)
- Preferred Focus Hours: ${userPreferences?.preferredFocusHours || "flexible"}
- Current Productivity Score (History): ${userPreferences?.productivityScore || 75} out of 100

User Habits & Consistency:
${JSON.stringify((habits || []).map((h: any) => ({
  name: h.name,
  frequency: h.frequency,
  streak: h.streak,
  historyCount: h.history?.length || 0
})))}

Current Tasks to Analyze:
${JSON.stringify(tasks.map((t: any) => ({
  id: t.id,
  title: t.title,
  description: t.description,
  deadline: t.deadline,
  priority: t.priority,
  category: t.category,
  status: t.status,
  progress: t.progress || 0,
  estimatedTime: t.estimatedTime || 0,
  postponementsCount: t.postponementsCount || 0,
  subtasks: t.subtasks || []
})))}

Ensure the output is valid JSON. Do not include any Markdown wrapping like \`\`\`json. Return only the raw JSON.
`;

    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text || "{}";
      const data = JSON.parse(responseText);
      res.json(data);
    } catch (aiError: any) {
      console.error("Gemini AI API Error:", aiError);
      
      // Dynamic fallback for demo if API Key is not set or failed
      const fallbackData = generateFallbackAnalysis(tasks, userPreferences);
      res.json(fallbackData);
    }
  } catch (err: any) {
    console.error("Server error during task analysis:", err);
    res.status(500).json({ error: "Failed to analyze tasks" });
  }
});

// Endpoint 2: Generate bite-sized subtasks
app.post("/api/generate-subtasks", async (req, res) => {
  try {
    const { title, description, category } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Task title is required" });
    }

    const prompt = `
You are the "Deadline Guardian" productivity companion.
Break down the following large task into 3-6 logical, bite-sized, sequential subtasks with realistic estimated times in minutes to help the user start immediately and conquer procrastination.

Task Title: ${title}
Description: ${description || "No description provided."}
Category: ${category || "General"}

Respond with a JSON object strictly conforming to the following structure:
{
  "subtasks": [
    {
      "title": "Bite-sized task description starting with an action verb (e.g., 'Draft first 2 outline sections')",
      "estimatedMinutes": number
    }
  ]
}

Ensure the output is valid JSON. Do not include any Markdown wrapping.
`;

    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text || "{}";
      const data = JSON.parse(responseText);
      res.json(data);
    } catch (aiError: any) {
      console.error("Gemini AI API Error (Subtasks):", aiError);
      
      // Fallback subtasks
      const defaultSubtasks = [
        { title: `Draft initial outline for ${title}`, estimatedMinutes: 15 },
        { title: `Gather resources and research key aspects`, estimatedMinutes: 30 },
        { title: `First pass implementation/drafting`, estimatedMinutes: 45 },
        { title: `Review against original requirements and edit`, estimatedMinutes: 20 },
      ];
      res.json({ subtasks: defaultSubtasks });
    }
  } catch (err) {
    console.error("Server error during subtask generation:", err);
    res.status(500).json({ error: "Failed to generate subtasks" });
  }
});

// Helper: Local fallback schedule generator
function generateFallbackSchedule(tasks: any[], prefs: any, startDateStr: string): any {
  const activeTasks = tasks.filter((t: any) => t.status !== "completed");
  const items: any[] = [];
  const start = new Date(startDateStr);
  
  // Sort tasks by deadline (earlier first) and priority (high first)
  const sortedTasks = [...activeTasks].sort((a: any, b: any) => {
    const deadlineDiff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    if (deadlineDiff !== 0) return deadlineDiff;
    const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
    return (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
  });

  const dailyWorkMinutes: Record<string, number> = {};
  const days: string[] = [];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getTime() + i * 24 * 3600 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    dailyWorkMinutes[dateStr] = 0;
    days.push(dateStr);
  }

  const focusPref = prefs?.preferredFocusHours || 'morning';
  const startHour = focusPref === 'morning' ? 9 : focusPref === 'afternoon' ? 14 : focusPref === 'evening' ? 19 : 10;

  let currentBlockIndex = 1;

  for (const task of sortedTasks) {
    const totalEst = task.estimatedTime || 90; // default to 90 min if not estimated
    const numBlocks = Math.ceil(totalEst / 60);
    const blockDuration = Math.min(60, totalEst);

    let daysAssigned = 0;
    
    for (const dateStr of days) {
      if (daysAssigned >= numBlocks) break;
      
      // Check deadline
      if (new Date(dateStr) > new Date(task.deadline)) continue;
      
      // Avoid overload: Max 300 minutes (5 hours) of study per day
      if (dailyWorkMinutes[dateStr] >= 300) continue;

      const currentDayMinutes = dailyWorkMinutes[dateStr];
      const startMinutes = startHour * 60 + currentDayMinutes;
      const h = Math.floor(startMinutes / 60);
      const m = startMinutes % 60;
      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      // 1. Add Study Block
      items.push({
        id: `sch-${Date.now()}-${currentBlockIndex++}`,
        type: "study",
        taskId: task.id,
        taskTitle: task.title,
        title: `Study Session: ${task.title} (Part ${daysAssigned + 1})`,
        date: dateStr,
        time: timeStr,
        durationMinutes: blockDuration,
        actionablePlan: `Work on "${task.title}". Focus on starting high-impact subtasks and tracking progress.`
      });

      dailyWorkMinutes[dateStr] += blockDuration;

      // 2. Add Break Time (to prevent fatigue)
      const breakStartMinutes = startMinutes + blockDuration;
      const bh = Math.floor(breakStartMinutes / 60);
      const bm = breakStartMinutes % 60;
      const breakTimeStr = `${bh.toString().padStart(2, '0')}:${bm.toString().padStart(2, '0')}`;
      const breakDuration = 15;

      items.push({
        id: `sch-${Date.now()}-${currentBlockIndex++}`,
        type: "break",
        title: "Mindful Transition Break",
        date: dateStr,
        time: breakTimeStr,
        durationMinutes: breakDuration,
        actionablePlan: "Step away from screens. Stretch, hydrate, and prepare mentally for your next block."
      });

      dailyWorkMinutes[dateStr] += breakDuration;
      daysAssigned++;
    }
  }

  const totalWorkMinutes = Object.values(dailyWorkMinutes).reduce((a, b) => a + b, 0);
  const avgDailyWork = totalWorkMinutes / 7;
  const overloadScore = Math.min(100, Math.round((avgDailyWork / 240) * 100));

  return {
    overloadScore,
    analysis: `Local Fallback Schedule compiled successfully. We analyzed ${activeTasks.length} active tasks across deadlines and importance. Workload is distributed over the next 7 days, capping daily work to prevent cognitive overload. Staggered 15-minute breaks are scheduled between work sessions.`,
    items
  };
}

// Endpoint 2.5: Generate AI-Optimized Daily/Weekly Schedule
app.post("/api/generate-schedule", async (req, res) => {
  try {
    const { tasks, userPreferences, startDate } = req.body;
    
    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ error: "Tasks array is required" });
    }

    const startDateStr = startDate || new Date().toISOString().split('T')[0];

    const prompt = `
You are the "Deadline Guardian" AI Scheduling Assistant.
Your goal is to build a highly optimized, fatigue-resistant 7-day study/work schedule starting on ${startDateStr}.
Analyze all tasks, deadlines, priorities, and estimated efforts to allocate study blocks and break times.

User preferences:
- Name: ${userPreferences?.name || "Guardian User"}
- Role: ${userPreferences?.role || "professional"}
- Preferred Focus Hours: ${userPreferences?.preferredFocusHours || "flexible"} (morning, afternoon, evening, flexible)
- Current Productivity Score: ${userPreferences?.productivityScore || 75} out of 100

Current Tasks in the System:
${JSON.stringify(tasks.map((t: any) => ({
  id: t.id,
  title: t.title,
  description: t.description,
  deadline: t.deadline,
  priority: t.priority,
  category: t.category,
  status: t.status,
  estimatedTime: t.estimatedTime || 90,
  subtasks: t.subtasks || []
})))}

Strict Scheduling Rules to Apply:
1. AVOID OVERLOAD: Do not schedule more than 4-6 hours of intense study/work blocks per day. High density causes burnout.
2. DISTRIBUTE WORKLOAD: Distribute larger tasks across multiple days leading up to their deadlines rather than cramming them on the final day.
3. PRIORITIZE IMPORTANT TASKS: Schedule "high" priority and urgent tasks during the user's preferred focus hours (${userPreferences?.preferredFocusHours || "flexible"}).
4. PREVENT DEADLINE PRESSURE: Allocate sessions early in the week for tasks with upcoming close deadlines.
5. BREAK TIMES: Always schedule a 15-30 minute break (type: "break") immediately after a 45-90 minute study block (type: "study") to preserve cognitive performance.
6. COMPLETED TASKS: Do not schedule any blocks for tasks that are already "completed".

Respond with a JSON object strictly conforming to the following structure:
{
  "overloadScore": number, // integer from 0 to 100 representing how dense/exhausting the schedule is. High workload + tight deadlines = high score.
  "analysis": "A supportive but professional coaching breakdown of this schedule's strategy. Explain how it avoids overload, how it distributes workload, why breaks are placed where they are, and how it mitigates deadline pressure.",
  "items": [
    {
      "id": "string unique id",
      "type": "study" | "break",
      "taskId": "string matching the task's id if type is study, or null if type is break",
      "taskTitle": "string matching the task's title if type is study, or null if type is break",
      "title": "Title of the block (e.g. 'Study Session: [Task Title]' or 'Short Stretch & Water Break')",
      "date": "YYYY-MM-DD",
      "time": "HH:MM", // in 24-hour format, e.g. "09:00", "10:30", "14:15"
      "durationMinutes": number, // duration in minutes (e.g. 15, 30, 45, 60, 90)
      "actionablePlan": "A specific micro-goal or instructions for this block (e.g., 'Draft first 2 paragraphs of intro' or 'Walk around and hydrate to prevent eye strain')"
    }
  ]
}

Ensure the output is valid JSON. Do not include any Markdown wrapping like \`\`\`json. Return only the raw JSON.
`;

    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text || "{}";
      const data = JSON.parse(responseText);
      res.json(data);
    } catch (aiError: any) {
      console.warn("Gemini API error during schedule generation, calling fallback generator:", aiError);
      const fallbackData = generateFallbackSchedule(tasks, userPreferences, startDateStr);
      res.json(fallbackData);
    }
  } catch (err) {
    console.error("Server error during schedule generation:", err);
    res.status(500).json({ error: "Failed to generate schedule" });
  }
});

// Endpoint 3: AI Accountability Chat Coach
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    const chatContextPrompt = `
You are "Deadline Guardian", a direct, supportive, and active AI Accountability Coach and Personal Productivity Mentor.
Unlike passive calendar apps that let users slide, your job is to proactively support, challenge, and keep the user accountable.

Current User Context:
- User Name: ${context?.userPreferences?.name || "Guardian User"}
- Role: ${context?.userPreferences?.role || "professional"}
- Active and Pending Tasks (Including Estimated Times): ${JSON.stringify(context?.tasks?.map((t: any) => ({ 
    id: t.id, 
    title: t.title, 
    deadline: t.deadline, 
    priority: t.priority, 
    status: t.status, 
    progress: t.progress || 0,
    estimatedMinutes: t.estimatedTime || 60,
    postponements: t.postponementsCount || 0
  })))}
- Active Habits & Streaks: ${JSON.stringify(context?.habits?.map((h: any) => ({ name: h.name, streak: h.streak, lastCompleted: h.lastCompleted })))}

Guidelines & Directives for your response:
1. **Dynamic Progress & Remaining Hours Calculations**: 
   - ALWAYS look at the active tasks list. 
   - When the user asks about their workload, next actions, or specific tasks, calculate the exact remaining hours or minutes needed to complete them. (Formula: Estimated remaining time = Total Estimated Minutes * (1 - (Progress % / 100)) / 60).
   - Incorporate highly personalized phrases like "You still need 2.5 hours to finish your assignment" or "According to my trackers, you have 45 minutes of active focus remaining to complete 'Assignment title'."
2. **Consistency & Streak Encouragement**:
   - Proactively track habit streaks. Highlight specific habits and streaks (e.g., "Your habit 'Study session' has a 4-day streak alive! Let's not let it reset today.").
   - Explicitly challenge and encourage the user to log progress or complete daily sessions (e.g., "Have you completed today's study session?").
3. **Firm and Supportive Mentor Persona**:
   - Sound like a premium cognitive coach. Direct, highly focused, professional, encouraging but completely intolerant of excuses.
   - Suggest 5-minute action commits to conquer start-up friction.
4. **Follow Up on Incomplete/Postponed Work**:
   - Highlight any tasks that have high postponements or overdue dates (e.g., "This task has been postponed 3 times and is now at critical risk.").
   - Ask clarifying follow-up questions to identify why they are stalling.

Here is the conversation history:
${messages.map((m: any) => `${m.role === 'user' ? 'User' : 'Deadline Guardian'}: ${m.text}`).join('\n')}

Deadline Guardian Response:
`;

    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: chatContextPrompt,
      });

      res.json({ text: response.text || "I am here with you to protect your deadlines. What is holding you back from starting today?" });
    } catch (aiError) {
      console.error("Gemini AI API Error (Chat):", aiError);
      res.json({ 
        text: "I am having trouble reaching my high-fidelity AI modules right now, but I am still here as your accountability partner! Tell me, what's one simple 5-minute action you can take on your highest-priority task in the next hour?" 
      });
    }
  } catch (err) {
    console.error("Server error during AI coach chat:", err);
    res.status(500).json({ error: "Failed to generate AI response" });
  }
});

// Endpoint 4: Procrastination Rescue Plan Generator
app.post("/api/procrastination-rescue", async (req, res) => {
  try {
    const { task, preferences, habits } = req.body;

    if (!task || !task.title) {
      return res.status(400).json({ error: "Task is required" });
    }

    const rescuePrompt = `
You are the "Deadline Guardian" cognitive psychologist and procrastination-breaker companion.
The user is struggling with severe procrastination and executive dysfunction on the following task:

Task: "${task.title}"
Description: "${task.description || "No description provided."}"
Priority: "${task.priority}"
Current Progress: ${task.progress || 0}%
Postponements: ${task.postponementsCount || 0} times
Number of incomplete subtasks: ${task.subtasks?.filter((s: any) => !s.completed).length || 0}

User Info:
- Role: ${preferences?.role || "professional"}
- Productivity History Score: ${preferences?.productivityScore || 75}/100

Generate a highly specific, psychologically intelligent, ultra-actionable 3-step Procrastination Rescue Plan for this task.
Guidelines:
1. Address the user directly by name (${preferences?.name || "Guardian User"}) with supportive, firm empathy. Acknowledge if they have postponed this task multiple times (e.g., "${task.postponementsCount} postponements").
2. Identify why their brain is avoiding this task (e.g. fear of failure, decisional overload, size of task).
3. Provide exactly 3 direct, tiny, sequence-driven steps.
4. Step 1 MUST be a 5-minute micro-commitment action (e.g., "Open the doc and write just one line" or "Create a blank folder on your desktop"). This makes starting nearly friction-free.
5. Keep it short, focused, and free of fluff. Use markdown highlights.
`;

    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: rescuePrompt,
      });

      res.json({ rescuePlan: response.text || "Could not generate a rescue plan. Just open the task and spend 5 minutes on it now!" });
    } catch (aiError) {
      console.error("Gemini AI API Error (Rescue):", aiError);
      res.json({ 
        rescuePlan: `### 🚨 Emergency Micro-Action Plan
Hey ${preferences?.name || "Guardian User"}, let's break this blockage down!
1. **The 5-Minute Trick**: Open the workspace for "${task.title}". You only need to do 5 minutes of work.
2. **First Milestone**: Check off or write down just one bullet point. 
3. **Turn Off Alerts**: Mute your notifications for 15 minutes to allow deep focus.`
      });
    }
  } catch (err) {
    console.error("Server error during procrastination rescue:", err);
    res.status(500).json({ error: "Failed to generate rescue plan" });
  }
});

// Endpoint 5: Strategic Goal Insights & Recommendations
app.post("/api/goal-insights", async (req, res) => {
  try {
    const { goals, habits, tasks, preferences } = req.body;

    const userProfile = preferences?.name || "Guardian User";
    const role = preferences?.role || "professional";

    // Format metrics for the prompt
    const totalGoals = goals?.length || 0;
    const completedGoals = goals?.filter((g: any) => g.progress >= 100).length || 0;
    const achievementRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

    const dailyGoals = goals?.filter((g: any) => g.timeframe === 'daily') || [];
    const dailyCompleted = dailyGoals.filter((g: any) => g.progress >= 100).length;
    const weeklyGoals = goals?.filter((g: any) => g.timeframe === 'weekly') || [];
    const weeklyCompleted = weeklyGoals.filter((g: any) => g.progress >= 100).length;
    const monthlyGoals = goals?.filter((g: any) => g.timeframe === 'monthly') || [];
    const monthlyCompleted = monthlyGoals.filter((g: any) => g.progress >= 100).length;

    const insightsPrompt = `
You are the "Deadline Guardian" Strategic Goal Planner and Performance Psychologist.
Your job is to analyze the user's progress on their goals and routines, and provide high-impact, elite strategic insights and actionable recommendations.

Current User Profile:
- Name: ${userProfile}
- Role: ${role}

Overall Goal Metrics:
- Total Goals: ${totalGoals}
- Completed Goals: ${completedGoals}
- Overall Goal Achievement Rate: ${achievementRate}%

Goal Distribution:
- Daily Goals: ${dailyGoals.length} set (${dailyCompleted} completed)
- Weekly Goals: ${weeklyGoals.length} set (${weeklyCompleted} completed)
- Monthly Goals: ${monthlyGoals.length} set (${monthlyCompleted} completed)

Active Goals List:
${JSON.stringify(goals?.map((g: any) => ({ title: g.title, timeframe: g.timeframe || 'monthly', progress: g.progress, targetDate: g.targetDate })))}

Active Routines/Habits List:
${JSON.stringify(habits?.map((h: any) => ({ name: h.name, frequency: h.frequency, streak: h.streak })))}

Active Tasks List:
${JSON.stringify(tasks?.map((t: any) => ({ title: t.title, status: t.status, progress: t.progress || 0 })))}

Please generate a high-impact, professional Strategic Performance Review report in Markdown.
Your review MUST include the following clear sections:
1. **🏆 Performance Diagnostics**: Evaluate their overall goal achievement rate (${achievementRate}%), and comment specifically on the alignment of their Daily, Weekly, and Monthly goals.
2. **📈 Progress Trends & Friction Analysis**: Highlight any strengths in their habits/streaks and identify any clear friction points (e.g., setting too many monthly goals without daily milestones, or habits that aren't matching up).
3. **🎯 Tactical Accountability Directives**: Offer 2 to 3 highly specific, hyper-actionable, psychological, or practical recommendations on how they can increase their achievement rate, complete pending milestones, and optimize their daily routines.

Keep your tone direct, premium, supportive, and analytical. Focus on driving tangible, high-quality results.
`;

    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: insightsPrompt,
      });

      res.json({ insights: response.text || "Your goals are locked and ready. Keep aligning daily actions to achieve strategic breakthroughs!" });
    } catch (aiError) {
      console.error("Gemini AI API Error (Goal Insights):", aiError);
      res.json({
        insights: `### 🏆 Performance Diagnostics
Currently, your Goal Achievement Rate is at **${achievementRate}%**. You have **${completedGoals} completed goals** out of **${totalGoals} total goals**. To hit peak productivity, we want to maintain a target achievement rate above 80%.

### 📈 Progress Trends & Friction Analysis
- **Execution Consistency**: Your daily and weekly routines are the foundation of your success. If your habit streaks are active, they are protecting you from startup friction.
- **Milestone Slicing**: Ensure that your Monthly Goals are properly sliced into Weekly Milestones, which are then broken down into Daily Actions. Goals without connected daily actions are just wishes.

### 🎯 Tactical Accountability Directives
1. **Atomic Start**: Pick one daily goal right now and spend just 10 minutes on it. Defeat the startup friction.
2. **Connect Tasks**: Always connect at least 1-2 tasks to your weekly and monthly goals. This automatically updates your progress and keeps your focus aligned.
3. **Mute Non-Essentials**: Lock in deep work blocks for your high-priority goals.`
      });
    }
  } catch (err) {
    console.error("Server error during goal insights:", err);
    res.status(500).json({ error: "Failed to generate goal insights" });
  }
});

// Endpoint 6: AI Habit Insights & Personalized Recommendations
app.post("/api/habit-insights", async (req, res) => {
  try {
    const { habits, tasks, preferences } = req.body;

    const userProfile = preferences?.name || "Guardian User";
    const role = preferences?.role || "professional";

    // Format metrics for the prompt
    const totalHabits = habits?.length || 0;
    const maxStreak = totalHabits > 0 ? Math.max(...habits.map((h: any) => h.streak || 0)) : 0;
    const totalStreaks = habits?.reduce((acc: number, h: any) => acc + (h.streak || 0), 0) || 0;
    const avgStreak = totalHabits > 0 ? Math.round(totalStreaks / totalHabits) : 0;

    const insightsPrompt = `
You are the "Deadline Guardian" Habits Architect and Peak Performance Psychologist.
Your job is to analyze the user's habits, routines, and task list to provide high-impact habit streaks analysis, success rate insights, and tailored AI habit recommendations.

Current User Profile:
- Name: ${userProfile}
- Role: ${role}

Active Habits List:
${JSON.stringify(habits?.map((h: any) => ({ name: h.name, frequency: h.frequency, streak: h.streak, lastCompleted: h.lastCompleted })))}

Active Tasks List:
${JSON.stringify(tasks?.map((t: any) => ({ title: t.title, status: t.status, priority: t.priority })))}

Overall Habit Stats:
- Total Logged Habits: ${totalHabits}
- Max Active Streak: ${maxStreak} days
- Average Habit Streak: ${avgStreak} days

Based on their current role (${role}) and active task list, generate a high-impact, professional Habit Performance and Recommendation Report in Markdown.
Your review MUST include the following clear sections:
1. **🔥 Habit Streak & Success Analysis**: Congratulate or constructively analyze their current streaks. Detail how consistency avoids start-up friction.
2. **🧠 Personalized AI Habit Recommendations**: Based on their active tasks and professional/student role, propose 3 NEW custom, atomic habits (e.g., if they have high priority tasks or are a developer, suggest a '90-Min Deep Work Sprint' or 'Daily Review'). Provide a title, timeframe, and a brief description for each recommendation.
3. **⚡ Daily Consistency Micro-Directives**: Offer 2 to 3 micro-steps they can execute today to lock in their routines and prevent reset anxiety.

Keep your tone direct, firm, encouraging, premium, and analytical. Focus on building impenetrable self-discipline.
`;

    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: insightsPrompt,
      });

      res.json({ insights: response.text || "Your habits are locked and ready. Keep building consistent streaks for executive breakthrough!" });
    } catch (aiError) {
      console.error("Gemini AI API Error (Habit Insights):", aiError);
      res.json({
        insights: `### 🔥 Habit Streak & Success Analysis
Your peak habit streak is currently **${maxStreak} days**. Maintaining daily and weekly habits is the ultimate cheat code to reduce startup friction and conserve executive willpower.

### 🧠 Personalized AI Habit Recommendations
1. **📚 Study Daily & Review (Daily)**: Allocate exactly 30 minutes every morning to review technical materials or work on core projects. This builds an unbreakable momentum before distractions set in.
2. **💪 Active Pacing & Exercise (Daily)**: Commit to 15-20 minutes of high-intensity physical pacing (e.g., brisk walk, bodyweight exercises) to flush cortisol and recharge executive attention.
3. **📖 Structured Reading Blocks (Weekly)**: Set a weekend habit to read 1-2 chapters of industry literature or professional development material to stay ahead of the curve.

### ⚡ Daily Consistency Micro-Directives
- **Reduce Startup Costs**: Lay out all materials (editor open, study files ready) the night before.
- **Micro-Commits**: If you don't feel like completing a habit, do it for just 2 minutes. A 2-minute session prevents the streak from resetting.
- **Stacking**: Anchor your new habit immediately after an existing, solid routine (e.g., "Right after my morning coffee, I will Study Daily for 20 minutes").`
      });
    }
  } catch (err) {
    console.error("Server error during habit insights:", err);
    res.status(500).json({ error: "Failed to generate habit insights" });
  }
});

// Endpoint 7: AI Reminder Agent (Actionable & Dynamic Reminders)
app.post("/api/generate-reminders", async (req, res) => {
  try {
    const { tasks, preferences } = req.body;

    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ error: "Tasks array is required" });
    }

    const activeTasks = tasks.filter((t: any) => t.status !== "completed");
    const userProfile = preferences?.name || "Guardian User";
    const role = preferences?.role || "professional";

    const prompt = `
You are the "Deadline Guardian" AI Reminder Agent.
Your job is to scan the user's active, pending, or in-progress tasks, and generate 2 to 3 highly specific, hyper-actionable, and clear reminders.

CRITICAL INSTRUCTIONS:
- DO NOT generate generic reminders (e.g., "Don't forget to study" or "Remember to work on your tasks").
- Every reminder MUST look like this concrete example: "Your assignment needs 4 hours of work and is due tomorrow. Start by completing the research section today."
- Each reminder MUST explicitly state:
  1. The task name or what the assignment is.
  2. The workload requirement (e.g., "needs X hours of work" or "requires X minutes of focus") based on the task's estimatedTime or complexity.
  3. The precise deadline proximity relative to today (today's date is 2026-06-23) (e.g., "is due tomorrow", "is due in 2 days", "is past due").
  4. A highly concrete, bite-sized starting action to execute TODAY (e.g., "Start by completing the research section today", "Focus on writing the database migration script first").

Current Date: 2026-06-23
Active Tasks List:
${JSON.stringify(activeTasks.map((t: any) => ({
  id: t.id,
  title: t.title,
  description: t.description,
  deadline: t.deadline,
  priority: t.priority,
  estimatedTime: t.estimatedTime,
  subtasks: t.subtasks || []
})))}

Respond with a JSON object strictly conforming to the following structure:
{
  "reminders": [
    {
      "id": "string unique ID or matching task ID",
      "taskId": "string matching the task's ID",
      "message": "The full actionable reminder string following the exact pattern requested.",
      "priority": "high" | "medium" | "low",
      "actionStep": "The specific micro-step they should start today (e.g., 'complete research section')"
    }
  ]
}

Ensure the output is valid JSON. Do not include any Markdown wrapping like \`\`\`json. Return only the raw JSON. If there are no active tasks, return an empty reminders array.
`;

    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text || '{"reminders":[]}';
      const data = JSON.parse(responseText);
      res.json(data);
    } catch (aiError) {
      console.warn("Gemini API error during reminder generation, calling fallback:", aiError);
      const fallbackReminders = generateFallbackReminders(tasks);
      res.json({ reminders: fallbackReminders });
    }
  } catch (err) {
    console.error("Server error during reminder generation:", err);
    res.status(500).json({ error: "Failed to generate reminders" });
  }
});

// Endpoint 8: Voice Productivity Assistant NLP Command Parser
app.post("/api/voice-command", async (req, res) => {
  try {
    const { voiceInput, tasks, preferences } = req.body;

    if (!voiceInput || typeof voiceInput !== "string") {
      return res.status(400).json({ error: "Voice input text is required" });
    }

    const todayDateStr = "2026-06-23";
    const userProfile = preferences?.name || "Guardian User";
    const role = preferences?.role || "professional";

    const prompt = `
You are the "Deadline Guardian" Voice Productivity Assistant.
Your task is to parse a raw voice input/text command from the user and map it into one of 5 key actions:
1. "add_task": Create a new task with structured details (title, priority, category, deadline, estimatedTime).
2. "show_schedule": Display or review the active plan or daily calendar.
3. "check_deadlines": Audit all active task deadlines and call out high-risk timelines.
4. "mark_complete": Complete a task.
5. "generate_plan": Generate a micro-plan or break down a topic into actionable steps.

Current Date: ${todayDateStr}
Active Tasks in the system:
${JSON.stringify(tasks?.map((t: any) => ({ id: t.id, title: t.title, deadline: t.deadline, status: t.status, priority: t.priority })))}

User's Raw Voice Input: "${voiceInput}"

You must respond with a JSON object containing:
- "action": One of the 5 allowed keys: "add_task" | "show_schedule" | "check_deadlines" | "mark_complete" | "generate_plan".
- "parameters": An object containing properties depending on the action:
  - For "add_task":
    - "title" (string, default to whatever they said)
    - "priority" ("low" | "medium" | "high", default to "medium")
    - "category" ("student" | "professional" | "personal" | "other", default to "student" or "professional" based on role)
    - "deadline" (string "YYYY-MM-DD", map dynamic days like "tomorrow" to 2026-06-24, "in 3 days" to 2026-06-26, "next Friday" to 2026-06-26, default to 2026-06-25)
    - "estimatedTime" (number in minutes, e.g., "3 hours" -> 180, default to 120)
  - For "mark_complete":
    - "title" (string, the title or a key substring of the task they want to mark as complete)
- "explanation": An elegant, direct, premium auditory spoken brief text explaining what action you took, or summarizing the schedule/deadline risk/generated plan directly to them as their assistant. Make it professional, encouraging, and highly specific!

Example outputs:
For "add math exam due tomorrow priority high":
{
  "action": "add_task",
  "parameters": {
    "title": "Math Exam Prep",
    "priority": "high",
    "category": "student",
    "deadline": "2026-06-24",
    "estimatedTime": 180
  },
  "explanation": "Affirmative, ${userProfile}. I have registered your 'Math Exam Prep' task due tomorrow, June 24th, with a high priority and an estimated focus time of 3 hours. Let's dominate this."
}

Ensure the output is valid JSON. Return ONLY the raw JSON block without markdown wrap formatting.
`;

    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const data = JSON.parse(response.text || "{}");
      res.json(data);
    } catch (aiError) {
      console.warn("Gemini error during voice parse, utilizing fallback parser:", aiError);
      const fallbackResponse = parseVoiceCommandFallback(voiceInput, tasks, userProfile);
      res.json(fallbackResponse);
    }
  } catch (err) {
    console.error("Server error parsing voice input:", err);
    res.status(500).json({ error: "Failed to parse voice command" });
  }
});

// Fallback Local Voice Command parser
function parseVoiceCommandFallback(input: string, tasks: any[], userProfile: string) {
  const norm = input.toLowerCase();
  
  if (norm.includes("add") || norm.includes("create") || norm.includes("new task")) {
    const titleMatch = input.match(/(?:add|create|new task)\s+([^due|priority|estimated|category]+)/i);
    const title = titleMatch ? titleMatch[1].trim() : "New Voice Task";
    return {
      action: "add_task",
      parameters: {
        title,
        priority: norm.includes("high") ? "high" : norm.includes("low") ? "low" : "medium",
        category: norm.includes("student") ? "student" : norm.includes("personal") ? "personal" : "professional",
        deadline: norm.includes("tomorrow") ? "2026-06-24" : "2026-06-25",
        estimatedTime: norm.includes("hour") ? 180 : 120
      },
      explanation: `I've created the task "${title}" scheduled for completion. Keep pushing forward, ${userProfile}.`
    };
  }

  if (norm.includes("complete") || norm.includes("mark") || norm.includes("finish")) {
    const titleMatch = input.match(/(?:complete|mark|finish|done)\s+(?:task|with)?\s*(.+)/i);
    const title = titleMatch ? titleMatch[1].trim() : "";
    return {
      action: "mark_complete",
      parameters: { title },
      explanation: `Locating and checking off your task matching "${title || 'your request'}". Excellent execution!`
    };
  }

  if (norm.includes("schedule") || norm.includes("calendar") || norm.includes("show")) {
    return {
      action: "show_schedule",
      parameters: {},
      explanation: `Showing your structured daily schedule, ${userProfile}. You have several core blocks set up for maximum concentration.`
    };
  }

  if (norm.includes("deadline") || norm.includes("due") || norm.includes("check")) {
    return {
      action: "check_deadlines",
      parameters: {},
      explanation: `Checking active deadlines. You have a few items pending attention. Let's make sure nothing slips past tonight.`
    };
  }

  return {
    action: "generate_plan",
    parameters: {},
    explanation: `Voice directive received. Let's craft a custom deep work plan for today to divide and conquer your pending workloads.`
  };
}

// Helper: Local fallback generator if AI Key is missing for reminders
function generateFallbackReminders(tasks: any[]) {
  const activeTasks = tasks.filter((t: any) => t.status !== "completed");
  if (activeTasks.length === 0) {
    return [
      {
        id: "all-clear",
        taskId: "",
        message: "Your active queue is completely clear. Maintain your momentum by scheduling your next high-impact goal today.",
        priority: "low",
        actionStep: "Schedule next goal"
      }
    ];
  }

  // Sort by priority and deadline
  const sorted = [...activeTasks].sort((a: any, b: any) => {
    if (a.priority === "high" && b.priority !== "high") return -1;
    if (a.priority !== "high" && b.priority === "high") return 1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  return sorted.slice(0, 3).map((task: any) => {
    const hoursNeeded = Math.ceil((task.estimatedTime || 120) / 60);
    const deadlineDate = new Date(task.deadline);
    const today = new Date("2026-06-23");
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let deadlineStr = `due in ${diffDays} days`;
    if (diffDays === 0) deadlineStr = "due today";
    else if (diffDays === 1) deadlineStr = "due tomorrow";
    else if (diffDays < 0) deadlineStr = "past due";

    // Grab first pending subtask if any
    const pendingSubtask = task.subtasks?.find((s: any) => !s.completed);
    const firstStep = pendingSubtask?.title || "drafting the initial framework";

    return {
      id: task.id,
      taskId: task.id,
      message: `Your "${task.title}" needs ${hoursNeeded} hours of work and is ${deadlineStr}. Start by completing the ${firstStep.toLowerCase()} today.`,
      priority: task.priority || "medium",
      actionStep: `Complete ${firstStep}`
    };
  });
}

// Helper: Local fallback generator if AI Key is missing
function generateFallbackAnalysis(tasks: any[], prefs: any) {
  const name = prefs?.name || "Guardian User";
  const overdueCount = tasks.filter(t => new Date(t.deadline).getTime() < Date.now() && t.status !== "completed").length;
  const pendingCount = tasks.filter(t => t.status !== "completed").length;
  const highPriorityPending = tasks.filter(t => t.priority === "high" && t.status !== "completed").length;

  let score = 75;
  if (overdueCount > 0) score -= 15;
  if (highPriorityPending > 1) score -= 10;
  if (pendingCount > 5) score -= 5;
  score = Math.max(20, score);

  const taskAnalyses = tasks.map((t: any) => {
    const isHigh = t.priority === "high";
    const deadlineDate = new Date(t.deadline);
    const timeDiff = deadlineDate.getTime() - Date.now();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    let risk: "low" | "medium" | "high" = "low";
    let riskAnalysis = "Everything looks on track. Keep sticking to your pacing.";
    
    let deadlineRisk: 'Safe' | 'Medium Risk' | 'High Risk' | 'Critical Risk' = 'Safe';
    let deadlineRiskExplanation = "This task has ample time remaining and is on track according to your productivity patterns.";
    let deadlineRiskActions: string[] = ["Review requirements", "Keep up the steady pace"];

    const incompleteSubtasksCount = t.subtasks?.filter((s: any) => !s.completed)?.length || 0;
    const completedSubtasksCount = t.subtasks?.filter((s: any) => s.completed)?.length || 0;

    if (t.status === "completed") {
      risk = "low";
      riskAnalysis = "Task completed successfully!";
      deadlineRisk = 'Safe';
      deadlineRiskExplanation = "Task is successfully completed! Excellent accountability and execution.";
      deadlineRiskActions = ["Celebrate completion", "Maintain your streak on other deadlines"];
    } else if (daysRemaining <= 1) {
      risk = "high";
      riskAnalysis = `URGENT: This deadline is tomorrow and is currently ${t.status}. Risk is high due to extremely tight timeframe. Start immediately.`;
      deadlineRisk = 'Critical Risk';
      deadlineRiskExplanation = `CRITICAL: The deadline is tomorrow or overdue. You have ${incompleteSubtasksCount} incomplete subtasks with ${t.estimatedTime ? (t.estimatedTime/60).toFixed(1) + ' hours' : 'unestimated'} of remaining work.`;
      deadlineRiskActions = ["Start working immediately with a 25-minute Pomodoro block", "Settle all immediate distractions", "Ask for support or extension if absolutely needed"];
    } else if (daysRemaining <= 3) {
      risk = "high";
      riskAnalysis = "High-priority item with less than 3 days remaining. Procrastination detector suggests establishing focus blocks today.";
      deadlineRisk = 'High Risk';
      deadlineRiskExplanation = `HIGH RISK: Only ${daysRemaining} days remaining. Remaining work includes ${incompleteSubtasksCount} subtasks requiring around ${t.estimatedTime ? (t.estimatedTime/60).toFixed(1) + ' hours' : 'unestimated'} effort. Beginning immediately is essential to avoid deadline pressure.`;
      deadlineRiskActions = ["Establish a dedicated 1-hour study block today", "Complete at least 2 key subtasks now", "Review your workload and adjust lower-priority items"];
    } else if (daysRemaining <= 5) {
      risk = "medium";
      riskAnalysis = "Moderate risk. Early planning will prevent last-minute rushes.";
      deadlineRisk = 'Medium Risk';
      deadlineRiskExplanation = `MEDIUM RISK: Due in ${daysRemaining} days. You have completed ${completedSubtasksCount} subtasks so far. Proactive effort now will prevent high stress later.`;
      deadlineRiskActions = ["Break the task down into smaller subtasks", "Plan a focus session for tomorrow morning", "Set a personal milestone checklist"];
    }

    // AI Task Prioritization Calculation (Fallback Engine)
    let pScore = 20; // base score for low key priority
    if (t.priority === "high") pScore = 60;
    else if (t.priority === "medium") pScore = 40;

    // Urgency multiplier
    if (daysRemaining <= 0) {
      pScore += 30; // past deadline or due today
    } else if (daysRemaining <= 1) {
      pScore += 25;
    } else if (daysRemaining <= 3) {
      pScore += 15;
    } else if (daysRemaining <= 7) {
      pScore += 5;
    }

    // Postponement penalty
    const postponements = t.postponementsCount || 0;
    pScore += Math.min(postponements * 8, 25);

    // Effort modifier (estimatedTime in minutes)
    const effortMin = t.estimatedTime || 0;
    if (effortMin > 180) pScore += 10; // > 3 hours
    else if (effortMin > 60) pScore += 5; // > 1 hour

    // Productivity score offset (lower user productivity score increases task pressure/score)
    const userProd = prefs?.productivityScore || 75;
    if (userProd < 50) pScore += 8;
    else if (userProd > 85) pScore -= 5;

    // Clamp score
    pScore = Math.max(5, Math.min(100, pScore));

    let pLevel: "Critical" | "High" | "Medium" | "Low" = "Low";
    if (pScore >= 85) pLevel = "Critical";
    else if (pScore >= 65) pLevel = "High";
    else if (pScore >= 35) pLevel = "Medium";

    // Build reasoning
    const postponementsText = postponements > 0 ? ` has been postponed ${postponements} times` : " has not been postponed";
    const reasoning = `Fallback Priority: Rated ${pLevel} (${pScore}/100). The task has a '${t.priority}' base importance with ${daysRemaining < 0 ? 'overdue status' : daysRemaining === 0 ? 'deadline today' : daysRemaining + ' days left'}. It requires ${effortMin > 0 ? (effortMin / 60).toFixed(1) + ' hrs' : 'unestimated'} effort and${postponementsText}, demanding active pacing.`;

    // Propose basic schedules
    const suggestedSchedule = [];
    if (t.status !== "completed") {
      const scheduleDate = daysRemaining > 0 
        ? new Date(Date.now() + Math.max(0, daysRemaining - 1) * 24 * 3600 * 1000).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      suggestedSchedule.push({
        date: scheduleDate,
        time: prefs?.preferredFocusHours === "morning" ? "09:00" : prefs?.preferredFocusHours === "afternoon" ? "14:00" : "19:00",
        durationMinutes: isHigh ? 60 : 30,
        actionablePlan: `Work on "${t.title}" focusing on breaking ground on the first 2 checklist milestones.`
      });
    }

    return {
      taskId: t.id,
      riskLevel: risk,
      riskAnalysis,
      deadlineRisk,
      deadlineRiskExplanation,
      deadlineRiskActions,
      priorityScore: pScore,
      priorityLevel: pLevel,
      priorityReasoning: reasoning,
      suggestedSchedule
    };
  });

  const recommendations = [];
  if (overdueCount > 0) {
    recommendations.push({
      type: "risk",
      title: "Overdue Deadline Backlog Detected",
      description: `You have ${overdueCount} task(s) past their deadline. Focus exclusively on rescheduling or instantly closing these to clean your headspace.`,
      taskId: tasks.find(t => new Date(t.deadline).getTime() < Date.now() && t.status !== "completed")?.id || ""
    });
  }
  
  const highRisk = taskAnalyses.find(ta => ta.riskLevel === "high");
  if (highRisk) {
    const matchingTask = tasks.find(t => t.id === highRisk.taskId);
    recommendations.push({
      type: "procrastination",
      title: `High Risk: ${matchingTask?.title}`,
      description: `Procrastination prediction is triggered. Block out a 45-minute focus session right now to complete the primary milestones of this high-risk task.`,
      taskId: highRisk.taskId
    });
  }

  recommendations.push({
    type: "schedule",
    title: "Optimize Peak Focus Hours",
    description: `Your profile indicates you are highly productive in the ${prefs?.preferredFocusHours || "morning"}. We have aligned your hardest schedule blocks to this time.`,
    taskId: tasks[0]?.id || ""
  });

  return {
    productivityScore: score,
    analysis: `Hi ${name}. You have ${pendingCount} active deadlines, with ${highPriorityPending} high-priority. Procrastination probability is moderate. We recommend taking immediate 5-minute action on your highest risk item to break through friction.`,
    taskAnalyses,
    recommendations
  };
}

// ----------------------------------------------------
// VITE OR STATIC ASSET SERVING
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode with Vite Middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode with Static Serving of Bundled Client
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Deadline Guardian Backend] Server is running on port ${PORT}`);
  });
}

startServer();
