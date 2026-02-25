import { useStore } from './store/useStore';
import { CalendarHeader } from './components/Calendar/CalendarHeader';
import { MonthView } from './components/Calendar/MonthView';
import { WeekView } from './components/Calendar/WeekView';
import { TechnicianWeekView } from './components/Calendar/TechnicianWeekView';
import { InterventionPanel } from './components/InterventionPanel/InterventionPanel';
import { SettingsPanel } from './components/SettingsPanel/SettingsPanel';
import { DayRecapPanel } from './components/DayRecapPanel/DayRecapPanel';

export default function App() {
  const currentTab = useStore((state) => state.currentTab);
  const currentView = useStore((state) => state.currentView);

  return (
    <div className="h-screen flex flex-col bg-white">
      <CalendarHeader />

      <main className="flex-1 flex overflow-hidden">
        {currentTab === 'settings' ? (
          <SettingsPanel />
        ) : currentView === 'month' ? (
          <MonthView />
        ) : currentView === 'techweek' ? (
          <TechnicianWeekView />
        ) : (
          <WeekView />
        )}
      </main>

      <InterventionPanel />
      <DayRecapPanel />
    </div>
  );
}
