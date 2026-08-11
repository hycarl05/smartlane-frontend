import React, { useState } from 'react';
import { createPortal } from 'react-dom';

const DEFAULT_PHASE_TEMPLATES = {
  vms: {
    1: { msg: 'PERHATIAN: BERSEDIA', msg2: 'SMARTLANE AKAN DIBUKA' },
    2: { msg: 'SMARTLANE BERMULA', msg2: 'GUNAKAN LORONG KECEMASAN' },
    3: { msg: 'SMARTLANE AKAN DITUTUP', msg2: 'SEGERA MASUK LORONG UTAMA' },
    4: { msg: 'PEMERIKSAAN LORONG', msg2: 'PATUHI ARAHAN PETUGAS' },
    5: { msg: 'SMARTLANE DITUTUP', msg2: 'GUNA LORONG UTAMA SAHAJA' }
  },
  miniVms: {
    1: { msg: 'PERHATIAN BERSEDIA', msg2: 'PERHATIKAN ISYARAT LCS' },
    2: { msg: 'JALUR KECEMASAN', msg2: 'DIBUKA SEMENTARA' },
    3: { msg: 'BERSEDIA KELUAR', msg2: 'SEGERA MASUK LORONG UTAMA' },
    4: { msg: 'PEMERIKSAAN KAWASAN', msg2: 'PANDU DENGAN CERMAT' },
    5: { msg: 'LORONG KECEMASAN', msg2: 'DITUTUP SEMENTARA' }
  }
};

