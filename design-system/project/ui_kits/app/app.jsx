function App() {
  const { IOSDevice } = window;
  const { TodayScreen, ProfileScreen, TabBar } = window;
  const [active, setActive] = React.useState('today');

  // Re-render Lucide icons whenever the screen changes
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  const screen = (active === 'profile' || active === 'plan')
    ? <ProfileScreen />
    : <TodayScreen onOpenProfile={() => setActive('profile')} />;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EEF2F6', padding: 24 }}>
      <IOSDevice>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FBF7F1' }}>
          <div style={{ flex: 1, minHeight: 0 }}>{screen}</div>
          <TabBar active={active} onChange={setActive} />
        </div>
      </IOSDevice>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
