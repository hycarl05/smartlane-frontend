import { DEMO_OPERATION_POLICY as P, PHASE_NAMES, INTERVENTION_REASONS } from './operationPolicy.js';
import { createScheduleStore, changeSchedules, occurrences, simulationEligibility } from './scheduling.js';

const ACKNOWLEDGEMENT_OPERATIONS = new Set(['Activate', 'Deactivate']);

export function emptyOperation(locationId) {
  return { locationId, operationId: null, mode: 'Manual', phase: 0, pendingDecision: null,
    intervention: null, warningDeadline: null, plannedEnd: null, startedAt: null,
    nextDecisionAt: null, notification: null, command: { status: 'Idle' },
    warningMs: P.warningMs, lastResult: 'Demo session starts in standby; no live operation restored.' };
}
export function initialOperations(locations, now = Date.now()) {
  return { now, offset: 0, sequence: 0, events: [], scheduleStore: createScheduleStore(locations), byId: Object.fromEntries(locations.map(l => [l.id, emptyOperation(l.id)])) };
}
export function canDeactivate(op, now) {
  return op.phase === 2 && (op.mode !== 'Automated' || now >= op.startedAt + P.automatedMinimumMs);
}
export function laneState(op) {
  if (op.intervention) return 'Intervention active — lane / sign policy awaiting approval';
  if (op.phase === 2 || op.phase === 3) return 'Operating in simulation — equipment not confirmed';
  return 'Not operating in simulation — equipment not confirmed';
}
// Pure reducer: one event path for operator decisions and clock transitions.
export function operationReducer(state, action) {
  if (action.type === 'ADVANCE' && ![1, 3, 20, 30].includes(action.minutes)) return state;
  if (action.type === 'REGISTER') {
    if (state.byId[action.locationId]) return state;
    return { ...state, byId: { ...state.byId, [action.locationId]: emptyOperation(action.locationId) } };
  }
  const offset = action.type === 'ADVANCE' ? state.offset + action.minutes * 60_000 : state.offset;
  const now = Math.max(state.now, (action.now ?? Date.now()) + offset);
  let next = { ...state, offset, now, byId: { ...state.byId }, events: [...state.events] };
  const emit = (op, name, decision, previousPhase = op.phase, detail = {}) => {
    const id = `OP-EVT-${++next.sequence}`;
    next.events.unshift({ id, timestamp: new Date(now).toISOString(), locationId: op.locationId,
      operationId: op.operationId, occurrenceId: op.scheduleOccurrenceId || null, actor: action.actor || 'Demo clock', action: name, decision,
      previousPhase, newPhase: op.phase, interventionReason: op.intervention?.reason || null,
      extensionMinutes: null, outcome: 'Simulated', ...detail });
    return id;
  };
  const save = op => { next.byId[op.locationId] = op; };
  const advance = original => {
    let op = { ...original };
    if (op.pendingDecision?.expiresAt && now >= op.pendingDecision.expiresAt) {
      emit(op, op.pendingDecision.kind, 'Cancelled: acknowledgement expired', op.phase, {
        acknowledgement: 'Missing', applicableVmsMessages: op.pendingDecision.vmsMessages || [], selectedVmsMessages: [], outcome: 'Cancelled',
      });
      op.pendingDecision = null; op.command = { status: 'Expired' };
      op.lastResult = 'Acknowledgement expired; no transition started (simulation).';
    }
    if (op.warningDeadline && now >= op.warningDeadline) {
      op.command = { status: 'Transition pending', dueAt: op.warningDeadline + P.transitionMs };
      op.warningDeadline = null;
      emit(op, 'Transition', 'Warning completed; simulated command pending');
    }
    if (op.command.status === 'Transition pending' && now >= op.command.dueAt) {
      const previous = op.phase;
      const completedAt = op.command.dueAt;
      op.phase = previous === 1 ? 2 : 4;
      op.command = { status: 'Simulated success', completedAt };
      if (op.phase === 2) {
        op.startedAt = completedAt;
        op.plannedEnd = op.mode === 'Manual' ? null : completedAt + op.durationMinutes * 60_000;
        op.nextDecisionAt = completedAt + (op.mode === 'Automated' ? P.automatedMinimumMs : P.recurringDecisionMs);
      } else {
        op.endedAt = completedAt;
        op.postAt = completedAt + P.postActivationMs;
        op.notification = null; op.intervention = null; op.nextDecisionAt = null;
      }
      op.lastResult = `${PHASE_NAMES[op.phase]} completed in simulation; no equipment response received.`;
      emit(op, 'Transition', op.lastResult, previous);
    }
    if (op.phase === 4 && now >= op.postAt) {
      op.phase = 5;
      op.lastResult = 'Phase 5: Post Activation reached in simulation.';
      emit(op, 'Transition', op.lastResult, 4);
    }
    if (op.phase === 2 && !op.notification) {
      const due = op.intervention ? op.intervention.remindAt : Math.min(op.nextDecisionAt ?? Infinity, op.plannedEnd ?? Infinity);
      if (now >= due) {
        const kind = op.intervention ? 'Intervention reminder' : 'Extend or deactivate';
        const id = emit(op, 'Notification', kind);
        op.notification = { id, kind, raisedAt: now };
      }
    }
    save(op);
  };
  // Check deadlines on every action too, so delayed browser ticks cannot bypass expiry.
  Object.values(next.byId).forEach(advance);
  if (['SCHEDULE_SAVE', 'SCHEDULE_DELETE', 'SCHEDULE_IMPORT', 'SCHEDULE_REGION'].includes(action.type)) {
    const scheduleStore = changeSchedules(next.scheduleStore, action, now, Object.keys(next.byId));
    return { ...next, scheduleStore: { ...scheduleStore, feedback: { ...scheduleStore.feedback, locationId: action.locationId } } };
  }
  if (action.type === 'SCHEDULE_SIMULATE') {
    const occurrence = occurrences(next.scheduleStore, action.locationId, action.date, action.date, now).find(o => o.id === action.occurrenceId);
    const error = simulationEligibility(next.scheduleStore, occurrence, next.byId[action.locationId], now);
    if (error || !P.durationsMinutes.includes(action.durationMinutes)) return { ...next, scheduleStore: { ...next.scheduleStore, feedback: { locationId: action.locationId, errors: [error || 'Select a Phase 2 demo duration of 30 or 60 minutes.'], message: '' } } };
    const shared = { locationId: action.locationId, now: action.now, actor: action.actor };
    let requested = operationReducer(next, { ...shared, type: 'MODE', mode: 'Scheduled' });
    requested = operationReducer(requested, { ...shared, type: 'REQUEST', kind: 'Activate', durationMinutes: action.durationMinutes, occurrenceId: occurrence.id, vmsMessages: action.vmsMessages });
    const operation = requested.byId[action.locationId];
    return { ...requested, scheduleStore: { ...requested.scheduleStore,
      attempts: { ...requested.scheduleStore.attempts, [occurrence.id]: { occurrence, operationId: operation.operationId, requestId: operation.pendingDecision.id, requestedAt: now } },
      feedback: { locationId: action.locationId, errors: [], message: 'Scheduled activation requested in simulation. Open this location from the persistent decisions inbox to review the activation acknowledgement; no lane has opened.' } } };
  }
  if (['TICK', 'ADVANCE'].includes(action.type)) return next;
  let op = next.byId[action.locationId];
  if (!op) return next;
  op = { ...op };
  const idle = [0, 5].includes(op.phase) && !op.pendingDecision;
  if (action.type === 'MODE' && idle && ['Manual', 'Scheduled', 'Automated'].includes(action.mode)) {
    op.mode = action.mode; emit(op, 'Mode', action.mode);
  } else if (action.type === 'WARNING' && idle && [1, 3, 5].includes(action.minutes)) {
    op.warningMs = action.minutes * 60_000; emit(op, 'Demo warning policy', `${action.minutes} minutes; unapproved`);
  } else if (action.type === 'REQUEST' && !op.pendingDecision && !op.warningDeadline && op.command.status !== 'Transition pending') {
    const kind = action.kind;
    const allowed = (kind === 'Activate' && idle && (op.mode === 'Manual' || P.durationsMinutes.includes(action.durationMinutes))) ||
      (kind === 'Deactivate' && canDeactivate(op, now));
    if (!allowed) return next;
    if (kind === 'Activate') {
      op.operationId = `DEMO-${op.locationId}-${next.sequence + 1}`;
      op.scheduleOccurrenceId = action.occurrenceId || null;
    }
    const requiresAcknowledgement = ACKNOWLEDGEMENT_OPERATIONS.has(kind);
    const vmsMessages = Array.isArray(action.vmsMessages) ? [...new Set(action.vmsMessages.filter(Boolean))] : [];
    const id = emit(op, kind, 'Alert displayed; awaiting operator acknowledgement', op.phase, { applicableVmsMessages: vmsMessages, outcome: 'Pending' });
    op.pendingDecision = { id, kind, requestedAt: now, durationMinutes: action.durationMinutes,
      requiresAcknowledgement, vmsMessages,
      expiresAt: now + P.acknowledgementMs };
    op.command = { status: 'Awaiting acknowledgement' };
  } else if (action.type === 'CANCEL' && op.pendingDecision?.id === action.requestId) {
    const pending = op.pendingDecision;
    emit(op, pending.kind, pending.requiresAcknowledgement ? 'Cancelled before acknowledgement' : 'Decision cancelled', op.phase, {
      acknowledgement: pending.requiresAcknowledgement ? 'Missing' : 'Not required', applicableVmsMessages: pending.vmsMessages || [], selectedVmsMessages: [], outcome: 'Cancelled',
    }); op.pendingDecision = null;
    op.command = { status: 'Cancelled' }; op.lastResult = 'Decision cancelled; no transition performed (simulation).';
  } else if (action.type === 'CONFIRM' && op.pendingDecision?.id === action.requestId) {
    const pending = op.pendingDecision;
    const previous = op.phase;
    if (pending.kind === 'Activate' || pending.kind === 'Deactivate') {
      if (pending.kind === 'Activate') {
        op.startedAt = null; op.endedAt = null; op.plannedEnd = null;
        op.nextDecisionAt = null; op.intervention = null;
      }
      op.phase = pending.kind === 'Activate' ? 1 : 3;
      op.durationMinutes = pending.kind === 'Activate' ? pending.durationMinutes : op.durationMinutes;
      op.warningDeadline = null;
      op.notification = null;
      op.lastResult = `${pending.kind} acknowledged; configured warning retained but bypassed by design simulation.`;
    }
    const selectedVmsMessages = pending.vmsMessages;
    emit(op, pending.kind, pending.requiresAcknowledgement ? 'Acknowledged and proceeded' : 'Decision confirmed', previous, {
      acknowledgement: pending.requiresAcknowledgement ? 'Acknowledged' : 'Not required',
      selectedVmsMessages,
      extensionMinutes: null,
    });
    op.pendingDecision = null;
    if (action.simulationResult === 'Failed') {
      op.command = { status: 'Failed', completedAt: now };
      op.lastResult = `${pending.kind} simulated device transition failed; operation state was not reported as completed.`;
      emit(op, 'Transition', op.lastResult, op.phase, { outcome: 'Failed' });
    } else if (pending.kind === 'Activate') {
      const prePhase = op.phase;
      op.phase = 2;
      op.startedAt = now;
      op.plannedEnd = op.mode === 'Manual' ? null : now + op.durationMinutes * 60_000;
      op.nextDecisionAt = now + (op.mode === 'Automated' ? P.automatedMinimumMs : P.recurringDecisionMs);
      op.command = { status: 'Simulated success', completedAt: now };
      op.lastResult = 'Activation completed immediately in design simulation; no live equipment response was received.';
      emit(op, 'Transition', op.lastResult, prePhase);
    } else if (pending.kind === 'Deactivate') {
      const prePhase = op.phase;
      op.phase = 4;
      op.endedAt = now;
      op.notification = null; op.intervention = null; op.nextDecisionAt = null;
      op.command = { status: 'Simulated success', completedAt: now };
      op.lastResult = 'Deactivation completed immediately in design simulation; no live equipment response was received.';
      emit(op, 'Transition', op.lastResult, prePhase);
      op.phase = 5;
      op.postAt = now;
      op.lastResult = 'Post-operation state reached immediately in design simulation.';
      emit(op, 'Transition', op.lastResult, 4);
    }
  } else if (action.type === 'INTERVENE' && op.phase === 2 && !op.intervention && !op.pendingDecision && INTERVENTION_REASONS.includes(action.reason)) {
    op.intervention = { reason: action.reason, startedAt: now, remindAt: now + P.interventionReminderMs };
    op.notification = null; op.command = { status: 'Policy awaiting approval' };
    op.lastResult = 'Manual intervention active. VMS/LCS instructions await approved policy; no commands issued.';
    emit(op, 'Intervene', 'Operator selected manual intervention', op.phase, { acknowledgement: 'Not required', interventionReason: action.reason });
  } else if (action.type === 'RESUME' && op.phase === 2 && op.intervention && !op.pendingDecision) {
    const reason = op.intervention.reason;
    op.intervention = null; op.notification = null;
    op.nextDecisionAt = Math.max(now + P.recurringDecisionMs, op.mode === 'Automated' ? op.startedAt + P.automatedMinimumMs : 0);
    op.command = { status: 'Simulated success' };
    op.lastResult = 'Resumed existing simulated operation; operation ID, start and planned end retained.';
    emit(op, 'Resume', 'Operator resumed operation', op.phase, { acknowledgement: 'Not required', interventionReason: reason });
  } else if (action.type === 'EXTEND' && op.phase === 2 && op.plannedEnd && !op.intervention && !op.pendingDecision && P.extensionMinutes.includes(action.minutes)) {
    op.plannedEnd = Math.max(now, op.plannedEnd) + action.minutes * 60_000;
    op.nextDecisionAt = Math.max(now + P.recurringDecisionMs, op.mode === 'Automated' ? op.startedAt + P.automatedMinimumMs : 0);
    op.notification = null; op.command = { status: 'Simulated success' };
    op.lastResult = `Extended by ${action.minutes} minutes in simulation.`;
    emit(op, 'Extend', 'Operator extended operation', op.phase, { acknowledgement: 'Not required', extensionMinutes: action.minutes });
  } else if (action.type === 'KEEP_INTERVENTION' && op.intervention && op.notification && !op.pendingDecision) {
    op.intervention = { ...op.intervention, remindAt: now + P.interventionReminderMs };
    op.notification = null; emit(op, 'Intervention reminder', 'Continue intervention');
  } else if (action.type === 'CONTINUE_MANUAL' && op.mode === 'Manual' && op.notification && !op.intervention && !op.pendingDecision) {
    op.notification = null; op.nextDecisionAt = now + P.recurringDecisionMs;
    emit(op, 'Recurring decision', 'Continue manual operation without planned end');
  } else if (action.type === 'MATCH_LCS' && !op.intervention && !op.pendingDecision && op.command.status !== 'Transition pending') {
    emit(op, 'Match LCS', `Requested ${op.phase === 2 || op.phase === 3 ? 'Green Arrow' : 'Red X'} in simulation; observed equipment unchanged`);
    op.lastResult = 'LCS simulation request recorded; equipment acknowledgement is not available.';
  }
  save(op);
  return next;
}

