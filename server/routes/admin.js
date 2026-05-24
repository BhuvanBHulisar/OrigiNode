import express from "express";
import bcrypt from "bcryptjs";
import db from "../config/db.js";
import * as paymentController from "../controllers/paymentController.js";
import { adminOnly } from "../middleware/adminAuth.js";
import {
  sendExpertWelcomeEmail,
  sendExpertRemovalEmail,
  sendBankDetailsRequestEmail,
} from "../utils/mailer.js";
import {
  getExpertStats,
  getFullExpertPerformance,
} from "../services/expertPerformanceService.js";
import {
  getAllTickets,
  updateTicketStatus,
} from "../controllers/supportController.js";
import * as notificationController from "../controllers/notificationController.js";

const router = express.Router();

// ─── Health check — no auth required ─────────────────────────────────────────
router.get("/system-health", async (req, res) => {
  const checks = {};
  const startTime = Date.now();

  // 1. Database
  try {
    const dbStart = Date.now();
    await db.query("SELECT 1");
    checks.database = {
      status: "ok",
      responseTime: Date.now() - dbStart + "ms",
    };
  } catch (err) {
    checks.database = { status: "error", message: err.message };
  }

  // 2. Environment variables
  const requiredEnvVars = [
    "DATABASE_URL",
    "JWT_ACCESS_SECRET",
    "JWT_SECRET",
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "SMTP_HOST",
    "SMTP_PASS",
    "CLIENT_URL",
  ];
  checks.environment = {};
  requiredEnvVars.forEach((varName) => {
    checks.environment[varName] = { exists: !!process.env[varName] };
  });

  // 3. Socket.io
  try {
    const io = req.app.get("socketio");
    const sockets = await io.fetchSockets();
    checks.socketio = { status: "ok", connectedClients: sockets.length };
  } catch (err) {
    checks.socketio = { status: "error", message: err.message };
  }

  // 4. Razorpay
  checks.razorpay = {
    status:
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
        ? "ok"
        : "error",
    message:
      !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET
        ? "Missing Razorpay credentials in .env"
        : null,
  };

  // 5. Email
  checks.email = {
    status: process.env.SMTP_HOST && process.env.SMTP_PASS ? "ok" : "error",
    message:
      !process.env.SMTP_HOST || !process.env.SMTP_PASS
        ? "Missing SMTP credentials in .env"
        : null,
  };

  // 6. API routes
  checks.apiRoutes = { status: "ok", count: 11 };

  // Overall status
  const hasDbError = checks.database?.status === "error";
  const missingEnv = Object.values(checks.environment).some((v) => !v.exists);
  const hasErrors =
    hasDbError ||
    checks.razorpay.status === "error" ||
    checks.email.status === "error" ||
    checks.socketio?.status === "error";
  const overall = hasDbError
    ? "critical"
    : hasErrors || missingEnv
      ? "degraded"
      : "healthy";

  // Server stats
  const uptimeSeconds = process.uptime();
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

  res.json({
    timestamp: new Date().toISOString(),
    overall,
    uptime: `${hours}h ${minutes}m`,
    memory: `${memory} MB`,
    responseTime: Date.now() - startTime + "ms",
    checks,
    recentErrors: [],
  });
});

// All routes below require admin authentication
router.use(adminOnly);

