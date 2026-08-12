import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export const DEFAULT_ROLE_TEMPLATES = {
  entry: {
    1: { msg: 'PERHATIAN: BERSEDIA', msg2: 'SMARTLANE AKAN DIBUKA' },
    2: { msg: 'SMARTLANE BERMULA', msg2: 'GUNAKAN LORONG KECEMASAN' },
    3: { msg: 'SMARTLANE AKAN DITUTUP', msg2: 'BERSEDIA MASUK LORONG UTAMA' },
    4: { msg: 'PEMERIKSAAN LORONG', msg2: 'PATUHI ARAHAN PETUGAS' },
    5: { msg: 'SMARTLANE DITUTUP', msg2: 'GUNA LORONG UTAMA SAHAJA' },
    0: { msg: 'SMARTLANE DITUTUP', msg2: 'GUNA LORONG UTAMA SAHAJA' }
  },
  exit: {
    1: { msg: 'PERHATIAN: BERSEDIA', msg2: 'SMARTLANE AKAN DIBUKA' },
    2: { msg: 'SMARTLANE TAMAT', msg2: 'MASUK KEMBALI KE LORONG UTAMA' },
    3: { msg: 'SMARTLANE AKAN DITUTUP', msg2: 'KOSONGKAN LORONG KECEMASAN' },
    4: { msg: 'PEMERIKSAAN LORONG', msg2: 'PATUHI ARAHAN PETUGAS' },
    5: { msg: 'SMARTLANE DITUTUP', msg2: 'GUNA LORONG UTAMA SAHAJA' },
    0: { msg: 'SMARTLANE DITUTUP', msg2: 'GUNA LORONG UTAMA SAHAJA' }
  },
  mini: {
    1: { msg: 'PATUHI ARAHAN', msg2: 'PERHATIKAN ISYARAT LCS' },
    2: { msg: 'JALUR KECEMASAN', msg2: 'DIBUKA SEMENTARA' },
    3: { msg: 'BERSEDIA KELUAR', msg2: 'SEGERA MASUK LORONG UTAMA' },
    4: { msg: 'PEMERIKSAAN KAWASAN', msg2: 'PANDU DENGAN CERMAT' },
    5: { msg: 'LORONG KECEMASAN', msg2: 'DITUTUP SEMENTARA' },
    0: { msg: 'LORONG KECEMASAN', msg2: 'DITUTUP SEMENTARA' }
  }
};

export function getDynamicVmsMessage(sign, phase = 0) {
  if (!sign) return { msg: 'SMARTLANE DITUTUP', msg2: 'GUNA LORONG UTAMA SAHAJA' };
  const pNum = Number(phase) || 0;

  if (sign.phaseTemplates && sign.phaseTemplates[pNum]) {
    return sign.phaseTemplates[pNum];
  }

  let role = 'entry';
  if (sign.position === 'Exit') {
    role = 'exit';
  } else if (sign.position === 'Entry') {
    role = 'entry';
  } else if (
    sign.type?.toLowerCase().includes('mini') ||
    sign.position === 'Intermediate' ||
    sign.id?.startsWith('mvms')
  ) {
    role = 'mini';
  }

  const roleMap = DEFAULT_ROLE_TEMPLATES[role] || DEFAULT_ROLE_TEMPLATES.entry;
  return roleMap[pNum] || roleMap[0] || roleMap[5] || { msg: 'SMARTLANE DITUTUP', msg2: 'GUNA LORONG UTAMA SAHAJA' };
}

const ENTRY_PRESETS = [
  { msg: 'SMARTLANE BERMULA', msg2: 'GUNAKAN LORONG KECEMASAN' },
  { msg: 'PERHATIAN: BERSEDIA', msg2: 'SMARTLANE AKAN DIBUKA' },
  { msg: 'SMARTLANE AKAN DITUTUP', msg2: 'BERSEDIA MASUK LORONG UTAMA' },
  { msg: 'SMARTLANE DITUTUP', msg2: 'GUNA LORONG UTAMA SAHAJA' }
];