export function projectLocation(loc, op, now) {
  if (!op) return loc;
  const operating = !op.intervention && [2, 3].includes(op.phase);
  return { ...loc, operation: op, mode: op.mode.toLowerCase(), phase: op.phase,
    phaseLabel: PHASE_NAMES[op.phase], status: op.pendingDecision || op.intervention ? 'pending' : operating ? 'active' : 'inactive',
    elapsedSeconds: op.startedAt ? Math.max(0, Math.floor(((op.endedAt || now) - op.startedAt) / 1000)) : 0,
    ps: op.startedAt ? new Date(op.startedAt).toLocaleTimeString('en-GB') : 'Not started',
    pe: op.plannedEnd ? new Date(op.plannedEnd).toLocaleTimeString('en-GB') : 'No planned end',
    lcs: (loc.lcs || []).map(sign => ({ ...sign, observedOpen: sign.open, open: operating })),
  };
}
export function operationAudit(events, locations) {
  return events.map(e => ({ ...e, date: e.timestamp.slice(0, 10), time: e.timestamp.slice(11, 19),
    initiator: e.actor, initiatorRole: 'Demo actor', module: 'Smartlane Operation',
    location: locations.find(l => l.id === e.locationId)?.name || e.locationId,
    equipmentId: e.operationId || 'N/A', operationType: e.action, user: e.actor, result: e.outcome,
    activity: `${e.action}: ${e.decision}. ${PHASE_NAMES[e.previousPhase]} → ${PHASE_NAMES[e.newPhase]}` +
      (e.interventionReason ? `; Reason: ${e.interventionReason}` : '') +
      (e.occurrenceId ? `; Schedule occurrence: ${e.occurrenceId}` : '') +
      (e.extensionMinutes ? `; Extension: ${e.extensionMinutes} min` : '') +
      (e.acknowledgement ? `; Acknowledgement: ${e.acknowledgement}` : '') +
      (e.selectedVmsMessages?.length ? `; VMS: ${e.selectedVmsMessages.join(' | ')}` : ''),
  }));
}
