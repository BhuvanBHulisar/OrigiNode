import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import db from './db.js';
import { logger } from '../utils/logger.js';

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id') {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/auth/google/callback',
        proxy: true
    }, async (accessToken, refreshToken, profile, done) => {
        logger.info('Google auth callback triggered');
        try {
            const { id: googleId, emails, name } = profile;
            const email = emails[0].value;
            const firstName = name.givenName || 'Google';
            const lastName = name.familyName || 'User';
            logger.info('Google auth profile received', { email });

            // 1. Check if user exists with this google_id
            let result = await db.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
            logger.info('Google ID lookup complete', { found: result.rows.length > 0 });
            if (result.rows.length > 0) {
                return done(null, result.rows[0]);
            }

            // 2. Check if user exists with this email but no google_id
            result = await db.query('SELECT * FROM users WHERE LOWER(email) = $1', [email.toLowerCase()]);
            logger.info('Email lookup complete', { found: result.rows.length > 0 });
            if (result.rows.length > 0) {
                const user = result.rows[0];
                // Link Google account
                await db.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
                user.google_id = googleId;
                return done(null, user);
            }

            // 3. Create new user
            const newUserResult = await db.query(
                'INSERT INTO users (email, password, first_name, last_name, google_id, role, email_verified, provider) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
                [email.toLowerCase(), 'oauth_managed', firstName, lastName, googleId, 'consumer', true, 'google']
            );
            logger.info('New Google user created', { email: newUserResult.rows[0].email, role: newUserResult.rows[0].role });
            return done(null, newUserResult.rows[0]);
        } catch (err) {
            logger.error('GoogleStrategy error', err);
            return done(err, null);
        }
    }));
} else {
    logger.warn('⚠️ Google Client ID not configured. Google Sign-In will be disabled.');
}

// Passport session serialization (not strictly needed for JWT but good practice)
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
        done(null, result.rows[0]);
    } catch (err) {
        done(err, null);
    }
});

export default passport;
