function TodayScreen({ onOpenProfile }) {
  const { Logo, Card, Badge } = window.DododoDesignSystem_cdf388;
  const { Ico, ActThumb } = window;

  const days = Array.from({ length: 11 }, (_, i) => ({ n: i + 1, done: i < 4 }));
  const activities = [
    { t: 'Gentle rocking (slow)', tag: 'VESTIBULAR', b: 'Provide slow, predictable input; support balance and calm.', min: 3, pts: 8, tone: '#E6E0F2' },
    { t: 'Dry Texture Treasure', tag: 'TACTILE', b: 'Introduce safe, dry textures predictably; build confidence.', min: 7, pts: 12, tone: '#F3DEDA' },
    { t: 'Cushion Sandwich', tag: 'PROPRIOCEPTIVE', b: 'Deep-pressure play that helps your child feel grounded.', min: 5, pts: 10, tone: '#DCEFE7' },
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#FBF7F1' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '54px 18px 12px', background: 'var(--white)' }}>
        <Logo height={26} assetBase={window.APP_ASSETS} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: 'var(--ink-900)' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>13 min</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: 'var(--ink-900)' }}>
            <Ico name="star" size={16} color="var(--confetti-yellow)" /> 28
          </span>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#CBD9E8' }} />
        </div>
      </div>

      {/* Day streak */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '14px 18px', background: 'var(--white)' }}>
        {days.map(d => (
          <div key={d.n} style={{ flexShrink: 0, textAlign: 'center' }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: d.done ? 'var(--green-500)' : 'var(--white)',
              border: d.done ? 'none' : '1.5px solid var(--green-100)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 13,
            }}>{d.done && <Ico name="check" size={16} color="#fff" />}</div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 5 }}>day {d.n}</div>
          </div>
        ))}
      </div>

      {/* For you */}
      <div style={{ padding: '22px 18px 6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22, color: 'var(--ink-900)', margin: 0 }}>For you</h2>
          <button onClick={onOpenProfile} style={{ border: 'none', background: 'transparent', color: 'var(--green-500)', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>View all</button>
        </div>
        <Card tone="white" padding={18} style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -18, left: -18, width: 70, height: 70, borderRadius: '50%', background: 'var(--confetti-pink)', opacity: .8 }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 17, color: 'var(--ink-900)', marginBottom: 4 }}>Parent emotional wellbeing &amp; calm</div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: 'var(--text-subtle)', marginBottom: 8 }}>DODODO FOUNDATION</div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: 'var(--text-muted)' }}>Build a strong foundation for both you and your child. Learn how to stay calm and create a supportive routine.</p>
          </div>
        </Card>
      </div>

      {/* Today's plan */}
      <div style={{ padding: '22px 18px 24px' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22, color: 'var(--ink-900)', margin: '0 0 14px' }}>Today&rsquo;s plan</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {activities.map((a, i) => (
            <Card key={i} tone="white" padding={16}>
              <div style={{ display: 'flex', gap: 14 }}>
                <ActThumb tone={a.tone} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, color: 'var(--ink-900)' }}>{a.t}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', color: 'var(--green-500)', margin: '3px 0 6px' }}>{a.tag}</div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: 'var(--text-muted)' }}>{a.b}</p>
                  <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 13, color: 'var(--text-muted)', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Ico name="clock" size={14} color="var(--green-500)" /> {a.min} min</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Ico name="star" size={14} color="var(--confetti-yellow)" /> +{a.pts}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
window.TodayScreen = TodayScreen;
