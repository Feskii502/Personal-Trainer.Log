import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase.js';
import { initStore, resetStore, applyRemoteState } from './lib/store.js';
import { subscribeToUserState } from './lib/storage.js';
import HomeScreen from './components/HomeScreen.jsx';
import ClientProfile from './components/ClientProfile.jsx';
import WeekView from './components/WeekView.jsx';
import DayView from './components/DayView.jsx';
import SettingsView from './components/SettingsView.jsx';
import AuthView from './components/AuthView.jsx';

// View stack: 'home' | 'client' | 'week' | 'day' | 'settings'
export default function App() {
  const [view, setView] = useState({ name: 'home' });
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [storeReady, setStoreReady] = useState(false);

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
    }
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [session?.user?.id]);

  // Reflow on orientation change — some Safari/iPad viewports need a nudge.
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
  const openDay = (dayId) =>
    setView({
      name: 'day',
      clientId: view.clientId,
      weekId: view.weekId,
      dayId,
    });

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-bg-base text-txt-secondary flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-full bg-bg-base text-txt-primary">
        <AuthView />
      </div>
    );
  }

  if (!storeReady) {
    return (
      <div className="min-h-screen bg-bg-base text-txt-secondary flex items-center justify-center">
        Loading your data...
      </div>
    );
  }

  return (
    <div className="min-h-full bg-bg-base text-txt-primary">
      {view.name === 'home' && (
        <HomeScreen
          onOpenClient={openClient}
          onOpenSettings={() => setView({ name: 'settings' })}
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
          onBack={() =>
            setView({
              name: 'week',
              clientId: view.clientId,
              weekId: view.weekId,
            })
          }
        />
      )}
    </div>
  );
}
