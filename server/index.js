process.env.NODE_NO_WARNINGS = '1';
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import session from "express-session";
import { createServer } from "http";
import { Server } from "socket.io";
import db from "./config/db.js";
import passport from "./config/passport.js";
import authRoutes from "./routes/auth.routes.js";
import paymentRoutes from "./routes/payment.js";
import jobRoutes from "./routes/jobRoutes.js";
import financeRoutes from "./routes/financeRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import machineRoutes from "./routes/machineRoutes.js";
import { saveMessage } from "./controllers/chatController.js";
import adminRouter, { ensureAdminSchema } from "./routes/admin.js";
import adminNotificationsRoutes from "./routes/notifications.routes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import providerRoutes from "./routes/providerRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";
import { ensureExpertPerformanceSchema } from "./services/expertPerformanceSchema.js";
import { ensurePaymentSchema } from "./services/paymentSchema.js";
import { startExpertPerformanceCron } from "./services/expertPerformanceService.js";
import { releaseMaturedHolds } from './services/holdReleaseScheduler.js';
import { ensureDemoSchema, ensureDemoAccounts, seedDemoData } from "./services/demoService.js";
import demoRoutes from "./routes/demoRoutes.js";
import healthRouter from './routes/healthRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';
import cron from 'node-cron';
import { releaseMilestone1, releaseMilestone2 } from './services/escrowService.js';
import * as notificationController from './controllers/notificationController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  ...(process.env.CLIENT_URL || "").split(",").map((s) => s.trim()).filter(Boolean),
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

app.set("socketio", io);
global.io = io; // For controllers to access without req object

// 1. GLOBAL MIDDLEWARE
app.use(
  helmet({
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  }),
);

// Force COOP: unsafe-none so Google OAuth popup can postMessage back
// Without this, browsers block window.postMessage from accounts.google.com
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  next();
});

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
    exposedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
  }),
);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.JWT_SECRET || "originode_session_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());

// ── Static file serving for uploads (MUST be before route definitions) ────────
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 2. ROUTES
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/machines", machineRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin/notifications", adminNotificationsRoutes);
app.use("/api/analytics", adminRouter);

app.use('/api/admin/health', healthRouter);
app.use("/api/admin", adminRouter);
app.use("/api/reviews", reviewRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/demo", demoRoutes);
import aiRoutes from './routes/aiRoutes.js';
app.use('/api/ai', aiRoutes);

// Upload route
app.use('/api/upload', uploadRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// 3. ERROR HANDLING
app.use(errorHandler);

// 4. REAL-TIME SIGNALS
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
    if (socket.data.userId) {
      io.emit("expert_offline", { userId: socket.data.userId });
    }
  });
  socket.on("identify", (userId) => {
    socket.join(`user_${userId}`);
    socket.data.userId = userId;
    console.log(`[Socket] Registered user room: user_${userId}`);
    io.emit("expert_online", { userId });
  });

  socket.on("send_message", async (data) => {
    const { requestId, senderId, text } = data;
    console.log(
      `[Socket] Incoming signal in session ${requestId} from source ${senderId}`,
    );
    const saved = await saveMessage(requestId, senderId, text);
    io.emit("new_message", saved);
  });
});

