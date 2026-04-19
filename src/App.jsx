import { useEffect, useState } from 'react';
import HomeScreen from './components/HomeScreen.jsx';
import ClientProfile from './components/ClientProfile.jsx';
import WeekView from './components/WeekView.jsx';
import DayView from './components/DayView.jsx';
import SettingsView from './components/SettingsView.jsx';

// View stack: 'home' | 'client' | 'week' | 'day'
export default function App() {
  const [view, setView] = useState({ name: 'home' });

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
