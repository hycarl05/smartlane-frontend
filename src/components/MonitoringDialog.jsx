import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAccess } from '../accessContext';

export default function MonitoringDialog({ title, onClose, children, hideAccessTest = false, className = '' }) {
  const access = useAccess();
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    const focusable = () => [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]')];
    focusable()[0]?.focus();
    const handleKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(); }
      if (event.key === 'Tab') {
        const items = focusable();
        const first = items[0]; const last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    dialog.addEventListener('keydown', handleKey);
    return () => { dialog.removeEventListener('keydown', handleKey); if (previous?.isConnected) previous.focus(); };
  }, []);
  return createPortal(<div className="monitoring-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={`monitoring-dialog ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
      <header><h2 id={titleId}>{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog">✕</button></header>
      {children}
      {access.notice && <p role="status">{access.notice}</p>}
      {!hideAccessTest && access.persona && <details className="access-dialog-test"><summary>Demo access-change test</summary><p>Switch to the read-only observer preview. This closes dialogs, discards unsaved entries and blocks submission under the old context; shared operations remain intact.</p><button type="button" onClick={access.revoke}>Simulate access change now</button></details>}
    </section>
  </div>, document.body);
}