async function startServer() {
  const PORT = process.env.PORT || 5000;

  // ── Boot the HTTP server immediately so the process never hard-crashes ──────
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `[Startup] Port ${PORT} is already in use. Free it with: npx kill-port ${PORT}`,
      );
      process.exit(1);
    }
  });

  server.listen(PORT, () => {
    console.log(`[Startup] HTTP server listening on port ${PORT}`);
    console.log("-----------------------------------");
  });

  // ── Attempt database connection in the background (non-blocking) ────────────
  const MAX_RETRIES = 5;
  let retries = MAX_RETRIES;

  while (retries > 0) {
    try {
      console.log(
        `[DB] Connecting… (attempt ${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`,
      );
      await db.query("SELECT NOW()");

      // Sequential schema verification
      await ensureAdminSchema();
      await ensureExpertPerformanceSchema();
      await ensurePaymentSchema();
      await ensureDemoSchema();
      await ensureDemoAccounts();
      await seedDemoData();

      // [NEW] AI Analysis column migrations (safe — only adds if not exists)
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS ai_machine_type VARCHAR(100)`);
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS ai_issue_summary TEXT`);
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS ai_confidence INTEGER`);
      console.log('[DB] AI analysis columns verified ✓');

      // [NEW] Quote-first workflow columns
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS urgency_level VARCHAR(20) DEFAULT 'normal'`);
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS preferred_date DATE`);
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS preferred_time_slot VARCHAR(20)`);
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS preferred_note TEXT`);
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS escrow_status VARCHAR(20) DEFAULT 'none'`);
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS follow_up_deadline TIMESTAMPTZ`);
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS follow_up_raised BOOLEAN DEFAULT FALSE`);

      // [NEW] job_quotes table — expert sends quote before consumer accepts
      await db.query(`
        CREATE TABLE IF NOT EXISTS job_quotes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
          expert_id UUID REFERENCES users(id) ON DELETE CASCADE,
          amount NUMERIC(10,2) NOT NULL,
          estimated_hours NUMERIC(4,1),
          note TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(request_id, expert_id)
        )
      `);
      
      // [NEW] Rich quote fields — expert provides detailed information
      await db.query(`ALTER TABLE job_quotes ADD COLUMN IF NOT EXISTS diagnosis_note TEXT`);
      await db.query(`ALTER TABLE job_quotes ADD COLUMN IF NOT EXISTS scope_of_work TEXT`);
      await db.query(`ALTER TABLE job_quotes ADD COLUMN IF NOT EXISTS labour_cost NUMERIC(10,2)`);
      await db.query(`ALTER TABLE job_quotes ADD COLUMN IF NOT EXISTS parts_cost NUMERIC(10,2)`);
      await db.query(`ALTER TABLE job_quotes ADD COLUMN IF NOT EXISTS parts_included BOOLEAN DEFAULT TRUE`);
      await db.query(`ALTER TABLE job_quotes ADD COLUMN IF NOT EXISTS available_date DATE`);
      await db.query(`ALTER TABLE job_quotes ADD COLUMN IF NOT EXISTS available_slot VARCHAR(20)`);
      await db.query(`ALTER TABLE job_quotes ADD COLUMN IF NOT EXISTS visit_type VARCHAR(20) DEFAULT 'onsite'`);
      console.log('[DB] Quote workflow schema verified ✓');

      await db.query(`
        CREATE TABLE IF NOT EXISTS job_quotes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
          expert_id UUID REFERENCES users(id) ON DELETE CASCADE,
          amount NUMERIC(10,2) NOT NULL,
          labour_cost NUMERIC(10,2),
          parts_cost NUMERIC(10,2),
          parts_included BOOLEAN DEFAULT TRUE,
          estimated_hours NUMERIC(4,1),
          diagnosis_note TEXT,
          scope_of_work TEXT,
          available_date DATE,
          available_slot VARCHAR(20),
          visit_type VARCHAR(20) DEFAULT 'onsite',
          note TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(request_id, expert_id)
        )
      `);
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS urgency_level VARCHAR(20) DEFAULT 'normal'`);
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS preferred_date DATE`);
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS preferred_time_slot VARCHAR(20) DEFAULT 'anytime'`);
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS consumer_budget_hint VARCHAR(50)`);
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS escrow_status VARCHAR(20) DEFAULT 'none'`);
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ`);
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS work_started_at TIMESTAMPTZ`);
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS pending_confirmation_at TIMESTAMPTZ`);
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS completion_summary TEXT`);
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS parts_actually_used TEXT`);
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS follow_up_deadline TIMESTAMPTZ`);
      await db.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS follow_up_raised BOOLEAN DEFAULT FALSE`);

      console.log('[DB] New workflow columns verified ✓');

      // FIX 6 -- Partial payment tracking columns
      await db.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10,2) DEFAULT 0`);
      await db.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(10,2) DEFAULT 0`);
      console.log('[DB] Partial payment columns verified');

      const progressTrackingSql = fs.readFileSync(
        path.join(__dirname, 'migrations', 'add_progress_tracking.sql'),
        'utf8',
      );
      await db.query(progressTrackingSql);
      console.log('[DB] Progress tracking schema verified');

      startExpertPerformanceCron();

      // Daily cron: delete orphaned videos older than 7 days
      cron.schedule('0 2 * * *', () => {
        const dir = path.join(__dirname, 'uploads', 'videos');
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);
        const now = Date.now();
        let deleted = 0;
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          const ageInDays = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);
          if (ageInDays > 7) {
            fs.unlinkSync(filePath);
            deleted++;
          }
        });
        if (deleted > 0) console.log(`[Cleanup] Deleted ${deleted} old video(s)`);
      });

      // PROMPT 1 — Every 30 minutes — escalate unaccepted requests
      cron.schedule('*/30 * * * *', async () => {
        try {
          // Find requests broadcast for more than 2 hours with no expert
          const result = await db.query(`
            SELECT sr.id, sr.consumer_id, sr.issue_description,
                   m.name as machine_name, u.first_name as consumer_name
            FROM service_requests sr
            JOIN machines m ON sr.machine_id = m.id
            JOIN users u ON sr.consumer_id = u.id
            WHERE sr.status = 'broadcast'
            AND sr.is_demo = false
            AND sr.first_broadcast_at < NOW() - INTERVAL '2 hours'
            AND sr.admin_escalated IS NOT TRUE
          `);

          for (const job of result.rows) {
            // Mark as escalated so we don't repeat
            await db.query(
              `UPDATE service_requests SET admin_escalated = true WHERE id = $1`,
              [job.id]
            );

            // Notify consumer
            await db.query(
              `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
               VALUES ($1, $2, $3, $4, false, NOW())`,
              [
                job.consumer_id,
                'Finding Expert',
                `We are manually assigning an expert for your ${job.machine_name} request. You will be notified shortly.`,
                'system'
              ]
            );

            // Notify admin via socket
            const io = global.io;
            if (io) {
              io.emit('admin_escalation', {
                jobId: job.id,
                machineName: job.machine_name,
                consumerName: job.consumer_name,
                issue: job.issue_description,
                message: `No expert accepted request for ${job.machine_name} in 2 hours. Manual assignment needed.`
              });
            }

            console.log(`[Escalation] Job ${job.id} escalated to admin after 2 hours`);
          }
        } catch (err) {
          console.error('[Escalation Cron] Error:', err.message);
        }
      });

      // ── ESCROW: Auto-release Milestone 1 after 24 h (every 30 min) ─────────
      cron.schedule('*/30 * * * *', async () => {
        try {
          const result = await db.query(`
            SELECT * FROM service_requests
            WHERE status = 'work_started'
              AND arrival_confirmed_by_consumer = false
              AND disputed = false
              AND milestone1_released = false
              AND work_started_at < NOW() - INTERVAL '24 hours'
          `);

          for (const job of result.rows) {
            try {
              await releaseMilestone1(job.id, 'auto_released', db);

              const io = global.io;
              if (io && job.producer_id) {
                io.to(`user_${job.producer_id}`).emit('milestone1_auto_released', {
                  jobId: job.id,
                  message: 'Milestone 1 auto-released after 24 hours of no consumer confirmation.'
                });
              }

              await notificationController.createNotification(
                job.producer_id,
                '💰 Milestone 1 Auto-Released',
                'Milestone 1 was automatically released after 24 hours of no consumer confirmation.',
                'payment', null
              );
              await notificationController.createNotification(
                job.consumer_id,
                'ℹ️ Milestone 1 Auto-Released',
                'The expert\'s arrival milestone was auto-released after 24 hours without your confirmation.',
                'system', null
              );

              console.log(`[CRON] Auto-released Milestone 1 for job ${job.id}`);
            } catch (jobErr) {
              console.error(`[CRON] Failed auto-release M1 for job ${job.id}:`, jobErr.message);
            }
          }
        } catch (err) {
          console.error('[CRON] Milestone 1 auto-release error:', err.message);
        }
      });

      // ── ESCROW: Auto-release Milestone 2 after 72 h (every hour) ──────────
      cron.schedule('0 * * * *', async () => {
        try {
          const result = await db.query(`
            SELECT * FROM service_requests
            WHERE status = 'work_done'
              AND completion_confirmed_by_consumer = false
              AND disputed = false
              AND milestone2_released = false
              AND work_done_at < NOW() - INTERVAL '72 hours'
          `);

          for (const job of result.rows) {
            try {
              await releaseMilestone2(job.id, 'auto_released', db);

              const io = global.io;
              if (io && job.producer_id) {
                io.to(`user_${job.producer_id}`).emit('milestone2_auto_released', {
                  jobId: job.id,
                  message: 'Milestone 2 auto-released after 72 hours of no consumer confirmation.'
                });
              }

              await notificationController.createNotification(
                job.producer_id,
                '🎉 Final Payment Auto-Released',
                'Milestone 2 was automatically released after 72 hours of no consumer confirmation. Job closed.',
                'payment', null
              );
              await notificationController.createNotification(
                job.consumer_id,
                'ℹ️ Final Payment Auto-Released',
                'The completion milestone was auto-released after 72 hours without your confirmation.',
                'system', null
              );

              console.log(`[CRON] Auto-released Milestone 2 for job ${job.id}`);
            } catch (jobErr) {
              console.error(`[CRON] Failed auto-release M2 for job ${job.id}:`, jobErr.message);
            }
          }
        } catch (err) {
          console.error('[CRON] Milestone 2 auto-release error:', err.message);
        }
      });

      console.log("[DB] Connected and schemas verified ✓");
      setInterval(releaseMaturedHolds, 60 * 60 * 1000); // every hour
      releaseMaturedHolds(); // run once on startup
      return;
    } catch (error) {
      retries--;
      console.error(`[DB] Connection failed: ${error.message}`);

      if (retries === 0) {
        console.error("─────────────────────────────────────────────────────");
        console.error("[DB] Could not reach the database after all attempts.");
        console.error("     The HTTP server is still running on port", PORT);
        console.error("     API routes that need the DB will return 503.");
        console.error("");
        console.error("  Common fixes:");
        console.error("  1. Check DATABASE_URL in server/.env");
        console.error("     • Render free DBs expire after 90 days — create a");
        console.error("       new one at https://neon.tech (free, no expiry)");
        console.error("     • Neon URL format:");
        console.error(
          "       postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require",
        );
        console.error("  2. Make sure ?sslmode=require is appended to the URL");
        console.error("  3. Restart the server after updating .env");
        console.error("─────────────────────────────────────────────────────");
        return; // keep server alive — do NOT call process.exit()
      }

      console.log(`[DB] Retrying in 5 seconds…`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

startServer();
