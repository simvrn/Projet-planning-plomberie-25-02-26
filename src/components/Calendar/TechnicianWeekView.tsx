import { useState } from 'react';
import { format, startOfWeek, addDays, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useStore } from '../../store/useStore';
import { getLighterColor } from '../../utils/colors';
import { DeleteConfirmModal } from '../ui/DeleteConfirmModal';
import { PdfViewerModal } from '../ui/PdfViewerModal';
import type { Intervention } from '../../types';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];

// Hauteur fixe de chaque cellule (toutes identiques, légèrement agrandies)
const CELL_HEIGHT = 140;

/* ─────────────────────────────────────────────────────────────
   TechCard : carte d'intervention avec suppression via modal
───────────────────────────────────────────────────────────── */
interface TechCardProps {
  intervention: Intervention;
  techColor: string;
  onEdit: (intervention: Intervention) => void;
  onDelete: (id: string) => void;
}

function TechCard({ intervention, techColor, onEdit, onDelete }: TechCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const bgColor = getLighterColor(techColor, 0.85);
  const hasPdf = Boolean(intervention.pdfDataUrl);

  return (
    <>
      <DeleteConfirmModal
        isOpen={showConfirm}
        onConfirm={() => { onDelete(intervention.id); setShowConfirm(false); }}
        onCancel={() => setShowConfirm(false)}
      />

      {hasPdf && showPdf && (
        <PdfViewerModal
          pdfDataUrl={intervention.pdfDataUrl!}
          pdfName={intervention.pdfName || 'document.pdf'}
          onClose={() => setShowPdf(false)}
        />
      )}

      <div
        className="group relative rounded"
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData('interventionId', intervention.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
      >
        {/* Zone édition */}
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(intervention); }}
          className="w-full text-left rounded p-2 text-xs hover:opacity-80 transition-opacity cursor-grab active:cursor-grabbing"
          style={{ backgroundColor: bgColor, borderLeft: `3px solid ${techColor}` }}
        >
          {/* Horaire */}
          <div className="font-bold text-[11px] pr-6" style={{ color: techColor }}>
            {intervention.startTime} – {intervention.endTime}
          </div>

          {/* Tâche */}
          {intervention.taskText && (
            <div className="text-gray-800 font-medium truncate mt-0.5">{intervention.taskText}</div>
          )}

          {/* Client */}
          {intervention.tenantName && (
            <div className="text-gray-600 truncate mt-0.5 flex items-center gap-0.5">
              <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {intervention.tenantName}
            </div>
          )}

          {/* Localisation */}
          {intervention.address && (
            <div className="text-gray-500 truncate mt-0.5 flex items-center gap-0.5">
              <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {intervention.address}
            </div>
          )}
        </button>

        {/* Bouton supprimer — haut droite, visible au survol */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
          className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all text-base leading-none"
          title="Supprimer"
        >
          ×
        </button>

        {/* Icône PDF — bas droite, toujours visible */}
        {hasPdf && (
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowPdf(true); }}
            className="absolute bottom-1 right-1 z-10 w-6 h-6 flex items-center justify-center rounded text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
            title="Voir le PDF"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
            </svg>
          </button>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   TechnicianWeekView principal
───────────────────────────────────────────────────────────── */
export function TechnicianWeekView() {
  const {
    currentDate,
    getActiveTechnicians,
    getInterventionsByDate,
    selectedTechnicianFilters,
    openCreatePanel,
    openEditPanel,
    openDuplicatePanel,
    openDayRecap,
    updateIntervention,
    deleteIntervention,
    interventions,
    interventionClipboard,
    clearClipboard,
  } = useStore();

  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekdays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const allTechnicians = getActiveTechnicians();
  const technicians =
    selectedTechnicianFilters.length > 0
      ? allTechnicians.filter((t) => selectedTechnicianFilters.includes(t.id))
      : allTechnicians;

  if (technicians.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">Aucun technicien actif</p>
          <p className="text-sm mt-1">Ajoutez des techniciens dans les réglages</p>
        </div>
      </div>
    );
  }

  // Handler de clic sur une cellule : coller si clipboard actif, sinon créer
  const handleCellClick = (dateStr: string, techId: string) => {
    if (interventionClipboard) {
      openDuplicatePanel(interventionClipboard, dateStr);
    } else {
      openCreatePanel(dateStr, '08:00', [techId]);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Bannière presse-papiers */}
      {interventionClipboard && (
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-blue-600 text-white text-sm">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="flex-1">
            <span className="font-semibold">Intervention copiée</span>
            {interventionClipboard.taskText && (
              <span className="opacity-80"> — {interventionClipboard.taskText}</span>
            )}
            <span className="opacity-70 ml-2 text-xs">Cliquez sur une cellule pour coller</span>
          </span>
          <button
            onClick={clearClipboard}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-blue-700 transition-colors text-white opacity-80 hover:opacity-100"
            title="Annuler la copie"
          >
            ×
          </button>
        </div>
      )}

    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse">
        <colgroup>
          <col style={{ width: '120px' }} />
          {weekdays.map((_, i) => <col key={i} />)}
        </colgroup>

        {/* En-tête jours */}
        <thead className="sticky top-0 z-10 bg-gray-50 border-b-2 border-gray-200">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-200 bg-gray-50">
              Technicien
            </th>
            {weekdays.map((day, i) => {
              const isCurrent = isToday(day);
              const dateStr = format(day, 'yyyy-MM-dd');
              return (
                <th
                  key={i}
                  className={`px-3 py-3 text-center text-xs font-medium uppercase border-r border-gray-200 last:border-r-0 bg-gray-50 ${
                    isCurrent ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  <div className="uppercase tracking-wide">{WEEKDAYS[i]}</div>
                  <button
                    onClick={() => openDayRecap(dateStr)}
                    className={`text-base font-semibold mt-0.5 mx-auto flex items-center justify-center transition-colors ${
                      isCurrent
                        ? 'w-7 h-7 bg-blue-600 text-white rounded-full hover:bg-blue-700'
                        : 'text-gray-900 hover:text-blue-600 hover:underline'
                    }`}
                    title="Voir le récapitulatif du jour"
                  >
                    {format(day, 'd')}
                  </button>
                  <div className="text-[10px] font-normal text-gray-400 capitalize mt-0.5">
                    {format(day, 'MMM', { locale: fr })}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* Lignes techniciens */}
        <tbody>
          {technicians.map((tech, techIndex) => (
            <tr key={tech.id} className={techIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
              {/* Nom */}
              <td
                className="px-3 border-r border-b border-gray-200 align-middle"
                style={{ height: CELL_HEIGHT }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tech.color }} />
                  <span className="text-sm font-semibold text-gray-900 truncate">{tech.name}</span>
                </div>
              </td>

              {/* Cellules par jour — hauteur fixe identique pour toutes */}
              {weekdays.map((day, dayIndex) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const cellKey = `${tech.id}:${dateStr}`;
                const dayInterventions = getInterventionsByDate(dateStr);
                const techInterventions = dayInterventions.filter((inv) =>
                  inv.technicianIds.includes(tech.id)
                );
                const isCurrent = isToday(day);
                const isDragOver = dragOverCell === cellKey;
                const hasInterventions = techInterventions.length > 0;

                return (
                  <td
                    key={dayIndex}
                    className={`border-r border-b border-gray-200 last:border-r-0 relative transition-colors ${
                      isCurrent ? 'bg-blue-50/20' : ''
                    } ${isDragOver ? 'bg-blue-100/60 ring-2 ring-inset ring-blue-300' : ''}`}
                    style={{ padding: 0, height: CELL_HEIGHT }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverCell !== cellKey) setDragOverCell(cellKey);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDragOverCell(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverCell(null);
                      const id = e.dataTransfer.getData('interventionId');
                      if (!id) return;
                      const intervention = interventions[id];
                      if (!intervention) return;

                      const original = intervention.technicianIds;
                      let newTechIds: string[];
                      if (tech.id === original[0]) {
                        newTechIds = original;
                      } else if (original.includes(tech.id)) {
                        newTechIds = [tech.id, ...original.filter((tid) => tid !== tech.id)];
                      } else {
                        newTechIds = [tech.id, ...original.slice(1)];
                      }

                      updateIntervention(id, { date: dateStr, technicianIds: newTechIds });
                    }}
                  >
                    {/* Div absolue : retiré du flux → le td ne peut plus s'agrandir */}
                    <div
                      className={`absolute inset-0 flex flex-col overflow-hidden ${interventionClipboard ? 'cursor-copy' : 'cursor-pointer'}`}
                      onClick={() => handleCellClick(dateStr, tech.id)}
                    >
                      {/* Zone scrollable des interventions */}
                      <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1.5 min-h-0">
                        {techInterventions.map((intervention) => (
                          <TechCard
                            key={intervention.id}
                            intervention={intervention}
                            techColor={tech.color}
                            onEdit={openEditPanel}
                            onDelete={deleteIntervention}
                          />
                        ))}
                      </div>

                      {/* Bouton + / Coller — toujours visible en bas */}
                      <div className="flex-shrink-0 px-1.5 pb-1.5">
                        {interventionClipboard ? (
                          // Mode clipboard : bouton coller
                          <div className="w-full text-center text-blue-400 text-xs py-0.5 rounded leading-none select-none">
                            Coller ici
                          </div>
                        ) : hasInterventions ? (
                          // Bouton cliquable quand interventions existantes
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openCreatePanel(dateStr, '08:00', [tech.id]);
                            }}
                            className="w-full text-center text-gray-300 hover:text-white hover:bg-blue-400 text-base py-0.5 rounded transition-colors leading-none"
                            title="Ajouter une intervention"
                          >
                            +
                          </button>
                        ) : (
                          // Indicateur visuel sur cellule vide
                          <div className="w-full text-center text-gray-200 text-base select-none py-0.5">
                            +
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}
