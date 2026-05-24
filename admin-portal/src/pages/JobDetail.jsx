import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Paper, Grid, Chip, Button, CircularProgress,
    Alert, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
    Snackbar, useTheme
} from '@mui/material';
import {
    ArrowBack, CheckCircle, RadioButtonUnchecked, Person, Engineering,
    HardwareOutlined, CalendarToday, AccountBalanceWallet, LockOpen,
    GavelOutlined, PersonOff
} from '@mui/icons-material';
import api from '../services/api';

const STATUS_COLOR = {
    completed: 'success', in_progress: 'warning', accepted: 'info',
    broadcast: 'warning', pending: 'warning', cancelled: 'error', payment_pending: 'info'
};

const STATUS_LABEL = {
    broadcast: 'PENDING', payment_pending: 'PAYMENT PENDING',
};

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB') : null;
const fmtTime = (d) => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

export default function JobDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();

    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [confirm, setConfirm] = useState({ open: false, milestone: null });
    const [releasing, setReleasing] = useState(false);
    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
    const [disputeConfirm, setDisputeConfirm] = useState({ open: false, releaseTo: null });
    const [resolvingDispute, setResolvingDispute] = useState(false);

    const fetchJob = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/jobs/${id}/admin-detail`);
            setJob(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load job details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchJob(); }, [id]);

    const handleRelease = async () => {
        setReleasing(true);
        try {
            await api.post(`/admin/jobs/${id}/release-milestone`, { milestone: confirm.milestone });
            const amount = confirm.milestone === 1 ? job.milestone1_amount : job.milestone2_amount;
            setToast({ open: true, message: `₹${Number(amount).toLocaleString()} released to ${job.expert_name || 'Expert'}`, severity: 'success' });
            setConfirm({ open: false, milestone: null });
            fetchJob();
        } catch (err) {
            setToast({ open: true, message: err.response?.data?.error || 'Release failed', severity: 'error' });
        } finally {
            setReleasing(false);
        }
    };

    const handleResolveDispute = async () => {
        setResolvingDispute(true);
        try {
            await api.patch(`/admin/jobs/${id}/resolve-dispute`, { releaseTo: disputeConfirm.releaseTo });
            const msg = disputeConfirm.releaseTo === 'expert'
                ? `Dispute resolved — payment released to ${job.expert_name || 'expert'}`
                : `Dispute resolved — refund initiated for ${job.consumer_name || 'consumer'}`;
            setToast({ open: true, message: msg, severity: 'success' });
            setDisputeConfirm({ open: false, releaseTo: null });
            fetchJob();
        } catch (err) {
            setToast({ open: true, message: err.response?.data?.error || 'Resolution failed', severity: 'error' });
        } finally {
            setResolvingDispute(false);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}><CircularProgress /></Box>;
    if (error) return <Box sx={{ pt: 6 }}><Alert severity="error">{error}</Alert></Box>;
    if (!job) return null;

    const shortId = `JOB-${String(id).substring(0, 8).toUpperCase()}`;
    const statusLabel = STATUS_LABEL[job.status] || job.status?.replace('_', ' ').toUpperCase();
    const statusColor = STATUS_COLOR[job.status] || 'default';
    const hasPayment = !!job.transaction_id;
    const m1Amount = Number(job.milestone1_amount || (job.paid_amount ? job.paid_amount * 0.5 : 0));
    const m2Amount = Number(job.milestone2_amount || (job.paid_amount ? job.paid_amount * 0.5 : 0));

    const canReleaseM1 = hasPayment && !job.milestone1_released && ['in_progress', 'accepted', 'payment_pending', 'completed'].includes(job.status);
    const canReleaseM2 = hasPayment && job.milestone1_released && !job.milestone2_released && job.status === 'completed';

    const timeline = [
        { label: 'Submitted', date: job.created_at, done: true },
        { label: 'Expert Assigned', date: job.accepted_at, done: !!job.accepted_at },
        { label: 'In Progress', date: null, done: ['in_progress', 'payment_pending', 'completed'].includes(job.status) },
        { label: 'Completed', date: job.completed_at, done: job.status === 'completed' },
    ];

    const cardSx = {
        p: 3, borderRadius: 4, border: `1px solid ${theme.palette.divider}`,
        elevation: 0, height: '100%'
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Button startIcon={<ArrowBack />} onClick={() => navigate('/jobs')} sx={{ color: 'text.secondary' }}>
                    Back to Jobs
                </Button>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>{shortId}</Typography>
                <Chip label={statusLabel} color={statusColor} size="small" sx={{ fontWeight: 800, borderRadius: 1.5 }} />
            </Box>

            <Grid container spacing={3}>
                {/* Left column */}
                <Grid item xs={12} md={6}>
                    {/* Job Overview */}
                    <Paper elevation={0} sx={cardSx}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, textTransform: 'uppercase', fontSize: '0.7rem', color: 'text.secondary', letterSpacing: 1 }}>
                            Job Overview
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <InfoRow icon={<Person sx={{ fontSize: 16 }} />} label="Consumer" value={job.consumer_name || '—'} sub={job.consumer_email} />
                            <InfoRow icon={<Engineering sx={{ fontSize: 16 }} />} label="Expert" value={job.expert_name || 'Not Assigned'} sub={job.expert_email} />
                            <InfoRow icon={<HardwareOutlined sx={{ fontSize: 16 }} />} label="Machine" value={job.machine_name || '—'} />
                            <InfoRow icon={<CalendarToday sx={{ fontSize: 16 }} />} label="Submitted" value={fmt(job.created_at) || '—'} />
                            {job.issue_description && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Issue</Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                                        {job.issue_description}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Paper>
                </Grid>

                {/* Right column */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={cardSx}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, textTransform: 'uppercase', fontSize: '0.7rem', color: 'text.secondary', letterSpacing: 1 }}>
                            Payment & Escrow
                        </Typography>

                        {!hasPayment ? (
                            <Alert severity="info" sx={{ borderRadius: 2 }}>No payment received yet.</Alert>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'success.50', borderRadius: 2, border: '1px solid', borderColor: 'success.200' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <AccountBalanceWallet sx={{ fontSize: 18, color: 'success.main' }} />
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>Total Paid</Typography>
                                    </Box>
                                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'success.main' }}>
                                        ₹{Number(job.paid_amount || 0).toLocaleString()}
                                    </Typography>
                                </Box>

                                <MilestoneCard
                                    number={1}
                                    label="Work Started"
                                    amount={m1Amount}
                                    released={job.milestone1_released}
                                    releasedAt={job.milestone1_released_at}
                                    canRelease={canReleaseM1}
                                    onRelease={() => setConfirm({ open: true, milestone: 1 })}
                                />
                                <MilestoneCard
                                    number={2}
                                    label="Work Completed"
                                    amount={m2Amount}
                                    released={job.milestone2_released}
                                    releasedAt={job.milestone2_released_at}
                                    canRelease={canReleaseM2}
                                    onRelease={() => setConfirm({ open: true, milestone: 2 })}
                                />
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Dispute Resolution Panel */}
                {job.disputed && (
                    <Grid item xs={12}>
                        <Paper elevation={0} sx={{ ...cardSx, height: 'auto', border: `1px solid ${theme.palette.error.light}`, bgcolor: 'error.50' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <GavelOutlined sx={{ color: 'error.main' }} />
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem', color: 'error.main', letterSpacing: 1 }}>
                                    Active Dispute
                                </Typography>
                                <Chip label="DISPUTED" color="error" size="small" sx={{ fontWeight: 800, fontSize: '0.6rem', borderRadius: 1, ml: 'auto' }} />
                            </Box>

                            <Grid container spacing={2} sx={{ mb: 2 }}>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>Raised By</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>{job.dispute_raised_by || '—'}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>Raised At</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmtTime(job.dispute_raised_at) || '—'}</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>Dispute Reason</Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5, p: 1.5, bgcolor: 'background.paper', borderRadius: 2, border: `1px solid ${theme.palette.error.light}` }}>
                                        {job.dispute_reason || 'No reason provided'}
                                    </Typography>
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 2 }} />

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Review the dispute and choose a resolution. This action is <strong>irreversible</strong>.
                            </Typography>

                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Button
                                    variant="contained" color="success"
                                    startIcon={<LockOpen />}
                                    onClick={() => setDisputeConfirm({ open: true, releaseTo: 'expert' })}
                                    sx={{ borderRadius: 2.5 }}
                                >
                                    Release to Expert
                                </Button>
                                <Button
                                    variant="contained" color="error"
                                    startIcon={<PersonOff />}
                                    onClick={() => setDisputeConfirm({ open: true, releaseTo: 'consumer' })}
                                    sx={{ borderRadius: 2.5 }}
                                >
                                    Refund Consumer
                                </Button>
                            </Box>
                        </Paper>
                    </Grid>
                )}

                {/* Timeline */}
                <Grid item xs={12}>
                    <Paper elevation={0} sx={{ ...cardSx, height: 'auto' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2.5, textTransform: 'uppercase', fontSize: '0.7rem', color: 'text.secondary', letterSpacing: 1 }}>
                            Job Timeline
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
                            {timeline.map((step, i) => (
                                <Box key={step.label} sx={{ display: 'flex', alignItems: 'flex-start', flex: 1, minWidth: 140 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 1.5 }}>
                                        {step.done
                                            ? <CheckCircle sx={{ fontSize: 20, color: 'success.main' }} />
                                            : <RadioButtonUnchecked sx={{ fontSize: 20, color: 'text.disabled' }} />
                                        }
                                        {i < timeline.length - 1 && (
                                            <Box sx={{ width: 2, flex: 1, minHeight: 24, bgcolor: step.done ? 'success.main' : 'divider', mt: 0.5 }} />
                                        )}
                                    </Box>
                                    <Box sx={{ pb: 2 }}>
                                        <Typography variant="body2" sx={{ fontWeight: step.done ? 700 : 400, color: step.done ? 'text.primary' : 'text.disabled' }}>
                                            {step.label}
                                        </Typography>
                                        {step.date && (
                                            <Typography variant="caption" color="text.secondary">{fmtTime(step.date)}</Typography>
                                        )}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Confirm Dialog */}
            <Dialog open={confirm.open} onClose={() => !releasing && setConfirm({ open: false, milestone: null })} PaperProps={{ sx: { borderRadius: 4 } }}>
                <DialogTitle sx={{ fontWeight: 800 }}>Release Milestone {confirm.milestone}?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Release <strong>₹{Number(confirm.milestone === 1 ? m1Amount : m2Amount).toLocaleString()}</strong> to{' '}
                        <strong>{job.expert_name || 'Expert'}</strong>? This cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                    <Button onClick={() => setConfirm({ open: false, milestone: null })} disabled={releasing}>Cancel</Button>
                    <Button
                        variant="contained" color="success" onClick={handleRelease} disabled={releasing}
                        startIcon={releasing ? <CircularProgress size={16} color="inherit" /> : <LockOpen />}
                        sx={{ borderRadius: 2.5 }}
                    >
                        {releasing ? 'Releasing…' : 'Confirm Release'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dispute Resolution Confirm Dialog */}
            <Dialog open={disputeConfirm.open} onClose={() => !resolvingDispute && setDisputeConfirm({ open: false, releaseTo: null })} PaperProps={{ sx: { borderRadius: 4 } }}>
                <DialogTitle sx={{ fontWeight: 800 }}>
                    {disputeConfirm.releaseTo === 'expert' ? '✅ Release Payment to Expert?' : '🔄 Refund Consumer?'}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        {disputeConfirm.releaseTo === 'expert'
                            ? `This will release all pending milestone payments to ${job?.expert_name || 'the expert'} and close the job. This cannot be undone.`
                            : `This will mark the job as refunded. No payment will be released to ${job?.expert_name || 'the expert'}. This cannot be undone.`
                        }
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                    <Button onClick={() => setDisputeConfirm({ open: false, releaseTo: null })} disabled={resolvingDispute}>Cancel</Button>
                    <Button
                        variant="contained"
                        color={disputeConfirm.releaseTo === 'expert' ? 'success' : 'error'}
                        onClick={handleResolveDispute}
                        disabled={resolvingDispute}
                        startIcon={resolvingDispute ? <CircularProgress size={16} color="inherit" /> : (disputeConfirm.releaseTo === 'expert' ? <LockOpen /> : <PersonOff />)}
                        sx={{ borderRadius: 2.5 }}
                    >
                        {resolvingDispute ? 'Processing…' : (disputeConfirm.releaseTo === 'expert' ? 'Confirm Release' : 'Confirm Refund')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: 3 }}>{toast.message}</Alert>
            </Snackbar>
        </Box>
    );
}

function InfoRow({ icon, label, value, sub }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Box sx={{ color: 'text.secondary', mt: 0.2 }}>{icon}</Box>
            <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>{label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{value}</Typography>
                {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
            </Box>
        </Box>
    );
}

function MilestoneCard({ number, label, amount, released, releasedAt, canRelease, onRelease }) {
    const theme = useTheme();
    return (
        <Box sx={{ p: 2, borderRadius: 3, border: `1px solid ${released ? theme.palette.success.light : theme.palette.divider}`, bgcolor: released ? 'success.50' : 'background.paper' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Milestone {number} — {label}</Typography>
                {released
                    ? <Chip label="RELEASED" size="small" color="success" sx={{ fontWeight: 800, fontSize: '0.6rem', borderRadius: 1 }} />
                    : <Chip label="PENDING" size="small" color="default" sx={{ fontWeight: 800, fontSize: '0.6rem', borderRadius: 1 }} />
                }
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>₹{Number(amount).toLocaleString()}</Typography>
            {released && releasedAt && (
                <Typography variant="caption" color="success.main" sx={{ display: 'block', mb: 1 }}>
                    Released on {fmtTime(releasedAt)}
                </Typography>
            )}
            {!released && (
                <Button
                    size="small" variant="contained" color="primary"
                    startIcon={<LockOpen sx={{ fontSize: 14 }} />}
                    onClick={onRelease} disabled={!canRelease}
                    sx={{ borderRadius: 2, mt: 0.5, fontSize: '0.75rem' }}
                >
                    Release ₹{Number(amount).toLocaleString()}
                </Button>
            )}
        </Box>
    );
}
