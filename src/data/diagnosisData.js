export const AI_DIAGNOSIS_MAP = [
  { keywords: ['leak', 'fluid', 'oil', 'drip', 'wet'],         type: 'Hydraulic Press',      issue: 'Seal leakage detected',           confidence: 87 },
  { keywords: ['vibrat', 'shake', 'wobble', 'rattle'],         type: 'Rotary Machine',       issue: 'Bearing wear / imbalance',        confidence: 82 },
  { keywords: ['heat', 'hot', 'overheat', 'temperature'],      type: 'Cooling System',       issue: 'Thermal overload risk',           confidence: 91 },
  { keywords: ['noise', 'sound', 'loud', 'squeak', 'grind'],   type: 'Gearbox Assembly',     issue: 'Gear tooth wear detected',        confidence: 78 },
  { keywords: ['slow', 'speed', 'rpm', 'performance', 'weak'], type: 'Drive Motor',          issue: 'Motor efficiency degradation',    confidence: 84 },
  { keywords: ['smoke', 'burn', 'spark', 'electric', 'power'], type: 'Electrical System',    issue: 'Electrical fault / short risk',   confidence: 93 },
  { keywords: ['jam', 'stuck', 'block', 'stop', 'freeze'],     type: 'Conveyor System',      issue: 'Mechanical obstruction detected', confidence: 88 },
];

export function getAIDiagnosis(description) {
  const lower = (description || '').toLowerCase();
  const match = AI_DIAGNOSIS_MAP.find(entry =>
    entry.keywords.some(kw => lower.includes(kw))
  );
  return match || { type: 'Industrial Equipment', issue: 'General fault pattern detected', confidence: 75 };
}
