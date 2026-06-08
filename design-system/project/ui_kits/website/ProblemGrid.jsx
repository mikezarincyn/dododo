function ProblemGrid() {
  const { Card } = window.DododoDesignSystem_cdf388;
  const items = [
    { t: 'Meltdowns still happen', b: "You're managing them alone, without understanding what's driving them or how to help." },
    { t: 'School still raises concerns', b: 'Teachers are flagging behaviour. But without a diagnosis, nobody knows what to do next.' },
    { t: "You're figuring it out alone", b: 'Hours of research, conflicting advice, late-night forum scrolling. Still no clear answers.' },
    { t: 'No one tells you what actually helps', b: 'You\u2019ve been told to "wait and see." Nobody has told you what to actually do at home.' },
  ];
  return (
    <section style={{ padding: '90px 50px', maxWidth: 1280, margin: '0 auto' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)', fontWeight: 400, letterSpacing: '.02em',
        fontSize: 44, lineHeight: 1.12, color: 'var(--navy-700)', textAlign: 'center', margin: '0 0 56px', textWrap: 'balance',
      }}>
        The system is overwhelmed.{' '}
        <strong style={{ fontWeight: 700, display: 'block' }}>But your child isn&rsquo;t pausing for it.</strong>
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22 }}>
        {items.map((it, i) => (
          <Card key={i} tone="white" padding={26} style={{ minHeight: 230 }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 21, color: 'var(--navy-700)', margin: '0 0 16px', lineHeight: 1.25 }}>{it.t}</h3>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: 'var(--text-muted)' }}>{it.b}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
window.ProblemGrid = ProblemGrid;