export async function ensureAdminSchema() {
  try {
    await db.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE`,
    );
    await db.query(`ALTER TABLE producer_profiles ADD COLUMN IF NOT EXISTS account_number VARCHAR(30)`);
    await db.query(`ALTER TABLE producer_profiles ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(30)`);
    await db.query(`ALTER TABLE producer_profiles ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20)`);
    await db.query(`ALTER TABLE producer_profiles ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255)`);
    console.log("[DB] is_deleted + bank detail columns verified.");
  } catch (err) {
    console.error("[DB] Failed to ensure schema columns:", err.message);
  }
}

// ────────────── Summary ──────────────
router.get("/summary", async (req, res) => {
  try {
    const { rows: revenueRows } = await db.query(
      `SELECT COALESCE(SUM(COALESCE(base_amount, provider_price, amount)),0) AS totalRevenue FROM transactions WHERE status IN ('escrow','completed','paid')`,
    );
    const { rows: pendingRows } = await db.query(
      `SELECT COALESCE(SUM(COALESCE(expert_amount, provider_payout, 0)),0) AS pendingPayout FROM transactions WHERE status='escrow'`,
    );
    const { rows: jobsRows } = await db.query(
      `SELECT COUNT(*) AS totalJobs FROM service_requests`,
    );
    const summary = {
      totalRevenue: Number(revenueRows[0].totalrevenue),
      pendingPayout: Number(pendingRows[0].pendingpayout),
      totalJobs: Number(jobsRows[0].totaljobs),
    };
    res.json(summary);
  } catch (err) {
    console.error("Admin summary error:", err);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// ────────────── Users ──────────────
router.get("/users", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, email, role, first_name, last_name, created_at,
                    COALESCE(is_suspended, false) AS is_suspended
             FROM users
             WHERE role = 'consumer'
             ORDER BY created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    // Fallback if is_suspended column doesn't exist yet
    try {
      const { rows } = await db.query(
        `SELECT id, email, role, first_name, last_name, created_at, false AS is_suspended
                 FROM users
                 WHERE role = 'consumer'
                 ORDER BY created_at DESC`,
      );
      res.json(rows);
    } catch (innerErr) {
      console.error("Admin users error:", innerErr);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  }
});

router.get("/users/:id/admin-detail", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query(
      `SELECT id, email, role, first_name, last_name, created_at, phone, location,
              COALESCE(is_suspended, false) AS is_suspended,
              (SELECT COUNT(*) FROM service_requests WHERE consumer_id = $1) AS total_jobs
       FROM users WHERE id = $1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Admin user detail error:", err);
    res.status(500).json({ error: "Failed to fetch user details" });
  }
});

