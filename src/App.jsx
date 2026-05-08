import { useCallback, useEffect, useState } from 'react';
import { supabase } from './lib/supabase.js';
import { initStore, resetStore, applyRemoteState } from './lib/store.js';
import { subscribeToUserState } from './lib/storage.js';
import HomeScreen from './components/HomeScreen.jsx';
import ClientProfile from './components/ClientProfile.jsx';
import WeekView from './components/WeekView.jsx';
import DayView from './components/DayView.jsx';
import SettingsView from './components/SettingsView.jsx';
import AuthView from './components/AuthView.jsx';
import SessionTabBar from './components/SessionTabBar.jsx';
import { useStore } from './lib/store.js';

// View stack: 'home' | 'client' | 'week' | 'day' | 'settings'
// Active sessions: an ordered list of {clientId, weekId, dayId} that the user
// has opened — drives the multi-tab bar inside DayView.
export default function App() {
  const [view, setView] = useState({ name: 'home' });
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [storeReady, setStoreReady] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = null;
    if (session) {
      setStoreReady(false);
      initStore().then(() => {
        if (cancelled) return;
        setStoreReady(true);
        unsubscribe = subscribeToUserState(session.user.id, applyRemoteState);
      });
    } else {
      resetStore();
      setStoreReady(false);
      setView({ name: 'home' });
      setActiveSessions([]);
    }
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [session?.user?.id]);

  useEffect(() => {
    const onResize = () => {
      document.documentElement.style.setProperty(
        '--vh',
        `${window.innerHeight * 0.01}px`
      );
    };
    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const openClient = (id) => setView({ name: 'client', clientId: id });
  const openWeek = (weekId) =>
    setView({ name: 'week', clientId: view.clientId, weekId });

  const openDay = useCallback(
    (dayId) => {
      const clientId = view.clientId;
      const weekId = view.weekId;
      const next = { clientId, weekId, dayId };
      setActiveSessions((cur) => {
        // Replace existing session for this client (so opening Day A then Day B
        // for the same client just updates that tab — doesn't spawn duplicates).
        const filtered = cur.filter((s) => s.clientId !== clientId);
        return [...filtered, next];
      });
      setView({ name: 'day', clientId, weekId, dayId });
    },
    [view.clientId, view.weekId]
  );

  const switchToSession = useCallback((s) => {
    setView({ name: 'day', clientId: s.clientId, weekId: s.weekId, dayId: s.dayId });
  }, []);

  const closeSession = useCallback(
    (clientId) => {
      setActiveSessions((cur) => {
        const next = cur.filter((s) => s.clientId !== clientId);
        // If the active view is the closed session, swap to another or back home.
        if (view.name === 'day' && view.clientId === clientId) {
          if (next.length > 0) {
            const last = next[next.length - 1];
            setView({
              name: 'day',
              clientId: last.clientId,
              weekId: last.weekId,
              dayId: last.dayId,
            });
          } else {
            setView({ name: 'home' });
          }
        }
        return next;
      });
    },
    [view]
  );

  const goHomeForAdd = useCallback(() => {
    // From the multi-tab + button — return to dashboard so user can pick another client.
    setView({ name: 'home' });
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen text-txt-secondary flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-full text-txt-primary">
        <AuthView />
      </div>
    );
  }

  if (!storeReady) {
    return (
      <div className="min-h-screen text-txt-secondary flex items-center justify-center">
        Loading your data...
      </div>
    );
  }

  const activeClientId = view.name === 'day' ? view.clientId : null;

  return (
    <AppShell
      activeSessions={activeSessions}
      activeClientId={activeClientId}
      onSwitchSession={switchToSession}
      onCloseSession={closeSession}
      onAddSession={goHomeForAdd}
      onHome={() => setView({ name: 'home' })}
    >
      {view.name === 'home' && (
        <HomeScreen
          onOpenClient={openClient}
          onOpenSettings={() => setView({ name: 'settings' })}
          activeSessions={activeSessions}
          onSwitchSession={switchToSession}
        />
      )}
      {view.name === 'settings' && (
        <SettingsView
          onBack={() => setView({ name: 'home' })}
          onOpenClient={openClient}
        />
      )}
      {view.name === 'client' && (
        <ClientProfile
          clientId={view.clientId}
          onBack={() => setView({ name: 'home' })}
          onOpenWeek={openWeek}
        />
      )}
      {view.name === 'week' && (
        <WeekView
          clientId={view.clientId}
          weekId={view.weekId}
          onBack={() =>
            setView({ name: 'client', clientId: view.clientId })
          }
          onOpenDay={openDay}
        />
      )}
      {view.name === 'day' && (
        <DayView
          clientId={view.clientId}
          weekId={view.weekId}
          dayId={view.dayId}
          activeSessions={activeSessions}
          onSwitchSession={switchToSession}
          onCloseSession={closeSession}
          onAddClient={goHomeForAdd}
          onOpenSettings={() => setView({ name: 'settings' })}
          onBack={() =>
            setView({
              name: 'week',
              clientId: view.clientId,
              weekId: view.weekId,
            })
          }
        />
      )}
    </AppShell>
  );
}

function AppShell({
  activeSessions,
  activeClientId,
  onSwitchSession,
  onCloseSession,
  onAddSession,
  onHome,
  children,
}) {
  const { clients } = useStore();
  return (
    <div className="min-h-full text-txt-primary flex flex-col">
      <SessionTabBar
        sessions={activeSessions}
        clients={clients}
        activeClientId={activeClientId}
        onSwitch={onSwitchSession}
        onClose={onCloseSession}
        onAdd={onAddSession}
        onHome={onHome}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}
