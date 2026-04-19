import React, { useState, useEffect } from 'react';
import {
  BarChart3, Dumbbell, Apple, LineChart, Settings, Info,
  Camera, Play, Flame, Droplets, Timer, Lock, Mic, Plus, User, LogOut,
  Upload, CheckCircle, Image as ImageIcon, Star, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedBackground from './components/AnimatedBackground';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler, ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, query, orderBy, onSnapshot } from "firebase/firestore";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, Filler, ArcElement
);

// Abstracted Firebase Configuration pulling from local .env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "fitforge-ai.firebaseapp.com",
  projectId: "fitforge-ai",
  storageBucket: "fitforge-ai.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const API_BASE = "/api";

const MOCK_TEMPLATES = [
  {
    id: "fat-loss-hiit", title: "FAT LOSS HIIT", emoji: "🔥", duration: "4 weeks",
    intensity: "High", session: "30 min", equipment: "None", category: "Fat Loss",
    rating: "4.8", reviews: "1.2k", color: "error", code: "#ff7351",
    split: ["Mon: Full Body HIIT", "Tue: Cardio Intervals", "Wed: Rest", "Thu: Full Body HIIT", "Fri: Cardio Intervals"],
    results: ["Burn 1,200-1,500 cals/week", "Improve cardiovascular health", "Reduce body fat by 2-3%"]
  },
  {
    id: "beginner-strength", title: "BEGINNER STRENGTH", emoji: "💪", duration: "6 weeks",
    intensity: "Moderate", session: "45 min", equipment: "Dumbbells", category: "Strength",
    rating: "4.6", reviews: "2.8k", color: "primary", code: "#f3ffca",
    split: ["Mon: Push (Chest, Shoulders)", "Tue: Pull (Back, Biceps)", "Wed: Legs", "Thu: Rest", "Fri: Full Body"],
    results: ["Gain 4-6 lbs lean muscle", "Increase strength by 20-30%", "Better form & injury prevention"]
  },
  {
    id: "hypertrophy-push", title: "HYPERTROPHY PUSH", emoji: "🏋️", duration: "8 weeks",
    intensity: "Very High", session: "60 min", equipment: "Full Gym", category: "Hypertrophy",
    rating: "4.9", reviews: "890", color: "tertiary", code: "#81ecff",
    split: ["Mon: Chest Day", "Tue: Shoulder Day", "Wed: Triceps Specialization", "Thu: Rest", "Fri: Chest (Volume)"],
    results: ["Gain 8-12 lbs muscle mass", "Larger chest/shoulders", "Improved muscle definition"]
  }
];

