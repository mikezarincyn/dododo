function Testimonials({ onStart }) {
  const { Card, Button } = window.DododoDesignSystem_cdf388;
  const { Avatar } = window;
  const pros = [
    { n: 'Claire M.', r: 'Speech & Language Therapist, London', q: 'What happens between sessions matters as much as the session itself. Dododo gives families the structure to make that time count.' },
    { n: 'Jaime A.', r: 'OT, Lisbon', q: "My families wait 12, 18, sometimes 24 months to see me. Dododo means that time isn't wasted, they arrive knowing their child, not just worrying about them." },
    { n: 'Rachel B.', r: 'Speech & Language Therapist, Birmingham', q: 'When a parent comes to a session with observations, notes, and confidence — the whole session changes.' },
  ];
  return (
    <section style={{ position: 'relative', padding: '80px 50px 90px', background: 'var(--blush-100)', overflow: 'hidden' }}>
      <img src={`${window.ASSETS}/sparkle.svg`} alt="" style={{ position: 'absolute', width: 34, top: 70, left: 70 }} />
      <img src={`${window.ASSETS}/sparkle.svg`} alt="" style={{ position: 'absolute', width: 26, top: '52%', right: 60 }} />
      <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 17, fontWeight: 700, letterSpacing: '.14em', color: 'var(--navy-700)', textTransform: 'uppercase' }}>What professionals say</div>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 64, color: 'var(--ink-900)', textAlign: 'center', margin: '0 0 48px' }}>Trusted by specialists</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 26, maxWidth: 1120, margin: '0 auto' }}>
        {pros.map((p, i) => (
          <Card key={i} tone="white" padding={28}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
              <Avatar size={56} tone="#D8E6F2" />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--navy-700)', fontSize: 18 }}>{p.n}</div>
                <div style={{ fontSize: 15, color: 'var(--ink-900)' }}>{p.r}</div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: 'var(--text-muted)' }}>&ldquo;{p.q}&rdquo;</p>
          </Card>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: 44 }}>
        <div style={{ fontSize: 26, color: 'var(--ink-900)', marginBottom: 22 }}>See your child&rsquo;s development clearly</div>
        <Button variant="outline" onClick={onStart}>Get a clear picture</Button>
      </div>
    </section>
  );
}
window.Testimonials = Testimonials;
