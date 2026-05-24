import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate, useLocation } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  MapPin as LocationIcon,
  Mail as MailIcon,
  Mail as EmailIcon,
  Phone as PhoneIcon,
  ShieldCheck as VerifiedIcon,
  ClipboardList as AssignmentIcon,
  CheckCircle2 as CheckCircleIcon,
  XCircle as CancelIcon,
  X,
  Info as InfoIcon,
  Download,
  Download as DownloadIcon,
  ChevronRight,
  Shield,
  Zap,
  Globe,
  Settings,
  Cpu,
  Fingerprint,
  HardDrive,
  Trash2,
  AlertCircle,
  Menu,
  CheckCircle,
  CircleDot,
  Layout,
  Command,
  ArrowRight,
  Sparkles,
  BarChart3,
  Network,
  Play,
  FileText,
  CreditCard,
  Lock,
  UserPlus,
  Video,
  Search,
  MessageSquare,
  ClipboardCheck,
  FileText as FileTextIcon,
  Building2,
  Wrench,
  Star,
  ShieldCheck,
  ChevronLeft,
  UserCircle,
  Brain,
  Users,
} from "lucide-react";

// Modern SaaS Dashboard Components
import PerformanceView from "./components/PerformanceView";

// --- Shared Components ---
import { Button, Card, Badge, Toast, cn } from "./components/ui/base";
import DashboardLayout from "./layouts/DashboardLayout";
import FleetView from "./components/FleetView";
import MachinesView from "./components/MachinesView";
import MessagesView from "./components/MessagesView";
import HistoryView from "./components/HistoryView";

import ProfileView from "./components/ProfileView";
import SettingsView from "./components/SettingsView";
import { SupportView } from "./components/SupportSettingsView";
import ProducerDashboard from "./components/ProducerDashboard";
import IncomingRequestsView from "./components/IncomingRequestsView";
import MachineDetailView from "./components/MachineDetailView";
import ActiveJobsView from "./components/ActiveJobsView";
import MyRequestsView from "./components/MyRequestsView";
import JobDetailsModal from "./components/JobDetailsModal";
import VideoUploadInput from "./components/VideoUploadInput";
import VideoPlayer from "./components/VideoPlayer";

import { generateInvoicePDF } from "./utils/invoiceGenerator";
import CompleteProfileModal from "./components/modals/CompleteProfileModal";
import PostPaymentRatingModal from "./components/modals/PostPaymentRatingModal";
import { SERVICE_COMPLETION_MESSAGE } from "./utils/serviceRequestStatus";

import api from "./services/api";
import { io } from "socket.io-client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import "./App.css";
import "./producer-styles.css";
import "./signup.css";

import { AI_DIAGNOSIS_MAP, getAIDiagnosis } from "./data/diagnosisData";
import INDIAN_LOCATIONS from "./data/locations";
import { MOCK_MACHINES, MOCK_MESSAGES, simulatedAccounts } from "./data/mockData";
import { faqs, tutorialVideos } from "./data/faqData";
import ReportField from "./components/ui/ReportField";
import PopupModal from "./components/modals/PopupModal";
import ExpertProfileModal from "./components/modals/ExpertProfileModal";
import CheckoutModal from "./components/modals/CheckoutModal";
import AddMachineModal from "./components/modals/AddMachineModal";
import DeleteAccountModal from "./components/modals/DeleteAccountModal";
import DecommissionModal from "./components/modals/DecommissionModal";
import { parseMessageBody } from "./utils/messageUtils";

// Data arrays (MOCK_MACHINES, INDIAN_LOCATIONS, MOCK_MESSAGES) moved to src/data/


