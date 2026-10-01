// DEMO POLICY ONLY: unresolved URS_1.1.4 timing must be approved before integration.
export const DEMO_OPERATION_POLICY = Object.freeze({
  warningMs: 3 * 60_000,
  acknowledgementMs: 2 * 60_000,
  transitionMs: 2_000,
  postActivationMs: 5_000,
  recurringDecisionMs: 20 * 60_000,
  interventionReminderMs: 20 * 60_000,
  automatedMinimumMs: 30 * 60_000,
  durationsMinutes: [30, 60],
  extensionMinutes: [15, 20, 30, 60],
});
export const PHASE_NAMES = ['Standby / not operating', 'Phase 1: Pre Activation',
  'Phase 2: Activation', 'Phase 3: Pre Deactivation', 'Phase 4: Deactivation', 'Phase 5: Post Activation'];
export const INTERVENTION_REASONS = [
  'Breakdown or accident obstructing Smartlane operation',
  'Breakdown or accident not obstructing Smartlane operation',
  'Vehicle involved in accident/breakdown towed',
];
