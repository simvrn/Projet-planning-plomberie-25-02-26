import { useCallback, useEffect, useState } from 'react';
import { useMemoireStore } from '../../store/useMemoireStore';
import { getAdminConfig } from '../../lib/memoire/memoireApi';
import { CORPS_DE_METIER } from '../../types/memoire';
import type { CompanyConfig, CorpsDeMetier, ReferenceDoc } from '../../types/memoire';
import { CompanyInfoSection } from './CompanyInfoSection';
import { SystemPromptSection } from './SystemPromptSection';
import { StructurePromptSection } from './StructurePromptSection';
import { ReferenceDocsSection } from './ReferenceDocsSection';

type AdminSection = 'company' | 'prompt' | 'structure' | 'references';

interface MemoireAdminPanelProps {
  onLogout: () => void;
}

export function MemoireAdminPanel({ onLogout }: MemoireAdminPanelProps) {
  const adminPassword = useMemoireStore((s) => s.adminPassword);
  const setView = useMemoireStore((s) => s.setView);
  const [corpsDeMetier, setCorpsDeMetier] = useState<CorpsDeMetier>(CORPS_DE_METIER[0]);
  const [activeSection, setActiveSection] = useState<AdminSection>('company');
  const [config, setConfig] = useState<CompanyConfig | null>(null);
  const [referenceDocs, setReferenceDocs] = useState<ReferenceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!adminPassword) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminConfig(adminPassword, corpsDeMetier);
      setConfig(result.config);
      setReferenceDocs(result.referenceDocs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [adminPassword, corpsDeMetier]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!adminPassword) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sélecteur de corps de métier : chaque métier a sa propre base entreprise */}
      <div className="border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 mr-2">Corps de métier :</span>
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {CORPS_DE_METIER.map((metier) => (
              <button
                key={metier}
                onClick={() => setCorpsDeMetier(metier)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  corpsDeMetier === metier
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {metier}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setView('wizard')}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          ← Mémoire technique
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-56 bg-gray-50 border-r border-gray-200 p-4 flex-shrink-0">
          <nav className="space-y-1">
            {(
              [
                ['company', 'Infos entreprise'],
                ['prompt', 'Prompt système'],
                ['structure', 'Structure / mise en page'],
                ['references', 'Mémoires de référence'],
              ] as [AdminSection, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === key ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <button onClick={onLogout} className="mt-8 text-xs text-gray-400 hover:text-gray-600">
            Verrouiller / quitter
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {loading && <p className="text-sm text-gray-500">Chargement...</p>}
          {error && <p className="text-sm text-red-600">Erreur : {error}</p>}

          {!loading && !error && config && (
            <>
              {activeSection === 'company' && (
                <CompanyInfoSection
                  key={corpsDeMetier}
                  password={adminPassword}
                  corpsDeMetier={corpsDeMetier}
                  config={config}
                  onSaved={refresh}
                />
              )}
              {activeSection === 'prompt' && (
                <SystemPromptSection
                  key={corpsDeMetier}
                  password={adminPassword}
                  corpsDeMetier={corpsDeMetier}
                  config={config}
                  onSaved={refresh}
                />
              )}
              {activeSection === 'structure' && (
                <StructurePromptSection
                  key={corpsDeMetier}
                  password={adminPassword}
                  corpsDeMetier={corpsDeMetier}
                  config={config}
                  onSaved={refresh}
                />
              )}
              {activeSection === 'references' && (
                <ReferenceDocsSection
                  key={corpsDeMetier}
                  password={adminPassword}
                  corpsDeMetier={corpsDeMetier}
                  referenceDocs={referenceDocs}
                  onChanged={refresh}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
