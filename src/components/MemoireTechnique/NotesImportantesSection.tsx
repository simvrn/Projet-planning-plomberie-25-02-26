import { useMemoireStore } from '../../store/useMemoireStore';

export function NotesImportantesSection() {
  const { notesImportantes, setNotesImportantes } = useMemoireStore();

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Notes importantes pour ce mémoire</h3>
      <p className="text-xs text-gray-500 mb-3">
        Propre à ce mémoire (pas gardé pour les suivants). Ce qui est écrit ici est traité en priorité par
        l'IA pendant la rédaction — reste court mais précis.
      </p>

      <textarea
        value={notesImportantes}
        onChange={(e) => setNotesImportantes(e.target.value)}
        rows={5}
        placeholder={
          "Ex : chantier en site occupé, bien insister sur la coordination avec les locataires...\n" +
          "Ex : le client a déjà refusé un planning en 2 phases, proposer en 3 phases."
        }
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
