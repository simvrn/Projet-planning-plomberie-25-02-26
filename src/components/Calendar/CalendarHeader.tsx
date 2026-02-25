import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { TechnicianFilter } from '../TechnicianFilter/TechnicianFilter';

export function CalendarHeader() {
  const {
    currentTab,
    currentView,
    currentDate,
    setTab,
    setView,
    navigatePrev,
    navigateNext,
    goToToday,
  } = useStore();

  const title = currentView === 'month'
    ? format(currentDate, 'MMMM yyyy', { locale: fr })
    : format(currentDate, "'Semaine du' d MMMM yyyy", { locale: fr });

  const isCalendarTab = currentTab === 'calendar';

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Tabs + Navigation */}
        <div className="flex items-center gap-4">
          {/* Main tabs: Réglages / Calendar */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTab('settings')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                currentTab === 'settings'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Réglages
            </button>
            <button
              onClick={() => {
                setTab('calendar');
                setView('week');
              }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                isCalendarTab && currentView === 'week'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => {
                setTab('calendar');
                setView('month');
              }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                isCalendarTab && currentView === 'month'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mois
            </button>
          </div>

          {/* Calendar navigation (only when in calendar tab) */}
          {isCalendarTab && (
            <>
              <div className="h-6 w-px bg-gray-200" />

              <Button variant="secondary" size="sm" onClick={goToToday}>
                Aujourd'hui
              </Button>

              <div className="flex items-center gap-1">
                <button
                  onClick={navigatePrev}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Précédent"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={navigateNext}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Suivant"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <h1 className="text-xl font-semibold text-gray-900 capitalize">
                {title}
              </h1>
            </>
          )}

          {/* Settings title */}
          {!isCalendarTab && (
            <>
              <div className="h-6 w-px bg-gray-200" />
              <h1 className="text-xl font-semibold text-gray-900">
                Paramètres
              </h1>
            </>
          )}
        </div>

        {/* Right: Technician Filter (only in calendar view) */}
        {isCalendarTab && (
          <div className="flex items-center gap-3">
            <TechnicianFilter />
          </div>
        )}
      </div>
    </header>
  );
}
