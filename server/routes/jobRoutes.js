import express from 'express';
import * as jobController from '../controllers/jobController.js';
import * as reviewController from '../controllers/reviewController.js';
import { protect as auth } from '../middleware/auth.middleware.js';
import { roleCheck } from '../middleware/roleCheck.js';
import db from '../config/db.js';

const router = express.Router();

/**
 * JOB & RADAR ROUTES
 */

// @route   POST api/jobs/broadcast
// @desc    Consumer broadcasts a machine fault
router.post('/broadcast', auth, roleCheck(['consumer']), jobController.broadcastJob);

// @route   GET api/jobs/radar
// @desc    Experts scan the radar for active signals
router.get('/radar', auth, roleCheck(['producer']), jobController.getRadarJobs);

// @route   GET api/jobs/producer-stats
// @desc    Get expert dashboard statistics
router.get('/producer-stats', auth, roleCheck(['producer']), jobController.getProducerStats);

// ================== QUOTE SYSTEM ==================

// @route   POST api/jobs/:id/quote
// @desc    Expert submits a quote (replaces direct accept)
router.post('/:id/quote', auth, roleCheck(['producer']), jobController.submitQuote);

// @route   GET api/jobs/:id/quotes
// @desc    Consumer views all quotes for their request
router.get('/:id/quotes', auth, roleCheck(['consumer']), jobController.getQuotes);

// @route   POST api/jobs/:id/quotes/:quoteId/approve
// @desc    Consumer approves a specific expert's quote
router.post('/:id/quotes/:quoteId/approve', auth, roleCheck(['consumer']), jobController.approveQuote);

// ================== PHYSICAL WORKFLOW ==================

// @route   PATCH api/jobs/:id/arrive
// @desc    Expert marks that they have arrived on site
router.patch('/:id/arrive', auth, roleCheck(['producer']), jobController.markArrived);

// @route   PATCH api/jobs/:id/confirm-complete
// @desc    Consumer confirms job is complete and releases funds
router.patch('/:id/confirm-complete', auth, roleCheck(['consumer']), jobController.consumerConfirmComplete);

// @route   POST api/jobs/:id/follow-up
// @desc    Consumer raises a follow-up issue within 7-day window
router.post('/:id/follow-up', auth, roleCheck(['consumer']), jobController.raiseFollowUp);

// @route   PATCH api/jobs/:id/decline
// @desc    Expert declines / skips a broadcast job
router.patch('/:id/decline', auth, roleCheck(['producer']), jobController.declineJob);

// @route   PATCH api/jobs/:id/start-work
// @desc    Expert marks repair as in progress (requires quote_approved status)
router.patch('/:id/start-work', auth, roleCheck(['producer']), jobController.startWork);

// @route   PATCH api/jobs/:id/complete-work
// @desc    Expert marks repair as completed
router.patch('/:id/complete-work', auth, roleCheck(['producer']), jobController.completeWork);

// @route   POST api/jobs/:id/invoice
// @desc    Expert sends an invoice/bill
router.post('/:id/invoice', auth, roleCheck(['producer']), jobController.createInvoice);

// @route   POST api/jobs/:id/rating
// @desc    Consumer submits a rating for a completed job (alias for /api/reviews)
router.post('/:id/rating', auth, roleCheck(['consumer']), (req, res) => {
    req.body.requestId = req.params.id;
    return reviewController.createReview(req, res);
});

// @route   PATCH api/jobs/:id/cancel
// @desc    Consumer cancels their pending request
router.patch('/:id/cancel', auth, roleCheck(['consumer']), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const result = await db.query(
            `UPDATE service_requests 
             SET status = 'cancelled' 
             WHERE id = $1 AND consumer_id = $2 AND status IN ('pending', 'broadcast')
             RETURNING *`,
            [id, userId]
        );
        if (result.rows.length === 0) {
            return res.status(400).json({ 
                error: 'Cannot cancel — request not found or already accepted' 
            });
        }
        if (global.io) {
            global.io.to(`user_${userId}`).emit('request_cancelled', { requestId: id });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to cancel request' });
    }
});

