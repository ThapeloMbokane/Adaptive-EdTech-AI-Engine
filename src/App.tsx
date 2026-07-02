import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  GraduationCap, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  BookOpen, 
  Lightbulb, 
  FileText, 
  HelpCircle, 
  RefreshCw, 
  AlertCircle, 
  Copy, 
  Compass, 
  ChevronRight, 
  Check, 
  Info,
  Terminal,
  Trophy,
  LogIn,
  UserPlus,
  LogOut,
  User as UserIcon,
  Shield,
  Users,
  Award,
  Settings,
  Plus,
  Trash2,
  Lock,
  LineChart,
  ClipboardList,
  Save,
  Upload,
  MessageSquare,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { LearningModule, QuizQuestion } from "./types";
import { auth, db } from "./firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  collection, 
  query, 
  where, 
  orderBy, 
  deleteDoc,
  updateDoc
} from "firebase/firestore";

// Interactive Educational Presets
const EDUCATIONAL_PRESETS = [
  {
    topic: "The Doppler Effect",
    description: "How sound pitch changes with motion",
    documentText: "The Doppler effect is the change in frequency of a wave in relation to an observer who is moving relative to the wave source. It is commonly heard when a vehicle sounding a siren approaches, passes, and recedes from an observer. The received frequency is higher during the approach, identical at the instant of passing by, and lower during the recession."
  },
  {
    topic: "Blockchain Proof of Work",
    description: "Securing decentralized networks",
    documentText: "Proof of work (PoW) is a form of cryptographic zero-knowledge proof in which one party proves to others that a certain amount of a specific computational effort has been expended. Verifiers can subsequently confirm this expenditure with minimal effort on their part. Bitcoin uses PoW to reach decentralized consensus on its ledger."
  },
  {
    topic: "How Inflation Works",
    description: "The mechanics of purchasing power",
    documentText: "Inflation is a general increase in prices and fall in the purchasing value of money. It occurs when the money supply grows faster than the rate of economic production, leading to more currency chasing the same amount of goods. Central banks try to manage inflation by controlling interest rates."
  },
  {
    topic: "Schrödinger's Cat",
    description: "Quantum superposition simplified",
    documentText: "Schrödinger's cat is a thought experiment that illustrates a paradox of quantum mechanics. A hypothetical cat is placed in a sealed box with a radioactive source and a poison flask that triggers if an atom decays. According to quantum superposition, the cat is simultaneously both alive and dead until the box is opened."
  }
];

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: "student" | "teacher" | "admin";
  createdAt: string;
}

interface SavedModuleItem {
  id: string;
  userId: string;
  topic: string;
  documentText: string;
  module: LearningModule;
  createdAt: string;
  savedByRole?: string;
}

interface StudentScoreRecord {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  topic: string;
  score: number;
  maxScore: number;
  date: string;
}

