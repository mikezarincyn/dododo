function Nav({ onStart }) {
  const { Logo, Button } = window.DododoDesignSystem_cdf388;
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '22px 50px', background: 'rgba(255,255,255,.86)',
      backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border-subtle)',
    }}>
      <Logo height={38} assetBase={window.ASSETS} />
      <Button variant="soft" size="sm" uppercase iconRight="→" onClick={onStart}>Start screening</Button>
    </header>
  );
}
window.Nav = Nav;