// @route   PATCH api/jobs/:id/progress
// @desc    Expert updates job progress stage
router.patch('/:id/progress', auth, roleCheck(['producer']), async (req, res) => {
    try {
        const { stage, note } = req.body;
        const validStages = ['en_route', 'arrived', 'accepted', 'in_progress', 'diagnosing', 'repairing', 'testing', 'completed'];
        if (!validStages.includes(stage)) {
            return res.status(400).json({ error: 'Invalid stage' });
        }
        await db.query(
            `UPDATE service_requests SET progress_stage = $1, progress_note = $2
             WHERE id = $3 AND producer_id = $4`,
            [stage, note || null, req.params.id, req.user.id]
        );
        await db.query(
            `INSERT INTO job_progress_history (job_id, stage, note) VALUES ($1, $2, $3)`,
            [req.params.id, stage, note || null]
        ).catch(() => {});
        const job = await db.query('SELECT consumer_id FROM service_requests WHERE id = $1', [req.params.id]);
        if (job.rows.length && global.io) {
            global.io.to(`user_${job.rows[0].consumer_id}`).emit('job_progress_updated', {
                jobId: req.params.id, stage, note: note || ''
            });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('[Progress] FULL ERROR:', err.stack || err);
        res.status(500).json({ error: err.message });
    }
});

// @route   GET api/jobs/my
// @desc    Get my active jobs (Chat List)
router.get('/my', auth, jobController.getMyJobs);

// @route   GET api/jobs/service-history
// @desc    Get service history/logs for producer
router.get('/service-history', auth, roleCheck(['producer']), jobController.getServiceHistory);

// @route   POST api/jobs/:id/waitlist
// @desc    Expert joins the waitlist for a job
router.post('/:id/waitlist', auth, roleCheck(['producer']), jobController.joinWaitlist);

// ================== EXPERT WORK-PHASE CONFIRMATION ==================

// @route   PATCH api/jobs/:id/mark-started
// @desc    Expert confirms they have started work on site.
//          Triggers consumer notification to confirm arrival (Milestone 1).
router.patch('/:id/mark-started', auth, roleCheck(['producer']), async (req, res) => {
    try {
        const { id: jobId } = req.params;
        const expertId = req.user.id;
        const io = req.app.get('socketio') || global.io;

        // Fetch job and validate ownership + status
        const jobRes = await db.query(
            `SELECT * FROM service_requests WHERE id = $1 AND producer_id = $2`,
            [jobId, expertId]
        );

        if (jobRes.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found or not assigned to you' });
        }

        const job = jobRes.rows[0];

        if (!['en_route', 'accepted'].includes(job.status)) {
            return res.status(400).json({ error: 'Cannot start a job that has not been accepted' });
        }

        // Update status and record timestamp
        const result = await db.query(
            `UPDATE service_requests
             SET status = 'work_started', work_started_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [jobId]
        );

        const updatedJob = result.rows[0];

        // Fetch expert name for the socket payload
        const expertNameRes = await db.query(
            `SELECT first_name FROM users WHERE id = $1`,
            [expertId]
        );
        const expertName = expertNameRes.rows[0]?.first_name || 'Expert';

        // Emit socket event to consumer
        if (io && job.consumer_id) {
            io.to(`user_${job.consumer_id}`).emit('expert_started_work', {
                jobId,
                expertName,
                message: 'Expert has started work. Please confirm.'
            });
        }

        // Persist notification for consumer
        const { createNotification } = await import('../controllers/notificationController.js');
        await createNotification(
            job.consumer_id,
            '🔧 Expert Has Started Work',
            `${expertName} has started working on your job. Please confirm their arrival to release the first payment milestone.`,
            'job_update',
            `/workspace/${jobId}`
        );

        return res.json(updatedJob);
    } catch (err) {
        console.error('[Jobs] mark-started failed:', err);
        res.status(500).json({ error: 'Failed to mark job as started' });
    }
});

// @route   PATCH api/jobs/:id/mark-done
// @desc    Expert marks work as complete.
//          Requires Milestone 1 (arrival) to have been released by consumer first.
router.patch('/:id/mark-done', auth, roleCheck(['producer']), async (req, res) => {
    try {
        const { id: jobId } = req.params;
        const expertId = req.user.id;
        const io = req.app.get('socketio') || global.io;

        // Fetch job and validate ownership
        const jobRes = await db.query(
            `SELECT * FROM service_requests WHERE id = $1 AND producer_id = $2`,
            [jobId, expertId]
        );

        if (jobRes.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found or not assigned to you' });
        }

        const job = jobRes.rows[0];

        // Gate: consumer must have confirmed arrival (milestone 1 released) first
        if (!job.milestone1_released) {
            return res.status(400).json({ error: 'Cannot mark done before consumer confirms arrival' });
        }

        // Update status and record completion timestamp
        const result = await db.query(
            `UPDATE service_requests
             SET status = 'work_done', work_done_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [jobId]
        );

        const updatedJob = result.rows[0];

        // Fetch expert name for the socket payload
        const expertNameRes = await db.query(
            `SELECT first_name FROM users WHERE id = $1`,
            [expertId]
        );
        const expertName = expertNameRes.rows[0]?.first_name || 'Expert';

        // Emit socket event to consumer
        if (io && job.consumer_id) {
            io.to(`user_${job.consumer_id}`).emit('expert_marked_done', {
                jobId,
                expertName,
                message: 'Expert marked work as complete. Please confirm.'
            });
        }

        // Persist notification for consumer
        const { createNotification } = await import('../controllers/notificationController.js');
        await createNotification(
            job.consumer_id,
            '✅ Expert Marked Work as Complete',
            `${expertName} has finished the repair. Please review and confirm to release final payment.`,
            'job_update',
            `/workspace/${jobId}`
        );

        return res.json(updatedJob);
    } catch (err) {
        console.error('[Jobs] mark-done failed:', err);
        res.status(500).json({ error: 'Failed to mark job as done' });
    }
});

// ================== CONSUMER ESCROW CONFIRMATION ==================

// @route   PATCH api/jobs/:id/confirm-arrival
// @desc    Consumer confirms the expert has arrived and releases Milestone 1.
router.patch('/:id/confirm-arrival', auth, roleCheck(['consumer']), async (req, res) => {
    try {
        const { id: jobId } = req.params;
        const consumerId = req.user.id;
        const io = req.app.get('socketio') || global.io;

        const jobRes = await db.query(
            `SELECT * FROM service_requests WHERE id = $1 AND consumer_id = $2`,
            [jobId, consumerId]
        );
        if (jobRes.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found or not yours' });
        }

        const job = jobRes.rows[0];

        if (job.status !== 'work_started') {
            return res.status(400).json({ error: 'Expert has not marked work as started yet' });
        }
        if (job.arrival_confirmed_by_consumer) {
            return res.status(400).json({ error: 'Arrival already confirmed' });
        }

        // Mark arrival confirmed
        await db.query(
            `UPDATE service_requests
             SET arrival_confirmed_by_consumer = true,
                 arrival_confirmed_at          = NOW()
             WHERE id = $1`,
            [jobId]
        );

        // Release Milestone 1 via escrow service
        const { releaseMilestone1 } = await import('../services/escrowService.js');
        const updatedJob = await releaseMilestone1(jobId, 'consumer_confirmed', db);

        // Notify expert via socket
        if (io && job.producer_id) {
            io.to(`user_${job.producer_id}`).emit('milestone1_released', {
                jobId,
                message: 'Consumer confirmed your arrival. Milestone 1 released.'
            });
        }

        // Persist notification for expert
        const { createNotification } = await import('../controllers/notificationController.js');
        await createNotification(
            job.producer_id,
            '💰 Milestone 1 Released',
            'The consumer confirmed your arrival. Your first payment milestone has been released.',
            'payment',
            `/workspace/${jobId}`
        );

        return res.json(updatedJob);
    } catch (err) {
        console.error('[Jobs] confirm-arrival failed:', err);
        res.status(500).json({ error: 'Failed to confirm arrival' });
    }
});

// @route   PATCH api/jobs/:id/confirm-complete
// @desc    Consumer confirms work is done and releases Milestone 2.
//          Note: This is the NEW escrow-aware version (replaces old confirm-complete for work_done status).
//          The existing consumerConfirmComplete handler still covers 'pending_confirmation' status.
router.patch('/:id/confirm-complete', auth, roleCheck(['consumer']), async (req, res) => {
    try {
        const { id: jobId } = req.params;
        const consumerId = req.user.id;
        const io = req.app.get('socketio') || global.io;

        const jobRes = await db.query(
            `SELECT * FROM service_requests WHERE id = $1 AND consumer_id = $2`,
            [jobId, consumerId]
        );
        if (jobRes.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found or not yours' });
        }

        const job = jobRes.rows[0];

        if (job.status !== 'work_done') {
            return res.status(400).json({ error: 'Expert has not marked work as done yet' });
        }
        if (job.completion_confirmed_by_consumer) {
            return res.status(400).json({ error: 'Completion already confirmed' });
        }
        if (!job.milestone1_released) {
            return res.status(400).json({ error: 'Milestone 1 must be released before confirming completion' });
        }

        // Mark completion confirmed
        await db.query(
            `UPDATE service_requests
             SET completion_confirmed_by_consumer = true,
                 completion_confirmed_at          = NOW()
             WHERE id = $1`,
            [jobId]
        );

        // Release Milestone 2 via escrow service (also sets status = 'completed')
        const { releaseMilestone2 } = await import('../services/escrowService.js');
        const updatedJob = await releaseMilestone2(jobId, 'consumer_confirmed', db);

        // Notify expert via socket
        if (io && job.producer_id) {
            io.to(`user_${job.producer_id}`).emit('milestone2_released', {
                jobId,
                message: 'Consumer confirmed completion. Milestone 2 released. Job complete!'
            });
        }

        // Persist notification for expert
        const { createNotification } = await import('../controllers/notificationController.js');
        await createNotification(
            job.producer_id,
            '🎉 Final Payment Released',
            'The consumer confirmed your work is complete. Milestone 2 has been released. Job closed!',
            'payment',
            `/workspace/${jobId}`
        );

        return res.json(updatedJob);
    } catch (err) {
        console.error('[Jobs] confirm-complete failed:', err);
        res.status(500).json({ error: 'Failed to confirm completion' });
    }
});

// @route   PATCH api/jobs/:id/raise-dispute
// @desc    Consumer or expert raises a dispute — freezes escrow.
router.patch('/:id/raise-dispute', auth, async (req, res) => {
    try {
        const { id: jobId } = req.params;
        const userId = req.user.id;
        const callerRole = req.user.role; // 'consumer' or 'producer'
        const { reason } = req.body;
        const io = req.app.get('socketio') || global.io;

        if (!reason || !reason.trim()) {
            return res.status(400).json({ error: 'Dispute reason is required' });
        }

        // Verify the caller is a party to this job
        const jobRes = await db.query(
            `SELECT * FROM service_requests WHERE id = $1 AND (consumer_id = $2 OR producer_id = $2)`,
            [jobId, userId]
        );
        if (jobRes.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found or you are not a party to it' });
        }

        const job = jobRes.rows[0];

        if (job.disputed) {
            return res.status(400).json({ error: 'A dispute is already active for this job' });
        }

        // Freeze escrow via escrow service
        const { freezeEscrow } = await import('../services/escrowService.js');
        await freezeEscrow(jobId, reason.trim(), callerRole, db);

        // Update job status to 'disputed'
        const result = await db.query(
            `UPDATE service_requests SET status = 'disputed' WHERE id = $1 RETURNING *`,
            [jobId]
        );
        const updatedJob = result.rows[0];

        // Determine the other party and notify them via socket
        const otherPartyId = callerRole === 'consumer' ? job.producer_id : job.consumer_id;
        if (io && otherPartyId) {
            io.to(`user_${otherPartyId}`).emit('dispute_raised', {
                jobId,
                raisedBy: callerRole,
                message: 'A dispute has been raised. Escrow frozen.'
            });
        }

        // Notify admin via notifications table (no specific user_id — use NULL / broadcast)
        await db.query(
            `INSERT INTO notifications (type, title, message, is_read, created_at)
             VALUES ($1, $2, $3, false, NOW())`,
            [
                'dispute',
                'New Dispute Raised',
                `A dispute was raised on job ${jobId} by ${callerRole}. Reason: ${reason.trim().substring(0, 120)}`
            ]
        ).catch(() => {}); // Non-blocking — admin table may not have NULL user_id constraint

        if (io) {
            io.emit('admin_notification', {
                type: 'dispute',
                message: `Dispute raised on job ${jobId} by ${callerRole}`,
                jobId
            });
        }

        return res.json(updatedJob);
    } catch (err) {
        console.error('[Jobs] raise-dispute failed:', err);
        res.status(500).json({ error: 'Failed to raise dispute' });
    }
});

export default router;