const EXIT_PRESETS = [
  { msg: 'SMARTLANE TAMAT', msg2: 'MASUK KEMBALI KE LORONG UTAMA' },
  { msg: 'PERHATIAN: BERSEDIA', msg2: 'KOSONGKAN LORONG KECEMASAN' },
  { msg: 'SMARTLANE AKAN DITUTUP', msg2: 'KOSONGKAN LORONG KECEMASAN' },
  { msg: 'SMARTLANE DITUTUP', msg2: 'GUNA LORONG UTAMA SAHAJA' }
];

const MINI_PRESETS = [
  { msg: 'JALUR KECEMASAN', msg2: 'DIBUKA SEMENTARA' },
  { msg: 'PATUHI HAD LAJU', msg2: '60 KM/J DI LORONG KECEMASAN' },
  { msg: 'KESESAKAN DIKESAN', msg2: 'LORONG KECEMASAN DIBUKA' },
  { msg: 'PATUHI ARAHAN', msg2: 'PERHATIKAN ISYARAT LCS' }
];

// STANDALONE / INLINE FULL TAB SECTION FOR VMS EDITOR
export function VmsEditorSection({
  loc,
  locations = [],
  onUpdateLoc,
  onShowToast
}) {
  const [moduleType, setModuleType] = useState('vms'); // 'vms' | 'miniVms'
  const [selectedScope, setSelectedScope] = useState('group'); // 'individual' | 'group' | 'all-locations'
  const [selectedSignId, setSelectedSignId] = useState(() => {
    if (loc?.vms?.length > 0) return loc.vms[0].id;
    return '';
  });

  const [selectedPhase, setSelectedPhase] = useState(loc?.phase || 2);

  // Forms state per phase
  const [entryForms, setEntryForms] = useState(() => DEFAULT_ROLE_TEMPLATES.entry);
  const [exitForms, setExitForms] = useState(() => DEFAULT_ROLE_TEMPLATES.exit);
  const [miniForms, setMiniForms] = useState(() => DEFAULT_ROLE_TEMPLATES.mini);

  // Active individual sign form when scope is 'individual'
  const [indivForm, setIndivForm] = useState(() => {
    const currentSign = loc?.vms?.find(s => s.id === selectedSignId) || loc?.vms?.[0];
    return {
      msg: currentSign?.msg || DEFAULT_ROLE_TEMPLATES.entry[2].msg,
      msg2: currentSign?.msg2 || DEFAULT_ROLE_TEMPLATES.entry[2].msg2
    };
  });

  const handleSignSelect = (signId) => {
    setSelectedSignId(signId);
    const signsList = moduleType === 'vms' ? (loc?.vms || []) : (loc?.miniVms || []);
    const targetSign = signsList.find(s => s.id === signId);
    if (targetSign) {
      const phaseTpl = targetSign.phaseTemplates?.[selectedPhase];
      setIndivForm({
        msg: phaseTpl?.msg || targetSign.msg || 'SMARTLANE MESSAGE',
        msg2: phaseTpl?.msg2 || targetSign.msg2 || 'SUB MESSAGE'
      });
    }
  };

  const handlePhaseChange = (pNum) => {
    setSelectedPhase(pNum);
    if (selectedScope === 'individual') {
      const signsList = moduleType === 'vms' ? (loc?.vms || []) : (loc?.miniVms || []);
      const targetSign = signsList.find(s => s.id === selectedSignId);
      if (targetSign) {
        const phaseTpl = targetSign.phaseTemplates?.[pNum];
        setIndivForm({
          msg: phaseTpl?.msg || targetSign.msg || (targetSign.position === 'Exit' ? DEFAULT_ROLE_TEMPLATES.exit[pNum].msg : DEFAULT_ROLE_TEMPLATES.entry[pNum].msg),
          msg2: phaseTpl?.msg2 || targetSign.msg2 || (targetSign.position === 'Exit' ? DEFAULT_ROLE_TEMPLATES.exit[pNum].msg2 : DEFAULT_ROLE_TEMPLATES.entry[pNum].msg2)
        });
      }
    }
  };

  const handleSave = () => {
    const fieldKey = moduleType === 'vms' ? 'vms' : 'miniVms';

    if (selectedScope === 'individual') {
      const targetSign = (loc[fieldKey] || []).find(s => s.id === selectedSignId);
      const updatedList = (loc[fieldKey] || []).map(sign => {
        if (sign.id === selectedSignId) {
          const existingTemplates = sign.phaseTemplates || {};
          const updatedPhaseTemplates = {
            ...existingTemplates,
            [selectedPhase]: { msg: indivForm.msg, msg2: indivForm.msg2 }
          };
          return {
            ...sign,
            msg: indivForm.msg,
            msg2: indivForm.msg2,
            phaseTemplates: updatedPhaseTemplates
          };
        }
        return sign;
      });

      onUpdateLoc(loc.id, { [fieldKey]: updatedList });
      if (onShowToast) onShowToast(`Phase ${selectedPhase} template saved ONLY to sign [${targetSign?.km || selectedSignId}]`);
    } else if (selectedScope === 'group') {
      if (moduleType === 'vms') {
        const updatedVms = (loc.vms || []).map(sign => {
          const isExit = sign.position === 'Exit';
          const templateSource = isExit ? exitForms[selectedPhase] : entryForms[selectedPhase];
          const existingTemplates = sign.phaseTemplates || {};
          const updatedPhaseTemplates = {
            ...existingTemplates,
            [selectedPhase]: { msg: templateSource.msg, msg2: templateSource.msg2 }
          };
          return {
            ...sign,
            msg: templateSource.msg,
            msg2: templateSource.msg2,
            phaseTemplates: updatedPhaseTemplates
          };
        });
        onUpdateLoc(loc.id, { vms: updatedVms });
        if (onShowToast) onShowToast(`Phase ${selectedPhase} Entry & Exit VMS templates pushed to ${loc.name}`);
      } else {
        const updatedMini = (loc.miniVms || []).map(sign => {
          const templateSource = miniForms[selectedPhase];
          const existingTemplates = sign.phaseTemplates || {};
          const updatedPhaseTemplates = {
            ...existingTemplates,
            [selectedPhase]: { msg: templateSource.msg, msg2: templateSource.msg2 }
          };
          return {
            ...sign,
            msg: templateSource.msg,
            msg2: templateSource.msg2,
            phaseTemplates: updatedPhaseTemplates
          };
        });
        onUpdateLoc(loc.id, { miniVms: updatedMini });
        if (onShowToast) onShowToast(`Phase ${selectedPhase} Mini VMS templates pushed to ${loc.name}`);
      }
    } else if (selectedScope === 'all-locations') {
      locations.forEach(l => {
        if (moduleType === 'vms') {
          const updatedVms = (l.vms || []).map(sign => {
            const isExit = sign.position === 'Exit';
            const templateSource = isExit ? exitForms[selectedPhase] : entryForms[selectedPhase];
            const existingTemplates = sign.phaseTemplates || {};
            const updatedPhaseTemplates = {
              ...existingTemplates,
              [selectedPhase]: { msg: templateSource.msg, msg2: templateSource.msg2 }
            };
            return {
              ...sign,
              msg: templateSource.msg,
              msg2: templateSource.msg2,
              phaseTemplates: updatedPhaseTemplates
            };
          });
          onUpdateLoc(l.id, { vms: updatedVms });
        } else {
          const updatedMini = (l.miniVms || []).map(sign => {
            const templateSource = miniForms[selectedPhase];
            const existingTemplates = sign.phaseTemplates || {};
            const updatedPhaseTemplates = {
              ...existingTemplates,
              [selectedPhase]: { msg: templateSource.msg, msg2: templateSource.msg2 }
            };
            return {
              ...sign,
              msg: templateSource.msg,
              msg2: templateSource.msg2,
              phaseTemplates: updatedPhaseTemplates
            };
          });
          onUpdateLoc(l.id, { miniVms: updatedMini });
        }
      });
      if (onShowToast) onShowToast(`Phase ${selectedPhase} role templates pushed to ALL highway locations!`);
    }
  };

  const signsList = moduleType === 'vms' ? (loc?.vms || []) : (loc?.miniVms || []);
  const activeIndivSign = signsList.find(s => s.id === selectedSignId) || signsList[0];

  return (
    <div className="tab-panel active">
      <div className="vms-section-grid">
        {/* LEFT COLUMN: CONTROLS & POSITION-AWARE TEMPLATE FORMS */}
        <div className="panel" style={{ minHeight: 0 }}>
          <div className="panel-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div className="panel-title" style={{ margin: 0 }}>Position-Aware VMS Message Controller</div>
              <small style={{ color: 'var(--text-faint)' }}>Location: {loc?.name} ({loc?.direction})</small>
            </div>

            {/* MODULE SWITCHER */}
            <div className="vms-module-switcher">
              <button
                className={`mod-switch-btn ${moduleType === 'vms' ? 'active' : ''}`}
                onClick={() => setModuleType('vms')}
              >
                📡 Standard VMS (Entry &amp; Exit)
              </button>
              <button
                className={`mod-switch-btn ${moduleType === 'miniVms' ? 'active' : ''}`}
                onClick={() => setModuleType('miniVms')}
              >
                📱 Mini VMS (Intermediate)
              </button>
            </div>
          </div>

          {/* 1. PUSH SCOPE MANAGEMENT */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Push Scope Management</label>
            <div className="scope-toggle-group">
              <button
                type="button"
                className={`scope-btn ${selectedScope === 'individual' ? 'active' : ''}`}
                onClick={() => setSelectedScope('individual')}
              >
                🎯 Individual Sign Only
              </button>
              <button
                type="button"
                className={`scope-btn ${selectedScope === 'group' ? 'active' : ''}`}
                onClick={() => setSelectedScope('group')}
              >
                📡 Location Group (Position Aware)
              </button>
              <button
                type="button"
                className={`scope-btn ${selectedScope === 'all-locations' ? 'active' : ''}`}
                onClick={() => setSelectedScope('all-locations')}
              >
                🌐 Entire Highway Network
              </button>
            </div>
            <div className="scope-hint-box" style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-faint)', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--line)' }}>
              {selectedScope === 'individual' && `Updates ONLY sign [${activeIndivSign?.km || 'Selected'}] without changing other signs on this stretch.`}
              {selectedScope === 'group' && `Updates Entry VMS with Entry messages & Exit VMS with Exit messages on ${loc?.name}.`}
              {selectedScope === 'all-locations' && 'Broadcasts position-aware Entry & Exit templates across ALL highway locations nationwide.'}
            </div>
          </div>

          {/* 2. TARGET SIGN SELECTOR (If scope is individual) */}
          {selectedScope === 'individual' && (
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Select Target Sign Hardware</label>
              <select
                className="custom-select"
                value={selectedSignId}
                onChange={e => handleSignSelect(e.target.value)}
              >
                {signsList.map(s => (
                  <option key={s.id} value={s.id}>
                    [{s.km}] {s.type} ({s.position}) — Current: "{s.msg}"
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 3. OPERATIONAL PHASE STEPPER */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
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

          {/* 4. FORM INPUTS BASED ON SCOPE */}
          {selectedScope === 'individual' ? (
            /* INDIVIDUAL SIGN EDITING FORM */
            <div className="role-form-box" style={{ background: 'var(--card-soft)', padding: '14px', borderRadius: '8px', border: '1px solid var(--line)' }}>
              <div className="role-title" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--brand)', marginBottom: '10px' }}>
                ✏️ Editing Target Sign: {activeIndivSign?.type} [{activeIndivSign?.km}]
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Line 1 Display Message</label>
                  <input
                    type="text"
                    value={indivForm.msg}
                    onChange={e => setIndivForm({ ...indivForm, msg: e.target.value.toUpperCase() })}
                    placeholder="e.g. SMARTLANE BERMULA"
                    maxLength={32}
                  />
                </div>
                <div className="form-group">
                  <label>Line 2 Display Message</label>
                  <input
                    type="text"
                    value={indivForm.msg2}
                    onChange={e => setIndivForm({ ...indivForm, msg2: e.target.value.toUpperCase() })}
                    placeholder="e.g. GUNAKAN LORONG KECEMASAN"
                    maxLength={32}
                  />
                </div>
              </div>
            </div>
          ) : moduleType === 'vms' ? (
            /* DUAL ENTRY & EXIT FORMS FOR GROUP BROADCAST */
            <div className="vms-dual-forms" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* ENTRY VMS FORM */}
              <div className="role-form-box" style={{ background: 'rgba(30, 136, 229, 0.06)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(30, 136, 229, 0.3)' }}>
                <div className="role-title" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--brand)', marginBottom: '10px' }}>
                  🟢 Entry VMS (Buka) Template — Phase {selectedPhase}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Line 1 (Entry Sign)</label>
                    <input
                      type="text"
                      value={entryForms[selectedPhase]?.msg || ''}
                      onChange={e => setEntryForms({
                        ...entryForms,
                        [selectedPhase]: { ...(entryForms[selectedPhase] || {}), msg: e.target.value.toUpperCase() }
                      })}
                      placeholder="e.g. SMARTLANE BERMULA"
                      maxLength={32}
                    />
                  </div>
                  <div className="form-group">
                    <label>Line 2 (Entry Sign)</label>
                    <input
                      type="text"
                      value={entryForms[selectedPhase]?.msg2 || ''}
                      onChange={e => setEntryForms({
                        ...entryForms,
                        [selectedPhase]: { ...(entryForms[selectedPhase] || {}), msg2: e.target.value.toUpperCase() }
                      })}
                      placeholder="e.g. GUNAKAN LORONG KECEMASAN"
                      maxLength={32}
                    />
                  </div>
                </div>
                <div className="preset-chips-wrap" style={{ marginTop: '8px' }}>
                  {ENTRY_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="preset-chip-btn"
                      onClick={() => setEntryForms({ ...entryForms, [selectedPhase]: { msg: p.msg, msg2: p.msg2 } })}
                    >
                      {p.msg}
                    </button>
                  ))}
                </div>
              </div>

              {/* EXIT VMS FORM */}
              <div className="role-form-box" style={{ background: 'rgba(255, 170, 0, 0.06)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255, 170, 0, 0.3)' }}>
                <div className="role-title" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--amber)', marginBottom: '10px' }}>
                  🔴 Exit VMS (Tutup) Template — Phase {selectedPhase}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Line 1 (Exit Sign)</label>
                    <input
                      type="text"
                      value={exitForms[selectedPhase]?.msg || ''}
                      onChange={e => setExitForms({
                        ...exitForms,
                        [selectedPhase]: { ...(exitForms[selectedPhase] || {}), msg: e.target.value.toUpperCase() }
                      })}
                      placeholder="e.g. SMARTLANE TAMAT"
                      maxLength={32}
                    />
                  </div>
                  <div className="form-group">
                    <label>Line 2 (Exit Sign)</label>
                    <input
                      type="text"
                      value={exitForms[selectedPhase]?.msg2 || ''}
                      onChange={e => setExitForms({
                        ...exitForms,
                        [selectedPhase]: { ...(exitForms[selectedPhase] || {}), msg2: e.target.value.toUpperCase() }
                      })}
                      placeholder="e.g. MASUK KEMBALI KE LORONG UTAMA"
                      maxLength={32}
                    />
                  </div>
                </div>
                <div className="preset-chips-wrap" style={{ marginTop: '8px' }}>
                  {EXIT_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="preset-chip-btn"
                      onClick={() => setExitForms({ ...exitForms, [selectedPhase]: { msg: p.msg, msg2: p.msg2 } })}
                    >
                      {p.msg}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* MINI VMS INTERMEDIATE FORM */
            <div className="role-form-box" style={{ background: 'var(--card-soft)', padding: '14px', borderRadius: '8px', border: '1px solid var(--line)' }}>
              <div className="role-title" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '10px' }}>
                📱 Mini VMS Intermediate Template — Phase {selectedPhase}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Line 1 Display Message</label>
                  <input
                    type="text"
                    value={miniForms[selectedPhase]?.msg || ''}
                    onChange={e => setMiniForms({
                      ...miniForms,
                      [selectedPhase]: { ...(miniForms[selectedPhase] || {}), msg: e.target.value.toUpperCase() }
                    })}
                    placeholder="e.g. JALUR KECEMASAN"
                    maxLength={32}
                  />
                </div>
                <div className="form-group">
                  <label>Line 2 Display Message</label>
                  <input
                    type="text"
                    value={miniForms[selectedPhase]?.msg2 || ''}
                    onChange={e => setMiniForms({
                      ...miniForms,
                      [selectedPhase]: { ...(miniForms[selectedPhase] || {}), msg2: e.target.value.toUpperCase() }
                    })}
                    placeholder="e.g. DIBUKA SEMENTARA"
                    maxLength={32}
                  />
                </div>
              </div>
              <div className="preset-chips-wrap" style={{ marginTop: '8px' }}>
                {MINI_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="preset-chip-btn"
                    onClick={() => setMiniForms({ ...miniForms, [selectedPhase]: { msg: p.msg, msg2: p.msg2 } })}
                  >
                    {p.msg}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ACTION BUTTON */}
          <div style={{ marginTop: '20px' }}>
            <button className="gen-btn" style={{ margin: 0, width: '100%' }} onClick={handleSave}>
              ⚡ Save &amp; Broadcast Position-Aware Template
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE LED PREVIEWS & HARDWARE MATRIX */}
        <div className="panel" style={{ minHeight: 0 }}>
          <div className="panel-title">Live LED Sign Board Matrix Preview</div>

          {selectedScope === 'individual' ? (
            /* SINGLE SIGN PREVIEW */
            <div className="vms-preview-box" style={{ marginTop: '4px', padding: '16px' }}>
              <div className="preview-label">
                LIVE TARGET PREVIEW — [{activeIndivSign?.km}] {activeIndivSign?.type}
              </div>
              <div className="vms-led-preview" style={{ minHeight: '70px', justifyContent: 'center' }}>
                <div className="led-text line1" style={{ fontSize: '18px', textShadow: '0 0 10px rgba(255, 170, 0, 0.8)' }}>
                  {indivForm.msg || 'LINE 1 DISPLAY'}
                </div>
                <div className="led-text line2" style={{ fontSize: '15px', textShadow: '0 0 8px rgba(255, 170, 0, 0.7)', marginTop: '4px' }}>
                  {indivForm.msg2 || 'LINE 2 DISPLAY'}
                </div>
              </div>
            </div>
          ) : moduleType === 'vms' ? (
            /* SIDE-BY-SIDE ENTRY & EXIT PREVIEWS FOR GROUP BROADCAST */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
              {/* ENTRY PREVIEW */}
              <div className="vms-preview-box" style={{ padding: '14px', border: '1px solid rgba(30, 136, 229, 0.4)' }}>
                <div className="preview-label" style={{ color: 'var(--brand)' }}>
                  🟢 ENTRY VMS (BUKA) PREVIEW — PHASE {selectedPhase}
                </div>
                <div className="vms-led-preview" style={{ minHeight: '65px', justifyContent: 'center' }}>
                  <div className="led-text line1" style={{ fontSize: '17px', textShadow: '0 0 10px rgba(255, 170, 0, 0.8)' }}>
                    {entryForms[selectedPhase]?.msg || 'SMARTLANE BERMULA'}
                  </div>
                  <div className="led-text line2" style={{ fontSize: '14px', textShadow: '0 0 8px rgba(255, 170, 0, 0.7)', marginTop: '4px' }}>
                    {entryForms[selectedPhase]?.msg2 || 'GUNAKAN LORONG KECEMASAN'}
                  </div>
                </div>
              </div>

              {/* EXIT PREVIEW */}
              <div className="vms-preview-box" style={{ padding: '14px', border: '1px solid rgba(255, 170, 0, 0.4)' }}>
                <div className="preview-label" style={{ color: 'var(--amber)' }}>
                  🔴 EXIT VMS (TUTUP) PREVIEW — PHASE {selectedPhase}
                </div>
                <div className="vms-led-preview" style={{ minHeight: '65px', justifyContent: 'center' }}>
                  <div className="led-text line1" style={{ fontSize: '17px', textShadow: '0 0 10px rgba(255, 170, 0, 0.8)' }}>
                    {exitForms[selectedPhase]?.msg || 'SMARTLANE TAMAT'}
                  </div>
                  <div className="led-text line2" style={{ fontSize: '14px', textShadow: '0 0 8px rgba(255, 170, 0, 0.7)', marginTop: '4px' }}>
                    {exitForms[selectedPhase]?.msg2 || 'MASUK KEMBALI KE LORONG UTAMA'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* MINI VMS PREVIEW */
            <div className="vms-preview-box" style={{ marginTop: '4px', padding: '16px' }}>
              <div className="preview-label">
                📱 MINI VMS PREVIEW — PHASE {selectedPhase}
              </div>
              <div className="vms-led-preview" style={{ minHeight: '70px', justifyContent: 'center' }}>
                <div className="led-text line1" style={{ fontSize: '18px', textShadow: '0 0 10px rgba(255, 170, 0, 0.8)' }}>
                  {miniForms[selectedPhase]?.msg || 'JALUR KECEMASAN'}
                </div>
                <div className="led-text line2" style={{ fontSize: '15px', textShadow: '0 0 8px rgba(255, 170, 0, 0.7)', marginTop: '4px' }}>
                  {miniForms[selectedPhase]?.msg2 || 'DIBUKA SEMENTARA'}
                </div>
              </div>
            </div>
          )}

          <div className="panel-title" style={{ marginTop: '20px', marginBottom: '8px' }}>
            Configured VMS Boards on {loc?.name}
          </div>

          <div className="vms-boards-list-grid">
            {signsList.map(s => {
              const activePhaseNum = loc?.phase || 0;
              const dMsg = getDynamicVmsMessage(s, activePhaseNum);
              const displayMsg1 = dMsg.msg;
              const displayMsg2 = dMsg.msg2;

              return (
                <div key={s.id || s.km} className="vms-card-hw">
                  <div className="hw-head">
                    <span className="hw-type">{s.type}</span>
                    <span className="hw-km">{s.km}</span>
                  </div>
                  <div className="hw-body">
                    <div className="t1">{displayMsg1}</div>
                    <div className="t2">{displayMsg2}</div>
                  </div>
                  <div className="hw-foot">
                    <span className="status-dot-good">● {s.status || 'Good'}</span>
                    <span className="mono-ip">10.180.4.{15 + (s.id ? s.id.length : 1)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// MODAL WRAPPER COMPONENT
export default function VmsEditor({
  isOpen,
  onClose,
  moduleType = 'vms',
  loc,
  locations = [],
  onUpdateLoc,
  onShowToast
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop">
      <div className="modal-content vms-editor-modal" style={{ width: '900px', maxWidth: '95vw' }}>
        <div className="modal-header">
          <div>
            <h3>VMS Message Controller &amp; Position-Aware Mapper</h3>
            <small style={{ color: 'var(--text-faint)' }}>Phase-Aware Text Mapping &amp; Multi-Sign Push Management</small>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="vms-editor-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <VmsEditorSection
            loc={loc}
            locations={locations}
            onUpdateLoc={onUpdateLoc}
            onShowToast={onShowToast}
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close Window
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
