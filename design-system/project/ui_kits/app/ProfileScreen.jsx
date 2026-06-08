function Radar() {
  // 7-axis radar (the 6 areas + joint attention), values 0..1
  const axes = [
    { label: 'Communication', v: 0.78, icon: 'messages-square', tone: 'var(--green-500)' },
    { label: 'Sensory', v: 0.55, icon: 'ear', tone: 'var(--green-500)' },
    { label: 'Motor', v: 0.7, icon: 'hand', tone: 'var(--green-500)' },
    { label: 'Routines', v: 0.62, icon: 'sun', tone: 'var(--green-500)' },
    { label: 'Social', v: 0.5, icon: 'users', tone: 'var(--green-500)' },
    { label: 'Visual', v: 0.38, icon: 'eye', tone: 'var(--coral-500)' },
    { label: 'Emotional', v: 0.66, icon: 'brain', tone: 'var(--confetti-yellow)' },
  ];
  const cx = 150, cy = 150, R = 96, n = axes.length;
  const pt = (i, r) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const grid = [0.33, 0.66, 1].map(f => axes.map((_, i) => pt(i, R * f).join(',')).join(' '));
  const shape = axes.map((ax, i) => pt(i, R * ax.v).join(',')).join(' ');

  return (
    <svg viewBox="0 0 300 300" style={{ width: '100%', maxWidth: 300, display: 'block', margin: '0 auto' }}>
      {grid.map((g, i) => <polygon key={i} points={g} fill="none" stroke="#E7E9EB" strokeWidth="1" />)}
      {axes.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#EDEEF0" strokeWidth="1" />; })}
      <polygon points={shape} fill="rgba(120,110,220,.18)" stroke="#7A6FE0" strokeWidth="2" />
      {axes.map((ax, i) => {
        const [x, y] = pt(i, R + 30);
        return (
          <foreignObject key={i} x={x - 17} y={y - 17} width="34" height="34">
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: ax.tone, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i data-lucide={ax.icon} style={{ width: 17, height: 17, color: '#fff' }}></i>
            </div>
          </foreignObject>
        );
      })}
    </svg>
  );
}

function ProfileScreen() {
  const { Card, ProgressBar } = window.DododoDesignSystem_cdf388;
  const { Ico } = window;
  const rows = [
    { t: 'Emotional Regulation', band: 'Typical for age', level: 'Basic', filled: 4, status: 'typical' },
    { t: 'Joint Attention', band: 'Typical for age', level: 'Building', filled: 3, status: 'building' },
    { t: 'Sensory Processing', band: 'Emerging', level: 'Emerging', filled: 2, status: 'emerging' },
  ];
  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#FBF7F1', padding: '60px 18px 24px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 26, color: 'var(--navy-700)', margin: '4px 0 18px' }}>Ada&rsquo;s development</h1>
      <Card tone="white" padding={18} style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 17, color: 'var(--ink-900)' }}>Sensory needs</span>
          <Ico name="chevron-right" size={20} color="var(--text-subtle)" />
        </div>
        <Radar />
      </Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map((r, i) => (
          <Card key={i} tone="white" padding={18}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, color: 'var(--ink-900)' }}>{r.t}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--grey-surface-100)', padding: '4px 10px', borderRadius: 99 }}>{r.band}</span>
            </div>
            <ProgressBar filled={r.filled} segments={6} status={r.status} label={r.level} />
          </Card>
        ))}
      </div>
    </div>
  );
}
window.ProfileScreen = ProfileScreen;
