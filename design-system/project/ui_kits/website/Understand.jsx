function Understand() {
  const { CheckItem } = window.DododoDesignSystem_cdf388;
  const { Photo } = window;
  return (
    <section style={{ padding: '40px 50px 90px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
        <Photo label="Mum & child laughing" height={520} tone="#F3DEDA" />
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '.02em', fontSize: 48, lineHeight: 1.08, color: 'var(--navy-700)', margin: '0 0 32px' }}>
            <span style={{ background: 'linear-gradient(transparent 62%, var(--confetti-blue) 62%)' }}>Understand</span><br/>your child
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            <CheckItem title="Know what's happening — right now">A 20-minute developmental screening gives you a clear picture of your child across 6 key areas. Today, not in 18 months.</CheckItem>
            <CheckItem title="A plan you can trust">Built by UK-certified occupational therapists. The same clinical framework used in NHS practice — made accessible at home.</CheckItem>
            <CheckItem title="Activities you can actually do">15–20 minutes a day. No equipment. No specialist knowledge. Built around your child&rsquo;s interests and your real life.</CheckItem>
          </div>
          <p style={{ marginTop: 28, fontSize: 17, color: 'var(--text-subtle)' }}>Three things that work together, so the wait becomes time well spent, not time lost.</p>
        </div>
      </div>
    </section>
  );
}
window.Understand = Understand;
