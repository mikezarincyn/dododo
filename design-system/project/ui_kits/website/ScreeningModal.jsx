function ScreeningModal({ open, onClose }) {
  const { Card, Button, Input, Logo } = window.DododoDesignSystem_cdf388;
  const [step, setStep] = React.useState(0);
  React.useEffect(() => { if (open) setStep(0); }, [open]);
  if (!open) return null;

  const domains = ['Communication', 'Sensory processing', 'Emotional regulation', 'Social interaction', 'Motor skills', 'Daily routines'];
  const [picked, setPicked] = React.useState([]);
  const toggle = (d) => setPicked(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);

  const Steps = [
    (
      <React.Fragment>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 30, color: 'var(--navy-700)', margin: '0 0 10px' }}>Let&rsquo;s get a clear picture</h3>
        <p style={{ fontSize: 18, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 26px' }}>A free 20-minute screening across 6 developmental areas. No card needed.</p>
        <Input label="Child's first name" placeholder="e.g. Ada" style={{ marginBottom: 18 }} />
        <Input label="Child's age" placeholder="e.g. 4" />
      </React.Fragment>
    ),
    (
      <React.Fragment>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 30, color: 'var(--navy-700)', margin: '0 0 10px' }}>What&rsquo;s on your mind?</h3>
        <p style={{ fontSize: 18, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 24px' }}>Pick the areas you&rsquo;ve noticed — there are no wrong answers.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {domains.map(d => {
            const on = picked.includes(d);
            return (
              <button key={d} onClick={() => toggle(d)} style={{
                padding: '14px 22px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
                border: `1.5px solid ${on ? 'var(--green-500)' : 'var(--border-subtle)'}`,
                background: on ? 'var(--green-100)' : 'var(--white)',
                color: on ? 'var(--green-500)' : 'var(--ink-900)',
                fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 17,
              }}>{d}</button>
            );
          })}
        </div>
      </React.Fragment>
    ),
    (
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-100)', color: 'var(--green-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 20px' }}>✓</div>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 30, color: 'var(--navy-700)', margin: '0 0 10px' }}>You&rsquo;re all set</h3>
        <p style={{ fontSize: 18, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>We&rsquo;ll build {picked.length ? `a plan across ${picked.length} area${picked.length > 1 ? 's' : ''}` : 'your child\u2019s plan'} with a UK-certified occupational therapist. Your PDF report is on its way.</p>
      </div>
    ),
  ];

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,50,118,.32)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(560px, 94vw)' }}>
        <Card tone="white" padding={40} style={{ boxShadow: 'var(--shadow-float)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 26 }}>
            <Logo height={32} assetBase={window.ASSETS} />
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 26, color: 'var(--text-subtle)', cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
          {/* progress dots */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
            {[0,1,2].map(i => <span key={i} style={{ height: 6, flex: 1, borderRadius: 99, background: i <= step ? 'var(--green-500)' : '#E7E9EB' }} />)}
          </div>
          <div style={{ minHeight: 200 }}>{Steps[step]}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30, alignItems: 'center' }}>
            <button onClick={() => step === 0 ? onClose() : setStep(step - 1)} style={{ border: 'none', background: 'transparent', fontSize: 17, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}>
              {step === 0 ? 'Cancel' : 'Back'}
            </button>
            {step < 2
              ? <Button variant="primary" size="sm" iconRight="→" onClick={() => setStep(step + 1)}>Continue</Button>
              : <Button variant="primary" size="sm" onClick={onClose}>Done</Button>}
          </div>
        </Card>
      </div>
    </div>
  );
}
window.ScreeningModal = ScreeningModal;
