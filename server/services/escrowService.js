/**
 * escrowService.js
 * Handles all escrow release and dispute logic for the IndEase platform.
 * All functions accept a `db` pool instance (from config/db.js) to allow
 * easy injection and testing.
 */

// ─── 1. Release Milestone 1 ───────────────────────────────────────────────────
/**
 * Marks the first escrow milestone as released.
 *
 * @param {string} jobId      - UUID of the service_request
 * @param {string} releaseType - 'consumer_confirmed' | 'auto_released' | 'dispute_resolved'
 * @param {object} db         - pg Pool instance
 * @returns {object} Updated job row
 */
export const releaseMilestone1 = async (jobId, releaseType, db) => {
  const result = await db.query(
    `UPDATE service_requests
     SET milestone1_released      = true,
         milestone1_released_at   = NOW(),
         milestone1_release_type  = $1
     WHERE id = $2
     RETURNING *`,
    [releaseType, jobId]
  );

  const job = result.rows[0];
  console.log(
    `[Escrow] Milestone 1 released — jobId: ${jobId}, type: ${releaseType}, at: ${job?.milestone1_released_at}`
  );
  return job;
};

// ─── 2. Release Milestone 2 ───────────────────────────────────────────────────
/**
 * Marks the second (final) escrow milestone as released and closes the job.
 *
 * @param {string} jobId      - UUID of the service_request
 * @param {string} releaseType - 'consumer_confirmed' | 'auto_released' | 'dispute_resolved'
 * @param {object} db         - pg Pool instance
 * @returns {object} Updated job row
 */
export const releaseMilestone2 = async (jobId, releaseType, db) => {
  const result = await db.query(
    `UPDATE service_requests
     SET milestone2_released      = true,
         milestone2_released_at   = NOW(),
         milestone2_release_type  = $1,
         status                   = 'completed'
     WHERE id = $2
     RETURNING *`,
    [releaseType, jobId]
  );

  const job = result.rows[0];
  console.log(
    `[Escrow] Milestone 2 released — jobId: ${jobId}, type: ${releaseType}, at: ${job?.milestone2_released_at}`
  );
  return job;
};

// ─── 3. Freeze Escrow (Raise Dispute) ────────────────────────────────────────
/**
 * Freezes the escrow by marking the job as disputed.
 *
 * @param {string} jobId     - UUID of the service_request
 * @param {string} reason    - Human-readable dispute reason
 * @param {string} raisedBy  - 'consumer' | 'expert'
 * @param {object} db        - pg Pool instance
 * @returns {object} Updated job row
 */
export const freezeEscrow = async (jobId, reason, raisedBy, db) => {
  const result = await db.query(
    `UPDATE service_requests
     SET disputed          = true,
         dispute_reason    = $1,
         dispute_raised_at = NOW(),
         dispute_raised_by = $2
     WHERE id = $3
     RETURNING *`,
    [reason, raisedBy, jobId]
  );

  console.log(
    `[Escrow] Escrow frozen — jobId: ${jobId}, raisedBy: ${raisedBy}, reason: ${reason}`
  );
  return result.rows[0];
};

// ─── 4. Resolve Dispute ───────────────────────────────────────────────────────
/**
 * Resolves a dispute and either releases funds to the expert or marks
 * the job as refunded for the consumer.
 *
 * @param {string} jobId     - UUID of the service_request
 * @param {string} releaseTo - 'expert' | 'consumer'
 * @param {object} db        - pg Pool instance
 * @returns {object} Updated job row
 */
export const resolveDispute = async (jobId, releaseTo, db) => {
  if (releaseTo === 'expert') {
    // Release any milestones that have not yet been released
    const currentRes = await db.query(
      `SELECT milestone1_released, milestone2_released FROM service_requests WHERE id = $1`,
      [jobId]
    );
    const current = currentRes.rows[0];

    const updates = [];
    const params = [];
    let paramIdx = 1;

    if (!current?.milestone1_released) {
      updates.push(
        `milestone1_released = true`,
        `milestone1_released_at = NOW()`,
        `milestone1_release_type = 'dispute_resolved'`
      );
    }
    if (!current?.milestone2_released) {
      updates.push(
        `milestone2_released = true`,
        `milestone2_released_at = NOW()`,
        `milestone2_release_type = 'dispute_resolved'`
      );
    }

    // Always clear the disputed flag and set final status
    updates.push(`disputed = false`, `status = 'completed'`);

    params.push(jobId);
    const result = await db.query(
      `UPDATE service_requests SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    console.log(`[Escrow] Dispute resolved — funds released to expert. jobId: ${jobId}`);
    return result.rows[0];
  }

  // releaseTo === 'consumer' — refund; do not release milestones
  const result = await db.query(
    `UPDATE service_requests
     SET disputed = false,
         status   = 'refunded'
     WHERE id = $1
     RETURNING *`,
    [jobId]
  );

  console.log(`[Escrow] Dispute resolved — refund to consumer. jobId: ${jobId}`);
  return result.rows[0];
};
