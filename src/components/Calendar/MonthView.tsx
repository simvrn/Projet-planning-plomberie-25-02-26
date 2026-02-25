import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
} from 'date-fns';
import { useStore } from '../../store/useStore';
import { EventChip } from './EventChip';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function MonthView() {
  const {
    currentDate,
    openCreatePanel,
    openDayRecap,
    getFilteredInterventionsByDate,
  } = useStore();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleDayClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    openCreatePanel(dateStr, '08:00');
  };

  const handleDayNumberClick = (e: React.MouseEvent, date: Date) => {
    e.stopPropagation();
    const dateStr = format(date, 'yyyy-MM-dd');
    openDayRecap(dateStr);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-3 text-center text-sm font-medium text-gray-600"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-auto">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const interventions = getFilteredInterventionsByDate(dateStr);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={dateStr}
              onClick={() => handleDayClick(day)}
              className={`
                min-h-[100px] p-2 border-b border-r border-gray-200 cursor-pointer
                hover:bg-blue-50 transition-colors
                ${!isCurrentMonth ? 'bg-gray-50' : 'bg-white'}
              `}
            >
              {/* Day number - clickable for recap */}
              <div className="flex items-center justify-between mb-1">
                <button
                  onClick={(e) => handleDayNumberClick(e, day)}
                  className={`
                    text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                    transition-colors hover:ring-2 hover:ring-blue-300
                    ${isCurrentDay ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                    ${!isCurrentMonth ? 'text-gray-400 hover:bg-gray-200' : 'text-gray-700 hover:bg-blue-100'}
                  `}
                  title="Voir le récapitulatif du jour"
                >
                  {format(day, 'd')}
                </button>
                {interventions.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {interventions.length}
                  </span>
                )}
              </div>

              {/* Events */}
              <div className="space-y-1">
                {interventions.slice(0, 3).map((intervention) => (
                  <EventChip
                    key={intervention.id}
                    intervention={intervention}
                    compact
                  />
                ))}
                {interventions.length > 3 && (
                  <button
                    onClick={(e) => handleDayNumberClick(e, day)}
                    className="text-xs text-blue-600 hover:text-blue-800 px-2"
                  >
                    +{interventions.length - 3} autres
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
