function Pricing({ onStart }) {
  const { Card, Button, Badge } = window.DododoDesignSystem_cdf388;
  const Plan = ({ name, price, unit, feats, cta, ctaVariant, popular }) => (
    <Card tone="white" padding={34} style={{ position: 'relative', display: 'flex', flexDirection: 'column', border: popular ? '1.5px solid var(--green-500)' : '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '.04em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{name}</span>
        {popular && <Badge tone="coral">most popular</Badge>}
      </div>
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 56, color: 'var(--navy-700)', lineHeight: 1 }}>{price}</div>
      <div style={{ fontSize: 17, color: 'var(--text-muted)', margin: '6px 0 26px' }}>{unit}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28, flex: 1 }}>
        {feats.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 17, color: 'var(--ink-900)' }}>
            <span style={{ color: 'var(--green-500)', fontWeight: 700 }}>✓</span>{f}
          </div>
        ))}
      </div>
      <Button variant={ctaVariant} onClick={onStart}>{cta}</Button>
    </Card>
  );
  return (
    <section style={{ position: 'relative', padding: '90px 50px 100px', background: 'linear-gradient(180deg, var(--green-500) 0%, #8FCBB4 55%, #DDF0E8 100%)', overflow: 'hidden' }}>
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '.14em', color: 'rgba(255,255,255,.9)', textTransform: 'uppercase', marginBottom: 14 }}>Pricing</div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 64, color: 'var(--white)', margin: 0 }}>Simple and transparent</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 26, maxWidth: 1100, margin: '0 auto', alignItems: 'stretch' }}>
        <Plan name="Free" price="£0" unit="forever" ctaVariant="outline" cta="Start screening" feats={['Full screening', 'Developmental results', 'PDF report']} />
        <Plan name="Daily plan" price="£19" unit="/ month" popular ctaVariant="primary" cta="Let's go!" feats={['Everything in free', 'Personalised activity plan', 'Progress tracking', 'Cancel anytime']} />
        <Plan name="Daily plan + OT support" price="£120" unit="/ month" ctaVariant="outline" cta="Choose plan" feats={['Everything in Daily plan', 'One OT call a month']} />
      </div>
      <div style={{ textAlign: 'center', marginTop: 36, fontSize: 22, color: 'rgba(43,42,42,.7)' }}>No card needed for screening</div>
    </section>
  );
}
window.Pricing = Pricing;
