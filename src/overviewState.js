import { canDeactivate } from './operations.js';

export const isLocationOperating = location =>
  !location.operation?.intervention && [2, 3].includes(location.operation?.phase ?? location.phase);

export const activeLocationCount = locations => locations.filter(isLocationOperating).length;

export const locationCardClass = location =>
  `loc-row is-${location.status}${isLocationOperating(location) ? ' location-card--active' : ''}`;

export function locationActionState(location, now, canOperate = true) {
  const operation = location.operation;
  return {
    activationDisabled: !canOperate || !operation || ![0, 5].includes(operation.phase) || !!operation.pendingDecision,
    deactivationDisabled: !canOperate || !operation || !canDeactivate(operation, now) || !!operation.pendingDecision,
  };
}
