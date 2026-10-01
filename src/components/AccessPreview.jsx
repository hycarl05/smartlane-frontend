export default function AccessPreview({ users, selected, onSelect, notice }) {
  return <aside className="access-preview" aria-label="Demo access preview"><label>Demo persona <select value={selected} onChange={e => onSelect(e.target.value)}>{users.map(u => <option key={u.id} value={u.id}>{u.name} · {u.role}{u.active ? '' : ' · Inactive'}</option>)}</select></label><span>Frontend presentation only — not authentication or security enforcement.</span>{notice && <strong role="status">{notice}</strong>}</aside>;
}