export default function App() {
  // Authentication & Profile States
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<"none" | "login" | "signup">("none");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Auth Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher" | "admin">("student");

  // App Core States for Module Generation
  const [topic, setTopic] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [uploadedFileBase64, setUploadedFileBase64] = useState<string>("");
  const [uploadedFileMimeType, setUploadedFileMimeType] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [module, setModule] = useState<LearningModule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"remedial" | "advanced" | "quiz" | "json">("remedial");
  const [jsonString, setJsonString] = useState("");
  const [copied, setCopied] = useState(false);

  // Firestore Synchronized States
  const [savedModules, setSavedModules] = useState<SavedModuleItem[]>([]);
  const [scoresHistory, setScoresHistory] = useState<StudentScoreRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isSavingModule, setIsSavingModule] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // View Controller: Study Area vs Dashboard
  const [viewMode, setViewMode] = useState<"study" | "dashboard">("study");

  // Quiz Play States
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<{
    submitted: boolean;
    isCorrect: boolean;
    showHint: boolean;
    showScaffolding: boolean;
    attempts: number;
  }>({
    submitted: false,
    isCorrect: false,
    showHint: false,
    showScaffolding: false,
    attempts: 0,
  });
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [answersHistory, setAnswersHistory] = useState<Array<{
    question: string;
    selected: string;
    correct: string;
    isCorrect: boolean;
    attempts: number;
  }>>([]);

  // Teacher Tool: Feedback creator
  const [feedbackStudent, setFeedbackStudent] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Admin Tool: Settings options
  const [tempSimulated, setTempSimulated] = useState(0.7);
  const [selectedTheme, setSelectedTheme] = useState("Indigo-Slate");
  const [maxQuizLength, setMaxQuizLength] = useState(3);

  // Loading screen steps
  const loadingSteps = [
    "Analyzing core topic structure...",
    "Extracting critical terminologies...",
    "Drafting 5th-grade analogical maps...",
    "Polishing advanced analytical pathways...",
    "Creating 3-question adaptive quiz sequence...",
    "Synthesizing structured JSON module..."
  ];

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setAuthLoading(true);
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            // Profile fallback
            const fallbackProfile: UserProfile = {
              uid: currentUser.uid,
              name: currentUser.displayName || currentUser.email?.split("@")[0] || "User",
              email: currentUser.email || "",
              role: "student",
              createdAt: new Date().toISOString()
            };
            setUserProfile(fallbackProfile);
          }
        } catch (err) {
          console.error("Error reading profile:", err);
        } finally {
          setAuthLoading(false);
        }
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Firestore Data based on Authentication Status & User Role
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !userProfile) return;
      try {
        // Fetch saved modules (teachers/admins can see all or just theirs, students see all/assigned)
        const modulesSnap = await getDocs(collection(db, "saved_modules"));
        const modulesList = modulesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SavedModuleItem[];
        setSavedModules(modulesList);

        // Fetch scores (students see theirs, teachers/admins see all)
        const scoresSnap = await getDocs(collection(db, "student_scores"));
        const scoresList = scoresSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as StudentScoreRecord[];
        setScoresHistory(scoresList);

        // Fetch user profiles (only needed/permitted for admins, but let's query gracefully)
        if (userProfile.role === "admin") {
          const usersSnap = await getDocs(collection(db, "users"));
          const usersList = usersSnap.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
          })) as UserProfile[];
          setAllUsers(usersList);
        }
      } catch (err) {
        console.error("Error syncing Firestore collections:", err);
      }
    };

    fetchData();
  }, [user, userProfile]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStepIndex((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 2000);
    } else {
      setLoadingStepIndex(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Auth Submit Handlers
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setAuthError("All fields are required.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      const profile: UserProfile = {
        uid: newUser.uid,
        name: fullName,
        email: email,
        role: selectedRole,
        createdAt: new Date().toISOString()
      };

      // Store profile in Firestore
      await setDoc(doc(db, "users", newUser.uid), profile);
      setUserProfile(profile);
      setAuthMode("none");
      resetAuthForm();
    } catch (err: any) {
      console.error(err);
      setAuthError(err?.message || String(err) || "An error occurred during registration.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError("Please provide your email and password.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loginUid = userCredential.user.uid;

      // Get profile
      const docSnap = await getDoc(doc(db, "users", loginUid));
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
      }
      setAuthMode("none");
      resetAuthForm();
    } catch (err: any) {
      console.error(err);
      setAuthError(err?.message || String(err) || "Authentication failed. Please verify your credentials.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const loggedUser = userCredential.user;

      // Get or create profile
      const docRef = doc(db, "users", loggedUser.uid);
      const docSnap = await getDoc(docRef);
      let profile: UserProfile;
      if (docSnap.exists()) {
        profile = docSnap.data() as UserProfile;
      } else {
        profile = {
          uid: loggedUser.uid,
          name: loggedUser.displayName || loggedUser.email?.split("@")[0] || "User",
          email: loggedUser.email || "",
          role: "student", // default role for Google Sign-In
          createdAt: new Date().toISOString()
        };
        await setDoc(docRef, profile);
      }
      setUserProfile(profile);
      setAuthMode("none");
      resetAuthForm();
    } catch (err: any) {
      console.error(err);
      setAuthError(err?.message || String(err) || "Google Sign-In failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      setViewMode("study");
    } catch (err) {
      console.error(err);
    }
  };

  const resetAuthForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setAuthError(null);
  };

  // Preset Selection
  const handleSelectPreset = (preset: typeof EDUCATIONAL_PRESETS[0]) => {
    setTopic(preset.topic);
    setDocumentText(preset.documentText);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit. Please select a smaller file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setUploadedFileBase64(reader.result);
        setUploadedFileMimeType(file.type);
        setUploadedFileName(file.name);
      }
    };
    reader.onerror = (err) => {
      console.error("FileReader error:", err);
    };
    reader.readAsDataURL(file);
  };

  const handleClearFile = () => {
    setUploadedFileBase64("");
    setUploadedFileMimeType("");
    setUploadedFileName("");
  };

  // Submit Generation Request
  const handleGenerateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError("Please specify a topic or concept to begin.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setModule(null);
    setSaveSuccess(false);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          topic, 
          documentText,
          fileData: uploadedFileBase64,
          fileMimeType: uploadedFileMimeType
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "The EdTech Engine failed to build this module.");
      }

      setModule(result.module);
      setJsonString(JSON.stringify(result.module, null, 2));
      setActiveTab("remedial");
      resetQuizState(result.module.quiz);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "A network or validation error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // Save Learning Module to Firestore
  const handleSaveModuleToCloud = async () => {
    if (!module || !user || !userProfile) return;
    setIsSavingModule(true);
    try {
      const moduleId = `mod_${Date.now()}`;
      const savedItem: SavedModuleItem = {
        id: moduleId,
        userId: user.uid,
        topic: topic,
        documentText: documentText,
        module: module,
        createdAt: new Date().toISOString(),
        savedByRole: userProfile.role
      };

      await setDoc(doc(db, "saved_modules", moduleId), savedItem);
      setSavedModules((prev) => [savedItem, ...prev]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save module to Cloud:", err);
      alert("Error saving module. Make sure your database allows this write.");
    } finally {
      setIsSavingModule(false);
    }
  };

  // Load Saved Module back into active study screen
  const handleLoadSavedModule = (item: SavedModuleItem) => {
    setTopic(item.topic);
    setDocumentText(item.documentText);
    setModule(item.module);
    setJsonString(JSON.stringify(item.module, null, 2));
    setViewMode("study");
    setActiveTab("remedial");
    resetQuizState(item.module.quiz);
  };

  // Delete Saved Module
  const handleDeleteSavedModule = async (moduleId: string) => {
    try {
      await deleteDoc(doc(db, "saved_modules", moduleId));
      setSavedModules((prev) => prev.filter(m => m.id !== moduleId));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // Quiz States Handler
  const resetQuizState = (questions: QuizQuestion[]) => {
    setQuizIndex(0);
    setSelectedOption(null);
    setQuizFeedback({
      submitted: false,
      isCorrect: false,
      showHint: false,
      showScaffolding: false,
      attempts: 0,
    });
    setQuizScore(0);
    setQuizFinished(false);
    setAnswersHistory([]);
  };

  const handleSelectOption = (option: string) => {
    if (quizFeedback.submitted && quizFeedback.isCorrect) return;
    setSelectedOption(option);
  };

  const handleSubmitAnswer = () => {
    if (!module || !selectedOption) return;
    const currentQuestion = module.quiz[quizIndex];
    const isCorrectAnswer = selectedOption === currentQuestion.correct;
    const currentAttempts = quizFeedback.attempts + 1;

    setQuizFeedback((prev) => ({
      ...prev,
      submitted: true,
      isCorrect: isCorrectAnswer,
      attempts: currentAttempts,
      showScaffolding: !isCorrectAnswer,
    }));

    if (isCorrectAnswer) {
      const points = currentAttempts === 1 ? 10 : currentAttempts === 2 ? 5 : 2;
      setQuizScore((prev) => prev + points);

      setAnswersHistory((prev) => [
        ...prev,
        {
          question: currentQuestion.question,
          selected: selectedOption,
          correct: currentQuestion.correct,
          isCorrect: true,
          attempts: currentAttempts,
        }
      ]);
    }
  };

  const handleNextQuestion = async () => {
    if (!module) return;
    if (quizIndex < module.quiz.length - 1) {
      setQuizIndex((prev) => prev + 1);
      setSelectedOption(null);
      setQuizFeedback({
        submitted: false,
        isCorrect: false,
        showHint: false,
        showScaffolding: false,
        attempts: 0,
      });
    } else {
      setQuizFinished(true);

      // Save Student Quiz Result to Cloud Firestore
      if (user && userProfile) {
        try {
          const scoreId = `score_${Date.now()}`;
          const newRecord: StudentScoreRecord = {
            id: scoreId,
            userId: user.uid,
            userEmail: user.email || "",
            userName: userProfile.name,
            topic: topic,
            score: quizScore,
            maxScore: module.quiz.length * 10,
            date: new Date().toLocaleDateString()
          };
          await setDoc(doc(db, "student_scores", scoreId), newRecord);
          setScoresHistory((prev) => [newRecord, ...prev]);
        } catch (err) {
          console.error("Failed to post score:", err);
        }
      }
    }
  };

  // Admin Tool: Change user role
  const handleChangeUserRole = async (targetUid: string, newRole: "student" | "teacher" | "admin") => {
    try {
      await updateDoc(doc(db, "users", targetUid), { role: newRole });
      setAllUsers((prev) => prev.map(u => u.uid === targetUid ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Feedback (Teacher tool)
  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackStudent || !feedbackMsg) return;
    setFeedbackSent(true);
    setTimeout(() => {
      setFeedbackStudent("");
      setFeedbackMsg("");
      setFeedbackSent(false);
    }, 3000);
  };

  // Copy helper
  const handleCopyJSON = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Text Formatter for visual analogies & advanced paragraphs
  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const lines = text.split("\n");
    return (
      <div className="space-y-4 text-slate-700 leading-relaxed font-sans text-base">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-2" />;
          
          if (trimmed.startsWith("### ")) {
            return (
              <h4 key={idx} className="text-lg font-bold text-slate-900 mt-6 mb-2 tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-4 bg-indigo-500 rounded"></span>
                {trimmed.substring(4)}
              </h4>
            );
          }
          if (trimmed.startsWith("## ")) {
            return (
              <h3 key={idx} className="text-xl font-bold text-slate-900 mt-8 mb-3 tracking-tight border-b border-slate-100 pb-1">
                {trimmed.substring(3)}
              </h3>
            );
          }
          if (trimmed.startsWith("# ")) {
            return (
              <h2 key={idx} className="text-2xl font-black text-slate-900 mt-10 mb-4 tracking-tight">
                {trimmed.substring(2)}
              </h2>
            );
          }

          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            const content = trimmed.substring(2);
            return (
              <div key={idx} className="flex items-start gap-3 pl-2 my-1">
                <span className="text-indigo-500 mt-2 shrink-0 select-none text-xs">●</span>
                <p className="m-0 text-slate-700">{replaceBoldTags(content)}</p>
              </div>
            );
          }

          return (
            <p key={idx} className="text-slate-700 leading-relaxed">
              {replaceBoldTags(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  const replaceBoldTags = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-semibold text-slate-950 bg-indigo-50 px-1 rounded">{part}</strong>;
      }
      return part;
    });
  };

  // Dynamic user data computations for Student Dashboard
  const myScores = scoresHistory.filter(s => s.userId === user?.uid);
  const totalMyQuizzes = myScores.length;
  const accumulatedMyPoints = myScores.reduce((sum, item) => sum + item.score, 0);
  const studentLevel = accumulatedMyPoints > 60 ? "Gold Scholar" : accumulatedMyPoints > 25 ? "Silver Apprentice" : "Bronze Initiant";

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans select-none antialiased">
      
      {/* Premium Elegant Navbar */}
      <header id="app-header" className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-xl text-white shadow-sm shadow-indigo-200">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl tracking-tight text-slate-900 flex items-center gap-1.5">
              Adaptive EdTech <span className="text-indigo-600 font-medium text-xs px-2 py-0.5 bg-indigo-50 rounded-full border border-indigo-100/60">Core AI Engine</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Visual Analogies &bull; Analytical Superpositions &bull; Scaffolded Diagnostics</p>
          </div>
        </div>

        {/* Auth status & controls bar */}
        <div className="flex flex-wrap items-center gap-3">
          
          {userProfile ? (
            <div className="flex items-center gap-3 bg-slate-50 p-1.5 pr-3 rounded-full border border-slate-200/60">
              
              {/* Profile details */}
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-full text-white ${
                  userProfile.role === "admin" ? "bg-rose-500" : userProfile.role === "teacher" ? "bg-amber-500" : "bg-indigo-500"
                }`}>
                  {userProfile.role === "admin" ? <Shield className="w-3.5 h-3.5" /> : userProfile.role === "teacher" ? <UserIcon className="w-3.5 h-3.5" /> : <GraduationCap className="w-3.5 h-3.5" />}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800 leading-none">{userProfile.name}</p>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{userProfile.role}</span>
                </div>
              </div>

              {/* View Switches */}
              <span className="h-5 w-px bg-slate-200" />

              <button
                onClick={() => setViewMode(viewMode === "study" ? "dashboard" : "study")}
                className="text-xs font-bold px-3 py-1.5 bg-white border border-slate-200 rounded-full hover:bg-slate-50 text-slate-700 flex items-center gap-1 transition shadow-sm cursor-pointer"
              >
                {viewMode === "study" ? (
                  <>
                    <Award className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                    My Dashboard
                  </>
                ) : (
                  <>
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    Study Workstation
                  </>
                )}
              </button>

              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>

            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 mr-2 hidden md:inline">
                🔒 Log in to save module history
              </span>
              <button
                onClick={() => { setAuthMode("login"); setAuthError(null); }}
                className="text-xs font-bold px-3 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
              <button
                onClick={() => { setAuthMode("signup"); setAuthError(null); }}
                className="text-xs font-bold px-3.5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-100 hover:shadow-indigo-200 transition flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Sign Up
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Auth Modals */}
      <AnimatePresence>
        {authMode !== "none" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-2xl overflow-hidden p-6 relative space-y-4"
            >
              {/* Close Button */}
              <button
                onClick={() => setAuthMode("none")}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>

              <div className="text-center space-y-1">
                <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-xl mb-1">
                  <UserIcon className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-lg text-slate-900">
                  {authMode === "login" ? "Welcome Back to Adaptive EdTech" : "Register New Account"}
                </h3>
                <p className="text-xs text-slate-500">
                  {authMode === "login" ? "Log in to track your scorecards and save custom concepts." : "Choose your role and register to begin creating learning modules."}
                </p>
              </div>

              {authError && (
                <div className="p-4 bg-rose-50 border border-rose-100 text-rose-900 rounded-xl text-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span className="font-bold text-rose-800">Authentication Alert</span>
                  </div>
                  
                  {authError.includes("operation-not-allowed") ? (
                    <div className="space-y-2 text-slate-700">
                      <p className="font-semibold text-slate-900">
                        Email & Password authentication is not enabled on this Firebase project yet!
                      </p>
                      <p className="leading-relaxed">
                        To enable Email logins, please follow these simple steps:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] text-slate-600">
                        <li>Open your <a href={`https://console.firebase.google.com/project/${auth.app.options.projectId}/authentication/providers`} target="_blank" rel="noreferrer" className="text-indigo-600 underline font-bold hover:text-indigo-800">Firebase Authentication Console</a></li>
                        <li>Navigate to the <strong>Sign-in method</strong> tab.</li>
                        <li>Click <strong>Add new provider</strong>, select <strong>Email/Password</strong>, check "Enable", and click <strong>Save</strong>.</li>
                      </ol>
                      <div className="pt-2 text-[11px] bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/40">
                        <span className="font-bold text-indigo-700">💡 Instant Bypass:</span> You can sign in immediately using <strong>Google Sign-In</strong> below, which is pre-configured and works out-of-the-box!
                      </div>
                    </div>
                  ) : authError.includes("weak-password") ? (
                    <p className="text-slate-700 leading-relaxed">
                      The password is too weak. Firebase requires passwords to be <strong>at least 6 characters</strong> long. Please choose a stronger password.
                    </p>
                  ) : (
                    <p className="text-slate-700 leading-relaxed">
                      {authError}
                    </p>
                  )}
                </div>
              )}

              <form onSubmit={authMode === "login" ? handleSignIn : handleSignUp} className="space-y-3.5">
                {authMode === "signup" && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Professor Sarah Jenkins"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:bg-white focus:border-indigo-500 outline-none transition"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. sarah@school.edu"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:bg-white focus:border-indigo-500 outline-none transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:bg-white focus:border-indigo-500 outline-none transition"
                  />
                </div>

                {authMode === "signup" && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Account Platform Role</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["student", "teacher", "admin"] as const).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setSelectedRole(role)}
                          className={`py-2 px-1 text-xs font-bold rounded-xl border capitalize transition cursor-pointer ${
                            selectedRole === role 
                              ? "border-indigo-500 bg-indigo-50/50 text-indigo-700" 
                              : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 text-white disabled:text-slate-400 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {authLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : authMode === "login" ? (
                    "Authorize Session"
                  ) : (
                    "Create Secure Account"
                  )}
                </button>
              </form>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">or</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Compass className="w-4 h-4 text-indigo-500 shrink-0" />
                Continue with Google
              </button>

              <div className="text-center pt-2 border-t border-slate-100 text-xs">
                {authMode === "login" ? (
                  <p className="text-slate-500">
                    Need a student or teacher profile?{" "}
                    <button
                      onClick={() => { setAuthMode("signup"); setAuthError(null); }}
                      className="text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      Sign Up here
                    </button>
                  </p>
                ) : (
                  <p className="text-slate-500">
                    Already have an account?{" "}
                    <button
                      onClick={() => { setAuthMode("login"); setAuthError(null); }}
                      className="text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      Log In here
                    </button>
                  </p>
                )}
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Core Workstation */}
      <main id="app-main" className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        
        <AnimatePresence mode="wait">
          
          {/* VIEW MODE 1: Study Workstation */}
          {viewMode === "study" && (
            <motion.div
              key="study-workstation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              
              {/* Left Column - Input Panel & Interactive Controls */}
              <div id="input-pane" className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display font-semibold text-base text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      Configure Module
                    </h2>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      Generator
                    </span>
                  </div>

                  <form onSubmit={handleGenerateModule} className="space-y-4">
                    {/* Topic Input */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 tracking-wide block uppercase">
                        Concept or Topic
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          placeholder="e.g. Schrödinger's Cat, Photoelectric Effect..."
                          className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium placeholder:text-slate-400 outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Context Document Input */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-700 tracking-wide uppercase">
                          Reference Document / Text (Optional)
                        </label>
                        <span className="text-[10px] font-semibold text-slate-400">
                          Max 2000 words
                        </span>
                      </div>
                      <textarea
                        value={documentText}
                        onChange={(e) => setDocumentText(e.target.value)}
                        placeholder="Paste context, textbook paragraphs, articles, or notes here. The engine will adaptively map explanations to this material..."
                        rows={5}
                        className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium placeholder:text-slate-400 outline-none transition resize-none leading-relaxed"
                      />
                    </div>

                    {/* File Upload (Image, Slide, Notes, PDF) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1">
                        <Upload className="w-3.5 h-3.5 text-indigo-500" />
                        Upload Lesson Notes, Slides, or Images (Optional)
                      </label>
                      
                      {!uploadedFileBase64 ? (
                        <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 transition bg-slate-50/50 hover:bg-slate-50/80 flex flex-col items-center justify-center text-center cursor-pointer relative group">
                          <input
                            type="file"
                            accept="image/*,application/pdf,text/plain"
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 transition mb-1.5" />
                          <p className="text-xs font-semibold text-slate-700">
                            Drag & drop or <span className="text-indigo-600 group-hover:underline">browse files</span>
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            PNG, JPG, JPEG, PDF, or TXT up to 10MB
                          </p>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            {uploadedFileMimeType.startsWith("image/") ? (
                              <img
                                src={uploadedFileBase64}
                                alt="Uploaded preview"
                                className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0 border border-indigo-100">
                                <FileText className="w-5 h-5 text-indigo-600" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">
                                {uploadedFileName}
                              </p>
                              <p className="text-[10px] text-slate-500 capitalize">
                                {uploadedFileMimeType.split("/")[1] || "File"}
                              </p>
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={handleClearFile}
                            className="p-1.5 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg transition shrink-0 cursor-pointer"
                            title="Remove file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Submit trigger */}
                    <button
                      type="submit"
                      disabled={isLoading || !topic.trim()}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-medium text-sm py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:scale-[1.01] active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Generating Educational Assets...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Build Adaptive Module
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Quick Presets Deck */}
                <div id="presets" className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4.5 h-4.5 text-indigo-500" />
                    <h3 className="font-display font-semibold text-sm text-slate-900">Explore Interactive Presets</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2.5">
                    {EDUCATIONAL_PRESETS.map((preset, index) => {
                      const isSelected = topic.toLowerCase() === preset.topic.toLowerCase();
                      return (
                        <button
                          key={index}
                          onClick={() => handleSelectPreset(preset)}
                          className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col gap-1 cursor-pointer group ${
                            isSelected 
                              ? "border-indigo-500 bg-indigo-50/40 shadow-sm" 
                              : "border-slate-100 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${isSelected ? "text-indigo-600" : "text-slate-800"}`}>
                              {preset.topic}
                            </span>
                            <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition group-hover:translate-x-0.5 ${isSelected ? "text-indigo-500" : ""}`} />
                          </div>
                          <span className="text-[11px] text-slate-500 leading-normal">
                            {preset.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column - Results Workspace */}
              <div id="content-workspace" className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-sm min-h-[500px] flex flex-col overflow-hidden relative">
                
                <AnimatePresence mode="wait">
                  
                  {/* Blank State */}
                  {!isLoading && !module && !error && (
                    <motion.div
                      key="empty-state"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 flex flex-col items-center justify-center p-8 text-center"
                    >
                      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 mb-4 animate-bounce">
                        <Sparkles className="w-8 h-8" />
                      </div>
                      <h3 className="font-display font-semibold text-lg text-slate-900 mb-2">No Concept Selected</h3>
                      <p className="text-sm text-slate-500 max-w-md leading-relaxed mb-6">
                        Select a preset topic from the left panel, or type a custom topic with optionally pasted background text, and trigger the adaptive EdTech model generation.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                        {["Photosynthesis", "Black Holes", "Newton's Laws", "Quantum Cryptography"].map((term) => (
                          <button
                            key={term}
                            onClick={() => setTopic(term)}
                            className="text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-3 py-1.5 rounded-full transition border border-slate-200/50 hover:border-indigo-100 cursor-pointer"
                          >
                            +{term}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Loading State */}
                  {isLoading && (
                    <motion.div
                      key="loading-state"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-pulse"
                    >
                      <div className="relative w-24 h-24 mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
                        <div className="absolute inset-2 rounded-full border-4 border-slate-100 border-b-violet-500 animate-spin [animation-duration:3s]" />
                        <div className="absolute inset-4 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                          <GraduationCap className="w-8 h-8" />
                        </div>
                      </div>

                      <div className="space-y-2 max-w-md">
                        <h3 className="font-display font-semibold text-lg text-slate-900">Calibrating Adaptive Material</h3>
                        <div className="h-6 overflow-hidden">
                          <AnimatePresence mode="wait">
                            <motion.p
                              key={loadingStepIndex}
                              initial={{ y: 15, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: -15, opacity: 0 }}
                              className="text-sm font-semibold text-indigo-600"
                            >
                              {loadingSteps[loadingStepIndex]}
                            </motion.p>
                          </AnimatePresence>
                        </div>
                        <p className="text-xs text-slate-400">
                          This will take only a few moments. We are structuring deep analytical insights alongside simplified analogical lessons.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Error State */}
                  {error && !isLoading && (
                    <motion.div
                      key="error-state"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto"
                    >
                      <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <h3 className="font-display font-semibold text-base text-slate-900 mb-2">Engine Generation Refused</h3>
                      <p className="text-sm text-slate-500 leading-relaxed mb-6">
                        {error}
                      </p>
                      <button
                        onClick={() => setError(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                      >
                        Dismiss & Edit Topic
                      </button>
                    </motion.div>
                  )}

                  {/* Core Module Display */}
                  {module && !isLoading && (
                    <motion.div
                      key="module-content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 flex flex-col"
                    >
                      {/* Header of Active Module */}
                      <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100/60 px-2 py-0.5 rounded-full">
                              Active Concept Mapping
                            </span>
                            
                            {/* Save to Cloud Button */}
                            {userProfile ? (
                              <button
                                onClick={handleSaveModuleToCloud}
                                disabled={isSavingModule}
                                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border transition flex items-center gap-1 cursor-pointer ${
                                  saveSuccess 
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                                }`}
                              >
                                {isSavingModule ? (
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                ) : saveSuccess ? (
                                  <>
                                    <Check className="w-2.5 h-2.5 text-emerald-500" />
                                    Saved!
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-2.5 h-2.5" />
                                    Save Module
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => { setAuthMode("login"); }}
                                className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 flex items-center gap-1 cursor-pointer"
                              >
                                <Lock className="w-2.5 h-2.5" />
                                Save Profile
                              </button>
                            )}
                          </div>
                          
                          <h3 className="font-display font-bold text-lg text-slate-900 mt-1.5">
                            {topic}
                          </h3>
                        </div>

                        {/* Tabs Selector */}
                        <div className="flex bg-slate-200/60 p-1 rounded-xl flex-wrap gap-1">
                          <button
                            onClick={() => setActiveTab("remedial")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              activeTab === "remedial"
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            <Lightbulb className="w-3.5 h-3.5" />
                            Remedial (5th Grade)
                          </button>
                          <button
                            onClick={() => setActiveTab("advanced")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              activeTab === "advanced"
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            Advanced Deep-Dive
                          </button>
                          <button
                            onClick={() => setActiveTab("quiz")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              activeTab === "quiz"
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            Adaptive Quiz
                          </button>
                          <button
                            onClick={() => setActiveTab("json")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              activeTab === "json"
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            <Terminal className="w-3.5 h-3.5" />
                            Raw JSON
                          </button>
                        </div>
                      </div>

                      {/* Tab Contents Area */}
                      <div className="flex-1 p-6 overflow-y-auto max-h-[550px]">
                        
                        {/* Remedial Tab */}
                        {activeTab === "remedial" && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                          >
                            <div className="bg-gradient-to-r from-amber-50 to-orange-50/40 rounded-2xl p-5 border border-amber-100/50 flex gap-4 items-start">
                              <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-sm">
                                <Lightbulb className="w-5 h-5" />
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-display font-semibold text-sm text-amber-900">Analogical Visual Metaphor</h4>
                                <p className="text-xs text-amber-700 leading-relaxed">
                                  Complex concepts mapped onto physical-world, 5th-grade observations. This builds high-fidelity primary intuition.
                                </p>
                              </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm prose prose-slate">
                              {renderFormattedText(module.remedial_text)}
                            </div>
                          </motion.div>
                        )}

                        {/* Advanced Tab */}
                        {activeTab === "advanced" && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                          >
                            <div className="bg-gradient-to-r from-indigo-50 to-blue-50/40 rounded-2xl p-5 border border-indigo-100/50 flex gap-4 items-start">
                              <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm">
                                <BookOpen className="w-5 h-5" />
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-display font-semibold text-sm text-indigo-900">Advanced Rigor & Mechanics</h4>
                                <p className="text-xs text-indigo-700 leading-relaxed">
                                  Deep-dive analytical study containing complex mechanisms, technical interactions, and professional context.
                                </p>
                              </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                              {renderFormattedText(module.advanced_text)}
                            </div>
                          </motion.div>
                        )}

                        {/* Adaptive Quiz Tab */}
                        {activeTab === "quiz" && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                          >
                            
                            {!quizFinished ? (
                              <div className="space-y-6">
                                {/* Progress indicators */}
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                      Question {quizIndex + 1} of {module.quiz.length}
                                    </span>
                                    <span className="w-1 h-1 bg-slate-300 rounded-full animate-ping"></span>
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                      Score: {quizScore} pts
                                    </span>
                                  </div>
                                  
                                  {/* Visual Progress Bar */}
                                  <div className="w-32 bg-slate-100 h-2 rounded-full overflow-hidden flex">
                                    {module.quiz.map((_, i) => (
                                      <div
                                        key={i}
                                        className={`flex-1 h-full transition-colors border-r border-white last:border-0 ${
                                          i < quizIndex
                                            ? "bg-indigo-500"
                                            : i === quizIndex
                                            ? "bg-indigo-300 animate-pulse"
                                            : "bg-slate-200"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>

                                {/* Active Question Box */}
                                <div className="space-y-4">
                                  <h3 className="font-display font-bold text-base md:text-lg text-slate-955 leading-relaxed text-slate-900">
                                    {module.quiz[quizIndex].question}
                                  </h3>

                                  {/* Options List */}
                                  <div className="grid grid-cols-1 gap-3">
                                    {module.quiz[quizIndex].options.map((option, idx) => {
                                      const isSelected = selectedOption === option;
                                      const isCorrectOpt = option === module.quiz[quizIndex].correct;

                                      let optClass = "border-slate-100 bg-slate-50 hover:bg-slate-100/70 hover:border-slate-200";
                                      if (isSelected) {
                                        if (quizFeedback.submitted) {
                                          optClass = isCorrectOpt 
                                            ? "border-emerald-500 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-100" 
                                            : "border-rose-500 bg-rose-50/50 text-rose-950 ring-2 ring-rose-100";
                                        } else {
                                          optClass = "border-indigo-500 bg-indigo-50/30 text-indigo-950 ring-2 ring-indigo-100";
                                        }
                                      } else if (quizFeedback.submitted && isCorrectOpt) {
                                        optClass = "border-emerald-500 bg-emerald-50/30 text-emerald-950";
                                      }

                                      return (
                                        <button
                                          key={idx}
                                          onClick={() => handleSelectOption(option)}
                                          disabled={quizFeedback.submitted && quizFeedback.isCorrect}
                                          className={`w-full text-left p-4 rounded-xl border text-sm font-medium transition flex items-center justify-between gap-3 ${optClass} ${
                                            quizFeedback.submitted && quizFeedback.isCorrect ? "cursor-not-allowed" : "cursor-pointer"
                                          }`}
                                        >
                                          <span>{option}</span>
                                          {isSelected && quizFeedback.submitted && (
                                            isCorrectOpt ? (
                                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                            ) : (
                                              <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                                            )
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Submit & Control Bar */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                                  <div>
                                    {!quizFeedback.isCorrect && (
                                      <button
                                        onClick={() => setQuizFeedback(p => ({ ...p, showHint: !p.showHint }))}
                                        className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 transition px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                                      >
                                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                                        {quizFeedback.showHint ? "Hide Hint" : "Reveal Hint"}
                                      </button>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2.5">
                                    {!quizFeedback.submitted || !quizFeedback.isCorrect ? (
                                      <button
                                        onClick={handleSubmitAnswer}
                                        disabled={!selectedOption}
                                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 text-white disabled:text-slate-400 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                                      >
                                        Check Answer
                                      </button>
                                    ) : (
                                      <button
                                        onClick={handleNextQuestion}
                                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition flex items-center gap-1.5 cursor-pointer"
                                      >
                                        {quizIndex < module.quiz.length - 1 ? "Next Challenge" : "Complete Diagnostics"}
                                        <ArrowRight className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Clue box */}
                                <AnimatePresence>
                                  {quizFeedback.showHint && !quizFeedback.isCorrect && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="bg-amber-50/50 border border-amber-100/60 rounded-xl p-4 text-xs text-amber-800 flex items-start gap-2.5">
                                        <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                        <div>
                                          <span className="font-bold block mb-0.5">Stuck? Clue:</span>
                                          {module.quiz[quizIndex].hint}
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                {/* Scaffold Coach */}
                                <AnimatePresence>
                                  {quizFeedback.showScaffolding && !quizFeedback.isCorrect && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.98 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.98 }}
                                      className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 text-xs text-slate-700 flex items-start gap-3"
                                    >
                                      <div className="p-1.5 bg-slate-200 text-slate-700 rounded-lg shrink-0 mt-0.5">
                                        <Info className="w-4 h-4" />
                                      </div>
                                      <div className="space-y-1">
                                        <span className="font-bold text-slate-900 block uppercase tracking-wide">
                                          Step-by-Step Scaffold Guide
                                        </span>
                                        <p className="leading-relaxed text-slate-650">
                                          {module.quiz[quizIndex].scaffolded_step}
                                        </p>
                                        <span className="text-[10px] text-slate-400 block pt-1 font-semibold">
                                          Attempt {quizFeedback.attempts} &bull; Adjust your answer above and verify!
                                        </span>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            ) : (
                              /* Scorecard State */
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-8 space-y-6 max-w-md mx-auto"
                              >
                                <div className="inline-flex p-4 bg-indigo-50 text-indigo-600 rounded-3xl relative">
                                  <Trophy className="w-12 h-12 animate-bounce" />
                                  <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-1 border-2 border-white">
                                    <Sparkles className="w-3 h-3" />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h3 className="font-display font-bold text-xl text-slate-900">Module Scorecard</h3>
                                  <p className="text-sm text-slate-500">
                                    Diagnostic sequence complete! Your continuous learning performance has been indexed.
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                  <div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Score Earned</span>
                                    <span className="text-2xl font-black text-indigo-600">{quizScore} <span className="text-xs font-normal text-slate-500">pts</span></span>
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Questions</span>
                                    <span className="text-2xl font-black text-slate-900">3 / 3</span>
                                  </div>
                                </div>

                                <div className="text-left space-y-3">
                                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Challenge Summary</h4>
                                  <div className="space-y-2">
                                    {answersHistory.map((item, index) => (
                                      <div key={index} className="bg-white p-3 rounded-xl border border-slate-100 text-xs flex gap-2.5 items-start">
                                        <div className="mt-0.5 text-emerald-500">
                                          <Check className="w-4 h-4 bg-emerald-50 rounded-full p-0.5 border border-emerald-100" />
                                        </div>
                                        <div className="space-y-0.5">
                                          <span className="font-bold text-slate-900 block leading-tight">Q{index + 1}: {item.question}</span>
                                          <span className="text-slate-500 block">
                                            Solved in <strong className="text-slate-700">{item.attempts} {item.attempts === 1 ? 'attempt' : 'attempts'}</strong>
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="pt-4 flex justify-center gap-3">
                                  <button
                                    onClick={() => resetQuizState(module.quiz)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                                  >
                                    Retake Challenges
                                  </button>
                                  <button
                                    onClick={() => setActiveTab("remedial")}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-indigo-100 cursor-pointer"
                                  >
                                    Review Metaphor
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </motion.div>
                        )}

                        {/* Raw JSON Inspector */}
                        {activeTab === "json" && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                                <Terminal className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                                Strict JSON Schema Payload Output
                              </span>

                              <button
                                onClick={handleCopyJSON}
                                className="text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                              >
                                {copied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy Schema
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-950 overflow-x-auto relative">
                              <pre className="text-xs font-mono text-indigo-200 leading-relaxed max-h-[420px] overflow-y-auto">
                                <code>{jsonString}</code>
                              </pre>
                            </div>
                          </motion.div>
                        )}

                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>

              </div>

            </motion.div>
          )}

          {/* VIEW MODE 2: Custom Dashboard Panel (Changes depend on Role!) */}
          {viewMode === "dashboard" && userProfile && (
            <motion.div
              key="role-dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              
              {/* Dashboard Role Header Banner */}
              <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl shadow-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                {/* Background ambient lighting */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

                <div className="space-y-2 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-white/10 rounded-full border border-white/10 text-indigo-300">
                      🔒 Secured Workspace
                    </span>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                    <span className="text-[10px] font-bold text-slate-400 capitalize">{userProfile.role} Dashboard Mode</span>
                  </div>
                  <h2 className="font-display font-black text-2xl md:text-3xl tracking-tight">
                    Welcome back, {userProfile.name}!
                  </h2>
                  <p className="text-xs text-slate-300 max-w-md">
                    Explore personalized diagnostic records, curate reference libraries, or adjust platform mechanisms in real time.
                  </p>
                </div>

                <div className="flex items-center gap-3 relative z-10 shrink-0">
                  <button
                    onClick={() => setViewMode("study")}
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    Enter Study Station
                  </button>
                </div>
              </div>

              {/* ----------------- DASHBOARD VIEW A: STUDENT ----------------- */}
              {userProfile.role === "student" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* Student Stats overview */}
                  <div className="md:col-span-4 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-6">
                    <h3 className="font-display font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                      <Award className="w-4.5 h-4.5 text-indigo-500" />
                      Academic Milestones
                    </h3>

                    {/* Stats panel list */}
                    <div className="space-y-4">
                      
                      <div className="p-4 bg-slate-50 border border-slate-150/50 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed Quizzes</span>
                          <span className="text-2xl font-black text-slate-900">{totalMyQuizzes}</span>
                        </div>
                        <div className="p-2.5 bg-white border border-slate-200 text-indigo-600 rounded-xl">
                          <ClipboardList className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-150/50 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Accumulated Score</span>
                          <span className="text-2xl font-black text-indigo-600">{accumulatedMyPoints} <span className="text-xs font-normal text-slate-400">pts</span></span>
                        </div>
                        <div className="p-2.5 bg-white border border-slate-200 text-amber-500 rounded-xl">
                          <Trophy className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-150/50 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Scholar Status</span>
                          <span className="text-sm font-bold text-slate-800 block mt-1">{studentLevel}</span>
                        </div>
                        <div className="p-2.5 bg-white border border-slate-200 text-rose-500 rounded-xl">
                          <Award className="w-5 h-5" />
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Student Saved Modules & Scorecard Tables */}
                  <div className="md:col-span-8 space-y-6">
                    
                    {/* Saved learning deck */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                          <BookOpen className="w-4.5 h-4.5 text-indigo-500" />
                          My Saved Learning Library
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded">
                          {savedModules.length} Modules Saved
                        </span>
                      </div>

                      {savedModules.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl space-y-2">
                          <p className="text-xs font-semibold text-slate-500">No saved modules in your personal deck.</p>
                          <p className="text-[11px] text-slate-400">Generate any concept in the Study Station and click 'Save Module' to store it here.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {savedModules.map((item) => (
                            <div key={item.id} className="border border-slate-100 p-4 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 rounded-xl transition flex flex-col justify-between gap-3 group">
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/40 px-2 py-0.5 rounded-full uppercase">
                                  Saved Concept
                                </span>
                                <h4 className="font-display font-bold text-sm text-slate-900 pt-1 group-hover:text-indigo-600 transition">
                                  {item.topic}
                                </h4>
                                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                  {item.documentText || "No context text provided during compilation."}
                                </p>
                              </div>
                              
                              <div className="flex items-center justify-between pt-2 border-t border-slate-200/40">
                                <span className="text-[9px] font-mono text-slate-400">
                                  {new Date(item.createdAt).toLocaleDateString()}
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleDeleteSavedModule(item.id)}
                                    title="Delete from deck"
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleLoadSavedModule(item)}
                                    className="text-xs font-bold px-3 py-1 bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-600 rounded-lg transition cursor-pointer flex items-center gap-1"
                                  >
                                    Open
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Historical Score logs */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                      <h3 className="font-display font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                        <ClipboardList className="w-4.5 h-4.5 text-indigo-500" />
                        My Adaptive Diagnostic History
                      </h3>

                      {myScores.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                          No completed quizzes logged yet. Complete the 3-question sequence to post performance data.
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-slate-100 rounded-xl">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                              <tr>
                                <th className="p-3.5">Topic / Concept</th>
                                <th className="p-3.5">Diagnosis Date</th>
                                <th className="p-3.5">Scored Performance</th>
                                <th className="p-3.5">Performance Tier</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {myScores.map((scoreItem) => {
                                const percentage = (scoreItem.score / scoreItem.maxScore) * 100;
                                let tier = "Novice Mastery";
                                let color = "text-amber-600 bg-amber-50";
                                if (percentage >= 85) {
                                  tier = "Elite Mastery";
                                  color = "text-emerald-600 bg-emerald-50";
                                } else if (percentage >= 50) {
                                  tier = "Developing Mastery";
                                  color = "text-indigo-600 bg-indigo-50";
                                }

                                return (
                                  <tr key={scoreItem.id} className="hover:bg-slate-50/50 transition">
                                    <td className="p-3.5 font-bold text-slate-800">{scoreItem.topic}</td>
                                    <td className="p-3.5 text-slate-400 font-medium">{scoreItem.date}</td>
                                    <td className="p-3.5 text-slate-800 font-mono font-bold">
                                      {scoreItem.score} / {scoreItem.maxScore} <span className="text-[10px] text-slate-400">({Math.round(percentage)}%)</span>
                                    </td>
                                    <td className="p-3.5">
                                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${color}`}>
                                        {tier}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* ----------------- DASHBOARD VIEW B: TEACHER ----------------- */}
              {userProfile.role === "teacher" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* Left: Module Builder overview & analytics tracker */}
                  <div className="md:col-span-8 space-y-6">
                    
                    {/* Curated material list */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                          <ClipboardList className="w-4.5 h-4.5 text-indigo-500" />
                          Curated Class Lesson Modules
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded">
                          {savedModules.length} Modules Published
                        </span>
                      </div>

                      {savedModules.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs">
                          No lessons published yet. Open Study Station, write curriculum topic, generate & save.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {savedModules.map((item) => (
                            <div key={item.id} className="border border-slate-100 p-4 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 rounded-xl transition flex flex-col justify-between gap-3 group">
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100/40 px-2 py-0.5 rounded-full uppercase">
                                    Class Resource
                                  </span>
                                  <span className="text-[9px] font-semibold text-slate-400">Mastery: 85%</span>
                                </div>
                                <h4 className="font-display font-bold text-sm text-slate-900 pt-1 group-hover:text-indigo-600 transition">
                                  {item.topic}
                                </h4>
                                <p className="text-[11px] text-slate-500 line-clamp-2">
                                  {item.documentText || "No background lesson reference context saved."}
                                </p>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-200/40">
                                <span className="text-[9px] font-mono text-slate-400">
                                  {new Date(item.createdAt).toLocaleDateString()}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleDeleteSavedModule(item.id)}
                                    title="Delete published lesson"
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleLoadSavedModule(item)}
                                    className="text-xs font-bold px-3 py-1 bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-600 rounded-lg transition cursor-pointer flex items-center gap-1"
                                  >
                                    Review
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Student Diagnostics Log */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                          <LineChart className="w-4.5 h-4.5 text-indigo-500" />
                          Student Diagnostic Performance Logs
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          Class Tracking
                        </span>
                      </div>

                      {scoresHistory.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          No student diagnostics logged yet. Completed student quizzes will sync directly to this ledger.
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-slate-100 rounded-xl">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                              <tr>
                                <th className="p-3.5">Student Name</th>
                                <th className="p-3.5">Topic Tested</th>
                                <th className="p-3.5">Performance Score</th>
                                <th className="p-3.5">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {scoresHistory.map((scoreItem) => {
                                const percentage = (scoreItem.score / scoreItem.maxScore) * 100;
                                let label = percentage >= 80 ? "Proficient" : percentage >= 50 ? "Satisfactory" : "Attention Needed";
                                let style = percentage >= 80 ? "bg-emerald-50 text-emerald-700" : percentage >= 50 ? "bg-indigo-50 text-indigo-700" : "bg-rose-50 text-rose-700";

                                return (
                                  <tr key={scoreItem.id} className="hover:bg-slate-50/50 transition">
                                    <td className="p-3.5 font-bold text-slate-800">
                                      <div>
                                        <p className="font-bold">{scoreItem.userName || "Student"}</p>
                                        <span className="text-[10px] text-slate-400">{scoreItem.userEmail}</span>
                                      </div>
                                    </td>
                                    <td className="p-3.5 font-semibold text-slate-650">{scoreItem.topic}</td>
                                    <td className="p-3.5 font-mono font-bold">
                                      {scoreItem.score} / {scoreItem.maxScore}
                                    </td>
                                    <td className="p-3.5">
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${style}`}>
                                        {label}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Right: Class engagement mock graph & diagnostic feedback */}
                  <div className="md:col-span-4 space-y-6">
                    
                    {/* Simulated student performance trend */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                      <h3 className="font-display font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                        <Activity className="w-4.5 h-4.5 text-indigo-500 animate-pulse" />
                        Class Mastery Trends
                      </h3>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-500">Doppler Effect Analogies</span>
                            <span className="text-emerald-600">92% Metaphor Mastery</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full w-[92%]" />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-500">Blockchain Cryptography</span>
                            <span className="text-indigo-600">74% Rigor Comprehension</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full w-[74%]" />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-500">Schrödinger's Cat Superposition</span>
                            <span className="text-amber-600">58% Diagnostic Score Average</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full w-[58%]" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Teacher Feedback Dispatcher */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                      <h3 className="font-display font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                        <MessageSquare className="w-4.5 h-4.5 text-indigo-500" />
                        Send Scaffolded Feedback
                      </h3>

                      <form onSubmit={handleSubmitFeedback} className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Target Student</label>
                          <input
                            type="text"
                            required
                            value={feedbackStudent}
                            onChange={(e) => setFeedbackStudent(e.target.value)}
                            placeholder="e.g. Liam Sterling"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-indigo-500 outline-none transition"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Teacher Guidance Note</label>
                          <textarea
                            required
                            value={feedbackMsg}
                            onChange={(e) => setFeedbackMsg(e.target.value)}
                            placeholder="Liam, great job on Doppler Effect 1st attempt. On the advanced mechanics, try reviewing wave superposition frequencies..."
                            rows={3}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-indigo-500 outline-none transition resize-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={feedbackSent}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-indigo-100 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {feedbackSent ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Feedback Sent!
                            </>
                          ) : (
                            "Dispatch Coach Note"
                          )}
                        </button>
                      </form>
                    </div>

                  </div>

                </div>
              )}

              {/* ----------------- DASHBOARD VIEW C: ADMINISTRATOR ----------------- */}
              {userProfile.role === "admin" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* Left: User list and privilege adjustment table */}
                  <div className="md:col-span-8 space-y-6">
                    
                    {/* User catalogue */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                          <Users className="w-4.5 h-4.5 text-rose-500" />
                          Platform User Identity Ledger
                        </h3>
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded">
                          {allUsers.length} Users Catalogued
                        </span>
                      </div>

                      <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                            <tr>
                              <th className="p-3.5">Name / Email</th>
                              <th className="p-3.5">Assigned Platform Privilege</th>
                              <th className="p-3.5">Action Override</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {allUsers.map((profile) => (
                              <tr key={profile.uid} className="hover:bg-slate-50/50 transition">
                                <td className="p-3.5 font-bold text-slate-800">
                                  <div>
                                    <p className="text-slate-900">{profile.name}</p>
                                    <span className="text-[10px] text-slate-400 font-medium font-mono">{profile.email}</span>
                                  </div>
                                </td>
                                <td className="p-3.5 text-slate-500">
                                  <div className="flex items-center gap-1">
                                    {(["student", "teacher", "admin"] as const).map((role) => (
                                      <button
                                        key={role}
                                        onClick={() => handleChangeUserRole(profile.uid, role)}
                                        disabled={profile.uid === user?.uid} // Can't change self
                                        className={`px-2 py-0.5 rounded text-[9px] font-bold capitalize transition border cursor-pointer ${
                                          profile.role === role
                                            ? "bg-slate-900 border-slate-950 text-white"
                                            : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                        }`}
                                      >
                                        {role}
                                      </button>
                                    ))}
                                  </div>
                                </td>
                                <td className="p-3.5 text-center">
                                  {profile.uid !== user?.uid ? (
                                    <button
                                      title="Suspend user credentials"
                                      onClick={async () => {
                                        try {
                                          await deleteDoc(doc(db, "users", profile.uid));
                                          setAllUsers(prev => prev.filter(u => u.uid !== profile.uid));
                                        } catch (err) { console.error(err); }
                                      }}
                                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                      Active Self
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Published system modules list */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                      <h3 className="font-display font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                        <Terminal className="w-4.5 h-4.5 text-slate-700" />
                        Global Published Learning Modules
                      </h3>

                      {savedModules.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          No generated system modules indexed on Cloud.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {savedModules.map((m) => (
                            <div key={m.id} className="p-3.5 bg-slate-50 border border-slate-150/50 rounded-xl flex items-center justify-between text-xs">
                              <div>
                                <h4 className="font-bold text-slate-900">{m.topic}</h4>
                                <span className="text-[10px] text-slate-400 block font-mono">ID: {m.id} &bull; Creator UID: {m.userId}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleDeleteSavedModule(m.id)}
                                  className="p-1.5 bg-white border border-slate-200 rounded-lg hover:text-rose-500 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleLoadSavedModule(m)}
                                  className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-800 font-bold hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                >
                                  Inspect
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Right: Engine Parameters Configuration */}
                  <div className="md:col-span-4 space-y-6">
                    
                    {/* Platform Mechanics Manager */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-5">
                      <h3 className="font-display font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                        <Settings className="w-4.5 h-4.5 text-slate-600 animate-spin [animation-duration:12s]" />
                        Engine Configurations
                      </h3>

                      <div className="space-y-4">
                        
                        {/* Temperature Simulated Slider */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700 uppercase">Model Temperature</span>
                            <span className="font-mono text-indigo-600 font-bold">{tempSimulated}</span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={tempSimulated}
                            onChange={(e) => setTempSimulated(parseFloat(e.target.value))}
                            className="w-full accent-indigo-600"
                          />
                          <p className="text-[10px] text-slate-400">
                            Higher values increase metaphor creativity. Lower values preserve strict textual accuracy.
                          </p>
                        </div>

                        {/* Theme Select */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Active Workspace Palette</label>
                          <select
                            value={selectedTheme}
                            onChange={(e) => setSelectedTheme(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-indigo-500 outline-none transition"
                          >
                            <option value="Indigo-Slate">Indigo Slate (Primary default)</option>
                            <option value="Cosmic-Dark">Cosmic Charcoal theme</option>
                            <option value="Forest-Mint">Eco-Mint Greenery theme</option>
                          </select>
                        </div>

                        {/* Quiz sequence ceiling */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Max Quiz sequence ceiling</label>
                          <div className="flex items-center gap-2">
                            {[3, 5, 10].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setMaxQuizLength(num)}
                                className={`flex-1 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${
                                  maxQuizLength === num
                                    ? "bg-indigo-600 text-white border-indigo-700"
                                    : "bg-slate-50 text-slate-600 border-slate-200"
                                }`}
                              >
                                {num} Qs
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Live telemetry console */}
                    <div className="bg-slate-900 text-slate-400 rounded-2xl p-4 border border-slate-950 space-y-3 shadow-inner">
                      <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 font-mono">
                        <span>Engine Event Dispatcher</span>
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                      </div>
                      <div className="font-mono text-[10px] space-y-1 leading-normal max-h-40 overflow-y-auto">
                        <p className="text-emerald-400">[SYSTEM] Core adaptive engine initialized on port 3000</p>
                        <p className="text-indigo-300">[AUTH] Logged in user profile authenticated successfully</p>
                        <p className="text-slate-500">[FIRESTORE] Synchronizing saved modules database collection</p>
                        <p className="text-slate-500">[GEMINI] Call mapping structure initialized for gemini-3.5-flash</p>
                      </div>
                    </div>

                  </div>

                </div>
              )}

            </motion.div>
          )}

        </AnimatePresence>

      </main>

      <footer className="bg-white border-t border-slate-100 py-6 px-6 text-center text-xs text-slate-400 font-medium">
        Adaptive EdTech AI Engine &bull; Formulated strictly using valid JSON schema configurations.
      </footer>
    </div>
  );
}
