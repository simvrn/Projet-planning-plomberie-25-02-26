import { useCallback, useEffect, useState } from 'react';
import { useMemoireStore } from '../../store/useMemoireStore';
import { getAdminConfig } from '../../lib/memoire/memoireApi';
import type { CompanyConfig, ReferenceDoc } from '../../types/memoire';
import { CompanyInfoSection } from './CompanyInfoSection';
import { SystemPromptSection } from './SystemPromptSection';
import { ReferenceDocsSection } from './ReferenceDocsSection';

type AdminSection = 'company' | 'prompt' | 'references';

interface MemoireAdminPanelProps {
  onLogout: () => void;
}

export function MemoireAdminPanel({ onLogout }: MemoireAdminPanelProps) {
  const adminPassword = useMemoireStore((s) => s.adminPassword);
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
      const result = await getAdminConfig(adminPassword);
      setConfig(result.config);
      setReferenceDocs(result.referenceDocs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [adminPassword]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!adminPassword) return null;

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-56 bg-gray-50 border-r border-gray-200 p-4 flex-shrink-0">
        <nav className="space-y-1">
          {(
            [
              ['company', 'Infos entreprise'],
              ['prompt', 'Prompt système'],
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
              <CompanyInfoSection password={adminPassword} config={config} onSaved={refresh} />
            )}
            {activeSection === 'prompt' && (
              <SystemPromptSection password={adminPassword} config={config} onSaved={refresh} />
            )}
            {activeSection === 'references' && (
              <ReferenceDocsSection
                password={adminPassword}
                referenceDocs={referenceDocs}
                onChanged={refresh}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
