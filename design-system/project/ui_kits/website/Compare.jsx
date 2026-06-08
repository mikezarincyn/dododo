function Compare() {
  const { Card, CheckItem } = window.DododoDesignSystem_cdf388;
  const challenge = ['Frequent meltdowns', 'Difficulties with attention', 'Hard transitions between activities', 'Stress around everyday routines', 'Difficulty accessing specialist support', 'Too many conflicting opinions and advice'];
  const withd = ["You understand why it's happening", 'Clear daily steps, designed with therapists', 'Activities that fit into your routine', 'Professional support without the confusion', 'Calm. Confidence. Progress.'];
  return (
    <section style={{ padding: '40px 50px 90px', maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
        <Card tone="grey" padding={40}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 40, color: 'rgba(43,42,42,.75)', margin: '0 0 28px' }}>The challenge</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {challenge.map((c, i) => <CheckItem key={i} kind="cross" title={c} />)}
          </div>
        </Card>
        <Card tone="mint" padding={40}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 40, color: 'var(--navy-700)', margin: '0 0 28px' }}>With Dododo</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {withd.map((c, i) => <CheckItem key={i} title={c} />)}
          </div>
        </Card>
      </div>
    </section>
  );
}
window.Compare = Compare;