export default function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Auth State
  const [user, setUser] = useState(null);
  const [guestMode, setGuestMode] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (err) {
      setAuthError(err.message.replace("Firebase: ", ""));
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setGuestMode(false);
  };

  // Main UI State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  
  // Specific AI Outputs
  const [workoutResult, setWorkoutResult] = useState('');
  const [nutritionResult, setNutritionResult] = useState('');
  
  // Nutrition Lens (Photo Scanner) State
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerProgress, setScannerProgress] = useState(0);
  const [scannedData, setScannedData] = useState(null);

  const simulateFoodScan = () => {
    setScannerActive(true);
    setScannerProgress(0);
    setScannedData(null);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        clearInterval(interval);
        setScannerProgress(100);
        setTimeout(() => {
          setScannerActive(false);
          setScannedData({
            foods: [
              { name: "Paneer Paratha", qty: "2x", desc: "90g each" },
              { name: "Curd (Yogurt)", qty: "1x", desc: "Small Bowl" },
              { name: "Green Chutney", qty: "1x", desc: "2 tbsp" }
            ],
            macros: { calories: 480, protein: 18, carbs: 52, fat: 20, fiber: 2.4 },
            insight: "High protein content (18g) from paneer. Consider pairing with spinach or tomato for more fiber."
          });
        }, 500);
      } else {
        setScannerProgress(progress);
      }
    }, 300);
  };

  // Workout Templates State
  const [templateFilter, setTemplateFilter] = useState('All');

  // Inputs
  const [workoutPrompt, setWorkoutPrompt] = useState('');
  const [nutritionPrompt, setNutritionPrompt] = useState('');
  const [workoutCategory, setWorkoutCategory] = useState('FAT LOSS HIIT');

  const navItems = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
    { id: 'workout', icon: Dumbbell, label: 'Workouts' },
    { id: 'nutrition', icon: Apple, label: 'Meal Plan' },
    { id: 'progress', icon: LineChart, label: 'Progress' },
    { id: 'settings', icon: Settings, label: 'Settings' },
    { id: 'support', icon: Info, label: 'Support' }
  ];

  // Tracker State
  const [stepCount, setStepCount] = useState(12340);
  const [waterLog, setWaterLog] = useState([
    { id: 1, time: '08:00 AM', amount: 200, type: 'Tea' }
  ]);
  const [waterInput, setWaterInput] = useState('');
  const currentWater = waterLog.reduce((acc, log) => acc + log.amount, 0);
  const addWater = (amount) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setWaterLog([...waterLog, { id: Date.now(), time, amount, type: 'Water' }]);
  };
  const handleWaterManual = () => {
    if (waterInput && !isNaN(waterInput)) {
      addWater(parseInt(waterInput));
      setWaterInput('');
    }
  };

  useEffect(() => {
    if (!user && !guestMode) return;
    const interval = setInterval(() => {
      setStepCount(prev => prev + Math.floor(Math.random() * 5));
    }, 4000);
    return () => clearInterval(interval);
  }, [user, guestMode]);

  const callAI = async (endpoint, payload, setter) => {
    setLoading(true);
    setter('Generating via Forge AI Engine...');
    try {
      const res = await axios.post(`${API_BASE}/${endpoint}`, payload);
      setter(res.data.result || res.data.error || "No response generated.");
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setter(`Backend Error: ${err.response.data.error}`);
      } else {
        setter(`Failed to reach FitForge AI backend: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWorkoutSubmit = () => {
    if (!workoutPrompt) return;
    callAI('workout', { goal: workoutPrompt, level: workoutCategory }, setWorkoutResult);
  };
  const handleNutritionSubmit = () => {
    if (!nutritionPrompt) return;
    callAI('meal', { goal: nutritionPrompt }, setNutritionResult);
  };

  // ------------------ LOGIN OVERLAY ------------------
  if (!user && !guestMode) {
    return (
      <div className="flex h-screen items-center justify-center font-body bg-background selection:bg-primary/30 text-on-surface-variant relative overflow-hidden">
        <AnimatedBackground theme={theme} />
        <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        
        <div className="z-10 bg-surface-container rounded-2xl p-8 w-96 shadow-2xl border-t-4 border-primary">
          <div className="flex flex-col items-center mb-8">
             <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-container rounded-2xl flex items-center justify-center font-bold text-background shadow-[0_0_30px_rgba(243,255,202,0.3)] mb-4 text-2xl">F</div>
             <h1 className="text-3xl font-display font-medium text-on-surface">FitForge <span className="font-light">AI</span></h1>
             <p className="font-label text-xs uppercase tracking-widest text-primary mt-1">Authentication Required</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authError && <p className="text-error text-xs font-label bg-error/10 p-2 rounded">{authError}</p>}
            <input type="email" placeholder="ACCESS EMAIL" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-surface-container-highest border border-surface-variant rounded-xl p-4 text-xs font-label text-on-surface outline-none" />
            <input type="password" placeholder="PASSPHRASE" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-surface-container-highest border border-surface-variant rounded-xl p-4 text-xs font-label text-on-surface outline-none" />
            <button type="submit" className="w-full py-4 bg-primary text-background font-label uppercase tracking-widest rounded-xl hover:brightness-110 font-bold mt-4 flex justify-center gap-2">
              <Lock size={14} /> {isSignUp ? 'Sign Up' : 'Login'}
            </button>
          </form>
          <div className="mt-6 flex flex-col gap-2">
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-xs font-label hover:text-primary">
              {isSignUp ? 'Return to Login' : 'Create Account'}
            </button>
            <div className="border-t border-surface-variant/30 my-2" />
            <button onClick={() => setGuestMode(true)} className="text-xs font-label text-tertiary">
              Continue Offline (Guest Mode) &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden font-body bg-background selection:bg-primary/30 text-on-surface-variant">
      
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <AnimatedBackground theme={theme} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.05] dark:opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      </div>

      <aside className="w-[240px] bg-surface border-r border-surface-container shrink-0 z-50 flex flex-col justify-between shadow-2xl relative">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 font-display bg-gradient-to-br from-primary to-primary-container rounded-lg flex items-center justify-center font-bold text-background">F</div>
            <div>
              <h1 className="text-xl font-display font-bold text-on-surface leading-none">FitForge</h1>
              <span className="text-[10px] text-primary uppercase tracking-widest font-label">AI Engine</span>
            </div>
          </div>
          <div className="mb-8 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-surface-container-highest border border-surface-variant overflow-hidden flex items-center justify-center">
              {user ? <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} className="w-full h-full object-cover" /> : <User className="text-on-surface-variant"/>}
            </div>
            <div>
              <p className="font-label text-sm text-on-surface truncate w-32">{user ? user.email.split('@')[0] : 'Guest'}</p>
              <span className="text-[9px] bg-tertiary/20 text-tertiary px-2 py-0.5 rounded uppercase font-label">Elite</span>
            </div>
          </div>
          <nav className="space-y-2">
            {navItems.map((tab) => (
              <button
                key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-label text-sm transition-all border-l-2 ${
                  activeTab === tab.id ? 'border-primary bg-surface-container text-primary font-bold shadow-[inset_4px_0_15px_rgba(243,255,202,0.05)]' : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/30'
                }`}
              >
                <tab.icon size={18} className={activeTab === tab.id ? "text-primary" : "opacity-70"} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6 space-y-3">
          <button onClick={handleLogout} className="w-full py-3 bg-surface-container text-error border border-error/20 font-label uppercase text-[10px] rounded-xl font-bold flex justify-center gap-2"><LogOut size={12}/> Log Out</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative h-full">
        <div className="max-w-5xl mx-auto px-8 py-10">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }}>
              
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-5xl font-display font-medium text-on-surface">Dashboard</h2>
                  </div>
                  {/* Reuse old dashboard code conceptually... simplified for brevity here */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-surface-container rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between border border-surface-variant/10">
                        <h3 className="font-label text-xs uppercase text-on-surface-variant mb-6"><BarChart3 size={16} className="inline text-primary mr-2"/> Activity Score</h3>
                        <div className="flex justify-center mb-6">
                          <div className="w-32 h-32 rotate-45 border-4 border-primary rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(243,255,202,0.15)] bg-surface-container-highest/50">
                            <div className="-rotate-45 text-center"><span className="block text-4xl font-display font-bold text-on-surface leading-none">84</span></div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-surface-container rounded-2xl p-6 shadow-2xl relative border-surface-variant/10">
                        <h3 className="font-label text-xs uppercase text-on-surface-variant mb-6">Step Pulse</h3>
                        <div className="relative w-40 h-40 mx-auto">
                          <Doughnut data={{ datasets: [{ data: [stepCount, 18000 - stepCount], backgroundColor: ['#f3ffca', '#131313'], borderWidth: 0, cutout: '85%' }] }} options={{ plugins: { tooltip: { enabled: false } }, rotation: -90, circumference: 360 }} />
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="font-display font-bold text-2xl text-on-surface">{stepCount.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-surface-container rounded-2xl p-6 shadow-2xl border-l-[2px] border-tertiary relative border-y-0 border-r-0">
                         <h3 className="font-label text-xs uppercase text-on-surface-variant mb-4"><Droplets size={14} className="inline text-tertiary mr-1"/> Hydration</h3>
                         <div className="w-full bg-surface-container-low h-3 rounded-full overflow-hidden mb-2 shadow-inner">
                           <div className="h-full bg-gradient-to-r from-tertiary to-primary-container" style={{ width: `${Math.min((currentWater / 8000) * 100, 100)}%` }} />
                         </div>
                         <p className="text-right font-display text-xs text-tertiary mb-6">{currentWater} ml</p>
                         <input value={waterInput} onChange={e => setWaterInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') handleWaterManual() }} type="number" placeholder="Custom ml..." className="w-full bg-surface-container-lowest border border-surface-variant/20 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-tertiary/50" />
                      </div>
                   </div>
                </div>
              )}

              {/* NUTRITION & NUTRITION LENS */}
              {activeTab === 'nutrition' && (
                <div className="space-y-6 animate-in fade-in">
                  <div>
                    <h2 className="text-4xl font-display font-bold text-on-surface flex items-center gap-3">MACRO COMMAND <span className="border border-tertiary/30 text-tertiary px-2 py-1 rounded font-label text-[10px] flex items-center gap-1 bg-tertiary/10"><Mic size={12} className="animate-pulse"/> AI OPTIMIZED</span></h2>
                    <p className="font-body text-sm text-on-surface-variant mt-2">Precision Nutrition Tracking</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Manual Input */}
                    <div className="bg-surface-container rounded-2xl p-6 shadow-xl border-l-[2px] border-tertiary flex flex-col gap-4">
                      <h3 className="font-label text-xs text-tertiary uppercase tracking-widest"><Mic size={14} className="inline mr-1"/> Text Log</h3>
                      <input type="text" value={nutritionPrompt} onChange={e => setNutritionPrompt(e.target.value)} placeholder="'I ate 2 paneer parathas...'" className="w-full bg-surface-container-lowest border-none font-body text-on-surface text-lg p-4 rounded-xl focus:ring-0 shadow-inner" />
                      <button onClick={handleNutritionSubmit} disabled={loading} className="w-full py-4 bg-tertiary text-background font-bold rounded-xl uppercase tracking-widest text-xs hover:brightness-110">
                        {loading ? 'SYNCING...' : 'MANUAL LOG'}
                      </button>
                      {nutritionResult && <div className="p-4 bg-surface-container-highest rounded-xl text-xs font-body whitespace-pre-wrap">{nutritionResult}</div>}
                    </div>

                    {/* AI PHOTO LENS */}
                    <div className="bg-[#262626] rounded-2xl p-6 shadow-xl border-l-[2px] border-tertiary relative overflow-hidden">
                       <h3 className="font-label text-xs text-tertiary uppercase tracking-widest mb-4 flex justify-between">
                         <span><Camera size={14} className="inline mr-1"/> Nutrition Lens Scanner</span>
                         <span className="text-[10px] text-on-surface-variant bg-surface-container-lowest px-2 py-0.5 rounded">Beta</span>
                       </h3>

                       {!scannerActive && !scannedData && (
                         <div className="border-2 border-dashed border-surface-variant/50 rounded-xl p-8 flex flex-col items-center justify-center text-center group hover:border-tertiary/50 transition-colors">
                            <Camera size={48} className="text-tertiary/50 group-hover:text-tertiary mb-4 transition-colors" />
                            <h4 className="font-display text-lg text-on-surface mb-2">SCAN YOUR MEAL</h4>
                            <p className="font-body text-xs text-on-surface-variant mb-6">Upload a photo. AI will analyze instantly.</p>
                            <div className="flex gap-4 w-full">
                               <input type="file" id="lens-upload" className="hidden" accept="image/*" onChange={simulateFoodScan} />
                               <label htmlFor="lens-upload" className="flex-1 bg-surface-container-lowest border border-surface-variant py-2 rounded-lg font-label text-xs hover:bg-surface-container text-on-surface flex items-center justify-center gap-2 cursor-pointer"><ImageIcon size={14}/> GALLERY</label>
                               <label htmlFor="lens-upload" className="flex-1 bg-surface-container-lowest border border-surface-variant py-2 rounded-lg font-label text-xs hover:bg-surface-container text-on-surface flex items-center justify-center gap-2 cursor-pointer"><Camera size={14}/> CAMERA</label>
                            </div>
                         </div>
                       )}

                       {scannerActive && (
                         <div className="h-full min-h-[300px] flex flex-col items-center justify-center">
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="w-16 h-16 rounded-full border-4 border-surface-variant border-t-tertiary border-r-tertiary mb-6" />
                            <p className="font-label text-sm uppercase text-on-surface mb-4">Analyzing Food Structurals...</p>
                            <div className="w-full bg-surface-container-lowest h-2 rounded-full overflow-hidden">
                               <div className="h-full bg-gradient-to-r from-tertiary to-primary transition-all duration-300" style={{ width: `${scannerProgress}%` }} />
                            </div>
                         </div>
                       )}

                       {scannedData && (
                         <div className="animate-in slide-in-from-bottom-4">
                           <div className="mb-6">
                              <h4 className="font-label text-[10px] uppercase text-on-surface-variant mb-2">📋 DETECTED FOODS</h4>
                              <ul className="space-y-2">
                                {scannedData.foods.map((n, i) => (
                                  <li key={i} className="flex justify-between font-body text-sm text-on-surface bg-surface-container-low px-3 py-2 rounded">
                                    <span><span className="font-bold text-tertiary">{n.qty}</span> {n.name}</span>
                                    <span className="text-xs text-on-surface-variant">{n.desc}</span>
                                  </li>
                                ))}
                              </ul>
                           </div>

                           <div className="mb-6 bg-[#1a1a1a] rounded-xl p-4">
                             <h4 className="font-label text-[10px] uppercase text-on-surface-variant mb-3">🔥 NUTRITIONAL BREAKDOWN</h4>
                             <div className="space-y-3">
                               <div>
                                  <div className="flex justify-between font-body text-xs mb-1"><span className="text-on-surface-variant">Calories</span><span className="font-bold">{scannedData.macros.calories} kcal</span></div>
                                  <div className="h-1.5 w-full bg-surface-container-lowest rounded-full"><div className="h-full bg-primary rounded-full w-[60%]"/></div>
                               </div>
                               <div>
                                  <div className="flex justify-between font-body text-xs mb-1"><span className="text-on-surface-variant">Protein</span><span className="font-bold">{scannedData.macros.protein}g</span></div>
                                  <div className="h-1.5 w-full bg-surface-container-lowest rounded-full"><div className="h-full bg-tertiary rounded-full w-[45%]"/></div>
                               </div>
                               <div>
                                  <div className="flex justify-between font-body text-xs mb-1"><span className="text-on-surface-variant">Carbs</span><span className="font-bold">{scannedData.macros.carbs}g</span></div>
                                  <div className="h-1.5 w-full bg-surface-container-lowest rounded-full"><div className="h-full bg-error rounded-full w-[70%]"/></div>
                               </div>
                               <div>
                                  <div className="flex justify-between font-body text-xs mb-1"><span className="text-on-surface-variant">Fat</span><span className="font-bold">{scannedData.macros.fat}g</span></div>
                                  <div className="h-1.5 w-full bg-surface-container-lowest rounded-full"><div className="h-full bg-[#fbbc04] rounded-full w-[35%]"/></div>
                               </div>
                             </div>
                           </div>

                           <div className="bg-[#131313] border-t-2 border-tertiary p-3 rounded-lg mb-4">
                             <h4 className="font-label text-[10px] text-tertiary flex items-center gap-1 mb-1">💡 AI INSIGHTS</h4>
                             <p className="font-body text-xs text-on-surface leading-relaxed">{scannedData.insight}</p>
                           </div>

                           <div className="flex gap-3">
                             <button onClick={() => setScannedData(null)} className="flex-1 py-3 bg-surface-container border border-surface-variant rounded-xl text-xs font-label">RESCAN</button>
                             <button className="flex-[2] py-3 bg-tertiary text-background font-bold text-xs font-label rounded-xl flex justify-center items-center gap-2"><CheckCircle size={14}/> LOG MEAL</button>
                           </div>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              )}

              {/* WORKOUT ARCHITECT & TEMPLATES */}
              {activeTab === 'workout' && (
                <div className="space-y-10 animate-in fade-in">
                  
                  {/* Custom Architect Block */}
                  <div className="bg-surface-container rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                    <h2 className="text-3xl font-display font-medium text-on-surface mb-6"><Dumbbell className="inline text-primary mr-2"/> AI WORKOUT ARCHITECT</h2>
                    <div className="flex gap-4">
                       <input type="text" value={workoutPrompt} onChange={e => setWorkoutPrompt(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') handleWorkoutSubmit() }} placeholder="e.g., 'Beginner strength...'" className="w-full bg-surface-container-highest border border-surface-variant rounded-xl p-4" />
                       <button onClick={handleWorkoutSubmit} disabled={loading} className="px-6 bg-primary text-background rounded-xl font-bold"><Play size={20} fill="currentColor" /></button>
                    </div>
                    {workoutResult && (
                      <div className="mt-6 p-6 bg-surface-container-highest rounded-xl text-sm font-body whitespace-pre-wrap">{workoutResult}</div>
                    )}
                  </div>

                  {/* PRE-FORMATTED TEMPLATES GALLERY */}
                  <div>
                    <h3 className="text-xl font-display font-bold text-on-surface mb-4">WORKOUT TEMPLATES</h3>
                    <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
                      {['All', 'Beginner', 'Strength', 'Hypertrophy', 'Fat Loss'].map(filter => (
                        <button key={filter} onClick={() => setTemplateFilter(filter)} className={`px-4 py-2 rounded-full border text-xs font-label uppercase transition-all whitespace-nowrap ${templateFilter === filter ? 'bg-primary text-background border-primary' : 'border-surface-variant text-on-surface-variant hover:border-on-surface-variant/50'}`}>
                          {filter}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                      {MOCK_TEMPLATES.filter(t => templateFilter === 'All' || t.category.includes(templateFilter)).map(t => (
                        <div key={t.id} className="bg-surface-container rounded-2xl overflow-hidden shadow-xl hover:bg-surface-container-high transition-all flex flex-col group relative" style={{ borderLeft: `4px solid ${t.code}` }}>
                           <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity blur-2xl" style={{ backgroundColor: t.code }} />
                           
                           <div className="p-6 flex-1 z-10">
                             <div className="flex justify-between items-start mb-2">
                               <h4 className="font-display font-medium text-lg leading-tight text-on-surface">{t.emoji} {t.title} <span className="block text-xs font-label text-on-surface-variant mt-1">({t.duration})</span></h4>
                             </div>
                             <div className="flex items-center gap-1 font-label text-[10px] text-primary mb-4 cursor-pointer hover:underline">
                                <Star size={10} fill="currentColor" /> {t.rating}/5 from {t.reviews}
                             </div>

                             <div className="grid grid-cols-3 border-y border-surface-variant/30 py-3 mb-4 text-center divide-x divide-surface-variant/30">
                                <div><p className="font-label text-[9px] uppercase text-on-surface-variant">Intensity</p><p className="font-body text-xs text-on-surface">{t.intensity}</p></div>
                                <div><p className="font-label text-[9px] uppercase text-on-surface-variant">Time</p><p className="font-body text-xs text-on-surface">{t.session}</p></div>
                                <div><p className="font-label text-[9px] uppercase text-on-surface-variant">Gear</p><p className="font-body text-xs text-on-surface">{t.equipment}</p></div>
                             </div>

                             <div className="mb-4">
                               <p className="font-label text-[10px] uppercase text-on-surface-variant mb-2">Weekly Split</p>
                               <ul className="space-y-1">
                                 {t.split.slice(0, 3).map((day, i) => (
                                   <li key={i} className="font-body text-xs text-on-surface pl-2 border-l border-surface-variant/50">{day}</li>
                                 ))}
                                 {t.split.length > 3 && <li className="font-body text-xs text-on-surface pl-2 border-l border-surface-variant/50 italic text-on-surface-variant/70">+{t.split.length - 3} more days</li>}
                               </ul>
                             </div>

                             <div>
                               <p className="font-label text-[10px] uppercase text-on-surface-variant mb-2">Results</p>
                               <ul className="space-y-1">
                                 {t.results.slice(0,2).map((res, i) => (
                                   <li key={i} className="font-body text-xs text-on-surface flex gap-2 items-start"><CheckCircle size={12} className="text-[#26a641] shrink-0 mt-0.5" /> <span>{res}</span></li>
                                 ))}
                               </ul>
                             </div>
                           </div>

                           <div className="p-6 pt-0 flex gap-3 z-10 mt-auto">
                             <button className="flex-1 py-2.5 border border-surface-variant/80 rounded-xl font-label text-xs hover:bg-surface-variant/30 transition-colors">PREVIEW</button>
                             <button onClick={() => { setWorkoutPrompt(`I want to do the ${t.title} program`); setTimeout(() => handleWorkoutSubmit(), 100); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="flex-1 py-2.5 bg-primary text-background font-bold text-xs rounded-xl flex justify-center items-center gap-1 shadow-lg hover:brightness-110" style={{ backgroundColor: t.code, color: '#131313' }}><Play size={12} fill="currentColor"/> START</button>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'progress' && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-4xl font-display font-medium text-on-surface">Progress</h2>
                    </div>
                  </div>
                  <div className="bg-surface-container rounded-2xl p-6 shadow-2xl h-64 flex justify-center items-center text-on-surface-variant">Progress visualization maintained from active dashboard architecture</div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