export default function VmsEditor({
  isOpen,
  onClose,
  moduleType = 'vms', // 'vms' | 'miniVms'
  loc,
  locations = [],
  onUpdateLoc,
  onShowToast
}) {
  if (!isOpen) return null;

  const [selectedScope, setSelectedScope] = useState('individual'); // 'individual' | 'group' | 'all-locations'
  const [selectedSignId, setSelectedSignId] = useState(() => {
    if (moduleType === 'vms' && loc?.vms?.length > 0) return loc.vms[0].id;
    if (moduleType === 'miniVms' && loc?.miniVms?.length > 0) return loc.miniVms[0].id;
    return '';
  });

  const [selectedPhase, setSelectedPhase] = useState(1); // Phase 1 to 5

  // Phase Templates state per phase
  const [templates, setTemplates] = useState(() => {
    return DEFAULT_PHASE_TEMPLATES[moduleType] || DEFAULT_PHASE_TEMPLATES.vms;
  });

  const [activeForm, setActiveForm] = useState(() => ({
    msg: templates[1]?.msg || '',
    msg2: templates[1]?.msg2 || ''
  }));

  const handlePhaseChange = (phaseNum) => {
    setSelectedPhase(phaseNum);
    setActiveForm({
      msg: templates[phaseNum]?.msg || '',
      msg2: templates[phaseNum]?.msg2 || ''
    });
  };

  const handleSaveTemplate = () => {
    const updated = {
      ...templates,
      [selectedPhase]: {
        msg: activeForm.msg,
        msg2: activeForm.msg2
      }
    };
    setTemplates(updated);

    const updateSign = (sign) => {
      const existingTemplates = sign.phaseTemplates || {};
      const updatedPhaseTemplates = {
        ...existingTemplates,
        [selectedPhase]: { msg: activeForm.msg, msg2: activeForm.msg2 }
      };
      return {
        ...sign,
        msg: activeForm.msg,
        msg2: activeForm.msg2,
        phaseTemplates: updatedPhaseTemplates
      };
    };

    // Apply / push message updates based on scope
    if (selectedScope === 'individual') {
      // Update specific sign on current location
      const fieldKey = moduleType === 'vms' ? 'vms' : 'miniVms';
      const updatedList = (loc[fieldKey] || []).map(sign => {
        if (sign.id === selectedSignId) {
          return updateSign(sign);
        }
        return sign;
      });
      onUpdateLoc(loc.id, { [fieldKey]: updatedList });
      if (onShowToast) onShowToast(`Phase ${selectedPhase} template saved & pushed to sign [${selectedSignId}]`);
    } else if (selectedScope === 'group') {
      // Push to all signs in this category for current location
      const fieldKey = moduleType === 'vms' ? 'vms' : 'miniVms';
      const updatedList = (loc[fieldKey] || []).map(sign => updateSign(sign));
      onUpdateLoc(loc.id, { [fieldKey]: updatedList });
      if (onShowToast) onShowToast(`Phase ${selectedPhase} template pushed to all ${moduleType === 'vms' ? 'Standard VMS' : 'Mini VMS'} signs on ${loc.name}`);
    } else if (selectedScope === 'all-locations') {
      // Push to all highway locations
      const fieldKey = moduleType === 'vms' ? 'vms' : 'miniVms';
      locations.forEach(l => {
        const updatedList = (l[fieldKey] || []).map(sign => updateSign(sign));
        onUpdateLoc(l.id, { [fieldKey]: updatedList });
      });
      if (onShowToast) onShowToast(`Phase ${selectedPhase} template pushed to ALL highway locations!`);
    }

    onClose();
  };

  const signsList = moduleType === 'vms' ? (loc?.vms || []) : (loc?.miniVms || []);

  return createPortal(
    <div className="modal-backdrop">
      <div className="modal-content vms-editor-modal">
        <div className="modal-header">
          <div>
            <h3>{moduleType === 'vms' ? 'Standard Entry/Exit VMS Editor' : 'Mini VMS (Intermediate) Editor'}</h3>
            <small style={{ color: 'var(--text-faint)' }}>Phase-Aware Text Mapping &amp; Multi-Sign Push Management</small>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="vms-editor-body">
          {/* PUSH SCOPE MANAGEMENT */}
          <div className="form-group">
            <label>Push Scope Management</label>
            <div className="scope-toggle-group">
              <button
                type="button"
                className={`scope-btn ${selectedScope === 'individual' ? 'active' : ''}`}
                onClick={() => setSelectedScope('individual')}
              >
                🎯 Individual Sign
              </button>
              <button
                type="button"
                className={`scope-btn ${selectedScope === 'group' ? 'active' : ''}`}
                onClick={() => setSelectedScope('group')}
              >
                📡 Custom Group ({loc?.name})
              </button>
              <button
                type="button"
                className={`scope-btn ${selectedScope === 'all-locations' ? 'active' : ''}`}
                onClick={() => setSelectedScope('all-locations')}
              >
                🌐 Entire Highway Corridors
              </button>
            </div>
          </div>

          {selectedScope === 'individual' && (
            <div className="form-group">
              <label>Select Target Sign</label>
              <select
                className="custom-select"
                value={selectedSignId}
                onChange={e => setSelectedSignId(e.target.value)}
              >
                {signsList.map(s => (
                  <option key={s.id} value={s.id}>
                    [{s.km}] {s.type} — Current: "{s.msg}"
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* PHASE-AWARE STEPPER (PHASES 1 - 5) */}
          <div className="form-group">
            <label>Select Operational Phase (Phases 1–5)</label>
            <div className="phase-stepper-bar">
              {[
                { p: 1, label: 'P1: Pre-Activation' },
                { p: 2, label: 'P2: Active Run' },
                { p: 3, label: 'P3: Pre-Deactivation' },
                { p: 4, label: 'P4: Inspection' },
                { p: 5, label: 'P5: Standby / Closed' }
              ].map(phaseObj => (
                <button
                  key={phaseObj.p}
                  type="button"
                  className={`phase-step-btn ${selectedPhase === phaseObj.p ? 'active' : ''}`}
                  onClick={() => handlePhaseChange(phaseObj.p)}
                >
                  {phaseObj.label}
                </button>
              ))}
            </div>
          </div>

          {/* MESSAGE TEMPLATE EDITOR */}
          <div className="vms-preview-box">
            <div className="preview-label">Live VMS LED Display Preview — Phase {selectedPhase}</div>
            <div className="vms-led-preview">
              <div className="led-text line1">{activeForm.msg || 'LINE 1 TEXT'}</div>
              <div className="led-text line2">{activeForm.msg2 || 'LINE 2 TEXT'}</div>
            </div>
          </div>

          <div className="form-row" style={{ marginTop: '14px' }}>
            <div className="form-group">
              <label>Line 1 Display Text</label>
              <input
                type="text"
                value={activeForm.msg}
                onChange={e => setActiveForm({ ...activeForm, msg: e.target.value.toUpperCase() })}
                placeholder="e.g. SMARTLANE BERMULA"
                maxLength={30}
              />
            </div>
            <div className="form-group">
              <label>Line 2 Display Text</label>
              <input
                type="text"
                value={activeForm.msg2}
                onChange={e => setActiveForm({ ...activeForm, msg2: e.target.value.toUpperCase() })}
                placeholder="e.g. GUNAKAN LORONG KECEMASAN"
                maxLength={30}
              />
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSaveTemplate}>
            Save &amp; Push Message Template
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