router.patch("/users/:id/suspend", async (req, res) => {
  const { id } = req.params;
  const { suspended } = req.body;
  try {
    // Add column if it doesn't exist, then update
    await db.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false`,
    );
    await db.query(`UPDATE users SET is_suspended=$1 WHERE id=$2`, [
      !!suspended,
      id,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("Admin suspend user error:", err);
    res.status(500).json({ error: "Failed to update user status" });
  }
});

router.patch("/users/:id/role", async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!role) return res.status(400).json({ error: "Missing role" });
  try {
    await db.query(`UPDATE users SET role=$1 WHERE id=$2`, [role, id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Admin update role error:", err);
    res.status(500).json({ error: "Failed to update role" });
  }
});

router.patch("/users/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Missing status" });
  try {
    let query = `UPDATE producer_profiles SET status=$1, updated_at=NOW()`;
    let params = [status, id];

    if (status === "suspended") {
      query += `, suspended_at=NOW()`;
    }

    query += ` WHERE user_id=$2`;

    await db.query(query, params);
    res.json({ success: true });
  } catch (err) {
    console.error("Admin update provider status error:", err);
    res.status(500).json({ error: "Failed to update provider status" });
  }
});

// ────────────── Providers ──────────────
router.post("/providers/:id/request-bank-details", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) AS name, email
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Expert not found" });
    const { name, email } = result.rows[0];
    await sendBankDetailsRequestEmail(name || "Expert", email);
    res.json({ success: true });
  } catch (err) {
    console.error("Bank details request email error:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
});

router.get("/providers", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
                u.id,
                TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS name,
                u.email,
                u.created_at,
                COALESCE(ARRAY_TO_STRING(pp.skills, ', '), 'General Service') AS category,
                COALESCE(pp.rating, 0) AS rating,
                COALESCE(pp.status, 'pending') AS status,
                COALESCE(pp.level, 'Starter') AS level,
                COALESCE(pp.points, 0) AS points,
                COALESCE(pp.level_salary, 0) AS "levelSalary",
                COALESCE(pp.bank_account_number, '') as "bankAccountNumber",
                COALESCE(pp.ifsc_code, '') as "ifscCode",
                COALESCE(pp.account_holder_name, '') as "accountHolderName",
                pp.suspended_at,
                (SELECT COUNT(*) FROM service_requests sr WHERE sr.producer_id = u.id) AS "jobsCount"
             FROM users u
             JOIN producer_profiles pp ON pp.user_id = u.id
             WHERE u.role = 'producer'
             ORDER BY u.created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    console.error("Admin providers error:", err);
    res.status(500).json({ error: "Failed to fetch providers" });
  }
});

router.delete("/providers/:id", async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || { reason: "No reason provided" }; // Body may be empty in DELETE
  
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // 1. Get Expert Info for logging/email before deletion
    const { rows: expertRows } = await client.query(
      `SELECT u.email, u.first_name, u.last_name FROM users u WHERE u.id = $1`,
      [id],
    );

    if (expertRows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ error: "Expert not found" });
    }

    const expert = expertRows[0];
    const expertName = [expert.first_name, expert.last_name]
      .filter(Boolean)
      .join(" ");

    // 2. Prep Service Requests/Jobs
    // For active/pending jobs: Re-broadcast to other experts (set producer_id to NULL)
    await client.query(
      `UPDATE service_requests SET status='broadcast', producer_id=NULL
             WHERE producer_id=$1 AND status IN ('pending', 'accepted', 'in_progress')`,
      [id],
    );

    // For historical jobs: Set producer_id to NULL to avoid FK violation while keeping history
    await client.query(
      `UPDATE service_requests SET producer_id=NULL WHERE producer_id=$1`,
      [id],
    );

    // 3. Prep other referencing tables to avoid FK failure (NULLify what's not cascaded)
    // Chat Messages: Sender is now anonymous expert
    await client.query(
      `UPDATE chat_messages SET sender_id=NULL WHERE sender_id=$1`,
      [id],
    );

    // Reviews: Producer name is already in the database as 'removed' expert or nullify
    await client.query(`UPDATE reviews SET producer_id=NULL WHERE producer_id=$1`, [
      id,
    ]);

    // Transactions: Salary/Job payout records must be kept but decoupled from the user
    await client.query(
      `UPDATE transactions SET expert_id=NULL WHERE expert_id=$1`,
      [id],
    );

    // 4. Permanent Deletion from DB
    // The following tables have ON DELETE CASCADE in schema.sql:
    // - producer_profiles
    // - expert_point_events
    // - expert_schedules
    // - notifications
    // - support_tickets
    await client.query(`DELETE FROM users WHERE id = $1`, [id]);

    // 5. Record removal in admin activity log
    await client.query(`CREATE TABLE IF NOT EXISTS admin_activity_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            admin_id UUID REFERENCES users(id),
            action VARCHAR(255) NOT NULL,
            target_id UUID,
            details JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`);

    await client.query(
      `INSERT INTO admin_activity_log (admin_id, action, target_id, details)
             VALUES ($1, $2, $3, $4)`,
      [
        req.user.id,
        "REMOVE_EXPERT",
        id,
        JSON.stringify({ name: expertName, email: expert.email, reason }),
      ],
    );

    await client.query("COMMIT");
    client.release();

    // 6. Send email (non-blocking)
    sendExpertRemovalEmail({
      name: expertName,
      email: expert.email,
      reason,
    }).catch(console.error);

    res.json({
      success: true,
      message: `Expert ${expertName} has been permanently removed.`,
    });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
      client.release();
    }
    console.error("Admin remove expert hard delete error:", err);
    res
      .status(500)
      .json({ error: "Failed to permanently remove expert account" });
  }
});

router.get("/providers/:id/stats", async (req, res) => {
  try {
    const stats = await getFullExpertPerformance(req.params.id);

    if (!stats) {
      // Provide fallback instead of error
      return res.json({
        points: 0,
        level: "Starter",
        salary: 0,
        jobsCompleted: 0,
        avgCompletionTime: "0 hrs",
        specialization: "Not set",
        memberSince: new Date().toISOString(),
        bankAccountStatus: "NOT PROVIDED",
        acceptanceRate: "0%",
        lifetimeEarnings: 0,
      });
    }

    // Add bank account status
    const { rows: bankRows } = await db.query(
      "SELECT bank_account_number, ifsc_code FROM producer_profiles WHERE user_id = $1",
      [req.params.id],
    );
    const hasBank =
      bankRows.length > 0 &&
      bankRows[0].bank_account_number &&
      bankRows[0].ifsc_code;
    stats.bankAccountStatus = hasBank ? "VERIFIED" : "NOT PROVIDED";
    stats.bankAccountNumber = bankRows[0]?.bank_account_number || "";
    stats.ifscCode = bankRows[0]?.ifsc_code || "";

    return res.json(stats);
  } catch (err) {
    console.error("Admin provider stats error:", err);
    return res.status(500).json({ error: "Failed to fetch provider stats" });
  }
});

router.post("/providers", async (req, res) => {
  const {
    fullName,
    email,
    password,
    specialization,
    machineTypes,
    serviceCity,
    qualification,
    yearsOfExperience,
    phone,
  } = req.body;
  if (!fullName || !email || !password) {
    return res
      .status(400)
      .json({ error: "Full name, email, and password are required" });
  }
  if (!serviceCity || !serviceCity.trim()) {
    return res.status(400).json({ error: "Service city is required" });
  }
  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters" });
  }
  try {
    // [MODIFIED] Only check for non-deleted accounts with this email
    const existing = await db.query(
      `
            SELECT id FROM users
            WHERE LOWER(email) = $1
              AND (is_deleted IS NULL OR is_deleted = false)
        `,
      [email.toLowerCase()],
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error:
          "An account with this email already exists and is currently active.",
      });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const nameParts = fullName.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || null;

    const userRes = await db.query(
      `INSERT INTO users (email, password, role, first_name, last_name, phone, location)
             VALUES ($1, $2, 'producer', $3, $4, $5, $6) RETURNING id, email, first_name, last_name, role, created_at`,
      [
        email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        phone || null,
        serviceCity.trim(),
      ],
    );
    const user = userRes.rows[0];

    // Build skills array: specialization + machineTypes combined
    const skills = [];
    if (specialization) skills.push(specialization.trim());
    if (machineTypes) {
      const types = machineTypes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      skills.push(...types);
    }

    await db.query(
      `INSERT INTO producer_profiles (user_id, skills, status) VALUES ($1, $2, 'approved')`,
      [user.id, skills],
    );

    const expertName = [user.first_name, user.last_name]
      .filter(Boolean)
      .join(" ");

    // Send welcome email — non-blocking, failure doesn't abort account creation
    let emailSent = true;
    try {
      await sendExpertWelcomeEmail({
        name: expertName,
        email: user.email,
        password,
      });
    } catch (emailErr) {
      console.error("[Mailer] Welcome email failed:", emailErr.message);
      emailSent = false;
    }

    res.status(201).json({
      id: user.id,
      name: expertName,
      email: user.email,
      category: specialization || skills[0] || "General Service",
      rating: 0,
      status: "approved",
      jobsCount: 0,
      created_at: user.created_at,
      emailSent,
    });
  } catch (err) {
    console.error("Admin create expert error:", err);
    res.status(500).json({ error: "Failed to create expert account" });
  }
});

// ────────────── Job Detail (Admin) ──────────────
router.get("/jobs/:id/admin-detail", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
          sr.id, sr.status, sr.issue_description, sr.priority,
          sr.created_at, sr.accepted_at, sr.completed_at, sr.quoted_cost,
          sr.disputed, sr.dispute_reason, sr.dispute_raised_by, sr.dispute_raised_at,
          COALESCE(c.first_name || ' ' || c.last_name, c.email) AS consumer_name,
          c.email AS consumer_email,
          COALESCE(p.first_name || ' ' || p.last_name, p.email) AS expert_name,
          p.email AS expert_email,
          m.name AS machine_name,
          t.id AS transaction_id,
          t.amount AS paid_amount,
          t.status AS payment_status,
          t.milestone1_released, t.milestone2_released,
          t.milestone1_amount,  t.milestone2_amount,
          t.milestone1_released_at, t.milestone2_released_at
       FROM service_requests sr
       LEFT JOIN users c  ON c.id = sr.consumer_id
       LEFT JOIN users p  ON p.id = sr.producer_id
       LEFT JOIN machines m ON m.id = sr.machine_id
       LEFT JOIN transactions t ON t.request_id = sr.id
       WHERE sr.id = $1
       ORDER BY t.created_at DESC
       LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Job not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Job detail error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/jobs/:id/release-milestone", async (req, res) => {
  try {
    const { milestone } = req.body;
    const jobId = req.params.id;

    const { rows } = await db.query(
      "SELECT * FROM transactions WHERE request_id = $1 ORDER BY created_at DESC LIMIT 1",
      [jobId]
    );
    if (!rows.length) return res.status(404).json({ error: "No payment found for this job" });
    const t = rows[0];

    if (milestone === 1) {
      if (t.milestone1_released) return res.status(400).json({ error: "Milestone 1 already released" });
      await db.query(
        `UPDATE transactions SET milestone1_released = TRUE, milestone1_released_at = NOW() WHERE id = $1`,
        [t.id]
      );
    } else if (milestone === 2) {
      if (!t.milestone1_released) return res.status(400).json({ error: "Release Milestone 1 first" });
      if (t.milestone2_released) return res.status(400).json({ error: "Milestone 2 already released" });
      await db.query(
        `UPDATE transactions SET milestone2_released = TRUE, milestone2_released_at = NOW(), status = 'completed' WHERE id = $1`,
        [t.id]
      );
    } else {
      return res.status(400).json({ error: "Invalid milestone number" });
    }

    if (global.io) {
      global.io.emit("payment_update", { event: "milestone_released", jobId, milestone });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Milestone release error:", err);
    res.status(500).json({ error: err.message });
  }
});


router.get("/jobs", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
                sr.id, sr.status, sr.created_at, sr.quoted_cost,
                m.name AS machine_name,
                COALESCE(u.first_name || ' ' || u.last_name, u.email) AS consumer,
                COALESCE(p.first_name || ' ' || p.last_name, p.email) AS producer
             FROM service_requests sr
             LEFT JOIN machines m ON sr.machine_id = m.id
             LEFT JOIN users u ON sr.consumer_id = u.id
             LEFT JOIN users p ON sr.producer_id = p.id
             ORDER BY sr.created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    console.error("Admin jobs error:", err);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

router.patch("/jobs/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Missing status" });
  try {
    await db.query(`UPDATE service_requests SET status=$1 WHERE id=$2`, [
      status,
      id,
    ]);
    if (global.io) {
      const jobRes = await db.query(
        `SELECT consumer_id, producer_id FROM service_requests WHERE id=$1`,
        [id],
      );
      if (jobRes.rows.length) {
        const { consumer_id, producer_id } = jobRes.rows[0];
        if (consumer_id)
          global.io
            .to(`user_${consumer_id}`)
            .emit("status_update", { requestId: id, status });
        if (producer_id)
          global.io
            .to(`user_${producer_id}`)
            .emit("job_updated", { requestId: id, status });
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Admin update job status error:", err);
    res.status(500).json({ error: "Failed to update job status" });
  }
});

// ────────────── Payments (Escrow Ledger) ──────────────
router.get("/payments", paymentController.getAllPayments);
router.patch("/payments/release/:id", paymentController.releasePayment);
router.get("/dashboard/metrics", paymentController.getMetrics);

// ────────────── Salary Management ──────────────
router.get("/payments/salary", async (req, res) => {
  try {
    const { rows } = await db.query(`
            SELECT
                t.id, t.amount, t.status, t.created_at as "date",
                u.id as expert_id,
                TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS expert_name,
                pp.level
            FROM transactions t
            JOIN users u ON t.expert_id = u.id
            LEFT JOIN producer_profiles pp ON pp.user_id = u.id
            WHERE t.type = 'salary'
            ORDER BY t.created_at DESC
        `);
    res.json(rows);
  } catch (err) {
    console.error("Admin fetch salary history error:", err);
    res.status(500).json({ error: "Failed to fetch salary history" });
  }
});

import { initiateSalaryPayout } from "../services/razorpayService.js";

router.post("/payments/release-salary", async (req, res) => {
  const { expertId, amount } = req.body;

  if (!expertId || !amount) {
    return res.status(400).json({ error: "Missing expertId or amount" });
  }

  try {
    // 1. Fetch expert status and bank details
    const { rows } = await db.query(
      `
            SELECT u.first_name, u.last_name, pp.*
            FROM users u
            JOIN producer_profiles pp ON u.id = pp.user_id
            WHERE u.id = $1
        `,
      [expertId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Expert profile not found." });
    }

    const expert = rows[0];

    // Part 6 - Salary Release Rules
    if (expert.status !== "approved") {
      return res.status(400).json({
        error: `Expert status is ${expert.status?.toUpperCase()}. Salary only releasable for APPROVED experts.`,
      });
    }

    if (!expert.bank_account_number || !expert.ifsc_code) {
      return res.status(400).json({
        error:
          "Expert has not added bank details yet. Salary cannot be released.",
      });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({
        error: "Salary amount must be greater than 0 (Bronze level or above).",
      });
    }

    // Check for double release (within 25 days)
    const { rows: lastSalary } = await db.query(
      `
            SELECT created_at FROM transactions
            WHERE expert_id = $1 AND type = 'salary' AND status = 'completed'
            ORDER BY created_at DESC LIMIT 1
        `,
      [expertId],
    );

    if (lastSalary.length > 0) {
      const lastDate = new Date(lastSalary[0].created_at);
      const diffDays = (new Date() - lastDate) / (1000 * 60 * 60 * 24);
      if (diffDays < 25) {
        return res.status(400).json({
          error: `A salary was already released ${Math.floor(diffDays)} days ago. Please wait at least 25 days between releases.`,
        });
      }
    }

    // 2. Initiate Razorpay Payout
    const result = await initiateSalaryPayout({
      expertId,
      amount,
      name: `${expert.first_name} ${expert.last_name}`,
      accountNumber: expert.bank_account_number,
      ifsc: expert.ifsc_code,
    });

    // 3. Notify Expert
    if (global.io) {
      global.io.to(`user_${expertId}`).emit("notification", {
        id: Date.now(),
        type: "success",
        msg: `Your monthly salary of ₹${amount} has been released!`,
        time: "Just now",
        read: false,
      });
    }
    await notificationController.createNotification(
      expertId,
      "Salary Credited",
      `Your monthly salary of ₹${amount} has been credited to your bank account.`,
      "payment",
      null
    );

    res.json({
      success: true,
      message: `Salary of ₹${amount} released to ${expert.first_name}`,
      transaction: result.transaction,
    });
  } catch (err) {
    console.error("Admin release salary error:", err);
    res.status(500).json({ error: err.message || "Failed to release salary" });
  }
});

// ────────────── Analytics ──────────────
router.get("/analytics/job-distribution", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT status, COUNT(*) AS count FROM service_requests GROUP BY status`,
    );
    res.json({ categories: rows });
  } catch (err) {
    console.error("Job distribution error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

router.get("/analytics/overview", async (req, res) => {
  try {
    // 1. Top stats
    const [usersRes, expertsRes, jobsRes, revenueRes] = await Promise.all([
      db.query(`SELECT COUNT(*) AS count FROM users WHERE role = 'consumer'`),
      db.query(`SELECT COUNT(*) AS count FROM users WHERE role = 'producer'`),
      db.query(`SELECT COUNT(*) AS count FROM service_requests`),
      db.query(
        `SELECT COALESCE(SUM(COALESCE(base_amount, provider_price, amount)), 0) AS total FROM transactions WHERE status IN ('completed', 'paid')`,
      ),
    ]);

    // 2. Jobs by status
    const jobsByStatusRes = await db.query(
      `SELECT status, COUNT(*) AS count FROM service_requests GROUP BY status ORDER BY count DESC`,
    );

    // 3. Revenue last 7 days
    const revenueTimeRes = await db.query(
      `SELECT
                TO_CHAR(DATE_TRUNC('day', created_at), 'Mon DD') AS day,
                COALESCE(SUM(COALESCE(base_amount, provider_price, amount)), 0) AS revenue
             FROM transactions
             WHERE created_at >= NOW() - INTERVAL '7 days'
               AND status IN ('completed', 'paid', 'escrow')
             GROUP BY DATE_TRUNC('day', created_at)
             ORDER BY DATE_TRUNC('day', created_at) ASC`,
    );

    // 4. Top experts
    const topExpertsRes = await db.query(
      `SELECT
                u.id,
                TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS name,
                COALESCE(pp.rating, 0) AS rating,
                COUNT(sr.id) FILTER (WHERE sr.status = 'completed') AS jobs_completed,
                COALESCE(SUM(t.expert_amount), 0) AS total_earnings
             FROM users u
             LEFT JOIN producer_profiles pp ON pp.user_id = u.id
             LEFT JOIN service_requests sr ON sr.producer_id = u.id
             LEFT JOIN transactions t ON t.expert_id = u.id AND t.status IN ('completed', 'paid')
             WHERE u.role = 'producer'
             GROUP BY u.id, u.first_name, u.last_name, pp.rating
             ORDER BY jobs_completed DESC, total_earnings DESC
             LIMIT 10`,
    );

    res.json({
      stats: {
        totalUsers: Number(usersRes.rows[0].count),
        totalExperts: Number(expertsRes.rows[0].count),
        totalJobs: Number(jobsRes.rows[0].count),
        totalRevenue: Number(revenueRes.rows[0].total),
      },
      jobsByStatus: jobsByStatusRes.rows.map((r) => ({
        status: r.status,
        count: Number(r.count),
      })),
      revenueOverTime: revenueTimeRes.rows.map((r) => ({
        day: r.day,
        revenue: Number(r.revenue),
      })),
      topExperts: topExpertsRes.rows.map((r) => ({
        id: r.id,
        name: r.name || r.email || "Unknown",
        rating: Number(r.rating),
        jobsCompleted: Number(r.jobs_completed),
        totalEarnings: Number(r.total_earnings),
      })),
    });
  } catch (err) {
    console.error("Analytics overview error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// ────────────── Support Inbox ──────────────
router.get("/support", getAllTickets);
router.patch("/support/:id/status", updateTicketStatus);

const ALLOWED_TABLES = [
  'users','machines','service_requests','transactions',
  'chat_messages','notifications','reviews',
  'producer_profiles','expert_point_events'
];

router.get('/db/counts', adminOnly, async (req, res) => {
  try {
    const counts = {};
    await Promise.all(ALLOWED_TABLES.map(async (t) => {
      try {
        const r = await db.query(`SELECT COUNT(*) FROM ${t}`);
        counts[t] = parseInt(r.rows[0].count);
      } catch { counts[t] = 0; }
    }));
    res.json(counts);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/db/:table', adminOnly, async (req, res) => {
  const { table } = req.params;
  if (!ALLOWED_TABLES.includes(table))
    return res.status(400).json({ error: 'Table not allowed' });
  try {
    const { rows } = await db.query(
      `SELECT * FROM ${table} LIMIT 500`
    );
    res.json(rows);
  } catch (err) { 
    console.error(`DB Fetch Error for ${table}:`, err);
    res.status(500).json({ error: 'Failed retrieving data' }); 
  }
});

router.delete('/db/:table/:id', adminOnly, async (req, res) => {
  const { table, id } = req.params;
  if (!ALLOWED_TABLES.includes(table))
    return res.status(400).json({ error: 'Table not allowed' });
  try {
    if (table === 'users') {
      const check = await db.query('SELECT is_demo FROM users WHERE id=$1',[id]);
      if (check.rows[0]?.is_demo)
        return res.status(403).json({ error: 'Cannot delete demo accounts' });
    }
    await db.query(`DELETE FROM ${table} WHERE id=$1`, [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete' }); }
});

// ────────────── Dispute Resolution ──────────────
// @route   PATCH /admin/jobs/:id/resolve-dispute
// @desc    Admin resolves a dispute — releases funds to expert or refunds consumer.
router.patch('/jobs/:id/resolve-dispute', async (req, res) => {
  const { id: jobId } = req.params;
  const { releaseTo } = req.body;
  const io = req.app.get('socketio') || global.io;

  if (!['consumer', 'expert'].includes(releaseTo)) {
    return res.status(400).json({ error: "releaseTo must be 'consumer' or 'expert'" });
  }

  try {
    // Validate job exists and is disputed
    const jobRes = await db.query(
      `SELECT sr.*, 
              c.first_name AS consumer_first_name,
              p.first_name AS expert_first_name
       FROM service_requests sr
       LEFT JOIN users c ON c.id = sr.consumer_id
       LEFT JOIN users p ON p.id = sr.producer_id
       WHERE sr.id = $1`,
      [jobId]
    );

    if (!jobRes.rows.length) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobRes.rows[0];

    if (!job.disputed) {
      return res.status(400).json({ error: 'This job does not have an active dispute' });
    }

    // Call escrow service to resolve
    const { resolveDispute } = await import('../services/escrowService.js');
    const updatedJob = await resolveDispute(jobId, releaseTo, db);

    if (releaseTo === 'expert') {
      // Notify expert
      if (io && job.producer_id) {
        io.to(`user_${job.producer_id}`).emit('dispute_resolved', {
          jobId, releaseTo,
          message: 'Dispute resolved in your favour. Payment released.'
        });
      }
      if (io && job.consumer_id) {
        io.to(`user_${job.consumer_id}`).emit('dispute_resolved', {
          jobId, releaseTo,
          message: 'Dispute resolved. Expert was paid.'
        });
      }

      await notificationController.createNotification(
        job.producer_id,
        '✅ Dispute Resolved — Payment Released',
        'Admin reviewed the dispute and resolved it in your favour. Payment has been released.',
        'payment', null
      );
      await notificationController.createNotification(
        job.consumer_id,
        'ℹ️ Dispute Resolved',
        'Admin reviewed the dispute and the payment was released to the expert.',
        'system', null
      );
    } else {
      // releaseTo === 'consumer'
      if (io && job.consumer_id) {
        io.to(`user_${job.consumer_id}`).emit('dispute_resolved', {
          jobId, releaseTo,
          message: 'Dispute resolved in your favour. Refund initiated.'
        });
      }
      if (io && job.producer_id) {
        io.to(`user_${job.producer_id}`).emit('dispute_resolved', {
          jobId, releaseTo,
          message: 'Dispute resolved. Payment was refunded to consumer.'
        });
      }

      await notificationController.createNotification(
        job.consumer_id,
        '✅ Dispute Resolved — Refund Initiated',
        'Admin reviewed the dispute and resolved it in your favour. A refund has been initiated.',
        'payment', null
      );
      await notificationController.createNotification(
        job.producer_id,
        'ℹ️ Dispute Resolved',
        'Admin reviewed the dispute and the payment was refunded to the consumer.',
        'system', null
      );
    }

    return res.json({ success: true, job: updatedJob });
  } catch (err) {
    console.error('[Admin] resolve-dispute failed:', err);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

export default router;