// parseMessageBody function moved to src/utils/messageUtils.js

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showReconnecting, setShowReconnecting] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [socket, setSocket] = useState(null);

  // [FIX 1] Only show reconnect banner after 5 seconds of being disconnected
  useEffect(() => {
    let timer;
    if (!socketConnected && authenticated) {
      timer = setTimeout(() => setShowReconnecting(true), 5000);
    } else {
      setShowReconnecting(false);
    }
    return () => clearTimeout(timer);
  }, [socketConnected, authenticated]);

  // Safety net — loading states can never be stuck forever (8s max)
  useEffect(() => {
    const t = setTimeout(() => {
      setMachinesLoading(false);
      setChatsLoading(false);
      setRequestsLoading(false);
      setHistoryLoading(false);
      setAuthChecking(false);
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
      const handleOnline = () => {
          setIsOnline(true);
          if (wasOffline) {
              setWasOffline(false);
              // Auto reload data when back online
              window.location.reload();
          }
      };
      const handleOffline = () => {
          setIsOnline(false);
          setWasOffline(true);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
      };
  }, [wasOffline]);

  const getStoredUser = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch (err) {
      return null;
    }
  }, []);

  const getExpertTermsStorageKey = useCallback((user) => {
    const identifier = user?.id || user?.user_id || user?.email || "expert";
    return `IndEase_expert_terms_accepted_${identifier}`;
  }, []);

  // Instead of auto-logging in from localStorage on startup:
  // Only restore session if token is still valid

  // [NEW] LOGIN FORM STATE
  const [formData, setFormData] = useState({ email: "", password: "" });
  // Dark mode toggle handler
  const handleDarkModeToggle = () => {
    setIsDarkMode((prev) => {
      localStorage.setItem("darkMode", !prev);
      return !prev;
    });
  };
  // --- CORE APPLICATION STATES ---
  const [view, setView] = useState("landing");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedMachineNode, setSelectedMachineNode] = useState(null);
  const [activeRequests, setActiveRequests] = useState([]);
  const [declinedJobIds, setDeclinedJobIds] = useState([]);

  const { scrollY } = useScroll();
  const heroScale = useTransform(scrollY, [0, 300], [1, 0.98]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navigate = useNavigate();
  const location_info = useLocation();

  useEffect(() => {
    if (authChecking) return;
    const path = location_info.pathname;
    // PART 3 — treat token as the source of truth (not just isAuth flag)
    const token = localStorage.getItem("token");
    const isAuth = !!token && localStorage.getItem("isAuth") === "true";

    console.log(
      "[Routing] path:",
      path,
      "isAuth:",
      isAuth,
      "token:",
      !!token,
      "authChecking:",
      authChecking,
    );

    const isLoginPath = path.includes("/login") || path.includes("/signup");

    // PART 3 — If logged in → always show dashboard
    if (isAuth && isLoginPath) {
      setView("dashboard");
      return;
    }

    // PART 3 — If NOT logged in → block dashboard
    if (!isAuth && !isLoginPath && path !== "/") {
      navigate("/consumer/login", { replace: true });
      return;
    }

    if (path === "/") {
      setView(isAuth ? "dashboard" : "landing");
    } else if (path === "/dashboard" || path === "/expert-dashboard") {
      if (isAuth) {
        setView("dashboard");
      } else {
        navigate("/consumer/login", { replace: true });
      }
    } else if (path.startsWith("/expert/")) {
      if (isAuth) {
        setView("dashboard");
        setActiveTab("profile");
      } else {
        navigate("/consumer/login", { replace: true });
      }
    } else if (path === "/consumer/login" && !isAuth) {
      setView("auth");
      setRole("consumer");
      setIsLogin(true);
    } else if (path === "/consumer/signup" && !isAuth) {
      setView("auth");
      setRole("consumer");
      setIsLogin(false);
    } else if (path === "/provider/login" && !isAuth) {
      setView("auth");
      setRole("producer");
      setIsLogin(true);
    } else if (path === "/provider/signup" && !isAuth) {
      navigate("/provider/login", { replace: true });
    }
  }, [location_info, navigate, authChecking]);


  const navigateToAuth = (targetRole, targetIsLogin) => {
    const rolePath = targetRole === "consumer" ? "consumer" : "provider";
    const actionPath = targetIsLogin ? "login" : "signup";
    navigate(`/${rolePath}/${actionPath}`);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  // Popup for booking expert
  const [showBookExpertModal, setShowBookExpertModal] = useState(false);
  // Real-time chart update listener
  useEffect(() => {
    if (!socket) return;
    const handleChartUpdate = async () => {
      try {
        const chartRes = await api.get("/finance/chart-data");
        setChartData(chartRes.data);
      } catch (err) {
        console.error("Failed to update chart data in real time", err);
      }
    };
    socket.on("finance_chart_update", handleChartUpdate);
    return () => socket.off("finance_chart_update", handleChartUpdate);
  }, [socket]);
  const [role, setRole] = useState("consumer"); // State to track Machine Owner vs Repair Expert
  const [isDemo, setIsDemo] = useState(() => localStorage.getItem("isDemo") === "true");
  const [isLogin, setIsLogin] = useState(true);
  // Handler to simulate booking expert (call this where booking happens)
  const handleBookExpert = () => {
    setShowBookExpertModal(true);
    // ...any other booking logic...
  };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false); // For toggling visibility
  const [activeTab, setActiveTab] = useState("fleet"); // Toggle between 'fleet', 'history', 'legacy', 'profile', 'help', 'settings'
  const [searchQuery, setSearchQuery] = useState(""); // Search state for history
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Modal for account deletion confirmation
  const [recoverySent, setRecoverySent] = useState(false);

  // [NEW SIGNUP STATES]
  const [helpSearch, setHelpSearch] = useState(""); // Search state for help section

  const [signupStep, setSignupStep] = useState(1); // 1: Details, 2: OTP, 3: Context
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState(""); // Added Phone Number
  const [confirmPassword, setConfirmPassword] = useState(""); // Added Confirm Password
  const [dob, setDob] = useState("");
  const [location, setLocation] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [taxId, setTaxId] = useState("");
  const [otp, setOtp] = useState("");
  const [extraInfo, setExtraInfo] = useState(""); // Company for Consumer, Skill for Producer
  const [yearsExp, setYearsExp] = useState("");

  // [NEW IDENTITY & PHOTO STATES]
  const [userPhoto, setUserPhoto] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  // Language selection removed as per request
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showNoChangesModal, setShowNoChangesModal] = useState(false);

  // [NEW] TOAST STATE
  const [toast, setToast] = useState(null);

  // [NEW] CHECKOUT MODAL STATES
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutDetails, setCheckoutDetails] = useState(null);
  const [checkoutDesc, setCheckoutDesc] = useState("");

  const [originalData, setOriginalData] = useState({});

  // [NEW NOTIFICATION STATE]
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("origiNode_notifications");
    try {
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [machines, setMachines] = useState(MOCK_MACHINES); // [FIX] Init with mock data

  // [NEW] NOTIFICATION & DROPDOWN STATES
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef(null); // Ref for closing dropdown when clicking outside

  // [NEW] PROFILE EDITING STATE
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const isDemoInit = localStorage.getItem("isDemo") === "true";

    if (isDemoInit) {
      const demoRole = user?.role || "consumer";
      const demo = demoRole === "producer" ? DEMO_USERS.producer : DEMO_USERS.consumer;
      return {
        name: demo.name,
        role: demoRole === "producer" ? "Industrial Automation Specialist" : "Fleet Operator",
        location: demo.location,
        phone: demo.phone,
        email: demo.email,
        id: demoRole === "producer" ? "DEMO-EXP-001" : "DEMO-FLT-001",
        skills: demo.skills || [],
        bankAccountNumber: "",
        ifscCode: "",
        accountHolderName: demo.name,
      };
    }

    return {
      name: user
        ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Expert Technician"
        : "Expert Technician",
      role: user
        ? user.role === "producer" ? "Industrial Automation Specialist" : "Business Owner"
        : "Industrial Specialist",
      location: user?.location || "Not Set",
      phone: user?.phone || "",
      email: user?.email || "",
      id: user?.id || "IND-00000",
      skills: user?.skills || [],
      bankAccountNumber: user?.bank_account_number || "",
      ifscCode: user?.ifsc_code || "",
      accountHolderName: user?.account_holder_name || "",
    };
  });

  // [NEW] FILTER STATE & LOGIC
  const [activeFilter, setActiveFilter] = useState("All");
  const [fleetSearch, setFleetSearch] = useState("");

  const firstInitial = (firstName || "").charAt(0).toUpperCase();
  const lastInitial = (lastName || "").charAt(0).toUpperCase();

  // Filter logic
  // [FIX] Add safety check (machines || []) to prevent crash if state is momentarily null
  const filteredMachines = (machines || []).filter((m) => {
    // 1. Filter by Tab
    let matchesTab = true;
    const score = Number(m?.condition_score ?? 0);
    if (activeFilter === "Operational") matchesTab = score > 50;
    if (activeFilter === "Maintenance") matchesTab = score <= 50;

    // 2. Filter by Search
    const machineName = (m?.name || "").toLowerCase();
    const machineType = (m?.machine_type || "").toLowerCase();
    const search = (fleetSearch || "").toLowerCase();
    const matchesSearch =
      machineName.includes(search) || machineType.includes(search);

    return matchesTab && matchesSearch;
  });

  // Dynamic Stats
  const activeNodesCount = (machines || []).length;
  const criticalIssuesCount = (machines || []).filter(
    (m) => m.condition_score <= 30,
  ).length;
  // Calculate average continuity (health)
  const avgContinuity =
    (machines || []).length > 0
      ? (
          (machines || []).reduce(
            (acc, m) => acc + (m.condition_score || 0),
            0,
          ) / (machines || []).length
        ).toFixed(1)
      : "100.0";

  const [serviceRadius, setServiceRadius] = useState(50);

  // Load Razorpay Script
  // Razorpay script is loaded via index.html — no dynamic injection needed

  // --- REFS ---
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  // Prevents the session-check useEffect from running /auth/me after a fresh login
  // (the login already returned fresh user data — a redundant /auth/me that fails
  //  would incorrectly reset view to 'landing')
  const skipSessionCheckRef = useRef(false);

  // [NEW] SETTINGS PREFERENCES
  // Add dark mode toggle button to settings tab
  // Render this button in your settings UI:
  // <button className="btn btn-primary" onClick={handleDarkModeToggle} style={{margin:'10px'}}>Toggle Dark Mode</button>
  // Start in light mode by default
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem("darkMode") === "true",
  );
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState("Public");
  const [isTicketOpen, setIsTicketOpen] = useState(false);

  // [NEW] Social Account Selector States
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [socialProvider, setSocialProvider] = useState("");
  // simulatedAccounts array moved to src/data/mockData.js


  // [NEW] VIDEO DIAGNOSIS STATES
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [diagnosisStep, setDiagnosisStep] = useState(1); // 1: Upload, 2: AI Scanning, 'ai_result': AI card, 3: Success
  const [aiDiagnosis, setAiDiagnosis] = useState(null);
  const [broadcastInProgress, setBroadcastInProgress] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState(null);

  // [NEW] URGENCY & PREFERRED TIME STATES
  const [urgencyLevel, setUrgencyLevel] = useState('normal');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('anytime');
  const [consumerBudget, setConsumerBudget] = useState('');

  // [NEW] QUOTES MODAL STATES
  const [showQuotesModal, setShowQuotesModal] = useState(false);
  const [quotesForRequest, setQuotesForRequest] = useState([]);
  const [selectedRequestForQuotes, setSelectedRequestForQuotes] = useState(null);

  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [diagnosisResults, setDiagnosisResults] = useState([]);

  // [NEW] VIDEO DIAGNOSIS HANDLERS
  const [nodeToDelete, setNodeToDelete] = useState(null); // State for machine deletion confirmation modal

  // [NEW] PAYMENT STATE
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReviewSuccess, setShowReviewSuccess] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 0, comment: "" });
  const [showPostPaymentRatingModal, setShowPostPaymentRatingModal] =
    useState(false);
  const [postPaymentRatingContext, setPostPaymentRatingContext] =
    useState(null);

  // ── Escrow Confirmation States ─────────────────────────────────────────────
  const [pendingArrivalConfirmation, setPendingArrivalConfirmation] = useState(null);
  // { jobId, expertName }
  const [pendingCompletionConfirmation, setPendingCompletionConfirmation] = useState(null);
  // { jobId, expertName }
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeContext, setDisputeContext] = useState(null);
  // { jobId } — which job the dispute belongs to
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeSuccess, setDisputeSuccess] = useState(false);
  // ──────────────────────────────────────────────────────────────────────────
  const [ratedJobIds, setRatedJobIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("ratedJobIds") || "[]"));
    } catch {
      return new Set();
    }
  });
  const [showPaymentReceived, setShowPaymentReceived] = useState(false);
  const [completedJobId, setCompletedJobId] = useState(null);

  const [showExpertProfileModal, setShowExpertProfileModal] = useState(false);
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);
  const [paidInvoices, setPaidInvoices] = useState(() => {
    try { return JSON.parse(localStorage.getItem('paidInvoices') || '[]'); }
    catch { return []; }
  }); // Track paid invoice amounts/desc to disable button
  const [showExpertTermsModal, setShowExpertTermsModal] = useState(false);
  const [expertTermsChecked, setExpertTermsChecked] = useState(false);
  const [showCompleteProfileModal, setShowCompleteProfileModal] =
    useState(false);
  const [showPayoutSkipConfirm, setShowPayoutSkipConfirm] = useState(false);
  const [bankDetailsErrors, setBankDetailsErrors] = useState({});
  const [bankDetailsForm, setBankDetailsForm] = useState({
    bankAccountNumber: "",
    ifscCode: "",
    accountHolderName: "",
  });

  const [showInvoiceCreator, setShowInvoiceCreator] = useState(false);
  const [showInvoiceSuccess, setShowInvoiceSuccess] = useState(false);
  const [invoiceData, setInvoiceData] = useState({ amount: "", desc: "" });
  const [supportTicket, setSupportTicket] = useState({
    subject: "Machine Diagnosis Error",
    description: "",
  });
  const [myTickets, setMyTickets] = useState([]);
  const [callRequest, setCallRequest] = useState({
    machineId: "",
    preferredTime: "",
  });

  // Popup state for support ticket
  const [showSupportPopup, setShowSupportPopup] = useState(false);
  const [supportPopupMsg, setSupportPopupMsg] = useState("");

  // [NEW] CHAT & MESSAGE STATES
  const [activeChatId, setActiveChatId] = useState(1);
  const [newMessage, setNewMessage] = useState("");
  const [chats, setChats] = useState([
    {
      id: 1,
      name: "Expert Technician",
      avatar: "XT",
      lastMsg: "Please review the invoice...",
      time: "2m ago",
      unread: 1,
      expertId: "exp-001",
    },
    {
      id: 2,
      name: "Hydra-Fix Specialists",
      avatar: "HF",
      lastMsg: "We can schedule a visit...",
      time: "1h ago",
      unread: 0,
      expertId: "exp-002",
    },
  ]);
  const [producerChats, setProducerChats] = useState([
    {
      id: 1,
      name: "Bhuvan B H (Consumer)",
      avatar: "BH",
      lastMsg: "Payment confirmed.",
      time: "1m ago",
      unread: 1,
      expertId: "exp-003",
    },
    {
      id: 2,
      name: "Solaris Power",
      avatar: "SP",
      lastMsg: "Invoice received, thanks.",
      time: "2h ago",
      unread: 0,
      expertId: "exp-004",
    },
  ]);
  const [messages, setMessages] = useState(MOCK_MESSAGES); // [FIX] Init with mock data

  const radarJobsFromConsumer = useMemo(
    () =>
      activeRequests
        .filter((req) => {
          const rs = (req.rawStatus || "").toLowerCase();
          const pending =
            rs === "broadcast" || (!req.rawStatus && req.status === "Pending");
          return pending && !declinedJobIds.includes(req.id);
        })
        .map((req) => ({
          id: req.id,
          priority:
            req.issue && req.issue.toLowerCase().includes("drop")
              ? "critical"
              : "standard",
          client_name: req.consumerName || "Consumer",
          machine_name: req.machine,
          issue_description: req.issue,
          created_at: req.timestamp || Date.now(),
          status: req.rawStatus || req.status,
          video_url: req.video_url || req.videoUrl || req.videoPath || null,
        })),
    [activeRequests, declinedJobIds],
  );

  const [radarJobsRemote, setRadarJobs] = useState([]);

  const radarJobs = useMemo(() => {
    const map = new Map();
    radarJobsRemote.forEach((j) => map.set(j.id, j));
    radarJobsFromConsumer.forEach((j) => map.set(j.id, j));
    return Array.from(map.values());
  }, [radarJobsRemote, radarJobsFromConsumer]);

  // [NEW] DASHBOARD STATS
  const [producerDashStats, setProducerDashStats] = useState({
    earnings: 0,
    completedJobs: 0,
    rating: 5.0,
    points: 0,
    level: "Starter",
    salary: 0,
    recentPointEvents: [],
  });
  const [activeJobs, setActiveJobs] = useState([]);
  const [acceptingJobId, setAcceptingJobId] = useState(null);
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
  const [earningsStats, setEarningsStats] = useState({
    totalRevenue: 0,
    pendingPayout: 0,
    avgTicket: 0,
  });
  const [transactionHistory, setTransactionHistory] = useState(() => {
    const saved = localStorage.getItem("origiNode_ledger");
    return saved ? JSON.parse(saved) : [];
  });
  const [chartData, setChartData] = useState([]);
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [suggestedSlots, setSuggestedSlots] = useState([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [socketReconnecting, setSocketReconnecting] = useState(false);
  const [verifiedExperts, setVerifiedExperts] = useState([]);
  const [expertPresence, setExpertPresence] = useState({});
  const consumerFleetRefreshTimerRef = useRef(null);
  const fetchConsumerFleetSnapshotRef = useRef(null);
  const scheduleConsumerFleetRefreshRef = useRef(() => {});
  const socketWasDisconnectedRef = useRef(false);

  const mapServiceHistoryRow = (r) => {
    const amountValue =
      r.paid_amount || r.amount || r.quoted_cost || r.cost || r.totalAmount || 0;
    const paymentSt = (r.payment_status || r.paymentStatus || "").toLowerCase();
    const serviceSt = (r.status || "").toLowerCase();
    const paid =
      paymentSt === "captured" ||
      paymentSt === "paid" ||
      serviceSt === "completed";
    return {
      id: r.id,
      date: r.created_at || r.date,
      machine: r.machine_name || r.machine || r.machineName || "Machine",
      machine_name: r.machine_name || r.machine || r.machineName || "Machine",
      machineType: r.machine_type || "",
      expert: (r.expert_name || r.other_party || "Expert").trim(),
      expertLevel: r.expert_level || r.level || "Starter",
      expert_level: r.expert_level || r.level || "Starter",
      status: r.status || "active",
      paymentStatus: r.payment_status || r.paymentStatus || "",
      payment_status: r.payment_status || r.paymentStatus || "",
      amount: amountValue,
      cost: amountValue,
      paid_amount: r.paid_amount || null,
      quoted_cost: r.quoted_cost || 0,
      completedAt: r.completed_at,
      issue: r.issue_description || "",
      paid,
    };
  };

  // [NEW] Persist Ledger to localStorage
  useEffect(() => {
    localStorage.setItem(
      "origiNode_ledger",
      JSON.stringify(transactionHistory),
    );
  }, [transactionHistory]);

  // [NEW] FETCH FINANCIAL STATS (consumer fleet tab uses fetchConsumerFleetSnapshot)
  useEffect(() => {
    if (view !== "dashboard" || isDemo) return;
    if (
      activeTab === "earnings" ||
      activeTab === "history" ||
      (activeTab === "fleet" && role !== "consumer")
    ) {
      const fetchFinanceData = async () => {
        try {
          const statsRes = await api.get("/finance/stats");
          setEarningsStats(statsRes.data);

          // FIX 5 — For producers, fetch service history from jobs endpoint
          let historyRes;
          if (role === "producer") {
            historyRes = await api.get("/jobs/service-history");
          } else {
            historyRes = await api.get("/finance/history");
          }
          const rows = Array.isArray(historyRes.data) ? historyRes.data : [];
          const mapped = rows.map(mapServiceHistoryRow);
          setTransactionHistory(mapped);

          const chartRes = await api.get("/finance/chart-data");
          setChartData(chartRes.data);
        } catch (err) {
          console.error("Failed to load financial data", err);
        }
      };

      fetchFinanceData();
    }
  }, [activeTab, view, role, isDemo]);

  // [NEW] FETCH SUPPORT TICKETS
  useEffect(() => {
    if (view !== "dashboard") return;
    if (activeTab === "help" || activeTab === "support") {
      const fetchTickets = async () => {
        try {
          const res = await api.get("/support/tickets");
          setMyTickets(res.data);
        } catch (err) {
          console.error("Failed to fetch support tickets", err);
        }
      };
      fetchTickets();
    }
  }, [activeTab]);

  // [NEW] FETCH EXPERT SCHEDULE
  useEffect(() => {
    if (view !== "dashboard") return;
    if (activeTab === "schedule" && role === "producer") {
      const fetchSchedule = async () => {
        try {
          const res = await api.get("/schedule");
          setWeeklySchedule(res.data);
        } catch (err) {
          console.error("Failed to load schedule", err);
        }
      };
      fetchSchedule();
    }
  }, [activeTab]);

  const handleOptimizeSchedule = async () => {
    // AI intelligent scan and optimization removed from operation schedule
    // You can add your own schedule logic here if needed
  };

  const handleConfirmAISchedule = async () => {
    try {
      // Batch save suggested slots
      for (const slot of suggestedSlots) {
        await api.post("/schedule", slot);
      }
      setWeeklySchedule([...weeklySchedule, ...suggestedSlots]);
      setSuggestedSlots([]);
      alert("AI Suggestions synchronized with your operations log!");
    } catch (err) {
      alert("Failed to synchronize suggestions.");
    }
  };

  // [NEW] FETCH PROFILE DATA
  useEffect(() => {
    if (
      view === "dashboard" &&
      (activeTab === "profile" || activeTab === "settings")
    ) {
      if (isDemo) {
        // In demo mode — always show demo persona, never real DB data
        const demo = role === "producer" ? DEMO_USERS.producer : DEMO_USERS.consumer;
        setProfileData({
          name: demo.name,
          role: role === "producer" ? "Industrial Automation Specialist" : "Fleet Operator",
          location: demo.location,
          phone: demo.phone,
          email: demo.email,
          id: role === "producer" ? "DEMO-EXP-001" : "DEMO-FLT-001",
          skills: demo.skills || [],
          bankAccountNumber: "",
          ifscCode: "",
          accountHolderName: demo.name,
        });
        setFirstName(demo.firstName);
        setLastName(demo.lastName);
        setPhone(demo.phone);
        setExtraInfo(demo.company);
        setLocation(demo.location);
        return;
      }
      const fetchProfile = async () => {
        try {
          const res = await api.get("/profile");
          const p = res.data;
          setProfileData({
            name:
              `${p.first_name || ""} ${p.last_name || ""}`.trim() ||
              "Expert Technician",
            role:
              p.role === "producer"
                ? "Industrial Automation Specialist"
                : "Business Owner",
            location: p.location || "Not Set",
            phone: p.phone || phone,
            email: p.email,
            id: String(p.id || "IND-88219"),
            skills: p.skills || [],
            bankAccountNumber: p.bank_account_number || p.bankAccountNumber || "",
            ifscCode: p.ifsc_code || p.bankIfsc || "",
            accountHolderName: p.bank_account_name || p.account_holder_name || p.bankAccountName || "",
          });
          setBankDetailsForm({
            accountHolderName: p.bank_account_name || p.account_holder_name || p.bankAccountName || "",
            bankAccountNumber: p.bank_account_number || p.bankAccountNumber || "",
            ifscCode: p.ifsc_code || p.bankIfsc || "",
          });
          setFirstName(p.first_name || "");
          setLastName(p.last_name || "");
          setPhone(p.phone || "");
          setDob(p.dob || "");
          setExtraInfo(p.organization || "");
          setLocation(p.location || "");
          if (p.location && p.location.includes(", ")) {
            const [city, state] = p.location.split(", ");
            setSelectedCity(city);
            setSelectedState(state);
          }
          setTaxId(p.tax_id || "");
          setUserPhoto(p.photo_url || null);
          setIsVerified(p.is_verified || false);
          if (p.service_radius) setServiceRadius(p.service_radius);
          setOriginalData(p);
        } catch (err) {
          console.error("Failed to load profile", err);
          // Potential reason: missing table columns in DB, check schema.sql
        }
      };
      fetchProfile();
    }
  }, [activeTab, view, isDemo]);

  const [hasSkippedPayout, setHasSkippedPayout] = useState(false);

  // Mandatory Profile Completion Check
  useEffect(() => {
    if (
      view === "dashboard" &&
      role === "producer" &&
      profileData.email &&
      !hasSkippedPayout &&
      !isDemo
    ) {
      // Check if bank details are missing
      const isMissingBank =
        !profileData.bankAccountNumber || !profileData.ifscCode;
      if (isMissingBank) {
        setShowCompleteProfileModal(true);
        // Pre-fill name if missing in form but present in profile
        if (!bankDetailsForm.accountHolderName) {
          setBankDetailsForm((prev) => ({
            ...prev,
            accountHolderName: `${firstName} ${lastName}`.trim(),
          }));
        }
      }
    }
  }, [
    view,
    role,
    profileData.bankAccountNumber,
    profileData.ifscCode,
    profileData.email,
    firstName,
    lastName,
    hasSkippedPayout,
  ]);

  const handleSaveConsumerProfile = async () => {
    if (isDemo) { setToast({ message: "Profile editing is not available in demo mode.", type: "info" }); return; }
    const hasChanged =
      firstName !== (originalData.first_name || "") ||
      lastName !== (originalData.last_name || "") ||
      phone !== (originalData.phone || "") ||
      dob !== (originalData.dob || "") ||
      extraInfo !== (originalData.organization || "") ||
      location !== (originalData.location || "") ||
      taxId !== (originalData.tax_id || "") ||
      userPhoto !== (originalData.photo_url || null) ||
      profileData.bankAccountNumber !==
        (originalData.bank_account_number || "") ||
      profileData.ifscCode !== (originalData.ifsc_code || "") ||
      profileData.accountHolderName !==
        (originalData.account_holder_name || "");

    if (!hasChanged) {
      setShowNoChangesModal(true);
      setIsEditingProfile(false);
      return;
    }

    try {
      await api.patch("/profile", {
        first_name: firstName,
        last_name: lastName,
        phone,
        dob,
        organization: extraInfo,
        location,
        tax_id: taxId,
        photo_url: userPhoto,
        bank_account_number: profileData.bankAccountNumber,
        ifsc_code: profileData.ifscCode,
        account_holder_name: profileData.accountHolderName,
      });
      setShowSaveSuccessModal(true);
      setIsEditingProfile(false);
      // Update baseline after successful save
      setOriginalData({
        ...originalData,
        first_name: firstName,
        last_name: lastName,
        phone,
        dob,
        organization: extraInfo,
        location,
        tax_id: taxId,
        photo_url: userPhoto,
      });

      // ✅ FIX: Sync localStorage so banner re-checks correctly
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({
        ...storedUser,
        first_name: firstName,
        last_name: lastName,
        phone: phone,
      }));
    } catch (err) {
      alert("Failed to sync profile changes.");
    }
  };

  const handleSaveExpertProfile = async () => {
    if (isEditingProfile) {
      const [fName, ...lNames] = profileData.name.split(" ");
      const hasChanged =
        fName !== (originalData.first_name || "") ||
        lNames.join(" ") !== (originalData.last_name || "") ||
        String(serviceRadius) !== String(originalData.service_radius || "") ||
        profileData.location !== (originalData.location || "") ||
        profileData.phone !== (originalData.phone || "") ||
        JSON.stringify(profileData.skills) !==
          JSON.stringify(originalData.skills || []);

      if (!hasChanged) {
        setShowNoChangesModal(true);
        setIsEditingProfile(false);
        return;
      }

      try {
        const payload = {
          first_name: fName,
          last_name: lNames.join(" "),
          service_radius: serviceRadius,
          skills: profileData.skills,
          location: profileData.location,
          phone: profileData.phone,
        };

        await api.patch("/profile", payload);
        fName && setFirstName(fName);
        lNames.length > 0 && setLastName(lNames.join(" "));
        setPhone(profileData.phone);
        setLocation(profileData.location);
        setIsEditingProfile(false);
        setShowSaveSuccessModal(true);
        setOriginalData({
          ...originalData,
          ...payload,
        });
      } catch (err) {
        console.error("Save failure:", err);
        alert("Failed to synchronize profile.");
      }
    } else {
      setIsEditingProfile(true);
    }
  };

  const handleAddSkill = async (newSkill) => {
    if (newSkill && !profileData.skills.includes(newSkill)) {
      try {
        await api.post("/profile/skills", { skill: newSkill });
        setProfileData({
          ...profileData,
          skills: [...profileData.skills, newSkill],
        });
      } catch (err) {
        alert("Failed to update arsenal.");
      }
    }
  };

  const handleRemoveSkill = async (skillToRemove) => {
    try {
      await api.delete(`/profile/skills/${encodeURIComponent(skillToRemove)}`);
      setProfileData({
        ...profileData,
        skills: profileData.skills.filter((s) => s !== skillToRemove),
      });
    } catch (err) {
      alert("Failed to decommission skill.");
    }
  };

  const handleExportCSV = () => {
    if (transactionHistory.length === 0)
      return alert("No industrial records to export");

    let csvContent = "data:text/csv;charset=utf-8,";
    const header =
      role === "producer"
        ? "Date,Client,Service,Status,Amount"
        : "Date,Machine,Expert,Action,Status";
    csvContent += header + "\n";

    transactionHistory.forEach((tx) => {
      if (role === "producer") {
        csvContent += `${tx.date},${tx.client},${tx.service},${tx.status},${tx.amount}\n`;
      } else {
        // Consumer context (Ledger)
        csvContent += `${tx.date},${tx.machine || tx.client},${tx.expert || tx.service},${tx.action || tx.service},${tx.status}\n`;
      }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileName =
      role === "producer"
        ? `origiNode_earnings_${new Date().toLocaleDateString()}.csv`
        : `origiNode_ledger_${new Date().toLocaleDateString()}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getExpertInitials = () => {
    const parts = (profileData.name || "").split(" ");
    if (parts.length >= 2) return parts[0][0] + parts[1][0];
    return (profileData.name || "X")[0];
  };

  // Placeholder for consolidated handlers removed to avoid duplicates

  // [NEW] PROFILE DASHBOARD DATA
  const trustScore = isVerified ? 98 : 45;
  const totalNodes = 24;

  // Language translation dictionary removed as per request

  // Translation proxy removed as language selection is not available
  useEffect(() => {
    if (view !== "dashboard" || !authenticated || role !== "producer") {
      setShowExpertTermsModal(false);
      setExpertTermsChecked(false);
      return;
    }

    const user = getStoredUser();
    const hasAcceptedTerms =
      user && localStorage.getItem(getExpertTermsStorageKey(user)) === "true";

    setShowExpertTermsModal(!hasAcceptedTerms);
    if (hasAcceptedTerms) {
      setExpertTermsChecked(false);
    }
  }, [authenticated, getExpertTermsStorageKey, getStoredUser, role, view]);

  // [NEW] SESSION & SOCKET INITIALIZATION
  useEffect(() => {
    // Always start from landing page — clear any saved view/tab state
    localStorage.removeItem('lastView');
    localStorage.removeItem('lastTab');
    localStorage.removeItem('activeTab');

    // 1. Check for existing industrial session
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    // PART 2 — treat token as the true source of auth, not just the isAuth flag
    const isAuth = !!token && !!userStr;

    // Auto-repair the isAuth flag if token exists but flag is missing
    if (isAuth && localStorage.getItem("isAuth") !== "true") {
      localStorage.setItem("isAuth", "true");
    }

    if (isAuth) {
      const user = JSON.parse(userStr);

      // If we just performed a fresh login (Google or email), skip the
      // redundant /auth/me re-check — we already have verified user data.
      // A failing /auth/me here would incorrectly wipe the session and
      // send the user back to the landing page.
      if (skipSessionCheckRef.current) {
        skipSessionCheckRef.current = false;
        const resolvedRole = user.role === "admin" ? "consumer" : user.role || "consumer";
        setView("dashboard");
        setRole(resolvedRole);
        setAuthChecking(false);
        // Data fetches will fire via the view/role useEffects below
        return;
      }

      if (token === "demo-token-xyz") {
        setView("dashboard");
        const demoRole = user.role || "consumer";
        setRole(demoRole);
        setAuthenticated(true);
        setAuthChecking(false);
        const demo = demoRole === "producer" ? DEMO_USERS.producer : DEMO_USERS.consumer;
        setFirstName(demo.firstName);
        setLastName(demo.lastName);
        setEmail(demo.email);
        // Demo offline mode — loading states off, no API calls
        setMachinesLoading(false);
        setChatsLoading(false);
        setRequestsLoading(false);
        setHistoryLoading(false);
      } else {
        api
          .get("/auth/me")
          .then((res) => {
            const freshUser = res.data.user || res.data;
            const resolvedRole = freshUser.role === "admin" ? "consumer" : freshUser.role || "consumer";
            setView("dashboard");
            setAuthenticated(true);
            setRole(resolvedRole);
            if (localStorage.getItem("isDemo") === "true") {
              const demo = resolvedRole === "producer" ? DEMO_USERS.producer : DEMO_USERS.consumer;
              setFirstName(demo.firstName);
              setLastName(demo.lastName);
              setEmail(demo.email);
            } else {
              setFirstName(freshUser.first_name || "");
              setLastName(freshUser.last_name || "");
              setEmail(freshUser.email || "");
              setPhone(freshUser.phone || "");

              // Also update localStorage so isProfileComplete() reads correct values
              localStorage.setItem('user', JSON.stringify({
                ...JSON.parse(localStorage.getItem('user') || '{}'),
                first_name: freshUser.first_name || '',
                phone: freshUser.phone || '',
              }));
            }
            fetchNotifications();
            // Data fetches will fire via the view/role useEffects below
          })
          .catch((err) => {
            console.warn("[Auth] Session invalid or expired");
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("isAuth");
            setAuthenticated(false);
            setView("landing");
          })
          .finally(() => {
            setAuthChecking(false);
          });
      }

    } else {
      setAuthenticated(false);
      setAuthChecking(false);
      setView("landing");
    }
  }, [authenticated]);

  // [FIX 1] Socket init — only after token is confirmed, not on every render
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !authenticated) return;
    if (socket && socket.connected) return;

    const newSocket = io(
      import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000',
      {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionDelay: 3000,
        reconnectionAttempts: 5,
        timeout: 10000,
      }
    );

    const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
    if (user?.id) newSocket.emit('identify', user.id);

    newSocket.on('notification', (notif) => {
      setNotifications((prev) => {
        const mapped = {
          id: notif.id || Date.now(),
          title: notif.title || 'Notification',
          message: notif.message || notif.msg || '',
          msg: notif.message || notif.msg || '',
          time: notif.time || 'Just now',
          timestamp: Date.now(),
          read: false,
        };
        const updated = [mapped, ...prev].slice(0, 20);
        localStorage.setItem('origiNode_notifications', JSON.stringify(updated));
        return updated;
      });
    });

    newSocket.on('invoice_received', (data) => {
      handlePayment(`₹${data.amount}`, data.message || 'Expert Service Invoice', data.requestId);
    });

    newSocket.on('status_update', (data) => {
      if (data.status === 'completed') {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            chatId: data.requestId,
            sender: 'system',
            text: '✓ Service request marked as completed. Payment verified.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    });

    newSocket.on('job_completed', (data) => {
      if (role === 'producer') setShowPaymentReceived(true);
      if (data?.requestId) {
        setChats((prev) =>
          prev.map((c) =>
            String(c.id) === String(data.requestId) ? { ...c, status: 'completed' } : c
          )
        );
      }
    });

    newSocket.on('new_signal', (newJob) => {
      setRadarJobs((prev) => {
        if (prev.some((j) => j.id === newJob.id)) return prev;
        return [newJob, ...prev];
      });
      if (newJob._reassigned) {
        setToast({
          message: `🔔 You've been matched to a service request for ${newJob.machine_name || 'a machine'}. Check Incoming Requests!`,
          type: 'success',
        });
      }
    });

    newSocket.on('waitlist_offer', (data) => {
      setToast({ message: `A job you waitlisted is now available: ${data.machine_name}. Check incoming requests!`, type: 'success' });
    });

    // ── Escrow Confirmation Events (consumer-side) ─────────────────────────
    newSocket.on('expert_started_work', (data) => {
      if (role === 'consumer') {
        setPendingArrivalConfirmation({ jobId: data.jobId, expertName: data.expertName });
      }
    });

    newSocket.on('expert_marked_done', (data) => {
      if (role === 'consumer') {
        setPendingCompletionConfirmation({ jobId: data.jobId, expertName: data.expertName });
      }
    });

    newSocket.on('milestone1_released', () => {
      setToast({ message: 'Arrival confirmed. Milestone 1 released to expert.', type: 'success' });
    });

    newSocket.on('milestone2_released', () => {
      setToast({ message: 'Work confirmed complete. Final payment released.', type: 'success' });
    });

    newSocket.on('milestone1_auto_released', () => {
      setToast({ message: 'Milestone 1 was auto-released after 24 hours.', type: 'info' });
    });

    newSocket.on('milestone2_auto_released', () => {
      setToast({ message: 'Final payment was auto-released after 72 hours.', type: 'info' });
    });

    newSocket.on('dispute_raised', () => {
      setToast({ message: 'A dispute has been raised. Escrow is frozen.', type: 'warning' });
    });
    // ──────────────────────────────────────────────────────────────────────

    // ── Escrow Expert Events (producer-side) ─────────────────────────────
    newSocket.on('milestone1_released', (data) => {
      if (role === 'producer') {
        setToast({ message: '💰 Consumer confirmed your arrival! Milestone 1 payment released.', type: 'success' });
        // Enable Mark Work Done by updating the job's milestone1_released flag
        setActiveJobs(prev => prev.map(j =>
          String(j.id) === String(data?.jobId) ? { ...j, milestone1_released: true } : j
        ));
      }
    });

    newSocket.on('milestone2_released', (data) => {
      if (role === 'producer') {
        setToast({ message: '🎉 Job complete! Final payment released to you.', type: 'success' });
        setActiveJobs(prev => prev.map(j =>
          String(j.id) === String(data?.jobId) ? { ...j, milestone2_released: true, status: 'completed' } : j
        ));
      }
    });

    newSocket.on('milestone1_auto_released', (data) => {
      if (role === 'producer') {
        setToast({ message: '⏱️ Milestone 1 auto-released. You can now mark work as done.', type: 'info' });
        setActiveJobs(prev => prev.map(j =>
          String(j.id) === String(data?.jobId) ? { ...j, milestone1_released: true } : j
        ));
      }
    });

    newSocket.on('milestone2_auto_released', (data) => {
      if (role === 'producer') {
        setToast({ message: '⏱️ Final payment auto-released. Job marked complete.', type: 'info' });
        setActiveJobs(prev => prev.map(j =>
          String(j.id) === String(data?.jobId) ? { ...j, milestone2_released: true, status: 'completed' } : j
        ));
      }
    });

    newSocket.on('dispute_raised', (data) => {
      if (role === 'producer') {
        setToast({ message: '⚠️ Consumer raised a dispute. Escrow is frozen. Admin will review.', type: 'warning' });
        setActiveJobs(prev => prev.map(j =>
          String(j.id) === String(data?.jobId) ? { ...j, disputed: true } : j
        ));
      }
    });
    // ─────────────────────────────────────────────────────────────────────

    newSocket.on('disconnect', () => setSocketConnected(false));
    newSocket.on('connect',    () => setSocketConnected(true));

    setSocket(newSocket);
    return () => { newSocket.off(); newSocket.disconnect(); };
  }, [authenticated]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications");
      if (Array.isArray(res.data)) {
        // Map backend to frontend schema
        const mapped = res.data.map((n) => ({
          id: n.id,
          type: n.type || 'info',
          title: n.title || 'Notification',
          message: n.message || n.title || '',
          msg: n.message || n.title || '',
          time: new Date(n.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          timestamp: new Date(n.created_at).getTime(),
          read: n.is_read,
        }));
        setNotifications(mapped);
      }
    } catch (err) {
      console.warn("Notification retrieval offline.");
    }
  };

  // Logic to handle clicking outside notification dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- NOTIFICATION HANDLERS ---
  useEffect(() => {
    localStorage.setItem(
      "origiNode_notifications",
      JSON.stringify(notifications),
    );
  }, [notifications]);

  // ── Escrow Confirmation Handlers ──────────────────────────────────────────────
  const handleConfirmArrival = async (jobId) => {
    try {
      await api.patch(`/jobs/${jobId}/confirm-arrival`);
      setPendingArrivalConfirmation(null);
      setToast({ message: 'Arrival confirmed ✔️ Milestone 1 released to expert.', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Failed to confirm arrival', type: 'error' });
    }
  };

  const handleConfirmCompletion = async (jobId) => {
    try {
      await api.patch(`/jobs/${jobId}/confirm-complete`);
      setPendingCompletionConfirmation(null);
      setToast({ message: 'Work confirmed complete ✔️ Final payment released.', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Failed to confirm completion', type: 'error' });
    }
  };

  const handleRaiseDispute = async () => {
    if (!disputeReason.trim()) {
      setToast({ message: 'Please describe the issue before submitting.', type: 'error' });
      return;
    }
    setDisputeSubmitting(true);
    try {
      await api.patch(`/jobs/${disputeContext?.jobId}/raise-dispute`, { reason: disputeReason.trim() });
      setDisputeSuccess(true);
      setDisputeReason('');
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Failed to raise dispute', type: 'error' });
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const openDisputeForm = (jobId) => {
    // Close whichever confirmation modal is open
    setPendingArrivalConfirmation(null);
    setPendingCompletionConfirmation(null);
    setDisputeContext({ jobId });
    setDisputeReason('');
    setDisputeSuccess(false);
    setShowDisputeForm(true);
  };
  // ──────────────────────────────────────────────────────────────────────────────

  const addNotification = (title, message) => {
    setNotifications((prev) => {
      const newNotif = {
        id: Date.now().toString() + Math.random().toString(),
        title: title || 'Notification',
        message: message || '',
        msg: message || '',
        time: 'Just now',
        timestamp: Date.now(),
        read: false,
      };
      const updated = [newNotif, ...prev].slice(0, 20);
      localStorage.setItem('origiNode_notifications', JSON.stringify(updated));
      return updated;
    });
    setToast({
      message: title ? `${title}: ${message}` : message,
      type: "info",
    });
  };

  useEffect(() => {
    if (authenticated) {
      fetchNotifications();
    }
  }, [authenticated]);

  const handleMarkNotifRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const handleMarkAllNotifsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearNotifs = () => setNotifications([]);



  // faqs array moved to src/data/faqData.js


  // [NEW] HELP & SUPPORT UNLOCK STATES
  const [showCallModal, setShowCallModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);

  // [NEW] REPORT MODAL STATE
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // [NEW] ADD MACHINE STATE
  const [showAddMachineModal, setShowAddMachineModal] = useState(false);
  const [newMachineData, setNewMachineData] = useState({
    name: "",
    oem: "",
    model_year: "",
    machine_type: "",
  });

  // [NEW] COMPLETE PROFILE CHECK
  const isProfileComplete = () => {
    return !!(firstName && firstName.trim() !== '' && phone && phone.trim() !== '');
  };

  const [showProfileIncompleteModal, setShowProfileIncompleteModal] = useState(false);

  // Derived state to avoid stale useEffect desync
  const showCompleteProfileBanner = Boolean(
    view === 'dashboard' && authenticated && !isDemo && role === 'consumer' && activeTab === 'fleet' && !isProfileComplete()
  );

  const handleOpenAddMachine = () => {
    if (!isProfileComplete()) {
        setShowProfileIncompleteModal(true);
        return;
    }
    setShowAddMachineModal(true);
  };

  const handleOpenDiagnosisModal = () => {
    if (!isProfileComplete()) {
        setShowProfileIncompleteModal(true);
        return;
    }
    setShowDiagnosisModal(true);
  };

  const handleSendInvoice = async () => {
    if (!invoiceData.amount || !invoiceData.desc)
      return alert("Please fill details");

    try {
      // 1. Call Backend API to Create Invoice & Update State
      await api.post(`/jobs/${activeChatId}/invoice`, {
        amount: invoiceData.amount,
      });

      // 2. Send Chat Message for Record
      const invoicePayload = JSON.stringify({
        amount: invoiceData.amount,
        desc: invoiceData.desc,
      });
      const formattedMsg = `[INVOICE]:${invoicePayload}`;

      if (socket) {
        const userStr = localStorage.getItem("user");
        const user =
          userStr && userStr !== "undefined" ? JSON.parse(userStr) : { id: 1 };
        socket.emit("send_message", {
          requestId: activeChatId,
          senderId: user.id || user.user_id || 1, // Ensure ID is present
          text: formattedMsg,
        });
      }

      setShowInvoiceSuccess(true);
      setShowInvoiceCreator(false);
      setInvoiceData({ amount: "", desc: "" });
    } catch (err) {
      console.error("Failed to create invoice", err);
      alert(
        "Failed to send invoice. Reason: " +
          (err.response?.data?.message || err.message),
      );
    }
  };

  // tutorialVideos array moved to src/data/faqData.js


  // [NEW DOC LIST]
  const docLibrary = [
    {
      id: 1,
      title: "Hydraulic Press Maintenance Guide",
      type: "PDF",
      size: "2.4 MB",
    },
    {
      id: 2,
      title: "Industrial Wiring Standards 1990",
      type: "PDF",
      size: "8.1 MB",
    },
    { id: 3, title: "Safety Compliances 2025", type: "DOCX", size: "1.2 MB" },
  ];

  // [NEW] GLOBAL DARK MODE EFFECT
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
    // Force update for input placeholders
    const allInputs = document.querySelectorAll("input, textarea, select");
    allInputs.forEach((el) => {
      el.style.color = isDarkMode ? "#f3f4f6" : "";
      el.style.background = isDarkMode ? "#1e293b" : "";
      el.style.borderColor = isDarkMode ? "#334155" : "";
      if (el.placeholder) {
        el.style.setProperty("color", isDarkMode ? "#cbd5e1" : "", "important");
      }
    });
  }, [isDarkMode]);

  // --- PHOTO & CAMERA LOGIC ---
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUserPhoto(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Camera access denied.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const context = canvasRef.current.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, 400, 300);
    setUserPhoto(canvasRef.current.toDataURL("image/png"));
    stopCamera();
  };

  const handleDocVerify = async (e) => {
    if (e.target.files[0]) {
      try {
        await api.patch("/profile/verify");
        alert("Document received. Verifying your industrial identity...");
        // Fast mock for UX
        setTimeout(() => setIsVerified(true), 1500);
      } catch (err) {
        alert("Verification server unavailable. Try again later.");
      }
    }
  };

  // [NEW] VIDEO DIAGNOSIS HANDLERS
  const [activeJobMachine, setActiveJobMachine] = useState(null);
  const [diagnosisDesc, setDiagnosisDesc] = useState("");
  const [faultLocation, setFaultLocation] = useState("");

  const handleVideoSelect = (e) => {
    if (e.target.files[0]) {
      setVideoFile(e.target.files[0]);
    }
  };

  const startDiagnosis = () => {
    if (!videoFile) return alert("Please upload a video first.");
    setDiagnosisStep(2);

    // Simulate AI Analysis
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setAnalysisProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setDiagnosisStep(3);
        setDiagnosisResults([
          {
            id: 901,
            name: "Berlin Industrial Corp",
            type: "Original Successor",
            match: 98,
            avatar: "BI",
          },
          {
            id: 902,
            name: "Hydra-Fix Specialists",
            type: "Verified 3rd Party",
            match: 85,
            avatar: "HF",
          },
        ]);
      }
    }, 400); // 4 seconds total
  };

  // [NEW] FETCH CHAT LIST (MY JOBS)
  useEffect(() => {
    if (activeTab === "messages") {
      fetchConsumerChatsList({ selectFirstIfEmpty: true }).catch((err) =>
        console.error("Failed to load chat list", err),
      );
    }
  }, [activeTab]);



  const handleRequestSpecs = (item) => {
    // Add to local notifications for instant feedback
    const newNotif = {
      id: Date.now(),
      type: "info",
      msg: `Spec-Sheet request logged for ${item.name}. Successor (${item.replacement}) notified.`,
      time: "Just now",
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setShowNotifDropdown(true); // Show the dropdown to confirm the action
  };

  const handleSubmitSupportTicket = async () => {
    if (!supportTicket.description) {
      setSupportPopupMsg(
        "Please provide details in the description before submitting your ticket.",
      );
      setShowSupportPopup(true);
      return;
    }
    try {
      const res = await api.post("/support/tickets", supportTicket);
      setSupportPopupMsg(res.data.message || "Ticket successfully logged!");
      setShowSupportPopup(true);
      setSupportTicket({ ...supportTicket, description: "" });
      const fetchRes = await api.get("/support/tickets");
      setMyTickets(fetchRes.data);
    } catch (err) {
      setSupportPopupMsg("Failed to sync ticket with industrial server.");
      setShowSupportPopup(true);
    }
  };

  const handleScheduleCall = async () => {
    if (!callRequest.machineId || !callRequest.preferredTime)
      return alert("Select machine and time.");
    try {
      // We can reuse the schedule endpoint or create a request.
      // For now, let's just log it as a notification for the system/user feedback.
      // In a real app, this would create a 'consultation' record.
      await api.post("/schedule", {
        day_of_week: new Date(callRequest.preferredTime).toLocaleDateString(
          "en-US",
          { weekday: "short" },
        ),
        start_time: new Date(callRequest.preferredTime).toLocaleTimeString(
          "en-GB",
          { hour: "2-digit", minute: "2-digit" },
        ),
        end_time: "...", // calculate based on duration
        slot_type: "job",
        title: `Consultation: ${machines.find((m) => m.id == callRequest.machineId)?.name || "Machine"}`,
        description: "Machine owner requested a technical call.",
      });
      setShowCallModal(false);
      setShowBookExpertModal(true);
    } catch (err) {
      alert("Scheduling system currently maintenance. Please call support.");
    }
  };

  // [NEW] REAL-TIME CHAT HANDLERS

  // [NEW] FALLBACK MOCK DATA

  // ... (handleDeleteMachines, etc remain same)

  // 1. Fetch Chat History when activeChatId changes
  useEffect(() => {
    const token = localStorage.getItem("token");
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // Skip for mock IDs, unauthenticated, or demo mode (use local state only)
    if (!activeChatId || !token) return;
    if (!uuidRegex.test(String(activeChatId))) return;

    api
      .get(`/chat/${activeChatId}`)
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          const dbMessages = res.data.map((m) => ({
            id: m.id,
            chatId: m.request_id,
            sender: m.role === "consumer" ? "user" : "expert",
            text: m.message_text,
            time: new Date(m.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            ...parseMessageBody(m.message_text),
          }));
          setMessages(dbMessages);
        }
      })
      .catch((err) => {
        // 403 = user not part of this job — silently ignore
        if (err.response?.status !== 403) {
          console.warn("Failed to load chat history:", err.message);
        }
      });

    if (socket) {
      socket.emit("join_job", activeChatId);
    }
  }, [activeChatId, socket, view, isDemo]);

  // 2. Listen for Incoming Messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (role === "consumer" && msg.request_id) {
        setChats((prev) => {
          const idx = prev.findIndex(
            (c) => String(c.id) === String(msg.request_id),
          );
          if (idx === -1) {
            scheduleConsumerFleetRefreshRef.current?.();
            return prev;
          }
          const text = (msg.message_text || "").slice(0, 80);
          const t = new Date(msg.created_at || Date.now()).toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            },
          );
          const row = {
            ...prev[idx],
            lastMsg: text,
            lastMessage: text,
            lastTime: t,
            time: t,
          };
          const next = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
          return [row, ...next];
        });
      }
      // Only add if it belongs to current chat
      // [FIX] Use loose equality for potential string/number mismatch
      if (msg.request_id == activeChatId) {
        setMessages((prev) => {
          // Avoid duplicates if we already have it
          if (prev.some((p) => p.id === msg.id)) return prev;

          const currentUser = localStorage.getItem("user")
            ? JSON.parse(localStorage.getItem("user"))
            : null;
          const isMe = currentUser && msg.sender_id === currentUser.id;

          // Determine sender type for UI styling
          // If I am the consumer, 'user' style is ME. 'expert' style is THEM.
          // If I am the producer, 'expert' style is ME. 'user' style is THEM.

          let uiSender;
          if (role === "consumer") {
            uiSender = isMe ? "user" : "expert";
          } else {
            uiSender = isMe ? "expert" : "user";
          }

          // [FIX] Parse incoming message for type (invoice/text)
          const parsedContent = parseMessageBody(msg.message_text);

          // [NEW] Check for payment confirmation for Producer
          const messageText = msg?.message_text || "";
          if (
            role === "producer" &&
            messageText.includes("processed successfully") &&
            messageText.includes("Payment of")
          ) {
            setShowPaymentReceived(true);
          }

          if (
            role === "producer" &&
            isMe &&
            messageText === SERVICE_COMPLETION_MESSAGE &&
            prev.some(
              (p) =>
                p.sender === "expert" && p.text === SERVICE_COMPLETION_MESSAGE,
            )
          ) {
            return prev;
          }

          const baseMsg = {
            id: msg.id,
            chatId: msg.request_id,
            sender: uiSender,
            text: msg.message_text,
            time: new Date(msg.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            ...parsedContent,
          };

          const next = [...prev, baseMsg];

          if (
            role === "consumer" &&
            messageText === SERVICE_COMPLETION_MESSAGE &&
            !prev.some(
              (p) =>
                p.type === "rating_prompt" &&
                String(p.chatId) === String(msg.request_id),
            )
          ) {
            next.push({
              id: `rating-${msg.id}`,
              type: "rating_prompt",
              chatId: msg.request_id,
              sender: "system",
              text: "",
              time: new Date(msg.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            });
          }

          return next;
        });
      }
    };

    socket.on("new_message", handleNewMessage);

    return () => socket.off("new_message", handleNewMessage);
  }, [socket, activeChatId, role]);

  // [NEW] Notification Socket Listeners
  useEffect(() => {
    if (!socket) return;

    const onExpertAccepted = () =>
      addNotification(
        "Service Update",
        "Expert has accepted your service request.",
      );

    const onNewMessage = (data) => {
      const userStr = localStorage.getItem("user");
      const user =
        userStr && userStr !== "undefined" ? JSON.parse(userStr) : null;
      if (user && data.senderId === user.id) return;
      const fromName =
        data.senderName || (role === "consumer" ? "Expert" : "Consumer");

      // Sanitize message preview — don't show raw JSON payloads
      let preview = data.text || data.message || '';
      if (preview.startsWith('[INVOICE]:')) {
        preview = 'Sent you an invoice';
      } else if (preview.startsWith('[QUOTE]:')) {
        preview = 'Sent you a repair quote';
      } else if (preview.startsWith('{') || preview.startsWith('[')) {
        preview = 'Sent you a message';
      } else {
        preview = preview.substring(0, 50);
      }

      addNotification('New Message', `${fromName}: ${preview}`);
    };

    const onPaymentSuccess = (data) =>
      addNotification(
        "Payment Successful",
        `Payment of ₹${data.amount || "amount"} was successful.`,
      );
    const onPaymentReceived = (data) =>
      addNotification(
        "Payment Received",
        `Payment of ₹${data.amount || "amount"} received from Consumer.`,
      );
    const onServiceCompleted = () =>
      addNotification(
        "Service Complete",
        "Your service has been marked as completed.",
      );
    const onNewServiceRequest = (data) =>
      addNotification(
        "New Request",
        `New service request from Consumer for ${data.machineName || "machine"}.`,
      );

    socket.on("expert_accepted", onExpertAccepted);
    socket.on("new_message", onNewMessage);
    socket.on("payment_success", onPaymentSuccess);
    socket.on("payment_received", onPaymentReceived);
    socket.on("service_completed", onServiceCompleted);
    socket.on("new_service_request", onNewServiceRequest);

    return () => {
      socket.off("expert_accepted", onExpertAccepted);
      socket.off("new_message", onNewMessage);
      socket.off("payment_success", onPaymentSuccess);
      socket.off("payment_received", onPaymentReceived);
      socket.off("service_completed", onServiceCompleted);
      socket.off("new_service_request", onNewServiceRequest);
    };
  }, [socket, role]);

  // 3. Send Message Handler
  const DEMO_AUTO_REPLIES = [
    "Thank you for the update! Please let me know when you have diagnosed the issue.",
    "Okay, I understand. How long do you think the repair will take?",
    "Great, please proceed. I am available if you need anything.",
    "Thank you for keeping me updated!",
    "Understood. Please keep me posted on the progress.",
  ];

  const handleSendMessage = (text) => {
    const msgToSubmit = text || newMessage;
    if (!msgToSubmit.trim()) return;

    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user) return;

    const newMsgObj = {
      id: Date.now(),
      chatId: activeChatId,
      sender: role === "consumer" ? "user" : "expert",
      text: msgToSubmit,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsgObj]);

    // Demo mode — auto-reply from the other party after 2s
    if (isDemo) {
      setTimeout(() => {
        const replyText = DEMO_AUTO_REPLIES[Math.floor(Math.random() * DEMO_AUTO_REPLIES.length)];
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            chatId: activeChatId,
            sender: role === "consumer" ? "expert" : "user",
            text: replyText,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }, 2000);
    } else if (socket) {
      socket.emit("send_message", {
        requestId: activeChatId,
        senderId: user.id,
        text: msgToSubmit,
      });
    }

    setNewMessage("");
  };

  // FIX 3 — Handle appointment action (Accept/Decline/Reschedule)
  const handleAppointmentAction = async (originalMsg, action, prefillCallback) => {
    // Parse original appointment data
    const msgText = typeof originalMsg === 'string'
      ? originalMsg
      : (originalMsg.text || originalMsg.message || '');
    
    if (!msgText.startsWith('[APPOINTMENT]:')) return;
    
    try {
      const data = JSON.parse(msgText.replace('[APPOINTMENT]:', ''));
      
      // Update the appointment status
      const updatedData = { ...data, status: action };
      const updatedText = `[APPOINTMENT]:${JSON.stringify(updatedData)}`;
      
      // Send a new message with updated status
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (socket) {
        socket.emit('send_message', {
          requestId: activeChatId,
          senderId: user.id,
          senderName: user.first_name || 'User',
          text: updatedText,
        });
      }
      
      // Send notification to other party
      const actionLabel = action === 'accepted'
        ? 'accepted your appointment'
        : action === 'declined'
          ? 'declined your appointment'
          : 'requested to reschedule';
      
      addNotification(
        'Appointment Update',
        `${user.first_name || 'User'} ${actionLabel} for ${data.date} at ${data.time}`
      );
      
      // If reschedule — call prefill callback to open form with data
      if (action === 'rescheduled' && prefillCallback) {
        prefillCallback({
          date: data.date,
          time: data.time,
          type: data.type,
          note: 'Rescheduled — please pick a new time'
        });
      }
      
    } catch (err) {
      console.error('Failed to handle appointment action:', err);
    }
  };

  // [ADDED] Demo Data for Service History -> [MODIFIED] Now State
  const [historyData, setHistoryData] = useState([
    {
      id: 1,
      date: "Jan 12, 2026",
      machine: "Hydraulic Press #08",
      expert: "Expert #XP-992",
      action: "Valve Replacement",
      cost: "₹45000.00",
      status: "verified",
    },
    {
      id: 2,
      date: "Dec 05, 2025",
      machine: "Industrial Loom #22",
      expert: "Expert #XP-401",
      action: "Legacy Sync Calibration",
      cost: "₹120000.00",
      status: "verified",
    },
    {
      id: 3,
      date: "Nov 22, 2025",
      machine: "Motor Drive #A1",
      expert: "In-House",
      action: "Routine Lubrication",
      cost: "₹5000.00",
      status: "pending",
    },
    {
      id: 4,
      date: "Oct 15, 2025",
      machine: "Hydraulic Press #08",
      expert: "Expert #XP-992",
      action: "Pressure Sensor Check",
      cost: "₹12000.00",
      status: "verified",
    },
  ]);

  // [MODIFIED] Helper to get filtered history
  const filteredHistory = [
    ...(Array.isArray(transactionHistory)
      ? transactionHistory.map((th) => ({
          id: th.id,
          date: th.created_at
            ? new Date(th.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
              })
            : new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
              }),
          machine: th.machine_name || "Industrial System",
          expert: th.other_party || "Verified Expert",
          action: "Service Transaction",
          cost: `₹${th.amount}`,
          status: th.status === "paid" ? "verified" : "pending",
        }))
      : []),
    ...historyData,
  ].filter(
    (item) =>
      item.machine.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.expert.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.action.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // [REMOVED] Legacy mock payment logic replaced by premium Razorpay flow

  // [NEW] SUBMIT REVIEW HANDLER (legacy / other flows)
  const handleSubmitReview = async () => {
    if (!completedJobId) return;

    setShowReviewModal(false);
    setShowReviewSuccess(true);

    try {
      await api.post("/reviews", {
        requestId: completedJobId,
        rating: reviewData.rating || 5,
        comment: reviewData.comment,
      });
      setReviewData({ rating: 0, comment: "" });
      setCompletedJobId(null);
    } catch (err) {
      console.error("Failed to submit review", err);
    }
  };

  const handlePostPaymentRatingSubmit = async () => {
    const ctx = postPaymentRatingContext;
    if (!ctx?.requestId || reviewData.rating < 1 || reviewData.rating > 5)
      return;
    try {
      await api.post("/reviews", {
        requestId: ctx.requestId,
        rating: reviewData.rating,
        comment: (reviewData.comment || "").trim(),
      });
      // Persist rated job so modal never shows again for this job
      const updatedRated = new Set(ratedJobIds);
      updatedRated.add(String(ctx.requestId));
      setRatedJobIds(updatedRated);
      localStorage.setItem("ratedJobIds", JSON.stringify([...updatedRated]));

      setToast({ message: "Thank you for your feedback!", type: "success" });
      setShowPostPaymentRatingModal(false);
      setPostPaymentRatingContext(null);
      setReviewData({ rating: 0, comment: "" });

      // Refresh expert's rating stat on their dashboard
      if (role === "producer") {
        try {
          await fetchProducerDashboardStats();
        } catch (_) {}
      }
    } catch (err) {
      console.error("Review submission failed", err);
      setToast({
        message:
          err.response?.data?.message ||
          "Could not save your rating. Please try again.",
        type: "error",
      });
    }
  };

  const handlePostPaymentRatingSkip = () => {
    // Mark as rated so modal doesn't reappear for this job
    if (postPaymentRatingContext?.requestId) {
      const updatedRated = new Set(ratedJobIds);
      updatedRated.add(String(postPaymentRatingContext.requestId));
      setRatedJobIds(updatedRated);
      localStorage.setItem("ratedJobIds", JSON.stringify([...updatedRated]));
    }
    setShowPostPaymentRatingModal(false);
    setPostPaymentRatingContext(null);
    setReviewData({ rating: 0, comment: "" });
  };

  // Validation Logic based on your requirements
  const validate = () => {
    let tempErrors = {};
    if (!email.includes("@")) {
      tempErrors.email = "Invalid email format (missing @).";
    }

    if (view !== "forgot") {
      if (!isLogin) {
        // Simple password validation for Sign Up (to avoid blocking legitimate users during demo)
        if (!password || password.length < 6) {
          tempErrors.password = "Password must be at least 6 characters.";
        }
      } else {
        // Simple validation for Login
        if (!password) {
          tempErrors.password = "Password is required.";
        }
      }
    }

    if (!isLogin && signupStep === 1) {
      if (!firstName) tempErrors.firstName = "Full name required.";
    }

    const errorKeys = Object.keys(tempErrors);
    if (errorKeys.length > 0) {
      tempErrors.server = tempErrors[errorKeys[0]]; // Display the first validation error
    }

    setErrors(tempErrors);
    return errorKeys.length === 0;
  };

  // [NEW] REPORT DOWNLOAD LOGIC
  const handleDownloadReport = (record) => {
    const reportToDownload = record || selectedReport;
    if (!reportToDownload) return;

    generateInvoicePDF(reportToDownload);
  };

  const handleDemoLogin = async () => {
    try {
      const res = await api.post('/demo/login', { role });
      const { token, user } = res.data;
      const demo = user.role === 'producer' ? DEMO_USERS.producer : DEMO_USERS.consumer;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('isAuth', 'true');
      localStorage.setItem('isDemo', 'true');
      setIsDemo(true);
      setAuthenticated(true);
      setFirstName(demo.firstName);
      setLastName(demo.lastName);
      setEmail(demo.email);
      setRole(user.role);
      setProfileData({
        name: demo.name,
        role: user.role === 'producer' ? 'Industrial Automation Specialist' : 'Fleet Operator',
        location: demo.location,
        phone: demo.phone,
        email: demo.email,
        id: user.id,
        skills: demo.skills || [],
        bankAccountNumber: '',
        ifscCode: '',
        accountHolderName: demo.name,
      });

      setActiveTab(user.role === 'consumer' ? 'fleet' : 'requests');
      setView('dashboard');
      setToast({ message: 'Welcome to Demo Mode — explore the full platform safely', type: 'info' });
      // useEffects watching [view, authenticated, role] will trigger real data fetches automatically
    } catch (err) {
      console.error('Demo login failed — backend unavailable:', err);
      setToast({ message: 'Demo backend unavailable. Please try again.', type: 'error' });
      setIsDemo(false);
      setAuthenticated(false);
      localStorage.removeItem('token');
      localStorage.removeItem('isDemo');
    }
  };

  const handleLogin = async () => {
    setErrors({});

    if (view === "forgot") {
      if (!email) {
        setErrors({ server: "Email is required." });
        return;
      }
      try {
        await api.post("/auth/forgot-password", { email });
        setRecoverySent(true);
      } catch (err) {
        setErrors({
          server:
            err.response?.data?.message || "Failed to send recovery email.",
        });
      }
      return;
    }
    if (!isLogin) {
      if (!validate()) return;
      try {
        const res = await api.post("/auth/register", {
          email,
          password,
          role,
          firstName,
          lastName,
          phone,
          dob,
          organization: extraInfo,
          years_exp: yearsExp,
        });

        if (res.data?.token) {
          localStorage.setItem("token", res.data.token);
          localStorage.setItem("isAuth", "true");
          setAuthenticated(true);
          if (res.data.user) {
            localStorage.setItem("user", JSON.stringify(res.data.user));
            setRole(res.data.user.role || "consumer");
            setActiveTab(
              res.data.user.role === "consumer" ? "fleet" : "requests",
            );
          }
          setView("dashboard");
        } else {
          setErrors({ server: "Invalid signup response." });
        }
      } catch (err) {
        setErrors({
          server: err.response?.data?.message || "Signup failed.",
        });
      }
      return;
    }

    // Basic validation for Login
    if (!email || !password) {
      setErrors({ server: "Email and password are required." });
      return;
    }

    // [DEMO MODE BYPASS]
    if (email === "demo@originode.com" && password === "password123") {
      const demoUser = {
        id: "demo-123",
        first_name: "Demo",
        last_name: "User",
        email: "demo@originode.com",
        role: role, // Use the currently selected role (consumer/producer)
      };
      localStorage.setItem("token", "demo-token-xyz");
      localStorage.setItem("user", JSON.stringify(demoUser));
      localStorage.setItem("isAuth", "true");
      setAuthenticated(true);
      setFirstName("Demo");
      setLastName("User");
      setRole(role);
      setActiveTab(role === "consumer" ? "fleet" : "requests");
      setView("dashboard");
      setToast({ message: "Welcome to Demo Mode", type: "info" });
      return;
    }

    try {
      const res = await api.post("/auth/login", {
        email: email,
        password: password,
      });

      if (res.data?.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("isAuth", "true");
        setAuthenticated(true);
        if (res.data.user) {
          localStorage.setItem("user", JSON.stringify(res.data.user));
          setRole(res.data.user.role || "consumer");
          setActiveTab(
            res.data.user.role === "consumer" ? "fleet" : "requests",
          );
        }
        setView("dashboard");
      } else {
        setErrors({ server: "Invalid login response." });
      }
    } catch (err) {
      setErrors({
        server: err.response?.data?.message || "Invalid email or password.",
      });
    }
  };

  const handleExpertTermsAccept = () => {
    const user = getStoredUser();
    if (!user) return;

    localStorage.setItem(getExpertTermsStorageKey(user), "true");
    setShowExpertTermsModal(false);
    setExpertTermsChecked(false);
    setToast({ message: "Terms accepted.", type: "success" });
  };

  const handleSaveBankDetails = async () => {
    if (isDemo) { setToast({ message: "Bank details are not available in demo mode.", type: "info" }); return; }
    const errors = {};
    const accountNumberDigits = bankDetailsForm.bankAccountNumber.replace(
      /\s/g,
      "",
    );

    if (!bankDetailsForm.accountHolderName.trim()) {
      errors.accountHolderName = "Account holder name is required";
    }

    if (!accountNumberDigits) {
      errors.bankAccountNumber = "Account number is required";
    } else if (!/^\d{9,18}$/.test(accountNumberDigits)) {
      errors.bankAccountNumber = "Account number must be 9–18 digits";
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!bankDetailsForm.ifscCode) {
      errors.ifscCode = "IFSC code is required";
    } else if (!ifscRegex.test(bankDetailsForm.ifscCode)) {
      errors.ifscCode = "Invalid IFSC code format (e.g., SBIN0001234)";
    }

    if (Object.keys(errors).length > 0) {
      setBankDetailsErrors(errors);
      return;
    }

    setBankDetailsErrors({});
    try {
      await api.put("/profile/update", {
        bank_account_name: bankDetailsForm.accountHolderName,
        bank_account_number: accountNumberDigits,
        ifsc_code: bankDetailsForm.ifscCode,
      });

      setProfileData((prev) => ({
        ...prev,
        bankAccountNumber: accountNumberDigits,
        ifscCode: bankDetailsForm.ifscCode,
        accountHolderName: bankDetailsForm.accountHolderName,
      }));

      // Persist to localStorage so session restore reflects bank details
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({
        ...storedUser,
        bank_account_number: accountNumberDigits,
        ifsc_code: bankDetailsForm.ifscCode,
        account_holder_name: bankDetailsForm.accountHolderName,
      }));

      setShowCompleteProfileModal(false);
      setToast({
        message: "Payout setup complete! Your earnings are ready for transfer.",
        type: "success",
      });
      fetchProducerDashboardStats();
    } catch (err) {
      setBankDetailsErrors({ server: "Server error — please try again" });
      setToast({
        message: "Failed to save bank details. Please try again.",
        type: "error",
      });
    }
  };

  const handleFormatAccountNumber = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 18);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
    setBankDetailsForm({ ...bankDetailsForm, bankAccountNumber: formatted });
    if (bankDetailsErrors.bankAccountNumber) {
      setBankDetailsErrors((prev) => ({ ...prev, bankAccountNumber: "" }));
    }
  };

  const handleIFSCChange = (value) => {
    const upperValue = value.toUpperCase().slice(0, 11);
    setBankDetailsForm({ ...bankDetailsForm, ifscCode: upperValue });
    if (bankDetailsErrors.ifscCode) {
      setBankDetailsErrors((prev) => ({ ...prev, ifscCode: "" }));
    }
  };

  const handleCancelRequest = async (id) => {
    try {
      await api.patch(`/jobs/${id}/cancel`);
      setActiveRequests(prev => prev.filter(req => String(req.id) !== String(id)));
      setToast({ message: "Request cancelled", type: "success" });
    } catch (err) {
      setToast({ message: err.response?.data?.error || "Failed to cancel request", type: "error" });
    }
  };

  const fetchMachines = async () => {
    setMachinesLoading(true);
    try {
      const response = await api.get("/machines");
      if (Array.isArray(response.data)) {
        setMachines(response.data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.warn("[Fleet] Offline mode active.");
      setMachines(MOCK_MACHINES);
    } finally { 
      setMachinesLoading(false); 
      fetchVerifiedExperts();
    }
  };

  const fetchVerifiedExperts = async () => {
    try {
      const res = await api.get('/providers/experts');
      setVerifiedExperts(res.data.map(e => ({
        ...e,
        name: e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Expert'
      })));
    } catch (err) {
      console.error("Failed to load experts:", err);
    }
  };

  const handleAddMachine = async () => {
    if (!newMachineData.name || !newMachineData.machine_type)
      return alert("Name and Type are required");

    // [DEMO MODE BYPASS]
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;

    if (user && user.id === "demo-123") {
      const mockMachine = {
        id: "demo-new-" + Date.now(),
        name: newMachineData.name,
        machine_type: newMachineData.machine_type,
        oem: newMachineData.oem || "Generic OEM",
        model_year: newMachineData.model_year || "2024",
        condition_score: 100,
      };
      setMachines((prev) => {
        const updated = [mockMachine, ...prev];
        patchDemoStore({ machines: updated });
        return updated;
      });
      setShowAddMachineModal(false);
      setNewMachineData({ name: "", oem: "", model_year: "", machine_type: "" });
      return;
    }

    try {
      await api.post("/machines", newMachineData);
      setShowAddMachineModal(false);
      setNewMachineData({
        name: "",
        oem: "",
        model_year: "",
        machine_type: "",
      });
      fetchMachines(); // Refresh the fleet
    } catch (err) {
      console.error(err);
      alert("Failed to register node. Ensure server is running.");
    }
  };

  const handleDeleteMachine = (id, e) => {
    // Prevent event bubbling if triggered from a deeper element (like a menu)
    if (e) e.stopPropagation();
    if (nodeToDelete && nodeToDelete.id === id && !e) {
      confirmNodeDeletion();
      return;
    }
    const machine = machines.find((m) => m.id === id);
    if (machine) {
      setNodeToDelete(machine);
    }
  };

  const confirmNodeDeletion = async () => {
    if (!nodeToDelete) return;
    const id = nodeToDelete.id;

    try {
      // [DEMO CHECK]
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;

      if (user && user.id === "demo-123") {
        setMachines((prev) => prev.filter((m) => m.id !== id));
        setNodeToDelete(null);
        setToast({ message: "Machine removed successfully", type: "success" });
        return;
      }

      await api.delete(`/machines/${id}`);
      // Optimistic update
      setMachines((prev) => prev.filter((m) => m.id !== id));
      setNodeToDelete(null);
      setToast({ message: "Machine removed successfully", type: "success" });
    } catch (err) {
      setToast({
        message: "Unable to delete machine. Please try again.",
        type: "error",
      });
      console.error("Deletion error:", err);
    }
  };

  // [NEW] SERVICE REQUEST BROADCAST HANDLER
  // Step 1 → Step 2 (AI scan) → Step 'ai_result'
  const handleBroadcastJob = async () => {
    const machine = activeJobMachine || (machines?.[0] ?? null);
    if (!machine) return;
    if (!activeJobMachine) setActiveJobMachine(machine);

    setDiagnosisStep(2); // show scanning animation

    if (isDemo) {
        // DEMO: use existing mock — no API call
        const diagnosis = getAIDiagnosis(diagnosisDesc);
        setAiDiagnosis(diagnosis);
        setTimeout(() => setDiagnosisStep('ai_result'), 2500);
        return;
    }

    // REAL: call Gemini API
    try {
        const res = await api.post('/ai/diagnose', {
            machineName: machine.name,
            machineType: machine.type,
            machineYear: machine.year,
            manufacturer: machine.manufacturer,
            issueDescription: diagnosisDesc,
            videoPath: typeof uploadedVideoPath !== 'undefined' ? uploadedVideoPath : null
        });

        if (res.data.success) {
            const d = res.data.diagnosis;
            setAiDiagnosis({
                type: d.likelyFaults?.[0] || d.faultSummary,
                issue: d.urgencyReason || d.faultSummary,
                confidence: d.confidence || 85,
                severity: d.severity,
                likelyFaults: d.likelyFaults,
                requiredExpertise: d.requiredExpertise,
                estimatedRepairTime: d.estimatedRepairTime,
                videoFindings: d.videoFindings,
                faultSummary: d.faultSummary
            });
            setDiagnosisStep('ai_result');
        }
    } catch (err) {
        console.error('Gemini diagnosis failed:', err);
        // Fallback to mock silently — never break for real users
        const diagnosis = getAIDiagnosis(diagnosisDesc);
        setAiDiagnosis(diagnosis);
        setDiagnosisStep('ai_result');
    }
  };

  // Step 'ai_result' → Step 2 (broadcasting) → Step 3 (success)
  // Runs in background — closing the modal does NOT cancel it
  const handleConfirmBroadcast = async () => {
    if (broadcastInProgress) return;
    setBroadcastInProgress(true);
    setDiagnosisStep(2);

    const finalizeRequest = (serverJob) => {
      const newReq = {
        id: serverJob?.id ?? `demo-req-${Date.now()}`,
        machine: activeJobMachine?.name || 'Machine',
        machine_name: activeJobMachine?.name || 'Machine',
        issue: diagnosisDesc || 'Service Request',
        issue_description: diagnosisDesc || 'Service Request',
        rawStatus: serverJob?.status || 'broadcast',
        status: serverJob?.status || 'broadcast',
        expert: 'Scanning for experts...',
        time: 'Just now',
        created_at: new Date().toISOString(),
        ai_type: aiDiagnosis?.type || null,
        ai_issue: aiDiagnosis?.issue || null,
        ai_confidence: aiDiagnosis?.confidence || null,
        video_url: typeof uploadedVideoPath !== 'undefined' ? uploadedVideoPath : null,
      };
      setActiveRequests((prev) => [newReq, ...prev]);
      // Persist in demo store so it survives navigation
      if (isDemo) {
        const stored = loadDemoStore() || {};
        patchDemoStore({ activeRequests: [newReq, ...(stored.activeRequests || [])] });
      }
      setDiagnosisDesc('');
      setFaultLocation('');
      setVideoFile(null);
      setUploadedVideoUrl(null);
      setBroadcastInProgress(false);
    };


    // Detect demo mode — use app-level flag first, then check machine ID
    const isDemoUser = isDemo || (
      activeJobMachine?.id && (
        String(activeJobMachine.id).startsWith('local') ||
        String(activeJobMachine.id).startsWith('demo')
      )
    );

    if (isDemoUser) {
      // Demo: simulate 2s broadcast then succeed — modal close does not cancel
      setTimeout(() => {
        finalizeRequest(null);
        setDiagnosisStep(3);
        setShowDiagnosisModal(true);
      }, 2000);
      return;
    }

    // Real mode: fire API, run in background regardless of modal state
    try {
      const broadcastRes = await api.post('/jobs/broadcast', {
        machineId: activeJobMachine.id,
        issueDescription: diagnosisDesc || 'Routine maintenance check',
        priority: 'high',
        videoUrl: uploadedVideoUrl || null,
        // AI analysis metadata
        aiMachineType: aiDiagnosis?.type || null,
        aiIssueSummary: aiDiagnosis?.issue || null,
        aiConfidence: aiDiagnosis?.confidence || null,
        // Urgency & preference
        urgencyLevel,
        preferredDate: preferredDate || null,
        preferredTimeSlot,
        consumerBudgetHint: consumerBudget || null,
      });
      const serverJob = broadcastRes.data;
      finalizeRequest(serverJob);
      setDiagnosisStep(3);
      setShowDiagnosisModal(true);

      if (!isDemo && serverJob?.id) {
          try {
              const matchRes = await api.post('/ai/match-expert', {
                  jobId: serverJob.id,
                  diagnosis: aiDiagnosis
              });
              if (matchRes.data?.success) {
                  setToast({ message: `Expert matched: ${matchRes.data.match.bestExpertName}`, type: 'success' });
              }
          } catch (err) {
              console.warn('AI expert matching failed — experts notified via broadcast');
          }
      }
    } catch (err) {
      console.error('[Broadcast] Failed:', err);
      setBroadcastInProgress(false);
      setDiagnosisStep(1);
      setShowDiagnosisModal(true);
      setToast({ message: 'Failed to broadcast. Check connection.', type: 'error' });
    }
  };

  // [NEW] QUOTE SYSTEM & PHYSICAL WORKFLOW HANDLERS
  const handleSubmitQuote = async (jobId, quoteData) => {
    try {
      await api.post(`/jobs/${jobId}/quote`, quoteData);
      setToast({ message: '✅ Quote sent! Waiting for consumer approval.', type: 'success' });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to submit quote';
      setToast({ message: msg, type: 'error' });
      throw err;
    }
  };

  const handleViewQuotes = async (requestId) => {
    try {
      const res = await api.get(`/jobs/${requestId}/quotes`);
      setQuotesForRequest(res.data);
      setSelectedRequestForQuotes(requestId);
      setShowQuotesModal(true);
    } catch {
      setToast({ message: 'Failed to load quotes', type: 'error' });
    }
  };

  const handleApproveQuote = async (quoteId) => {
    try {
      const quote = quotesForRequest.find(q => q.id === quoteId);
      await api.post(`/jobs/${selectedRequestForQuotes}/quotes/${quoteId}/approve`);
      setShowQuotesModal(false);
      setToast({ message: '✅ Expert confirmed! Proceeding to payment...', type: 'success' });
      await fetchConsumerChatsList();
      await fetchConsumerActiveRequests();
      if (quote?.amount) handlePayment(`${quote.amount}`, 'Expert Service Payment', selectedRequestForQuotes);
    } catch {
      setToast({ message: 'Failed to approve quote', type: 'error' });
    }
  };

  const fetchActiveJobs = async () => {
    try {
      const res = await api.get('/jobs/my');
      const myJobs = res.data || [];
      const activeFromDB = myJobs
        .filter(j => ['accepted', 'in_progress', 'started', 'quote_approved', 'en_route', 'payment_pending', 'pending_confirmation', 'work_started', 'work_done'].includes(j.status))
        .map(j => ({
          id: j.id,
          machine_name: j.machine_name,
          issue_description: j.issue_description,
          client_name: j.other_party,
          status: j.status,
          rawStatus: j.status,
          progressStage: ['in_progress', 'started', 'work_started', 'work_done'].includes(j.status) ? 'in_progress'
            : j.status === 'en_route' ? 'en_route'
            : 'accepted',
          other_party: j.other_party,
          created_at: j.created_at,
          quoted_cost: j.quoted_cost,
          // ── Escrow tracking fields ──
          milestone1_released: j.milestone1_released || false,
          milestone2_released: j.milestone2_released || false,
          disputed: j.disputed || false,
        }));
      setActiveJobs(activeFromDB);
    } catch (err) {
      console.error('fetchActiveJobs failed:', err);
    }
  };

  const handleMarkArrived = async (jobId) => {
    try {
      await api.patch(`/jobs/${jobId}/arrive`);
      setToast({ message: '📍 Marked as arrived! Start the job when ready.', type: 'success' });
      fetchActiveJobs();
    } catch {
      setToast({ message: 'Failed to mark arrival', type: 'error' });
    }
  };

  const handleConsumerConfirmComplete = async (requestId) => {
    try {
      const res = await api.patch(`/jobs/${requestId}/confirm-complete`);
      setToast({ message: '✅ Payment released! Thank you.', type: 'success' });
      await fetchConsumerChatsList();

      // ✅ Show rating AFTER job is confirmed complete, not after payment
      const ratingJobId = String(requestId);
      if (!ratedJobIds.has(ratingJobId)) {
        // Find expert name from consumer requests or chats
        const jobData = activeRequests.find(r => String(r.id) === ratingJobId)
          || chats.find(c => String(c.id) === ratingJobId);
        const expertName = jobData?.expertName || jobData?.name?.split('—')[0]?.trim() || 'Expert';
        const amountPaid = jobData?.quoted_cost || jobData?.amount || 0;

        setPostPaymentRatingContext({
          requestId,
          expertName,
          amountPaid,
          refId: res?.data?.payment_ref || '',
        });
        setReviewData({ rating: 0, comment: '' });
        setShowPostPaymentRatingModal(true);
      }
    } catch {
      setToast({ message: 'Failed to confirm completion', type: 'error' });
    }
  };

  const handleRaiseFollowUp = async (requestId, description) => {
    try {
      await api.post(`/jobs/${requestId}/follow-up`, { description });
      setToast({ message: 'Follow-up raised. Expert notified.', type: 'success' });
    } catch (err) {
      setToast({ message: err?.response?.data?.message || 'Failed to raise follow-up', type: 'error' });
    }
  };

  const handleMarkJobComplete = async (jobId, completionSummary, partsActuallyUsed) => {
    try {
      await api.patch(`/jobs/${jobId}/complete-work`, { completionSummary, partsActuallyUsed });
      setToast({ message: '✅ Submitted! Waiting for consumer confirmation.', type: 'success' });
      fetchActiveJobs();
    } catch {
      setToast({ message: 'Failed to submit completion', type: 'error' });
    }
  };

  // ── Escrow Expert Handlers ───────────────────────────────────────────────
  const handleMarkStarted = async (jobId) => {
    try {
      await api.patch(`/jobs/${jobId}/mark-started`);
      setToast({ message: '🚀 Work started! Waiting for consumer to confirm your arrival…', type: 'success' });
      // Optimistically update job status so the button disables immediately
      setActiveJobs(prev => prev.map(j =>
        j.id === jobId ? { ...j, status: 'work_started', rawStatus: 'work_started' } : j
      ));
    } catch (err) {
      setToast({ message: err?.response?.data?.error || 'Failed to mark started', type: 'error' });
    }
  };

  const handleMarkDone = async (jobId) => {
    try {
      await api.patch(`/jobs/${jobId}/mark-done`);
      setToast({ message: '✅ Work marked done! Waiting for consumer to confirm completion…', type: 'success' });
      setActiveJobs(prev => prev.map(j =>
        j.id === jobId ? { ...j, status: 'work_done', rawStatus: 'work_done' } : j
      ));
    } catch (err) {
      setToast({ message: err?.response?.data?.error || 'Failed to mark work done', type: 'error' });
    }
  };
  // ────────────────────────────────────────────────────────────────────────

  // [NEW] LISTEN FOR JOB UPDATES (INVOICES)
  useEffect(() => {
    if (socket && view === "dashboard") {
      const handleStatusUpdate = (data) => {
        console.log("Job Status Update Received:", data);
        if (data.status === "payment_pending" && role === "consumer") {
          // Use the premium handlePayment flow
          handlePayment(
            `₹${data.amount}`,
            data.message || "Expert Service Invoice",
            data.requestId,
          );
        }

        if (data.status === "completed" && role === "producer") {
          setShowPaymentReceived(true);
        }
      };

      // Since the event name is dynamic status_update_${jobId},
      if (activeChatId) {
        socket.on(`status_update_${activeChatId}`, handleStatusUpdate);
        return () =>
          socket.off(`status_update_${activeChatId}`, handleStatusUpdate);
      }
    }
  }, [socket, view, activeChatId, role]);

  const fetchRadarJobs = async () => {
    try {
      const res = await api.get("/jobs/radar");
      setRadarJobs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Radar offline:", err);
      setRadarJobs([]);
    }
  };

  const mapJobRowToConsumerRequest = (job) => ({
    id: job.id,
    machine: job.machine_name || "Machine",
    issue: job.issue_description || "Service request",
    expert:
      job.other_party &&
      String(job.other_party).trim() &&
      job.other_party !== "Scanning..."
        ? job.other_party
        : "Assigning...",
    time: job.created_at
      ? new Date(job.created_at).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Just now",
    rawStatus: job.status,
    consumerName: job.consumer_name,
  });

  const fetchConsumerActiveRequests = async () => {
    setRequestsLoading(true);
    try {
      const res = await api.get("/jobs/my");
      const rows = Array.isArray(res.data) ? res.data : [];
      const active = rows.filter((j) => j.status !== "completed");
      setActiveRequests(active.map(mapJobRowToConsumerRequest));
    } catch (err) {
      console.warn("Consumer active requests fetch failed", err);
    } finally { setRequestsLoading(false); }
  };

  const fetchConsumerChatsList = async (options = {}) => {
    setChatsLoading(true);
    try {
      const res = await api.get("/jobs/my");
      const rows = Array.isArray(res.data) ? res.data : [];
      const myChats = rows.map((job) => {
        const lastMsg =
          (job.issue_description || "Service request created").substring(
            0,
            30,
          ) + "...";
        const t = new Date(job.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        return {
          id: job.id,
          name: `${job.machine_name || "Machine"} (${job.other_party || "User"})`,
          avatar: (job.other_party || "US").substring(0, 2).toUpperCase(),
          lastMsg,
          lastMessage: lastMsg,
          lastTime: t,
          time: new Date(job.created_at).toLocaleDateString(),
          unread: 0,
          other_party_id: job.other_party_id,
          expertId: job.other_party_id || job.expert_id || `exp-${job.id}`,
          status: job.status,
        };
      });
      setChats(myChats);
      if (options.selectFirstIfEmpty && myChats.length > 0) {
        setActiveChatId((prev) => prev || myChats[0].id);
      }
    } catch (err) {
      console.warn("Consumer chat list fetch failed", err);
    } finally {
      setChatsLoading(false);
    }
  };

  const fetchConsumerFleetSnapshot = async () => {
    await fetchMachines();
    await fetchConsumerActiveRequests();
    try {
      const statsRes = await api.get("/finance/stats");
      setEarningsStats(statsRes.data);
      setHistoryLoading(true); const histRes = await api.get("/finance/history");
      const histRows = Array.isArray(histRes.data) ? histRes.data : [];
      setTransactionHistory(histRows.map(mapServiceHistoryRow)); setHistoryLoading(false);
      try {
        const chartRes = await api.get("/finance/chart-data");
        if (chartRes?.data) setChartData(chartRes.data);
      } catch (_) {
        /* chart optional */
      }
    } catch (e) {
      console.warn("Consumer finance snapshot failed", e); setHistoryLoading(false);
    }
    await fetchConsumerChatsList();
  };

  const scheduleConsumerFleetRefresh = () => {
    if (consumerFleetRefreshTimerRef.current) {
      clearTimeout(consumerFleetRefreshTimerRef.current);
    }
    consumerFleetRefreshTimerRef.current = setTimeout(() => {
      consumerFleetRefreshTimerRef.current = null;
      if (typeof fetchConsumerFleetSnapshotRef.current === "function") {
        fetchConsumerFleetSnapshotRef.current();
      }
    }, 80);
  };
  fetchConsumerFleetSnapshotRef.current = fetchConsumerFleetSnapshot;
  scheduleConsumerFleetRefreshRef.current = scheduleConsumerFleetRefresh;

  useEffect(() => {
    if (view !== "dashboard" || role !== "consumer") return;
    fetchConsumerActiveRequests();
  }, [view, role, authenticated]);

  useEffect(() => {
    if (!socket || role !== "consumer" || view !== "dashboard") return;
    const run = () => scheduleConsumerFleetRefreshRef.current?.();
    const evs = [
      "machine_added",
      "machine_deleted",
      "request_created",
      "request_accepted",
      "request_completed",
      "invoice_sent",
      "payment_success",
    ];
    evs.forEach((e) => socket.on(e, run));
    const onExpertOn = (p) => {
      if (p?.userId)
        setExpertPresence((prev) => ({ ...prev, [p.userId]: true }));
    };
    const onExpertOff = (p) => {
      if (p?.userId)
        setExpertPresence((prev) => ({ ...prev, [p.userId]: false }));
    };
    socket.on("expert_online", onExpertOn);
    socket.on("expert_offline", onExpertOff);
    return () => {
      evs.forEach((e) => socket.off(e, run));
      socket.off("expert_online", onExpertOn);
      socket.off("expert_offline", onExpertOff);
    };
  }, [socket, role, view]);

  useEffect(() => {
    if (!socket || role !== "consumer" || view !== "dashboard") return;
    const onReqStatus = (p) => {
      const rid = p?.requestId ?? p?.request_id;
      const st = p?.status;
      if (!rid || !st) return;
      const low = String(st).toLowerCase();
      setActiveRequests((prev) => {
        if (low === "completed") {
          return prev.filter((r) => String(r.id) !== String(rid));
        }
        const has = prev.some((r) => String(r.id) === String(rid));
        if (!has) {
          scheduleConsumerFleetRefreshRef.current?.();
          return prev;
        }
        return prev.map((r) =>
          String(r.id) === String(rid) ? { ...r, rawStatus: st } : r,
        );
      });
      setChats((prev) =>
        prev.map((c) =>
          String(c.id) === String(rid) ? { ...c, status: st } : c,
        ),
      );
      if (low === "in_progress" && role === "consumer") {
        fetchConsumerChatsList().catch(() => {});
      }
    };
    socket.on("request_status_updated", onReqStatus);
    return () => socket.off("request_status_updated", onReqStatus);
  }, [socket, role, view]);

  useEffect(() => {
    if (!socket) return;
    const onDisconnect = () => {
      socketWasDisconnectedRef.current = true;
      setSocketReconnecting(true);
    };
    const onConnect = () => {
      setSocketReconnecting(false);
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (user?.id) socket.emit("identify", user.id);
      } catch (e) {
        /* ignore */
      }
      const shouldReload = socketWasDisconnectedRef.current;
      socketWasDisconnectedRef.current = false;
      if (shouldReload && role === "consumer" && view === "dashboard") {
        fetchConsumerFleetSnapshotRef.current?.();
      }
    };
    socket.on("disconnect", onDisconnect);
    socket.on("connect", onConnect);
    return () => {
      socket.off("disconnect", onDisconnect);
      socket.off("connect", onConnect);
    };
  }, [socket, role, view]);

  const consumerActiveJobIdsKey = activeRequests.map((r) => r.id).join("|");

  useEffect(() => {
    if (!socket || role !== "consumer" || view !== "dashboard") return;
    const handlers = [];
    activeRequests.forEach((req) => {
      const id = req.id;
      const eventName = `status_update_${id}`;
      const handler = (data) => {
        if (!data?.status) return;
        setActiveRequests((prev) => {
          const mapped = prev.map((r) => {
            if (String(r.id) !== String(id)) return r;
            return { ...r, rawStatus: data.status };
          });
          return mapped.filter(
            (r) => (r.rawStatus || "").toLowerCase() !== "completed",
          );
        });
        setChats((prev) =>
          prev.map((c) =>
            String(c.id) === String(id) ? { ...c, status: data.status } : c,
          ),
        );
        if (data.status === "accepted" || data.status === "payment_pending") {
          fetchConsumerActiveRequests();
        }
      };
      socket.on(eventName, handler);
      handlers.push([eventName, handler]);
    });
    return () => {
      handlers.forEach(([ev, h]) => socket.off(ev, h));
    };
  }, [socket, role, view, consumerActiveJobIdsKey]);

  // Stable deterministic value based on job ID chars (no random on re-render)
  const getJobEstValue = (id) => {
    if (!id) return "₹5,000";
    const hash = String(id)
      .split("")
      .reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const val = 5000 + (hash % 20) * 1000;
    return `₹${val.toLocaleString("en-IN")}`;
  };

  const fetchProducerDashboardStats = useCallback(async () => {
    const storedUser = getStoredUser();
    const expertId = storedUser?.id || storedUser?.user_id;
    const nextStats = {};

    const [dashboardStatsResult, providerStatsResult] =
      await Promise.allSettled([
        api.get("/jobs/producer-stats"),
        expertId
          ? api.get(`/providers/${expertId}/stats`)
          : Promise.resolve({ data: null }),
      ]);

    if (dashboardStatsResult.status === "fulfilled") {
      Object.assign(nextStats, dashboardStatsResult.value.data || {});
    } else {
      console.error(
        "Failed to load dashboard stats",
        dashboardStatsResult.reason,
      );
    }

    if (
      providerStatsResult.status === "fulfilled" &&
      providerStatsResult.value?.data
    ) {
      const providerStats = providerStatsResult.value.data;
      Object.assign(nextStats, {
        points: providerStats.points ?? 0,
        level: providerStats.level ?? "Starter",
        salary: providerStats.salary ?? providerStats.levelSalary ?? 0,
        completedJobs:
          providerStats.jobsCompleted ?? nextStats.completedJobs ?? 0,
        rating: providerStats.rating ?? nextStats.rating ?? 5,
        recentPointEvents: Array.isArray(providerStats.recentPointEvents)
          ? providerStats.recentPointEvents
          : [],
      });
    } else if (providerStatsResult.status === "rejected") {
      console.error(
        "Failed to load provider stats",
        providerStatsResult.reason,
      );
    }

    if (Object.keys(nextStats).length > 0) {
      setProducerDashStats((prev) => ({ ...prev, ...nextStats }));
    }
  }, [getStoredUser]);

  const fetchProducerChats = async () => {
    setChatsLoading(true);
    try {
      const res = await api.get("/jobs/my");
      const myJobs = Array.isArray(res.data) ? res.data : [];
      if (myJobs.length > 0) {
        const chatList = myJobs.map((job) => ({
          id: job.id,
          provider_id: job.other_party_id,
          consumer_id: job.other_party_id,
          name: `${job.other_party || "Client"} — ${job.machine_name || "Machine"}`,
          avatar: (job.other_party || "CL").substring(0, 2).toUpperCase(),
          lastMsg:
            (job.issue_description || "Service request").substring(0, 35) +
            "...",
          time: new Date(job.created_at).toLocaleDateString(),
          unread: 0,
          status: job.status,
          other_party_id: job.other_party_id,
          expertId: job.other_party_id,
        }));
        setProducerChats(chatList);

        // FIX 1 — populate activeJobs from DB so it survives refresh
        const activeFromDB = myJobs
          .filter(j => ['accepted', 'in_progress', 'started', 'quote_approved', 'en_route', 'payment_pending', 'pending_confirmation'].includes(j.status))
          .map(j => ({
            id: j.id,
            machine_name: j.machine_name,
            issue_description: j.issue_description,
            client_name: j.other_party,
            status: j.status,
            rawStatus: j.status,
            progressStage: ['in_progress', 'started'].includes(j.status) ? 'in_progress'
              : j.status === 'en_route' ? 'en_route'
              : 'accepted',
            other_party: j.other_party,
            created_at: j.created_at,
            quoted_cost: j.quoted_cost,
          }));
        setActiveJobs(activeFromDB);
      } else {
        setProducerChats([]);
        setActiveJobs([]);
      }
    } catch (err) {
      console.error("Failed to load producer chat list:", err);
      setProducerChats([]);
    } finally {
      setChatsLoading(false);
    }
  };

  const handleAcceptJob = async (jobOrId) => {
    const jobId = typeof jobOrId === "object" ? jobOrId.id : jobOrId;
    if (acceptingJobId === jobId) return; // prevent double click
    setAcceptingJobId(jobId);

    if (isDemo) {
      const job = (radarJobs || []).find((j) => j.id === jobId);
      setRadarJobs((prev) => prev.filter((j) => j.id !== jobId));

      const chatId = `demo-chat-${jobId}`;

      setTimeout(() => {
        const activeJob = {
          ...(job || {}),
          id: chatId,
          originalId: jobId,
          status: "accepted",
          progressStage: "accepted",
          progressNote: "",
          acceptedAt: new Date().toISOString(),
        };
        setActiveJobs((prev) => [activeJob, ...prev]);

        const newChat = {
          id: chatId,
          jobId: chatId,
          name: `${job?.client_name || "Demo Client"} — ${job?.machine_name || "Machine"}`,
          avatar: (job?.client_name || "DC").substring(0, 2).toUpperCase(),
          lastMsg: `Hi! I need help with my ${job?.machine_name || "machine"}.`,
          time: "Just now",
          unread: 1,
          status: "accepted",
          expertId: "demo-expert",
        };
        setProducerChats((prev) => {
          const updated = [newChat, ...prev];
          patchDemoStore({ producerChats: updated });
          return updated;
        });

        // Seed initial messages for this chat
        setMessages([
          {
            id: "demo-sys-1",
            chatId,
            sender: "system",
            text: `You accepted the service request for ${job?.machine_name || "Machine"}. Chat started.`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
          {
            id: "demo-consumer-1",
            chatId,
            sender: "user",
            text: `Hi! I need help with my ${job?.machine_name || "machine"}. The issue is: ${job?.issue_description || "service required"}.`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        setActiveChatId(chatId);

        setToast({ message: "Request accepted! Chat started.", type: "success" });
        setAcceptingJobId(null);
      }, 600);
      return;
    }

    try {
      const res = await api.patch(`/jobs/${jobId}/accept`);
      const acceptedJob = res.data;
      setRadarJobs((prev) => prev.filter((j) => j.id !== jobId));
      setActiveJobs((prev) => [{ ...acceptedJob, progressStage: "accepted", progressNote: "" }, ...prev]);
      await fetchProducerChats();
      await fetchProducerDashboardStats();
      setActiveChatId(jobId);
      setActiveTab("messages");
    } catch (err) {
      // PROMPT 2 — Improved error handling for race condition
      const msg = err.response?.data?.message || '';
      if (msg.includes('no longer available') || err.response?.status === 400) {
        // Show friendly message — another expert was faster
        setToast({ 
          message: 'This request was just accepted by another expert. Check for other requests.', 
          type: 'warning' 
        });
        // Refresh radar jobs to remove this one
        fetchRadarJobs();
      } else {
        setToast({ 
          message: 'Failed to accept request. Please try again.', 
          type: 'error' 
        });
      }
    } finally {
      setAcceptingJobId(null);
    }
  };

  const [searchResults, setSearchResults] = useState([]);

  const handleTopBarSearch = (query) => {
    if(!query || !query.trim()) {
      setSearchResults([]);
      return;
    }
    const lower = query.toLowerCase();
    const results = [];
    
    (machines || []).forEach(m => {
       if((m.name && m.name.toLowerCase().includes(lower)) || (m.machine_type && m.machine_type.toLowerCase().includes(lower))) {
          results.push({ id: `mach-${m.id || m._id}`, type: 'machine', icon: 'machine', title: m.name, subtitle: m.machine_type || 'Machine', rawRef: m });
       }
    });
    
    (activeRequests || []).forEach(r => {
       if((r.machine && r.machine.toLowerCase().includes(lower)) || (r.issue && r.issue.toLowerCase().includes(lower))) {
          results.push({ id: `req-${r.id}`, type: 'request', icon: 'request', title: r.issue, subtitle: r.machine, rawRef: r });
       }
    });
    
    setSearchResults(results);
  };

  const handleSearchResultClick = (res) => {
    if(res.type === 'machine') {
      setActiveTab('machines');
    } else if(res.type === 'request') {
      setActiveTab('fleet');
    }
  };

  const handleDeclineJob = async (jobOrId) => {
    const jobId = typeof jobOrId === "object" ? jobOrId.id : jobOrId;
    // In demo mode — just remove locally, no API call
    if (isDemo) {
      setRadarJobs((prev) => prev.filter((j) => j.id !== jobId));
      return;
    }
    try {
      await api.patch(`/jobs/${jobId}/decline`);
      setRadarJobs((prev) => prev.filter((j) => j.id !== jobId));
      await fetchProducerDashboardStats();
    } catch (err) {
      setRadarJobs((prev) => prev.filter((j) => j.id !== jobId));
      console.warn("Decline API call failed (offline?)", err);
    }
  };

  const handleJoinWaitlist = async (jobOrId) => {
    const jobId = typeof jobOrId === 'object' ? jobOrId.id : jobOrId;
    if (isDemo) {
      setToast({ message: 'Added to waitlist! You will be notified if this job becomes available.', type: 'success' });
      return;
    }
    try {
      await api.post(`/jobs/${jobId}/waitlist`);
      setToast({ message: 'Joined waitlist. You will be notified if this job opens up.', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to join waitlist', type: 'error' });
    }
  };

  // [NEW] Show full job details modal to expert before accepting
  const handleViewJobDetails = (job) => {
    setSelectedJobDetails(job);
    setShowJobDetailsModal(true);
  };

  const handleAcceptFromModal = async () => {
    if (!selectedJobDetails) return;
    setShowJobDetailsModal(false);
    await handleAcceptJob(selectedJobDetails);
    setSelectedJobDetails(null);
  };

  const handleDeclineFromModal = async () => {
    if (!selectedJobDetails) return;
    setShowJobDetailsModal(false);
    await handleDeclineJob(selectedJobDetails);
    setSelectedJobDetails(null);
  };



  const handleOpenChatFromActiveJob = (jobId) => {
    // jobId here is the activeJob.id which is demo-chat-${originalId} or a real UUID
    const chat = producerChats.find((c) => c.id === jobId || c.jobId === jobId);
    setActiveChatId(chat ? chat.id : jobId);
    setActiveTab("messages");
  };

  const handleUpdateJobProgress = (jobId, stage, note) => {
    if (isDemo) {
      setActiveJobs((prev) =>
        prev.map((j) => j.id === jobId ? { ...j, progressStage: stage, progressNote: note } : j)
      );
      setToast({ message: `Progress updated: ${stage}`, type: "success" });
      return;
    }
    api.patch(`/jobs/${jobId}/progress`, { stage, note })
      .then(() => {
        setActiveJobs((prev) =>
          prev.map((j) => j.id === jobId ? { ...j, progressStage: stage, progressNote: note } : j)
        );
        setToast({ message: "Consumer notified of update!", type: "success" });
      })
      .catch(() => setToast({ message: "Failed to update progress", type: "error" }));
  };



  const handleExpertStartWork = async () => {
    if (!activeChatId) return;

    if (isDemo) {
      setTimeout(() => {
        setProducerChats((prev) =>
          prev.map((c) => c.id === activeChatId ? { ...c, status: "in_progress" } : c)
        );
        setToast({ message: "Work started successfully", type: "success" });
      }, 600);
      return;
    }

    try {
      await api.patch(`/jobs/${activeChatId}/start-work`);
      await fetchProducerChats();
    } catch (err) {
      alert("Failed to start work: " + (err.response?.data?.message || err.message));
    }
  };

  const handleExpertMarkComplete = async () => {
    if (!activeChatId) return;

    if (isDemo) {
      setTimeout(() => {
        setProducerChats((prev) =>
          prev.map((c) => c.id === activeChatId ? { ...c, status: "completed" } : c)
        );
        const completionMsg = {
          id: Date.now(),
          chatId: activeChatId,
          sender: "expert",
          text: SERVICE_COMPLETION_MESSAGE,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, completionMsg]);
        setProducerDashStats((prev) => ({
          ...prev,
          completedJobs: (prev.completedJobs || 0) + 1,
          points: (prev.points || 0) + 20,
        }));
        setToast({ message: "Job marked as completed", type: "success" });
      }, 700);
      return;
    }

    try {
      const res = await api.patch(`/jobs/${activeChatId}/complete-work`);
      await fetchProducerDashboardStats();
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const newMsgObj = {
        id: Date.now(),
        chatId: activeChatId,
        sender: "expert",
        text: SERVICE_COMPLETION_MESSAGE,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, newMsgObj]);
      if (socket && user) {
        socket.emit("send_message", {
          requestId: activeChatId,
          senderId: user.id,
          text: SERVICE_COMPLETION_MESSAGE,
        });
        socket.emit("job_completed", {
          requestId: activeChatId,
          status: "completed",
          consumerId: res.data?.consumer_id,
        });
      }
      await fetchProducerChats();
    } catch (err) {
      alert("Failed to mark as completed: " + (err.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    if (view === "dashboard" && role === "consumer" && activeTab === "fleet") {
      fetchConsumerFleetSnapshot();
    }
  }, [view, role, activeTab, isDemo, authenticated]);

  useEffect(() => {
    if (view === "dashboard" && role === "producer") {
      fetchRadarJobs();
      fetchProducerChats();
      fetchProducerDashboardStats();
      const interval = setInterval(() => {
        fetchRadarJobs();
        fetchProducerDashboardStats();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [view, role, fetchProducerDashboardStats, isDemo, authenticated]);

  // When producer switches to messages tab, refresh their chat list
  useEffect(() => {
    if (activeTab === "messages" && role === "producer") {
      fetchProducerChats();
    }
  }, [activeTab, isDemo]);

  // [NEW] FETCH FINANCIAL STATS
  useEffect(() => {
    if (activeTab === "earnings" || activeTab === "history") {
      const fetchFinanceData = async () => {
        try {
          const statsRes = await api.get("/finance/stats");
          setEarningsStats(statsRes.data);
          const historyRes = await api.get("/finance/history");
          const rows = Array.isArray(historyRes.data) ? historyRes.data : [];
          setTransactionHistory(rows.map(mapServiceHistoryRow));
        } catch (err) {
          console.error("Failed to load financial data", err);
        }
      };
      fetchFinanceData();
    }
  }, [activeTab]);

  // Shared cleanup that runs on both exit paths
  const performLogout = () => {
    if (socket) { socket.off(); socket.disconnect(); }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isAuth');
    localStorage.removeItem('isDemo');
    localStorage.removeItem('ratedJobIds');
    setIsDemo(false);
    setAuthenticated(false);
    setEmail(''); setPassword(''); setFirstName(''); setLastName('');
    setMachines([]); setActiveRequests([]); setChats([]);
    setProducerChats([]); setMessages([]); setRadarJobs([]);
    setActiveTab('fleet');
    setView('landing');
    navigate('/', { replace: true });
  };

  // Exit session — keeps demo store intact for next login
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token && token !== 'demo-token-xyz') {
        await api.post('/auth/logout').catch(() => {});
      }
    } catch (e) {}
    performLogout();
  };

  // Clear data — wipes demo store then logs out
  const handleClearDataAndLogout = async () => {
    try {
      await api.post('/demo/reset');
    } catch (err) {
      console.warn('[Demo] Reset API failed, clearing localStorage only');
    }
    clearDemoStore();
    performLogout();
  };

  const handleViewExpertProfile = async (chat) => {
    if (!chat) return;

    if (isDemo) {
      setSelectedExpert({
        loading: false,
        name: 'Demo Expert',
        specialization: 'Industrial Automation Specialist',
        rating: '4.8',
        level: 'Gold',
        experience: '5',
        avatar: 'DE',
        online: true,
        machines: 'Hydraulics, CNC, Motors, PLC',
        city: 'Mumbai',
        qualification: 'Certified Technician',
        jobsCompleted: 12,
        responseTime: 'Responds in ~1 hr',
        memberSince: 'January 2025',
        badge: 'Verified Expert',
        error: false,
      });
      setShowExpertProfileModal(true);
      return;
    }

    setSelectedExpert({ loading: true, name: chat.name, online: chat.online });
    setShowExpertProfileModal(true);

    const timeout = setTimeout(() => {
      setSelectedExpert(prev =>
        prev?.loading
          ? { ...prev, loading: false, error: false, specialization: 'Expert', rating: 'N/A' }
          : prev
      );
    }, 10000);

    try {
      const expertId = chat.provider_id || chat.expertId || chat.other_party_id;
      
      // FIX 3 — Validate UUID before calling API
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!expertId || !uuidRegex.test(expertId)) {
        clearTimeout(timeout);
        const nameFromChat = (chat.name || '').split('(')[1]?.replace(')', '').trim() || 'Expert';
        setSelectedExpert({
          loading: false,
          error: false,
          name: nameFromChat,
          specialization: 'Repair Expert',
          rating: '5.0',
          level: 'Starter',
          experience: 'N/A',
          city: 'N/A',
          jobsCompleted: 0,
          badge: 'Verified Expert',
          machines: 'Industrial Machinery',
          qualification: 'Certified Technician',
          responseTime: 'N/A',
          memberSince: 'Recently',
          online: false,
          avatar: nameFromChat.substring(0, 2).toUpperCase(),
        });
        setShowExpertProfileModal(true);
        return;
      }
      
      const res = await api.get(`/providers/${expertId}`);
      clearTimeout(timeout);
      const data = res.data;

      let badgeLabel = "Verified Expert";
      const spec = (
        data.category ||
        data.specialty ||
        chat.specialty ||
        ""
      ).toLowerCase();
      if (spec.includes("cnc")) badgeLabel = "CNC Specialist";
      else if (spec.includes("hydraulic")) badgeLabel = "Hydraulics Expert";
      else if (spec.includes("motor")) badgeLabel = "Motor Specialist";

      setSelectedExpert({
        loading: false,
        name: data.name || chat.name || "Expert Technician",
        specialization:
          data.specialty || data.category || chat.specialty || "Repair Expert",
        rating: data.rating ? Number(data.rating).toFixed(1) : "5.0",
        level: data.level || "Starter",
        experience: data.experience || "5",
        avatar: data.avatar || data.name?.[0] || chat.name?.[0] || "E",
        online: chat.online || false,
        machines: data.machines || "All Industrial Machinery",
        city: data.city || "Local",
        qualification: data.qualification || "Certified Technician",
        jobsCompleted: data.jobsCompleted || "0",
        responseTime: "Responds in ~2 hrs",
        memberSince: data.memberSince
          ? new Date(data.memberSince).toLocaleDateString("en-GB", {
              month: "long",
              year: "numeric",
            })
          : "Recently",
        badge: badgeLabel,
        error: false,
      });
    } catch (err) {
      clearTimeout(timeout);
      setSelectedExpert({ loading: false, error: true });
    }
  };

  const handlePayment = (amountStr, desc, requestId = null) => {
    const checkoutAmount = Number(parseFloat(String(amountStr).replace(/[^0-9.]/g, ""))) || 5000;
    const providerPrice = checkoutAmount;
    const commissionPercentage = 5; // consumer pays 5% booking fee
    const commission = (providerPrice * commissionPercentage) / 100;
    const gst = commission * 0.18;
    const totalPayable = providerPrice + commission + gst;

    if (isDemo) {
      // Simulate payment — show checkout modal with demo flag, skip Razorpay
      setCheckoutDesc(desc || "Invoice Payment");
      setCheckoutDetails({
        checkoutAmount,
        providerPrice,
        commissionPercentage,
        commission: Math.round(commission * 100) / 100,
        gst: Math.round(gst * 100) / 100,
        totalPayable: Math.round(totalPayable * 100) / 100,
        requestId: requestId || activeChatId,
        isDemo: true,
      });
      setShowCheckoutModal(true);
      return;
    }

    setCheckoutDesc(desc || "Invoice Payment");
    setCheckoutDetails({
      checkoutAmount,
      providerPrice,
      commissionPercentage,
      commission: Math.round(commission * 100) / 100,
      gst: Math.round(gst * 100) / 100,
      totalPayable: Math.round(totalPayable * 100) / 100,
      requestId: requestId || activeChatId,
    });
    setShowCheckoutModal(true);
  };

  const initiateRazorpayCheckout = async () => {
    if (!checkoutDetails) return;

    // Demo mode — simulate payment success without Razorpay
    if (checkoutDetails.isDemo) {
      setShowCheckoutModal(false);
      setTimeout(() => {
        const fakeRef = `DEMO-PAY-${Date.now()}`;
        const successText = `✓ Payment of ₹${checkoutDetails.totalPayable} processed successfully. Ref: ${fakeRef}`;
        setMessages((prev) => [...prev, {
          id: Date.now(),
          chatId: activeChatId,
          sender: "system",
          text: successText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }]);
        const paidInvoiceKey = `${checkoutDesc}_${checkoutDetails.checkoutAmount}`;
        setPaidInvoices((prev) => {
          const updated = [...prev, paidInvoiceKey];
          localStorage.setItem('paidInvoices', JSON.stringify(updated));
          return updated;
        });
        setChats((prev) => prev.map((c) =>
          String(c.id) === String(activeChatId) ? { ...c, status: "payment_pending" } : c
        ));
        fetchConsumerActiveRequests();
        setToast({ message: "Payment successful (Demo)", type: "success" });
      }, 900);
      return;
    }

    try {
      setShowCheckoutModal(false);
      const res = await api.post("/payment/create-order", {
        providerPrice: checkoutDetails.providerPrice,
        requestId: checkoutDetails.requestId || activeChatId || null,
      });
      const order = res.data;

      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        setErrors({ server: "Payment gateway not configured. Please contact support." });
        return;
      }
      const options = {
        key: razorpayKey,
        amount: order.amount, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
        currency: order.currency,
        name: "IndEase Industrial Services",
        description: checkoutDesc,
        order_id: order.id, //This is a sample Order ID. Pass the `id` obtained in the response of create-order.
        handler: async function (response) {
          try {
            const verifyRes = await api.post("/payment/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paidAmount: checkoutDetails.checkoutAmount,
              requestId: checkoutDetails.requestId || activeChatId,
              description: checkoutDesc,
            });
            if (verifyRes.data.success) {
              // Mark invoice as paid (using desc and amount as unique key for mock)
              const paidInvoiceKey = `${checkoutDesc}_${checkoutDetails.checkoutAmount}`;
              setPaidInvoices((prev) => {
                const updated = [...prev, paidInvoiceKey];
                localStorage.setItem('paidInvoices', JSON.stringify(updated));
                return updated;
              });

              if (socket) {
                const userStr = localStorage.getItem("user");
                const user = userStr ? JSON.parse(userStr) : { id: "unknown" };
                const successText = `✓ Payment of ₹${checkoutDetails.totalPayable} processed successfully. Ref: ${response.razorpay_payment_id}`;
                socket.emit("send_message", {
                  requestId: activeChatId,
                  senderId: user.id || user.user_id,
                  text: successText,
                });
              }
              setCompletedJobId(activeChatId);

              // [NEW] Detailed Service Ledger Update
              const currentChat =
                chats.find((c) => c.id === activeChatId) ||
                producerChats.find((c) => c.id === activeChatId);
              const machineName = currentChat?.name?.includes(" (")
                ? currentChat.name.split(" (")[0]
                : "Industrial Node Unit";
              const expertName = currentChat?.name?.includes("(")
                ? currentChat.name.split("(")[1].replace(")", "")
                : "Expert Technician";

              const newEntry = {
                id: response.razorpay_payment_id || `INV-${Date.now()}`,
                date: new Date()
                  .toLocaleDateString("en-GB")
                  .replace(/\//g, "."),
                machine: machineName,
                service: checkoutDesc || "Maintenance Service",
                expert: expertName,
                status: "Completed",
                cost: `₹${checkoutDetails.totalPayable}`,
                amount: checkoutDetails.totalPayable,
                paid_amount: checkoutDetails.checkoutAmount,
                paymentId: response.razorpay_payment_id,
              };

              setTransactionHistory((prev) => [newEntry, ...prev]);

              setEarningsStats((prev) => ({
                ...prev,
                totalRevenue:
                  Number(prev.totalRevenue || 0) +
                  Number(checkoutDetails.totalPayable),
                totalSpent:
                  Number(prev.totalSpent || 0) +
                  Number(checkoutDetails.totalPayable),
              }));
            } else {
              setErrors({ server: "Payment Verification Failed!" });
            }
          } catch (error) {
            console.error("Error verifying payment:", error);
            setErrors({
              server: "Payment Verification Error. Please check dashboard.",
            });
          }
        },
        prefill: {
          name: firstName || "Customer",
          email: email || "customer@example.com",
          contact: phone || "9000090000",
        },
        theme: {
          color: "#3399cc",
        },
      };
      const rzp1 = new window.Razorpay(options);
      rzp1.on("payment.failed", function (response) {
        setErrors({ server: "Payment Failed" });
        console.warn(response.error);
      });
      rzp1.open();
    } catch (err) {
      console.error("Payment intent failed", err);
      if (err.response?.status === 500) {
        setErrors({ server: "Server error creating payment. Check if server is running." });
      } else if (err.response?.status === 401) {
        setErrors({ server: "Session expired. Please login again." });
      } else if (!window.Razorpay) {
        setErrors({ server: "Payment gateway script not loaded. Check internet connection." });
      } else {
        setErrors({ server: err.response?.data?.error || "Payment initialization failed." });
      }
    }
  };

  // PART 2 — Prevent multiple initializations of Google OAuth callback
  // useCallback gives a stable reference; window.googleInitialized ensures
  // the handler is never bound more than once per page lifecycle.
  const handleGoogleSuccess = useCallback(async (credentialResponse) => {
    if (window._googleAuthInProgress) return; // debounce rapid double-clicks
    window._googleAuthInProgress = true;
    try {
      const { credential } = credentialResponse;
      console.log("[Google] credentialResponse received, credential present:", !!credential);

      // Guard: credential can be null/undefined if browser blocked the popup
      // via Cross-Origin-Opener-Policy. Show a clear error instead of crashing.
      if (!credential) {
        window._googleAuthInProgress = false;
        setErrors({ server: "Google sign-in was blocked by browser. Please try again." });
        return;
      }

      setErrors({});

      const res = await api.post(
        "/auth/google",
        {
          token: credential,
        },
        { withCredentials: true },
      );

      const { user, token } = res.data;

      if (user && token) {
        if (socket) socket.emit("identify", user.id);
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("isAuth", "true");

        // Mark that the next session-check useEffect run should be skipped —
        // we already have verified fresh data from the login response.
        skipSessionCheckRef.current = true;

        // admin accounts belong to the admin portal; treat them as consumers
        // in the main app so they see the user-facing dashboard
        const effectiveRole =
          user.role === "admin" ? "consumer" : user.role || "consumer";

        setAuthChecking(false);
        setAuthenticated(true);
        setRole(effectiveRole);
        setView("dashboard");

        if (effectiveRole === "producer") {
          setActiveTab("requests");
          navigate("/expert-dashboard");
        } else {
          setActiveTab("fleet");
          navigate("/dashboard");
        }

        fetchNotifications();
        window._googleAuthInProgress = false;
        return;
      }

      // token or user missing in response
      window._googleAuthInProgress = false;
      setErrors({
        server: "Incomplete login response from server. Please try again.",
      });
    } catch (err) {
      console.error("Google login error:", err);
      window._googleAuthInProgress = false;
      setErrors({
        server:
          err.response?.data?.message || "Google identity verification failed.",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, socket]);


  const handleGoogleError = () => {
    setErrors({ server: "Google login was cancelled or failed." });
  };

  // Legacy social modal toggle (for Apple or others if needed)
  const handleSocialLogin = (provider) => {
    setSocialProvider(provider);
    setShowSocialModal(true);
  };

  // [NEW] Social Account Selector Modal Component
  const SocialLoginModal = () => (
    <div className="modal-overlay social-auth-overlay">
      <div className="social-selector-card animate-social-slide-up">
        <div className="social-modal-header">
          <div className="social-logo-wrap">
            {socialProvider === "Google" ? (
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 384 512">
                <path
                  fill="currentColor"
                  d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z"
                />
              </svg>
            )}
          </div>
          <h3>Choose an industrial identity</h3>
          <p>
            to continue to <strong>IndEase</strong>
          </p>
        </div>

        <div className="account-list">
          {simulatedAccounts.map((acc, idx) => (
            <div
              key={idx}
              className="account-item"
              onClick={() => finalizeSocialLogin(acc)}
            >
              <img src={acc.avatar} alt={acc.name} className="acc-avatar" />
              <div className="acc-info">
                <span className="acc-name">{acc.name}</span>
                <span className="acc-email">{acc.email}</span>
              </div>
            </div>
          ))}
          <div className="account-item use-another">
            <div className="add-icon">+</div>
            <span>Use another account</span>
          </div>
        </div>

        <div className="social-modal-footer">
          <p>
            By continuing, Google/Apple will share your name, email address, and
            profile picture with IndEase.
          </p>
          <button
            className="btn-cancel-social"
            onClick={() => setShowSocialModal(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const isFormValid =
    view === "forgot"
      ? email.includes("@")
      : email.includes("@") && password.length >= 8;

  // --- SHARED UI COMPONENTS (MODALS) ---
  const sharedModals = (
    <>
      {showProfileIncompleteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mb-6">
                <UserCircle size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Complete Your Profile First</h3>
              <p className="text-slate-500 mb-8 max-w-[280px]">
                Please complete your profile before adding machines. We need your name and phone number to connect you with the right experts.
              </p>
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => setShowProfileIncompleteModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setShowProfileIncompleteModal(false);
                    const el = document.getElementById("profile-tab");
                    if (el) el.click();
                    setActiveTab('profile');
                  }}
                  className="flex-1 py-3 px-4 rounded-xl text-white font-bold bg-[#0d9488] hover:bg-teal-700 shadow-lg shadow-teal-500/20 transition-all"
                >
                  Complete Profile
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      <ExpertProfileModal
        show={showExpertProfileModal}
        onClose={() => setShowExpertProfileModal(false)}
        selectedExpert={selectedExpert}
        cn={cn}
      />


      {showPaymentSuccessModal && paymentSuccessData && (
        <div className="modal-overlay">
          <div
            className="premium-modal animate-fade-in"
            style={{
              maxWidth: "400px",
              borderRadius: "16px",
              background: "white",
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
          >
            <div className="p-10 text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle
                  className="w-10 h-10 text-emerald-600"
                  strokeWidth={3}
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Payment Successful
                </h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">
                  Your payment has been completed successfully.
                </p>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-400">
                    Amount Paid
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    ₹{paymentSuccessData.amount}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-400">
                    Reference ID
                  </span>
                  <span className="text-xs font-mono text-slate-900">
                    {paymentSuccessData.refId}
                  </span>
                </div>
              </div>

              <button
                className="w-full h-12 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 transition-all"
                onClick={() => {
                  setShowPaymentSuccessModal(false);
                  setPaymentSuccessData(null);
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showPostPaymentRatingModal && postPaymentRatingContext && (
        <div className="modal-overlay">
          <div
            className="premium-modal animate-fade-in"
            style={{
              maxWidth: "440px",
              borderRadius: "16px",
              background: "white",
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 space-y-5">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Rate Your Experience
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  How was the service by{" "}
                  <span className="font-semibold text-slate-900">
                    {postPaymentRatingContext.expertName}
                  </span>
                  ?
                </p>
                {postPaymentRatingContext.amountPaid != null && (
                  <p className="text-xs text-slate-500 pt-1">
                    Payment of ₹{postPaymentRatingContext.amountPaid} completed
                    {postPaymentRatingContext.refId ? (
                      <span className="block font-mono text-[11px] mt-1 text-slate-400">
                        Ref: {postPaymentRatingContext.refId}
                      </span>
                    ) : null}
                  </p>
                )}
              </div>

              <div className="flex justify-center gap-1 py-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setReviewData((prev) => ({ ...prev, rating: i }))
                    }
                    className="p-1.5 rounded-xl hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-200"
                    aria-label={`Rate ${i} star${i > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={`w-9 h-9 transition-colors ${
                        i <= reviewData.rating
                          ? "text-amber-400 fill-amber-400"
                          : "text-slate-300"
                      }`}
                      strokeWidth={1.5}
                    />
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Leave a comment (optional)
                </label>
                <textarea
                  value={reviewData.comment}
                  onChange={(e) =>
                    setReviewData((prev) => ({
                      ...prev,
                      comment: e.target.value,
                    }))
                  }
                  placeholder="Share your experience (optional)"
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30 focus:border-[#0d9488]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
                <button
                  type="button"
                  onClick={handlePostPaymentRatingSkip}
                  className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={handlePostPaymentRatingSubmit}
                  disabled={reviewData.rating < 1}
                  className="flex-1 h-11 rounded-xl bg-[#0d9488] text-white text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  Submit Rating
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CheckoutModal show={showCheckoutModal} onClose={() => setShowCheckoutModal(false)} checkoutDetails={checkoutDetails} checkoutDesc={checkoutDesc} onConfirm={initiateRazorpayCheckout} />

      <AddMachineModal show={showAddMachineModal} onClose={() => setShowAddMachineModal(false)} newMachineData={newMachineData} setNewMachineData={setNewMachineData} onAdd={handleAddMachine} />

      <DeleteAccountModal show={showDeleteModal && !isDemo} onClose={() => setShowDeleteModal(false)} email={email} onConfirm={() => { setView("landing"); setShowDeleteModal(false); }} />

      <DecommissionModal nodeToDelete={nodeToDelete} onClose={() => setNodeToDelete(null)} onConfirm={() => { handleDeleteMachine(nodeToDelete.id); setNodeToDelete(null); }} />

      {showDiagnosisModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowDiagnosisModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl flex flex-col"
            style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh', margin: '0 auto' }}
          >
            {/* Header — fixed, does not scroll */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center">
                  <Wrench size={17} className="text-teal-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Request Service</h2>
                  <p className="text-xs text-slate-500">{activeJobMachine?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDiagnosisModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div
              className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
              style={{ minHeight: 0 }}
            >
              {diagnosisStep === 1 && (
                <div className="animate-fade-in space-y-5">
                  {/* Fault Video */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-2">Fault Video</label>
                    <VideoUploadInput
                      onUploaded={(url) => setUploadedVideoUrl(url)}
                      onFileSelected={(file) => setVideoFile(file)}
                    />
                  </div>

                  {/* Issue Description */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-2">Issue Description</label>
                    <textarea
                      rows={4}
                      placeholder="Describe the issue with your machine..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 outline-none text-sm resize-none transition-all"
                      value={diagnosisDesc}
                      onChange={(e) => setDiagnosisDesc(e.target.value)}
                    />
                  </div>

                  {/* Physical Location */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-2">Physical Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Front hydraulic valve, Main spindle..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 outline-none text-sm transition-all"
                      value={faultLocation}
                      onChange={(e) => setFaultLocation(e.target.value)}
                    />
                  </div>

                  {/* Urgency Level */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-2">Urgency Level</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'low', label: '🟢 Low', sub: 'Within a week' },
                        { value: 'normal', label: '🟡 Normal', sub: 'Within 2–3 days' },
                        { value: 'critical', label: '🔴 Critical', sub: 'Factory stopped' }
                      ].map(opt => (
                        <button key={opt.value} type="button" onClick={() => setUrgencyLevel(opt.value)}
                          className={`p-3 rounded-xl border text-left transition-all ${urgencyLevel === opt.value ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'}`}>
                          <div className="text-xs font-bold">{opt.label}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{opt.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preferred Date + Time Slot */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 block mb-2">Preferred Date</label>
                      <input type="date" min={new Date().toISOString().split('T')[0]}
                        value={preferredDate} onChange={e => setPreferredDate(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 outline-none text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 block mb-2">Time Slot</label>
                      <select value={preferredTimeSlot} onChange={e => setPreferredTimeSlot(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 outline-none text-sm bg-white">
                        <option value="morning">Morning (8am–12pm)</option>
                        <option value="afternoon">Afternoon (12pm–5pm)</option>
                        <option value="evening">Evening (5pm–8pm)</option>
                        <option value="anytime">Any time</option>
                      </select>
                    </div>
                  </div>

                  {/* Budget */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-1">
                      Your Budget <span className="text-slate-400 font-normal text-xs ml-1">(optional — shown to experts)</span>
                    </label>
                    <input type="text" placeholder="e.g. ₹2,000 – ₹5,000" value={consumerBudget} onChange={e => setConsumerBudget(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 outline-none text-sm transition-all" />
                  </div>
                </div>
              )}

              {diagnosisStep === 2 && (
                <div className="py-16 flex flex-col items-center justify-center space-y-8 animate-fade-in">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-slate-100 border-t-teal-600 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Globe
                        size={24}
                        className="text-teal-600 animate-pulse"
                      />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h4 className="text-xl font-bold text-slate-900 tracking-tight">
                      {broadcastInProgress ? 'Broadcasting Request' : 'Analysing Video'}
                    </h4>
                    <p className="text-sm font-medium text-slate-500">
                      {broadcastInProgress ? 'Scanning for available expert nodes...' : 'AI is scanning for fault patterns...'}
                    </p>
                  </div>
                  {broadcastInProgress && (
                    <p className="text-xs text-slate-400 mt-2">
                      Running in background — you can safely close this
                    </p>
                  )}
                </div>
              )}

              {diagnosisStep === 'ai_result' && aiDiagnosis && (
                <div className="animate-fade-in space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-emerald-600 uppercase tracking-widest">AI Analysis Complete</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Machine type detected</p>
                        <p className="text-base font-bold text-slate-900">{aiDiagnosis.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Confidence</p>
                        <p className="text-base font-bold text-emerald-600">{aiDiagnosis.confidence}%</p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-slate-200">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Possible issue</p>
                      <p className="text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{aiDiagnosis.issue}</p>
                    </div>

                    {/* ADD: Severity badge */}
                    {aiDiagnosis.severity && (
                        <div className={`text-xs px-3 py-1 rounded-full font-semibold w-fit
                            ${aiDiagnosis.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                              aiDiagnosis.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                              aiDiagnosis.severity === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'}`}>
                            {aiDiagnosis.severity} Severity
                        </div>
                    )}

                    {/* ADD: Likely faults list */}
                    {aiDiagnosis.likelyFaults?.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">Likely Faults</p>
                            <div className="flex flex-wrap gap-1">
                                {aiDiagnosis.likelyFaults.map(f => (
                                    <span key={f} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{f}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ADD: Estimated repair time */}
                    {aiDiagnosis.estimatedRepairTime && (
                        <p className="text-xs text-slate-500">
                            ⏱ Estimated repair: <span className="font-semibold text-slate-700">{aiDiagnosis.estimatedRepairTime}</span>
                        </p>
                    )}

                    {/* ADD: Video findings if video was uploaded */}
                    {aiDiagnosis.videoFindings && aiDiagnosis.videoFindings !== 'null' && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                            <p className="text-xs font-semibold text-blue-700 mb-1">📹 Video Analysis</p>
                            <p className="text-xs text-blue-600">{aiDiagnosis.videoFindings}</p>
                        </div>
                    )}
                  </div>
                  <button
                    className="w-full h-12 bg-[#0d9488] text-white rounded-xl font-semibold text-sm hover:bg-teal-700 shadow-md shadow-teal-500/20 transition-all active:scale-[0.98]"
                    onClick={handleConfirmBroadcast}
                  >
                    Confirm & Broadcast to Experts
                  </button>
                  <button
                    className="w-full h-10 text-slate-500 text-sm hover:text-slate-700 transition-colors"
                    onClick={() => { setDiagnosisStep(1); setAiDiagnosis(null); }}
                  >
                    Edit request
                  </button>
                </div>
              )}

              {diagnosisStep === 3 && (
                <div className="text-center py-8 space-y-8 animate-fade-in">
                  <div className="w-20 h-20 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle
                      className="w-10 h-10 text-emerald-600"
                      strokeWidth={3}
                    />
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-2xl font-bold text-slate-900 tracking-tight">
                      Request Live
                    </h4>
                    <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-xs mx-auto">
                      Your request for <strong>{activeJobMachine?.name}</strong>{" "}
                      has been broadcasted to our expert network.
                    </p>
                  </div>
                  <button
                    className="w-full h-12 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 transition-all"
                    onClick={() => {
                      setShowDiagnosisModal(false);
                      setDiagnosisStep(1);
                      setAiDiagnosis(null);
                    }}
                  >
                    Return to Console
                  </button>
                </div>
              )}
            </div>

            {/* Footer — fixed at bottom, only on step 1, does not scroll */}
            {diagnosisStep === 1 && (
              <div className="px-6 py-4 border-t border-slate-100 shrink-0">
                <button
                  onClick={handleBroadcastJob}
                  className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm"
                >
                  Submit Service Request
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showReportModal && selectedReport && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target.className === "modal-overlay" && setShowReportModal(false)
          }
        >
          <div
            className="premium-modal"
            style={{
              maxWidth: "480px",
              borderRadius: "16px",
              background: "white",
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
          >
            <div className="modal-header-premium border-b border-slate-100 p-6">
              <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
                Invoice Details
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowReportModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body-premium p-8 space-y-6">
              <div className="space-y-4">
                {[
                  { label: "Machine Name", value: selectedReport.machine },
                  {
                    label: "Service Type",
                    value:
                      selectedReport.service ||
                      selectedReport.action ||
                      "Maintenance",
                  },
                  { label: "Expert Name", value: selectedReport.expert },
                  { label: "Service Date", value: selectedReport.date },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {item.label}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <span className="text-base font-semibold text-slate-900">
                  Amount Paid
                </span>
                <span className="text-xl font-bold text-[#0d9488]">
                  {selectedReport.cost || selectedReport.amount}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <button
                  className="secondary-action-btn h-12 rounded-xl border-[#E5E7EB] text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all"
                  onClick={() => setShowReportModal(false)}
                >
                  Close
                </button>
                <button
                  className="main-action-btn h-12 rounded-xl bg-[#0d9488] text-white font-semibold text-sm hover:bg-teal-700 shadow-md shadow-teal-500/20 transition-all flex items-center justify-center gap-2"
                  onClick={() => handleDownloadReport(selectedReport)}
                >
                  <Download size={16} />
                  Download Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showVideoModal && (
        <div className="modal-overlay">
          <div
            className="diagnosis-modal"
            style={{ width: "800px", background: "black" }}
          >
            <div
              className="modal-header-v2"
              style={{
                background: "#1e293b",
                borderBottom: "1px solid #334155",
              }}
            >
              <h3 style={{ color: "white" }}>Video Tutorials</h3>
              <button
                className="btn-icon-label"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  border: "none",
                }}
                onClick={() => setShowVideoModal(false)}
              >
                Close
              </button>
            </div>
            <div className="modal-body-v2" style={{ padding: 0 }}>
              <div
                style={{
                  height: "400px",
                  background: "black",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  flexDirection: "column",
                }}
              >
                {activeVideo ? (
                  <>
                    <div
                      style={{ fontSize: "4rem", color: "var(--sage-green)" }}
                    >
                      ▶
                    </div>
                    <h2 style={{ marginTop: "20px" }}>{activeVideo.title}</h2>
                    <p style={{ color: "#94a3b8" }}>
                      Now Playing • {activeVideo.duration}
                    </p>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "4rem", opacity: 0.5 }}>▶</div>
                    <p style={{ marginTop: "20px" }}>
                      Select a tutorial to play
                    </p>
                  </>
                )}
              </div>
              <div style={{ padding: "20px", background: "#0f172a" }}>
                {tutorialVideos.map((vid) => (
                  <div
                    key={vid.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "15px",
                      color: "white",
                      padding: "10px",
                      borderBottom: "1px solid #334155",
                      cursor: "pointer",
                      background:
                        activeVideo?.id === vid.id ? "#1e293b" : "transparent",
                    }}
                    onClick={() => setActiveVideo(vid)}
                  >
                    <span style={{ fontSize: "1.5rem" }}>{vid.thumbnail}</span>
                    <div style={{ flex: 1 }}>
                      <h4
                        style={{
                          margin: 0,
                          color:
                            activeVideo?.id === vid.id
                              ? "var(--sage-green)"
                              : "white",
                        }}
                      >
                        {vid.title}
                      </h4>
                      <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                        {vid.duration}
                      </span>
                    </div>
                    {activeVideo?.id === vid.id ? (
                      <span
                        style={{
                          color: "var(--sage-green)",
                          fontWeight: "bold",
                        }}
                      >
                        Playing
                      </span>
                    ) : (
                      <button
                        className="btn-small"
                        style={{
                          width: "auto",
                          borderColor: "white",
                          color: "white",
                        }}
                      >
                        Play
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCallModal && (
        <div className="modal-overlay">
          <div className="diagnosis-modal" style={{ maxWidth: "450px" }}>
            <div className="modal-header-v2">
              <h3>Schedule Expert Call</h3>
              <button
                className="btn-icon-label"
                onClick={() => setShowCallModal(false)}
              >
                Close
              </button>
            </div>
            <div className="modal-body-v2">
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{ fontSize: "3rem" }}>📞</div>
                <p style={{ color: "#64748b", marginTop: "10px" }}>
                  Direct line to a verified industrial specialist.
                </p>
              </div>
              <div className="input-group" style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "bold",
                    color: "var(--navy-dark)",
                  }}
                >
                  Select Machine
                </label>
                <select
                  className="std-input"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                  }}
                  value={callRequest.machineId}
                  onChange={(e) =>
                    setCallRequest({
                      ...callRequest,
                      machineId: e.target.value,
                    })
                  }
                >
                  <option value="">Choose a Node...</option>
                  {(machines || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="input-group" style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "bold",
                    color: "var(--navy-dark)",
                  }}
                >
                  Preferred Time
                </label>
                <input
                  type="datetime-local"
                  className="std-input"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                  }}
                  value={callRequest.preferredTime}
                  onChange={(e) =>
                    setCallRequest({
                      ...callRequest,
                      preferredTime: e.target.value,
                    })
                  }
                />
              </div>
              <button
                className="btn btn-primary"
                style={{ width: "100%" }}
                onClick={handleScheduleCall}
              >
                Schedule Now
              </button>
            </div>
          </div>
        </div>
      )}

      {showDocModal && (
        <div className="modal-overlay">
          <div className="diagnosis-modal" style={{ width: "650px" }}>
            <div className="modal-header-v2">
              <h3>Technical Resource Library</h3>
              <button
                className="btn-icon-label"
                onClick={() => setShowDocModal(false)}
              >
                Close
              </button>
            </div>
            <div className="modal-body-v2" style={{ padding: 0 }}>
              <div
                style={{
                  padding: "20px",
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <input
                  type="text"
                  className="table-search"
                  placeholder="Search manuals, schematics, safety docs..."
                  style={{ width: "100%" }}
                />
              </div>
              <div
                style={{
                  maxHeight: "400px",
                  overflowY: "auto",
                  padding: "10px",
                }}
              >
                {docLibrary.map((doc) => (
                  <div
                    key={doc.id}
                    className="glass-panel"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "15px",
                      padding: "15px",
                      marginBottom: "10px",
                      background: "white",
                    }}
                  >
                    <span style={{ fontSize: "2rem" }}>
                      {doc.type === "PDF" ? "📕" : "📘"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, color: "var(--navy-dark)" }}>
                        {doc.title}
                      </h4>
                      <small style={{ color: "#64748b" }}>
                        {doc.type} • {doc.size}
                      </small>
                    </div>
                    <button
                      className="btn-small-text"
                      style={{
                        color: "var(--navy-primary)",
                        fontWeight: "bold",
                      }}
                      onClick={() => alert(`Downloading ${doc.title}...`)}
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // --- VIEW 0: AUTH CHECKING (PREVENT FLICKERING) ---
  if (authChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // --- VIEW 1: PROFESSIONAL LANDING PAGE ---
  if (view === "landing") {
    return (
      <div className="bg-white min-h-screen selection:bg-teal-100 selection:text-teal-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
        {/* NAVBAR */}
        <nav className={`nav-sticky ${scrolled ? "scrolled" : ""} bg-white/80 backdrop-blur-md sticky top-0 z-[1000] border-b border-slate-200`}>
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate("/")}>
              <Settings className="text-[#0d9488]" size={24} strokeWidth={2.5} />
              <span className="text-2xl font-bold tracking-tight text-slate-900">IndEase</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8 px-4 flex-1 justify-center">
               <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Features</button>
               <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">How It Works</button>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <button onClick={() => {
                const el = document.getElementById("platform-access");
                el?.scrollIntoView({ behavior: "smooth" });
              }} className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors hidden sm:block">
                Log In
              </button>
              <button 
                onClick={() => {
                  const el = document.getElementById("platform-access");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm"
              >
                Get Started
              </button>
            </div>
          </div>
        </nav>

        {/* HERO SECTION */}
        <section className="relative pt-24 pb-32 overflow-hidden flex items-center justify-center min-h-[600px] border-b border-slate-200" style={{ background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' }}>
          <div className="relative z-10 max-w-4xl mx-auto px-4 text-center px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold tracking-wide uppercase mb-8 mx-auto shadow-sm">
                <Settings size={14} className="text-blue-400" />
                AI-Powered Industrial Repair Platform
              </div>
              <h1 className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight mb-6">
                Connect Legacy Machines with <span className="text-blue-400">Expert Repair</span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 mb-10 max-w-3xl mx-auto font-medium">
                Upload a video of your faulty industrial machine. Our AI identifies the issue and instantly connects you with the right repair expert — nearby, top-rated, or available.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-slate-900 text-base font-bold hover:bg-slate-100 transition-colors shadow-lg flex items-center justify-center gap-2 group"
                  onClick={() => {
                    const el = document.getElementById("platform-access");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Report an Issue <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-transparent border-2 border-white/30 text-white text-base font-bold hover:bg-white/10 transition-colors"
                  onClick={() => {
                    const el = document.getElementById("platform-access");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Join as Expert
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* STATS BAR */}
        <section className="bg-white border-b border-slate-200">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-slate-200 text-center">
                 {[
                   { value: "500+", label: "Machines Repaired" },
                   { value: "200+", label: "Verified Experts" },
                   { value: "98%", label: "Resolution Rate" },
                   { value: "24hr", label: "Avg Response Time" },
                 ].map((stat, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="px-4"
                    >
                       <div className="text-3xl font-black text-[#0d9488] tracking-tight">{stat.value}</div>
                       <div className="text-sm font-semibold text-slate-500 uppercase tracking-widest mt-1">{stat.label}</div>
                    </motion.div>
                 ))}
              </div>
           </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">Everything You Need</h2>
              <p className="text-lg text-slate-600">
                A complete platform to diagnose, connect, and resolve industrial machine issues.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
               {[
                 { icon: <Video size={24} />, title: "Video-Based Reporting", desc: "Upload a video of your faulty machine and describe the issue. Our AI processes both visual and text inputs." },
                 { icon: <Brain size={24} />, title: "AI-Powered Analysis", desc: "Advanced AI identifies machine type, detects visible faults, and extracts keywords from your description." },
                 { icon: <Users size={24} />, title: "Smart Expert Matching", desc: "Priority-based algorithm finds nearby experts first, then top-rated ones, ensuring no request goes unresolved." },
                 { icon: <MessageSquare size={24} />, title: "Real-Time Chat", desc: "Communicate directly with assigned experts. Share additional media and discuss repair plans." },
                 { icon: <CreditCard size={24} />, title: "Secure Payments", desc: "Integrated payment system with platform fee handling, GST calculation, and expert payout management." },
                 { icon: <FileText size={24} />, title: "Invoice & Records", desc: "Auto-generated invoices and complete service history stored in your profile for future reference." },
               ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ y: -4, boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}
                    className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm transition-shadow"
                  >
                     <div className="w-12 h-12 rounded-xl bg-teal-50 text-[#0d9488] flex items-center justify-center mb-6">
                        {feature.icon}
                     </div>
                     <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                     <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                  </motion.div>
               ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className="py-24 bg-slate-50 border-y border-slate-200">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">How It Works</h2>
              <p className="text-lg text-slate-600">
                From issue to resolution in four simple steps.
              </p>
            </div>
            
            <div className="grid md:grid-cols-4 gap-8 relative">
               {/* Arrows between steps (desktop only) */}
               <div className="hidden md:block absolute top-[60px] left-[20%] right-[20%] h-0.5 bg-slate-200" />
               
               {[
                 { num: "01", title: "Upload Issue", desc: "Record and upload a video of the faulty machine with a description" },
                 { num: "02", title: "AI Analyzes", desc: "Our AI identifies the machine type, fault, and required expertise" },
                 { num: "03", title: "Expert Matched", desc: "System finds the nearest or best available repair expert for you" },
                 { num: "04", title: "Service Done", desc: "Expert repairs your machine, payment processed, invoice generated" },
               ].map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.15 }}
                    className="relative text-center"
                  >
                     <div className="w-16 h-16 mx-auto bg-white border-2 border-[#0d9488] rounded-full flex items-center justify-center text-[#0d9488] text-xl font-extrabold shadow-sm relative z-10 mb-6">{step.num}</div>
                     <h3 className="text-lg font-bold text-slate-900 mb-3">{step.title}</h3>
                     <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                  </motion.div>
               ))}
            </div>
           </div>
        </section>

        {/* CTA SECTION */}
        <section className="py-24" style={{ background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' }}>
           <div className="max-w-4xl mx-auto px-4 text-center">
              <h2 className="text-4xl font-extrabold text-white tracking-tight mb-6">Ready to Fix Your Machine?</h2>
              <p className="text-xl text-slate-300 font-medium mb-10">Join IndEase today and get connected with verified industrial repair experts.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                 <button
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-slate-900 text-base font-bold hover:bg-slate-100 transition-colors shadow-lg"
                  onClick={() => {
                    const el = document.getElementById("platform-access");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                 >
                    Get Started Free
                 </button>
                 <button
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-transparent border-2 border-white/30 text-white text-base font-bold hover:bg-white/10 transition-colors"
                  onClick={() => {
                    const el = document.getElementById("platform-access");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                 >
                    Register as Expert
                 </button>
              </div>
           </div>
        </section>

        {/* PLATFORM ACCESS */}
        <section id="platform-access" className="py-24 bg-slate-100 border-t border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
               <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Select Your Role</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl transition-all"
              >
                <div className="w-16 h-16 bg-teal-50 text-[#0d9488] rounded-2xl flex items-center justify-center mb-8">
                  <Cpu size={32} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Fleet Operator</h3>
                <p className="text-slate-600 mb-8 leading-relaxed">
                  Register industrial assets, track maintenance cycles, report issues, and connect with verified service experts.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    className="w-full py-3.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm"
                    onClick={() => navigateToAuth("consumer", true)}
                  >
                    Log In
                  </button>
                  <button
                    className="w-full py-3.5 rounded-xl bg-slate-50 text-slate-900 border border-slate-200 text-sm font-bold hover:bg-slate-100 transition-colors"
                    onClick={() => navigateToAuth("consumer", false)}
                  >
                    Sign Up
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl transition-all"
              >
                <div className="w-16 h-16 bg-teal-50 text-[#0d9488] rounded-2xl flex items-center justify-center mb-8">
                  <Shield size={32} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Service Expert</h3>
                <p className="text-slate-600 mb-8 leading-relaxed">
                  Receive service requests, provide repairs, manage your schedule, and get paid securely.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    className="w-full py-3.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm"
                    onClick={() => navigateToAuth("producer", true)}
                  >
                    Log In as Expert
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 py-12 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => {
                navigate("/");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}>
               <Settings className="text-[#0d9488]" size={20} strokeWidth={2.5} />
              <div className="text-xl font-bold text-white tracking-tight">IndEase</div>
            </div>
            
            <div className="flex items-center gap-6 text-sm font-medium text-slate-400">
               <button onClick={() => navigate("/terms")} className="hover:text-white transition-colors">Terms</button>
               <button onClick={() => navigate("/privacy")} className="hover:text-white transition-colors">Privacy</button>
               <a href="mailto:support@originode.com" className="hover:text-white transition-colors">Contact</a>
            </div>
            
            <p className="text-sm font-medium text-slate-500">
              © 2026 IndEase. All rights reserved.
            </p>
          </div>
        </footer>
        {sharedModals}
      </div>
    );
  }

  // VIEW 2: REDESIGNED AUTHENTICATION PORTAL (SaaS Style)
  if (view === "auth" || view === "forgot") {
    const authTitle =
      view === "forgot" ? "Reset Password" : isLogin ? "Log In" : "Sign Up";
    const roleLabel = role === "consumer" ? "Fleet Operator" : "Service Expert";

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex items-center gap-2 justify-center cursor-pointer mb-6" onClick={() => navigate("/")}>
              <Settings className="text-[#0d9488]" size={22} strokeWidth={2.5} />
              <span className="text-2xl font-bold text-slate-900">IndEase</span>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-slate-900">
              {authTitle}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{roleLabel} Portal</p>
          </div>

          <motion.div
            className="bg-white py-8 px-6 shadow-lg rounded-3xl sm:px-10 border border-slate-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {view === "forgot" ? (
              <div className="space-y-6">
                {recoverySent ? (
                  <div className="text-center space-y-6 animate-fade-in">
                    <div
                      className={`w-16 h-16 ${role === "consumer" ? "bg-teal-50 text-teal-600" : "bg-indigo-50 text-indigo-600"} rounded-full flex items-center justify-center mx-auto mb-4`}
                    >
                      <MailIcon size={32} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        Recovery Email Sent
                      </h3>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        If an account exists with this email, a password reset
                        link has been sent.
                      </p>
                      <p className="text-xs text-slate-400">
                        Please check your inbox and follow the link to reset
                        your password.
                      </p>
                    </div>
                    <button
                      className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white ${role === "consumer" ? "bg-teal-600 hover:bg-teal-700 focus:ring-teal-500" : "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"} focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors`}
                      onClick={() => {
                        setView("auth");
                        setRecoverySent(false);
                      }}
                    >
                      Back to Login
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="email-address"
                          className="block text-sm font-medium text-slate-700 mb-1"
                        >
                          Email Address
                        </label>
                        <input
                          id="email-address"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          className={`appearance-none block w-full px-3 py-2 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${role === "consumer" ? "teal-500" : "indigo-500"} focus:border-${role === "consumer" ? "teal-500" : "indigo-500"} sm:text-sm`}
                          placeholder="name@industrial.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <button
                      className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white ${role === "consumer" ? "bg-teal-600 hover:bg-teal-700 focus:ring-teal-500" : "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"} focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors`}
                      onClick={handleLogin}
                    >
                      Send Recovery Link
                    </button>
                    <div className="text-center text-sm">
                      <button
                        type="button"
                        onClick={() => setView("auth")}
                        className={`font-medium ${role === "consumer" ? "text-teal-600 hover:text-teal-500" : "text-indigo-600 hover:text-indigo-500"} transition-colors`}
                      >
                        Back to Login
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                {isLogin ? (
                  <div className="space-y-6">
                    <div>
                      <label
                        htmlFor="email-address"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Email Address
                      </label>
                      <input
                        id="email-address"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className={`appearance-none block w-full px-3 py-2 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${role === "consumer" ? "teal-500" : "indigo-500"} focus:border-${role === "consumer" ? "teal-500" : "indigo-500"} sm:text-sm`}
                        placeholder="name@industrial.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label
                          htmlFor="password"
                          className="block text-sm font-medium text-slate-700"
                        >
                          Password
                        </label>
                        <button
                          type="button"
                          className={`text-xs font-semibold ${role === "consumer" ? "text-teal-600 hover:text-teal-500" : "text-indigo-600 hover:text-indigo-500"} transition-colors`}
                          onClick={() => setView("forgot")}
                        >
                          Forgot your password?
                        </button>
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        className={`appearance-none block w-full px-3 py-2 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${role === "consumer" ? "teal-500" : "indigo-500"} focus:border-${role === "consumer" ? "teal-500" : "indigo-500"} sm:text-sm`}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    {errors.server && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium text-center">
                        {errors.server}
                      </div>
                    )}
                    <button
                      className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white ${role === "consumer" ? "bg-teal-600 hover:bg-teal-700 focus:ring-teal-500" : "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"} focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors`}
                      onClick={handleLogin}
                    >
                      Continue
                    </button>

                    <button
                      className={`mt-4 w-full flex justify-center py-3 px-4 rounded-xl border border-dashed border-slate-200 text-sm font-semibold text-slate-500 hover:border-${role === "consumer" ? "teal-200 hover:text-teal-600" : "indigo-200 hover:text-indigo-600"} transition-all`}
                      onClick={handleDemoLogin}
                    >
                      Quick Demo Access
                    </button>

                    {role === "consumer" && (
                      <div className="text-center text-sm">
                        Don't have an account?{" "}
                        <button
                          type="button"
                          onClick={() => navigateToAuth(role, false)}
                          className="font-medium text-teal-600 hover:text-teal-500 transition-colors"
                        >
                          Sign Up
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label
                        htmlFor="full-name"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Full Name
                      </label>
                      <input
                        id="full-name"
                        name="fullName"
                        type="text"
                        autoComplete="name"
                        required
                        className={`appearance-none block w-full px-3 py-2 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${role === "consumer" ? "teal-500" : "indigo-500"} focus:border-${role === "consumer" ? "teal-500" : "indigo-500"} sm:text-sm`}
                        placeholder="John Doe"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="institutional-email"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Institutional Email
                      </label>
                      <input
                        id="institutional-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className={`appearance-none block w-full px-3 py-2 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${role === "consumer" ? "teal-500" : "indigo-500"} focus:border-${role === "consumer" ? "teal-500" : "indigo-500"} sm:text-sm`}
                        placeholder="name@industrial.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="secure-password"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Secure Password
                      </label>
                      <input
                        id="secure-password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        className={`appearance-none block w-full px-3 py-2 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${role === "consumer" ? "teal-500" : "indigo-500"} focus:border-${role === "consumer" ? "teal-500" : "indigo-500"} sm:text-sm`}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>

                    {role === "consumer" ? (
                      <div>
                        <label
                          htmlFor="company-name"
                          className="block text-sm font-medium text-slate-700 mb-1"
                        >
                          Company / Industry Name
                        </label>
                        <input
                          id="company-name"
                          name="companyName"
                          type="text"
                          className={`appearance-none block w-full px-3 py-2 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${role === "consumer" ? "teal-500" : "indigo-500"} focus:border-${role === "consumer" ? "teal-500" : "indigo-500"} sm:text-sm`}
                          placeholder="Enterprise Co."
                          value={extraInfo}
                          onChange={(e) => setExtraInfo(e.target.value)}
                        />
                      </div>
                    ) : (
                      <>
                        <div>
                          <label
                            htmlFor="expertise-type"
                            className="block text-sm font-medium text-slate-700 mb-1"
                          >
                            Expertise Type
                          </label>
                          <input
                            id="expertise-type"
                            name="expertiseType"
                            type="text"
                            className={`appearance-none block w-full px-3 py-2 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${role === "consumer" ? "teal-500" : "indigo-500"} focus:border-${role === "consumer" ? "teal-500" : "indigo-500"} sm:text-sm`}
                            placeholder="e.g. Hydraulics, CNC"
                            value={extraInfo}
                            onChange={(e) => setExtraInfo(e.target.value)}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="years-experience"
                            className="block text-sm font-medium text-slate-700 mb-1"
                          >
                            Years of Experience
                          </label>
                          <input
                            id="years-experience"
                            name="yearsExperience"
                            type="number"
                            className={`appearance-none block w-full px-3 py-2 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${role === "consumer" ? "teal-500" : "indigo-500"} focus:border-${role === "consumer" ? "teal-500" : "indigo-500"} sm:text-sm`}
                            placeholder="5"
                            value={yearsExp}
                            onChange={(e) => setYearsExp(e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {errors.server && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium text-center">
                        {errors.server}
                      </div>
                    )}

                    <button
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
                      onClick={handleLogin}
                    >
                      Create Account
                    </button>

                    {role === "consumer" && (
                      <p className="text-center text-sm text-slate-500">
                        By creating an account you agree to our{" "}
                        <button
                          type="button"
                          onClick={() => navigate("/terms")}
                          className="font-semibold text-teal-600 transition-colors hover:text-teal-700"
                        >
                          Terms & Conditions
                        </button>{" "}
                        and{" "}
                        <button
                          type="button"
                          onClick={() => navigate("/privacy")}
                          className="font-semibold text-teal-600 transition-colors hover:text-teal-700"
                        >
                          Privacy Policy
                        </button>
                      </p>
                    )}

                    <div className="text-center text-sm">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => navigateToAuth(role, true)}
                        className="font-medium text-teal-600 hover:text-teal-500 transition-colors"
                      >
                        Log In
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-slate-500 font-medium">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={() => { window.location.href = 'http://localhost:5000/auth/google'; }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        width: '100%',
                        maxWidth: '380px',
                        margin: '0 auto',
                        padding: '10px 16px',
                        border: '1px solid #dadce0',
                        borderRadius: '9999px',
                        background: '#fff',
                        color: '#3c4043',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        fontFamily: 'Google Sans, Roboto, sans-serif',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                        transition: 'box-shadow 0.2s',
                      }}
                      onMouseOver={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)'}
                      onMouseOut={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)'}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Sign in with Google
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
          <div className="text-center text-sm">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="font-medium text-slate-600 hover:text-slate-500 transition-colors"
            >
              ← Return to Landing Page
            </button>
          </div>
        </div>
        {sharedModals}
      </div>
    );
  }

  // --- VIEW 3: UNIFIED MODERN DASHBOARD ---
  if (view === "dashboard") {
    const renderContent = () => {
      if (role === "consumer") {
        switch (activeTab) {
          case "fleet":
            return (
              <FleetView
                machines={machines}
                notifications={notifications}
                earningsStats={earningsStats}
                chartData={chartData}
                avgContinuity={avgContinuity}
                activeRequests={activeRequests}
                setShowAddMachineModal={setShowAddMachineModal}
                setShowReportIssueModal={setShowDiagnosisModal}
                setActiveJobMachine={setActiveJobMachine}
                transactionHistory={transactionHistory}
                chats={chats}
                setActiveTab={setActiveTab}
                onViewMachine={(m) => {
                  setSelectedMachineNode(m);
                  setActiveTab("machine-details");
                }}
                onDecommission={handleDeleteMachine}
              />
            );
          case "machine-details":
            return (
              <MachineDetailView
                machine={selectedMachineNode}
                onBack={() => setActiveTab("fleet")}
                onReportFault={() => setShowDiagnosisModal(true)}
                onDecommission={() => {
                  setNodeToDelete(selectedMachineNode);
                }}
              />
            );
          case "messages":
            return (
              <MessagesView
                chats={chats}
                activeChatId={activeChatId}
                setActiveChatId={setActiveChatId}
                chatHistory={messages}
                onSendMessage={handleSendMessage}
                currentUser={{ id: role === 'producer' ? 'expert' : 'consumer', role, name: firstName }}
                onViewProfile={handleViewExpertProfile}
                paidInvoices={paidInvoices}
                onProcessPayment={handlePayment}
                jobStatus={chats.find((c) => c.id === activeChatId)?.status}
                loading={chatsLoading}
                onAppointmentAction={handleAppointmentAction}
              />
            );
          case "history":
            return (
              <HistoryView
                loading={historyLoading}
                serviceHistory={transactionHistory}
                onDownloadReport={handleDownloadReport}
                onViewReport={(item) => {
                  setSelectedReport(item);
                  setShowReportModal(true);
                }}
                onRequestService={() => {
                  const el = document.getElementById("fleet-tab");
                  if (el) el.click();
                  setActiveTab("fleet");
                  handleOpenDiagnosisModal();
                }}
              />
            );
          case "machines":
            return (
              <MachinesView
                loading={machinesLoading}
                machines={machines}
                activeRequests={activeRequests}
                setActiveTab={setActiveTab}
                setShowAddMachineModal={handleOpenAddMachine}
                onViewMachine={(m) => {
                  /* Optional: could handle detailed view if established */
                }}
                setActiveJobMachine={setActiveJobMachine}
                setShowReportIssueModal={handleOpenDiagnosisModal}
              />
            );
          case "my-requests":
            return (
              <MyRequestsView
                requests={activeRequests}
                loading={requestsLoading}
                onOpenChat={(reqId) => {
                  setActiveChatId(reqId);
                  setActiveTab('messages');
                }}
                onCancelRequest={handleCancelRequest}
                onViewInvoice={(item) => {
                  setSelectedReport(item);
                  setShowReportModal(true);
                }}
                onRateExpert={(req) => {
                  setActiveTab('history');
                }}
                onViewQuotes={handleViewQuotes}
                onConfirmComplete={handleConsumerConfirmComplete}
                onRaiseFollowUp={handleRaiseFollowUp}
                onGoToMachines={() => setActiveTab('machines')}
              />
            );
          case "profile":
            return (
              <ProfileView
                user={{
                  firstName,
                  lastName,
                  extraInfo,
                  phone,
                  taxId,
                  userPhoto,
                }}
                isEditing={isEditingProfile}
                setIsEditing={setIsEditingProfile}
                onSave={(updatedUser) => {
                  setFirstName(updatedUser.firstName);
                  setLastName(updatedUser.lastName);
                  setPhone(updatedUser.phone);
                  setExtraInfo(updatedUser.organization);
                  handleSaveConsumerProfile(updatedUser);
                }}
                onPhotoUpload={handlePhotoUpload}
                onStartCamera={startCamera}
                onDeleteIdentity={() => setShowDeleteModal(true)}
              />
            );
          case "help":
          case "support":
            return <SupportView user={{ firstName, lastName, email, name: `${firstName} ${lastName}`.trim() }} />;
          case "settings":
            return (
              <SettingsView
                role={role}
                user={getStoredUser()}
                onLogout={handleLogout}
              />
            );
          default:
            return (
              <FleetView
                machines={machines}
                notifications={notifications}
                earningsStats={earningsStats}
                chartData={chartData}
                avgContinuity={avgContinuity}
                activeRequests={activeRequests}
                expertPresence={expertPresence}
                verifiedExperts={verifiedExperts}
                setShowAddMachineModal={handleOpenAddMachine}
                setShowReportIssueModal={handleOpenDiagnosisModal}
                transactionHistory={transactionHistory}
                chats={chats}
                setActiveTab={setActiveTab}
                onCancelRequest={handleCancelRequest}
                onDecommission={handleDeleteMachine}
              />
            );
        }
      } else {
        // Producer views
        switch (activeTab) {
          case "fleet":
            return (
              <ProducerDashboard
                loading={requestsLoading}
                stats={producerDashStats}
                radarJobs={radarJobs}
                user={{
                  firstName,
                  lastName,
                  photo: userPhoto,
                  id: profileData.id,
                }}
                onAcceptJob={handleAcceptJob}
                onDeclineJob={handleDeclineJob}
                onJoinWaitlist={handleJoinWaitlist}
                onViewDetails={handleViewJobDetails}
              />
            );
          case "incoming-requests":
            return (
              <IncomingRequestsView
                loading={requestsLoading}
                radarJobs={radarJobs}
                onAcceptJob={handleAcceptJob}
                onDeclineJob={handleDeclineJob}
                onJoinWaitlist={handleJoinWaitlist}
                onViewDetails={handleViewJobDetails}
              />
            );
          case "performance":
            return <PerformanceView userId={profileData.id} />;
          case "active-jobs":
            return (
              <ActiveJobsView
                activeJobs={activeJobs}
                isDemo={isDemo}
                onProgressUpdate={handleUpdateJobProgress}
                onMarkArrived={handleMarkArrived}
                onMarkStarted={handleMarkStarted}
                onMarkDone={handleMarkDone}
                onMarkComplete={handleMarkJobComplete}
                onOpenChat={(jobId) => {
                  const chat = producerChats.find(c => c.jobId === jobId || c.id === jobId);
                  if (chat) setActiveChatId(chat.id || chat.jobId);
                  setActiveTab('messages');
                }}
              />
            );
          case "messages":
            return (
              <MessagesView
                chats={producerChats}
                activeChatId={activeChatId}
                setActiveChatId={setActiveChatId}
                chatHistory={messages}
                onSendMessage={handleSendMessage}
                currentUser={{ id: "expert", name: firstName }}
                onViewProfile={handleViewExpertProfile}
                jobStatus={
                  producerChats.find((c) => c.id === activeChatId)?.status
                }
                onStartWork={handleExpertStartWork}
                onMarkComplete={handleExpertMarkComplete}
                loading={chatsLoading}
                onAppointmentAction={handleAppointmentAction}
              />
            );
          case "history":
            return (
              <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Total Revenue (INR)
                    </p>
                    <h3 className="text-4xl font-extrabold text-slate-900">
                      ₹{producerDashStats.earnings.toLocaleString()}
                    </h3>
                  </div>
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Jobs Completed
                    </p>
                    <h3 className="text-4xl font-extrabold text-slate-900">
                      {producerDashStats.completedJobs}
                    </h3>
                  </div>
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Expert Rating
                    </p>
                    <h3 className="text-4xl font-extrabold text-slate-900">
                      {producerDashStats.rating.toFixed(1)}/5.0
                    </h3>
                  </div>
                </div>
                <HistoryView
                  loading={historyLoading}
                  serviceHistory={transactionHistory}
                  onDownloadReport={handleDownloadReport}
                  onViewReport={(item) => {
                    setSelectedReport(item);
                    setShowReportModal(true);
                  }}
                />
              </div>
            );

          case "profile":
            return (
              <ProfileView
                user={{
                  firstName: profileData.name
                    ? profileData.name.split(" ")[0]
                    : firstName,
                  lastName: profileData.name
                    ? profileData.name.split(" ")[1] || ""
                    : lastName,
                  extraInfo: profileData.role,
                  phone: profileData.phone,
                  taxId: profileData.tax_id || profileData.taxId || '',
                  userPhoto: userPhoto,
                  bankAccountNumber: profileData.bankAccountNumber,
                  ifscCode: profileData.ifscCode,
                  accountHolderName: profileData.accountHolderName,
                  role: "producer",
                }}
                isEditing={isEditingProfile}
                setIsEditing={setIsEditingProfile}
                onSave={(newData) => {
                  setProfileData({ ...profileData, ...newData });
                  handleSaveConsumerProfile(newData);
                  const complete = !!(
                    newData.firstName?.trim() &&
                    newData.phone?.trim()
                  );
                  setShowCompleteProfileBanner(!complete);
                }}
                onPhotoUpload={handlePhotoUpload}
                onStartCamera={startCamera}
                onDeleteIdentity={() => setShowDeleteModal(true)}
                isProducer={true}
              />
            );
          case "help":
          case "support":
            return <SupportView user={{ firstName, lastName, email, name: `${firstName} ${lastName}`.trim() }} />;
          case "settings":
            return (
              <SettingsView
                role={role}
                user={getStoredUser()}
                onLogout={handleLogout}
              />
            );
          default:
            return (
              <ProducerDashboard
                loading={requestsLoading}
                stats={producerDashStats}
                radarJobs={radarJobs}
                user={{
                  firstName,
                  lastName,
                  photo: userPhoto,
                  id: profileData.id,
                }}
                onAcceptJob={handleAcceptJob}
                onDeclineJob={handleDeclineJob}
                onJoinWaitlist={handleJoinWaitlist}
                onViewDetails={handleViewJobDetails}
              />
            );
        }
      }
    };

    return (
      <>
        {!isOnline && (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                background: '#1f2937',
                color: 'white',
                padding: '10px 20px',
                textAlign: 'center',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
            }}>
                <span style={{
                    width: 8, height: 8,
                    borderRadius: '50%',
                    background: '#EF4444',
                    display: 'inline-block'
                }} />
                You are offline. Some features may not work until connection is restored.
            </div>
        )}
        {isOnline && showReconnecting && authenticated && (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                background: '#1f2937',
                color: 'white',
                padding: '10px 20px',
                textAlign: 'center',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
            }}>
                Reconnecting to real-time server...
                <span className="animate-spin">↻</span>
            </div>
        )}
      <DashboardLayout
        role={role}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={{ firstName, lastName, photo: userPhoto, email }}
        notifications={notifications}
        onLogout={handleLogout}
        onClearData={handleClearDataAndLogout}
        onClearNotifs={handleClearNotifs}
        onMarkAsRead={handleMarkNotifRead}
        onMarkAllRead={handleMarkAllNotifsRead}
        socketReconnecting={socketReconnecting}
        onSearch={handleTopBarSearch}
        searchResults={searchResults}
        onSearchResultClick={handleSearchResultClick}
        isDemo={isDemo}
        activeJobsCount={activeJobs.length}
        newRequestsCount={role === 'producer' ? radarJobs.length : 0}
        activeRequestsCount={activeRequests.filter(r => {
          const s = (r.rawStatus || r.status || '').toLowerCase();
          return s !== 'completed';
        }).length}
      >
        {showCompleteProfileBanner && role === 'consumer' && !isDemo && activeTab === 'fleet' && (
           <div className="bg-amber-50 border border-amber-200 px-6 py-4 mb-6 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm relative z-40">
              <div className="flex items-center gap-3 text-amber-800">
                 <AlertCircle size={20} className="shrink-0" />
                 <span className="text-sm font-semibold">Your profile is incomplete. Complete it to start using IndEase fully.</span>
              </div>
              <button 
                  onClick={() => setActiveTab('profile')} 
                  className="text-sm font-bold text-amber-900 flex items-center gap-1 hover:text-amber-700 whitespace-nowrap bg-amber-200/50 px-4 py-2 rounded-lg transition-colors"
              >
                 Complete Profile <ArrowRight size={16} />
              </button>
           </div>
        )}
        {sharedModals}
        {/* [NEW] Expert Job Details Modal */}
        {showJobDetailsModal && selectedJobDetails && (
          <JobDetailsModal
            job={selectedJobDetails}
            onAcceptAndChat={handleAcceptFromModal}
            onDecline={handleDeclineFromModal}
            onSubmitQuote={handleSubmitQuote}
            onClose={() => { setShowJobDetailsModal(false); setSelectedJobDetails(null); }}
          />
        )}

        {/* [NEW] Consumer Quotes Modal */}
        {showQuotesModal && (
          <div className="fixed inset-0 z-[300] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setShowQuotesModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Expert Quotes</h3>
                  <p className="text-xs text-slate-500">{quotesForRequest.length}/2 quotes received</p>
                </div>
                <button onClick={() => setShowQuotesModal(false)} className="text-slate-400 hover:text-slate-700"><X size={20}/></button>
              </div>
              <div className="p-6 space-y-5 overflow-y-auto">
                {quotesForRequest.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-4xl mb-3">⏳</p>
                    <p className="font-semibold text-slate-800">No quotes yet</p>
                    <p className="text-sm text-slate-500 mt-1">Experts are reviewing your request. You'll be notified when a quote arrives.</p>
                  </div>
                ) : quotesForRequest.map(q => (
                  <div key={q.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-lg">{q.first_name?.[0]}</div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{q.first_name}</p>
                          <p className="text-[11px] text-slate-500">⭐ {Number(q.rating||5).toFixed(1)} · {q.level||'Starter'} · {q.jobs_completed} jobs done</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">₹{Number(q.amount).toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-slate-400 uppercase">total</p>
                      </div>
                    </div>
                    {q.diagnosis_note && (
                      <div className="px-4 pt-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Expert's Assessment</p>
                        <p className="text-sm text-slate-700 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 italic">"{q.diagnosis_note}"</p>
                      </div>
                    )}
                    {q.scope_of_work && (
                      <div className="px-4 pt-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">What Will Be Done</p>
                        <p className="text-sm text-slate-700">{q.scope_of_work}</p>
                      </div>
                    )}
                    <div className="px-4 pt-3 grid grid-cols-3 gap-2">
                      {q.estimated_hours && <div className="bg-slate-50 rounded-xl p-3 text-center"><p className="text-[9px] font-bold text-slate-400 uppercase">Duration</p><p className="text-sm font-bold text-slate-900 mt-0.5">{q.estimated_hours}h</p></div>}
                      {q.available_date && <div className="bg-slate-50 rounded-xl p-3 text-center"><p className="text-[9px] font-bold text-slate-400 uppercase">Available</p><p className="text-xs font-bold text-slate-900 mt-0.5">{new Date(q.available_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} {q.available_slot ? `· ${q.available_slot}`:''}</p></div>}
                      {q.visit_type && <div className="bg-slate-50 rounded-xl p-3 text-center"><p className="text-[9px] font-bold text-slate-400 uppercase">Visit</p><p className="text-sm font-bold text-slate-900 mt-0.5 capitalize">{q.visit_type}</p></div>}
                    </div>
                    {(q.labour_cost || q.parts_cost) && (
                      <div className="mx-4 mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cost Breakdown</p>
                        {q.labour_cost && <div className="flex justify-between text-xs"><span className="text-slate-600">Labour</span><span className="font-semibold">₹{Number(q.labour_cost).toLocaleString('en-IN')}</span></div>}
                        {q.parts_cost && <div className="flex justify-between text-xs"><span className="text-slate-600">Parts {q.parts_included===false?'(may vary)':''}</span><span className="font-semibold">₹{Number(q.parts_cost).toLocaleString('en-IN')}</span></div>}
                        <div className="border-t border-slate-200 pt-1 flex justify-between text-xs font-bold"><span>Total</span><span>₹{Number(q.amount).toLocaleString('en-IN')}</span></div>
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <button onClick={() => handleApproveQuote(q.id)}
                        className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm">
                        ✓ Approve & Pay ₹{Number(q.amount).toLocaleString('en-IN')}
                      </button>
                      <button onClick={() => { setShowQuotesModal(false); setActiveTab('messages'); }}
                        className="w-full h-9 text-slate-500 text-xs font-medium hover:text-slate-700">
                        💬 Ask a question first (open chat)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <AnimatePresence>
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}
        </AnimatePresence>
        <div className="animate-fade-in">
          {role === "producer" &&
            !isDemo &&
            activeTab === "fleet" && (!profileData.bankAccountNumber || !profileData.ifscCode) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="mb-6 overflow-hidden"
              >
                <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-amber-900 leading-none mb-1">
                        Bank details not set up
                      </h4>
                      <p className="text-[11px] font-medium text-amber-700">
                        Complete payout setup to receive earnings and bonuses
                        directly to your bank account.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCompleteProfileModal(true)}
                    className="px-4 py-2 bg-amber-600 text-white text-[11px] font-bold rounded-lg hover:bg-amber-700 transition-colors shadow-sm shadow-amber-200"
                  >
                    Add Bank Details
                  </button>
                </div>
              </motion.div>
            )}
          {renderContent()}
        </div>
        <AnimatePresence>
          {showExpertTermsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 px-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                className="w-full max-w-2xl rounded-[2rem] bg-white p-8 shadow-2xl"
              >
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-teal-600">
                      Expert Agreement
                    </p>
                    <h2 className="text-3xl font-extrabold text-slate-900">
                      Please review and accept our Terms & Conditions
                    </h2>
                    <p className="text-base text-slate-500">
                      You must accept these terms before continuing to the
                      expert dashboard.
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-teal-100 bg-teal-50/70 p-6">
                    <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-teal-700">
                      Key points
                    </p>
                    <div className="space-y-3">
                      {[
                        "You must respond to requests within 24 hours.",
                        "Declining requests will affect your performance level.",
                        "IndEase takes 10% platform fee from each job.",
                        "Monthly salary is based on your performance level.",
                        "Inactivity for 10 days will reduce your points.",
                      ].map((point) => (
                        <p key={point} className="text-base text-slate-700">
                          {point}
                        </p>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/terms")}
                    className="text-left text-sm font-semibold text-teal-600 transition-colors hover:text-teal-700"
                  >
                    Review full Terms & Conditions
                  </button>

                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                    <input
                      type="checkbox"
                      checked={expertTermsChecked}
                      onChange={(event) =>
                        setExpertTermsChecked(event.target.checked)
                      }
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      I have read and agree to the Terms & Conditions
                    </span>
                  </label>

                  <button
                    type="button"
                    disabled={!expertTermsChecked}
                    onClick={handleExpertTermsAccept}
                    className="w-full rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Accept and Continue
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCompleteProfileModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                className="relative w-full max-w-xl overflow-hidden rounded-[2.5rem] bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-slate-100 font-['Outfit',_sans-serif]"
              >
                {/* Back Button */}
                <button
                  onClick={() => setShowPayoutSkipConfirm(true)}
                  className="absolute top-8 left-8 p-3 rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all z-20"
                >
                  <ChevronLeft size={20} />
                </button>

                {/* Header Gradient */}
                <div className="h-2 bg-gradient-to-r from-teal-600 via-indigo-600 to-violet-600" />

                <div className="p-8 md:p-12 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-teal-50 to-indigo-50 text-teal-600 rounded-[1.75rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <CreditCard size={40} strokeWidth={1.5} />
                  </div>

                  <div className="space-y-3 mb-10">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                      Set up payouts (optional)
                    </h2>
                    <p className="text-slate-500 font-semibold text-base">
                      You can complete this later anytime.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left mb-10">
                    <div className="md:col-span-2 space-y-2">
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-[11px] font-black text-slate-400 tracking-[0.2em] flex items-center gap-1.5">
                          <Lock size={10} className="text-slate-300" /> Account Holder Name
                        </label>
                        {bankDetailsErrors.accountHolderName && (
                          <span className="text-[10px] font-bold text-red-500">
                            {bankDetailsErrors.accountHolderName}
                          </span>
                        )}
                      </div>
                      <input
                        className={cn(
                          "w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 transition-all text-sm font-bold placeholder:text-slate-300 shadow-sm",
                          bankDetailsErrors.accountHolderName
                            ? "border-red-100 focus:border-red-500 focus:ring-red-500/5 bg-red-50/30"
                            : "border-slate-100 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/5",
                        )}
                        placeholder="Full name as per bank records"
                        value={bankDetailsForm.accountHolderName}
                        onChange={(e) => {
                          setBankDetailsForm({
                            ...bankDetailsForm,
                            accountHolderName: e.target.value,
                          });
                          if (bankDetailsErrors.accountHolderName)
                            setBankDetailsErrors((p) => ({
                              ...p,
                              accountHolderName: "",
                            }));
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-[11px] font-black text-slate-400 tracking-[0.2em] flex items-center gap-1.5">
                          <Lock size={10} className="text-slate-300" /> Account Number
                        </label>
                      </div>
                      <input
                        className={cn(
                          "w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 transition-all text-sm font-bold placeholder:text-slate-300 shadow-sm",
                          bankDetailsErrors.bankAccountNumber
                            ? "border-red-100 focus:border-red-500 focus:ring-red-500/5 bg-red-50/30"
                            : "border-slate-100 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/5",
                        )}
                        placeholder="Enter 9–18 digit account number"
                        value={bankDetailsForm.bankAccountNumber}
                        onChange={(e) =>
                          handleFormatAccountNumber(e.target.value)
                        }
                      />
                      {bankDetailsErrors.bankAccountNumber && (
                        <span className="text-[10px] font-bold text-red-500 ml-1">
                          {bankDetailsErrors.bankAccountNumber}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-[11px] font-black text-slate-400 tracking-[0.2em] flex items-center gap-1.5">
                          <Lock size={10} className="text-slate-300" /> IFSC Code
                        </label>
                      </div>
                      <input
                        className={cn(
                          "w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 transition-all text-sm font-bold placeholder:text-slate-300 shadow-sm uppercase",
                          bankDetailsErrors.ifscCode
                            ? "border-red-100 focus:border-red-500 focus:ring-red-500/5 bg-red-50/30"
                            : "border-slate-100 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/5",
                        )}
                        placeholder="SBIN0001234"
                        value={bankDetailsForm.ifscCode}
                        onChange={(e) => handleIFSCChange(e.target.value)}
                      />
                      {bankDetailsErrors.ifscCode && (
                        <span className="text-[10px] font-bold text-red-500 ml-1">
                          {bankDetailsErrors.ifscCode}
                        </span>
                      )}
                    </div>

                    {bankDetailsErrors.server && (
                      <div className="md:col-span-2 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold">
                        <AlertCircle size={14} /> {bankDetailsErrors.server}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={handleSaveBankDetails}
                      disabled={
                        !bankDetailsForm.accountHolderName ||
                        !bankDetailsForm.bankAccountNumber ||
                        !bankDetailsForm.ifscCode
                      }
                      className="group relative w-full h-16 overflow-hidden rounded-2xl bg-slate-900 text-white font-bold text-base shadow-2xl shadow-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="relative z-10 flex items-center justify-center gap-2 text-base">
                        Save Bank Details <ArrowRight size={20} />
                      </span>
                    </button>

                    <button
                      onClick={() => setShowPayoutSkipConfirm(true)}
                      className="w-full text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors py-2"
                    >
                      Skip for now
                    </button>


                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPayoutSkipConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm px-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 text-center"
              >
                <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <InfoIcon size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">
                  Complete later?
                </h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
                  You can finish setting up payouts anytime from your profile
                  settings.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setShowPayoutSkipConfirm(false)}
                    className="h-12 rounded-xl border-2 border-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
                  >
                    Stay
                  </button>
                  <button
                    onClick={() => {
                      setHasSkippedPayout(true);
                      setShowPayoutSkipConfirm(false);
                      setShowCompleteProfileModal(false);
                      setToast({
                        message:
                          "Dashboard access granted. Complete payout setup later.",
                        type: "info",
                      });
                    }}
                    className="h-12 rounded-xl bg-[#0d9488] text-white font-bold text-sm hover:bg-teal-700 transition-all"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Escrow: Expert Started Work — Confirm Arrival Modal ───────── */}
        <AnimatePresence>
          {pendingArrivalConfirmation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm px-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-100"
              >
                <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Wrench size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 text-center mb-2">
                  Expert Has Arrived
                </h3>
                <p className="text-sm text-slate-500 text-center mb-6">
                  <strong>{pendingArrivalConfirmation.expertName}</strong> has started work on your request.
                  Please confirm their arrival to release the first payment milestone.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handleConfirmArrival(pendingArrivalConfirmation.jobId)}
                    className="w-full h-12 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition-all"
                  >
                    ✓ Yes, Confirm Arrival
                  </button>
                  <button
                    onClick={() => openDisputeForm(pendingArrivalConfirmation.jobId)}
                    className="w-full h-12 rounded-xl border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-all"
                  >
                    Raise Dispute
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Escrow: Expert Marked Done — Confirm Completion Modal ─────── */}
        <AnimatePresence>
          {pendingCompletionConfirmation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm px-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-100"
              >
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 text-center mb-2">
                  Expert Marked Work Complete
                </h3>
                <p className="text-sm text-slate-500 text-center mb-6">
                  <strong>{pendingCompletionConfirmation.expertName}</strong> says the work is done.
                  Confirm to release the final payment milestone.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handleConfirmCompletion(pendingCompletionConfirmation.jobId)}
                    className="w-full h-12 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all"
                  >
                    ✓ Yes, Work is Complete
                  </button>
                  <button
                    onClick={() => openDisputeForm(pendingCompletionConfirmation.jobId)}
                    className="w-full h-12 rounded-xl border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-all"
                  >
                    Raise Dispute
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Escrow: Dispute Form Modal ────────────────────────────────── */}
        <AnimatePresence>
          {showDisputeForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[310] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm px-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-100"
              >
                {disputeSuccess ? (
                  <>
                    <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <AlertCircle size={32} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 text-center mb-2">
                      Dispute Raised
                    </h3>
                    <p className="text-sm text-slate-500 text-center mb-6">
                      Your dispute has been submitted. Escrow is now frozen. Admin will review within 24 hours.
                    </p>
                    <button
                      onClick={() => { setShowDisputeForm(false); setDisputeSuccess(false); }}
                      className="w-full h-12 rounded-xl bg-slate-800 text-white font-bold text-sm hover:bg-slate-900 transition-all"
                    >
                      Close
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <AlertCircle size={32} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 text-center mb-2">
                      Raise a Dispute
                    </h3>
                    <p className="text-sm text-slate-500 text-center mb-4">
                      Describe the issue clearly. Escrow will be frozen until admin reviews.
                    </p>
                    <textarea
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="Describe the issue..."
                      rows={4}
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-red-300 mb-4"
                    />
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={handleRaiseDispute}
                        disabled={disputeSubmitting}
                        className="w-full h-12 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-all disabled:opacity-60"
                      >
                        {disputeSubmitting ? 'Submitting…' : 'Submit Dispute'}
                      </button>
                      <button
                        onClick={() => setShowDisputeForm(false)}
                        disabled={disputeSubmitting}
                        className="w-full text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors py-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </DashboardLayout>
      </>
    );
  }

  // --- FALLBACK RENDER (SHOULD NOT BE REACHED IF VIEW IS LANDING OR DASHBOARD) ---
  return null;
}

export default App;
