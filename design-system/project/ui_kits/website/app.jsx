function Footer() {
  const { Logo } = window.DododoDesignSystem_cdf388;
  return (
    <footer style={{ padding: '48px 50px', background: 'var(--white)', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 18 }}>
      <Logo height={32} assetBase={window.ASSETS} />
      <div style={{ fontSize: 15, color: 'var(--text-subtle)' }}>Built by UK-certified occupational therapists · Non-clinical support for families.</div>
    </footer>
  );
}

function Site() {
  const { Nav, Hero, ProblemGrid, Understand, Compare, Pricing, Testimonials, ScreeningModal } = window;
  const [open, setOpen] = React.useState(false);
  const start = () => setOpen(true);
  return (
    <div style={{ background: 'var(--white)' }}>
      <Nav onStart={start} />
      <Hero onStart={start} />
      <ProblemGrid />
      <Understand />
      <Compare />
      <Pricing onStart={start} />
      <Testimonials onStart={start} />
      <Footer />
      <ScreeningModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Site />);
