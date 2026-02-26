import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TimeSelect } from './TimeSelect';
import { TechnicianSelect } from './TechnicianSelect';
import { TaskInput } from './TaskInput';
import { EquipmentInput } from './EquipmentInput';
import { isValidTimeRange } from '../../utils/time';

const PDF_MAX_SIZE = 5 * 1024 * 1024; // 5 Mo

interface FormData {
  date: string;
  startTime: string;
  endTime: string;
  technicianIds: string[];
  taskText: string;
  equipment: string;
  address: string;
  tenantName: string;
  phone: string;
  pdfDataUrl: string;
  pdfName: string;
}

const initialFormData: FormData = {
  date: '',
  startTime: '08:00',
  endTime: '09:00',
  technicianIds: [],
  taskText: '',
  equipment: '',
  address: '',
  tenantName: '',
  phone: '',
  pdfDataUrl: '',
  pdfName: '',
};

export function InterventionPanel() {
  const {
    panel,
    closePanel,
    createIntervention,
    updateIntervention,
    deleteIntervention,
    copyIntervention,
  } = useStore();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDuplicate = Boolean(panel.duplicatingFrom);

  // Reset form when panel opens
  useEffect(() => {
    if (panel.isOpen) {
      if (panel.mode === 'edit' && panel.editingIntervention) {
        const intervention = panel.editingIntervention;
        setFormData({
          date: intervention.date,
          startTime: intervention.startTime,
          endTime: intervention.endTime,
          technicianIds: intervention.technicianIds,
          taskText: intervention.taskText,
          equipment: intervention.equipment || '',
          address: intervention.address || '',
          tenantName: intervention.tenantName || '',
          phone: intervention.phone || '',
          pdfDataUrl: intervention.pdfDataUrl || '',
          pdfName: intervention.pdfName || '',
        });
        setShowOptionalFields(
          Boolean(intervention.address || intervention.tenantName || intervention.phone)
        );
      } else if (panel.duplicatingFrom) {
        // Mode duplication : pré-remplir depuis l'intervention d'origine
        const src = panel.duplicatingFrom;
        setFormData({
          date: panel.selectedDate || src.date,
          startTime: src.startTime,
          endTime: src.endTime,
          technicianIds: src.technicianIds,
          taskText: src.taskText,
          equipment: src.equipment || '',
          address: src.address || '',
          tenantName: src.tenantName || '',
          phone: src.phone || '',
          pdfDataUrl: src.pdfDataUrl || '',
          pdfName: src.pdfName || '',
        });
        setShowOptionalFields(
          Boolean(src.address || src.tenantName || src.phone)
        );
      } else {
        setFormData({
          ...initialFormData,
          date: panel.selectedDate || '',
          startTime: panel.selectedTime || '08:00',
          endTime: panel.selectedTime
            ? `${(parseInt(panel.selectedTime.split(':')[0]) + 1).toString().padStart(2, '0')}:00`
            : '09:00',
          technicianIds: panel.prefilledTechnicianIds || [],
        });
        setShowOptionalFields(false);
      }
      setErrors({});
      setPdfError('');
      setShowDeleteConfirm(false);
    }
  }, [panel.isOpen, panel.mode, panel.editingIntervention, panel.selectedTime, panel.duplicatingFrom]);

  // Escape key
  useEffect(() => {
    if (!panel.isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [panel.isOpen, closePanel]);

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > PDF_MAX_SIZE) {
      setPdfError('Fichier trop volumineux (max 5 Mo)');
      e.target.value = '';
      return;
    }
    setPdfError('');
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((f) => ({
        ...f,
        pdfDataUrl: reader.result as string,
        pdfName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const removePdf = () => {
    setFormData((f) => ({ ...f, pdfDataUrl: '', pdfName: '' }));
    setPdfError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.date) {
      newErrors.date = 'La date est requise';
    }
    if (!isValidTimeRange(formData.startTime, formData.endTime)) {
      newErrors.endTime = "L'heure de fin doit être après l'heure de début";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const data = {
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      technicianIds: formData.technicianIds,
      taskText: formData.taskText,
      equipment: formData.equipment || undefined,
      address: formData.address || undefined,
      tenantName: formData.tenantName || undefined,
      phone: formData.phone || undefined,
      pdfDataUrl: formData.pdfDataUrl || undefined,
      pdfName: formData.pdfName || undefined,
    };

    if (panel.mode === 'edit' && panel.editingIntervention) {
      updateIntervention(panel.editingIntervention.id, data);
    } else {
      createIntervention(data);
    }

    closePanel();
  };

  const handleDelete = () => {
    if (panel.editingIntervention) {
      deleteIntervention(panel.editingIntervention.id);
      closePanel();
    }
  };

  const handleDuplicate = () => {
    if (panel.editingIntervention) {
      copyIntervention(panel.editingIntervention);
      closePanel();
    }
  };

  if (!panel.isOpen) return null;

  const dateDisplay = formData.date
    ? format(new Date(formData.date + 'T00:00:00'), 'EEEE d MMMM yyyy', { locale: fr })
    : '';

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={closePanel} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col"
        style={{ animation: 'slideIn 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {panel.mode === 'edit'
                ? 'Modifier l\'intervention'
                : isDuplicate
                ? 'Dupliquer l\'intervention'
                : 'Nouvelle intervention'}
            </h2>
            <p className="text-sm text-gray-500 capitalize">{dateDisplay}</p>
          </div>
          <button
            onClick={closePanel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-5">

          {/* Date — visible en mode création/duplication */}
          {panel.mode === 'create' && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
            </div>
          )}

          {/* Horaires */}
          <div className="grid grid-cols-2 gap-4">
            <TimeSelect
              label="Début"
              value={formData.startTime}
              onChange={(v) => setFormData((f) => ({ ...f, startTime: v }))}
            />
            <TimeSelect
              label="Fin"
              value={formData.endTime}
              onChange={(v) => setFormData((f) => ({ ...f, endTime: v }))}
              minTime={formData.startTime}
              error={errors.endTime}
            />
          </div>

          {/* Techniciens */}
          <TechnicianSelect
            selectedIds={formData.technicianIds}
            onChange={(ids) => setFormData((f) => ({ ...f, technicianIds: ids }))}
          />

          {/* Tâche */}
          <TaskInput
            value={formData.taskText}
            onChange={(v) => setFormData((f) => ({ ...f, taskText: v }))}
          />

          {/* Matériel */}
          <EquipmentInput
            value={formData.equipment}
            onChange={(v) => setFormData((f) => ({ ...f, equipment: v }))}
          />

          {/* PDF */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Document PDF</label>
            {formData.pdfDataUrl ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5z"/>
                </svg>
                <span className="text-sm text-gray-700 truncate flex-1">{formData.pdfName}</span>
                <button
                  type="button"
                  onClick={removePdf}
                  className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  title="Supprimer le PDF"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm text-gray-500">Joindre un PDF (max 5 Mo)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handlePdfUpload}
                />
              </label>
            )}
            {pdfError && <p className="text-xs text-red-500">{pdfError}</p>}
          </div>

          {/* Infos client — toggle */}
          {!showOptionalFields && (
            <button
              type="button"
              onClick={() => setShowOptionalFields(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Ajouter infos client/chantier
            </button>
          )}

          {showOptionalFields && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700">Informations client</p>
              <Input
                label="Adresse"
                value={formData.address}
                onChange={(e) => setFormData((f) => ({ ...f, address: e.target.value }))}
                placeholder="123 rue de la Paix, 75001 Paris"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nom locataire"
                  value={formData.tenantName}
                  onChange={(e) => setFormData((f) => ({ ...f, tenantName: e.target.value }))}
                  placeholder="M. Dupont"
                />
                <Input
                  label="Téléphone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {showDeleteConfirm ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Supprimer cette intervention ?</span>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                  Annuler
                </Button>
                <Button type="button" variant="danger" size="sm" onClick={handleDelete}>
                  Supprimer
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              {panel.mode === 'edit' && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Supprimer
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleDuplicate}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    title="Copier cette intervention pour la placer sur une autre semaine"
                  >
                    <svg className="w-4 h-4 mr-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Dupliquer
                  </Button>
                </>
              )}
              <div className="flex-1" />
              <Button type="button" variant="secondary" onClick={closePanel}>
                Annuler
              </Button>
              <Button type="submit" onClick={handleSubmit}>
                {panel.mode === 'edit' ? 'Enregistrer' : isDuplicate ? 'Créer la copie' : 'Créer'}
              </Button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
