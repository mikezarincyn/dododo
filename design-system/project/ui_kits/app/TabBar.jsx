function TabBar({ active, onChange }) {
  const { Ico } = window;
  const tabs = [
    { id: 'today', label: 'Today', icon: 'calendar' },
    { id: 'foryou', label: 'For you', icon: 'book-open' },
    { id: 'plan', label: "Kid's plan", icon: 'layout-grid' },
    { id: 'profile', label: 'Profile', icon: 'sliders-horizontal' },
  ];
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '12px 8px 10px', background: 'var(--white)', borderTop: '1px solid var(--border-subtle)',
    }}>
      {tabs.map(t => {
        const on = active === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: on ? 'var(--green-500)' : 'rgba(43,42,42,.5)',
          }}>
            <Ico name={t.icon} size={22} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: on ? 700 : 500 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
window.TabBar = TabBar;
