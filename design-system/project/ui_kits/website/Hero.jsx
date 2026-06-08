function Hero({ onStart }) {
  const { Button, Card, ConfettiBurst } = window.DododoDesignSystem_cdf388;
  const { Photo, Avatar } = window;
  return (
    <section style={{ position: 'relative', padding: '72px 50px 100px', overflow: 'hidden' }}>
      <ConfettiBurst pieces={[
        { src: 'confetti-dot-yellow.svg', w: 26, top: '12%', left: '40%' },
        { src: 'confetti-triangle-pink.svg', w: 22, top: '8%', left: '46%' },
        { src: 'confetti-triangle-blue.svg', w: 22, top: '20%', left: '44%' },
      ]} assetBase={window.ASSETS} />
      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 56, alignItems: 'center', maxWidth: 1280, margin: '0 auto' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 400, letterSpacing: '.02em',
            fontSize: 68, lineHeight: 1.02, color: 'var(--navy-700)', margin: '0 0 24px', textWrap: 'balance',
          }}>
            The waiting list can take months. But your child&rsquo;s{' '}
            <strong style={{ fontWeight: 700, background: 'linear-gradient(transparent 60%, var(--confetti-blue) 60%)' }}>development isn&rsquo;t waiting.</strong>
          </h1>
          <p style={{ fontSize: 22, lineHeight: 1.5, color: 'var(--text-muted)', maxWidth: 460, margin: '0 0 32px' }}>
            If you&rsquo;ve started to notice issues with behaviour, communication, or how your child responds, you don&rsquo;t have to wait to understand what&rsquo;s going on.
          </p>
          <Button variant="primary" iconRight="→" onClick={onStart}>Get a clear picture</Button>
          <div style={{ marginTop: 18, fontSize: 16, color: 'var(--text-subtle)' }}>Get your child&rsquo;s plan today</div>
        </div>
        <div style={{ position: 'relative' }}>
          <Photo label="Mum & child painting" height={460} tone="#E9E2F2" />
          <Card tone="white" style={{ position: 'absolute', left: -36, bottom: 48, width: 320, padding: 22, boxShadow: 'var(--shadow-float)' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
              <Avatar size={52} tone="#CBD9E8" />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--navy-700)', fontSize: 17 }}>Jaime A.</div>
                <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>Occupational Therapist</div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--text-muted)' }}>
              &ldquo;Children make faster progress when support continues at home. Small daily activities add up to meaningful change.&rdquo;
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}
window.Hero = Hero;
