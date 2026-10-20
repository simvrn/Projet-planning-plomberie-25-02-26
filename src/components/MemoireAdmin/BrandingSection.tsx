import { useCallback, useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { deleteImage, getBranding, saveEntrepriseAdresse, uploadImage } from '../../lib/memoire/memoireApi';
import { ENTREPRISES } from '../../types/memoire';
import type { Entreprise } from '../../types/memoire';

interface BrandingSectionProps {
  password: string;
}

const fileInputClassName =
  'text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100';

interface ImageFieldProps {
  label: string;
  imageKey: string;
  imageUrl: string | undefined;
  password: string;
  onChanged: () => void;
}

function ImageField({ label, imageKey, imageUrl, password, onChanged }: ImageFieldProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {imageUrl ? (
        <div className="flex items-start gap-4 mb-2">
          <img src={imageUrl} alt={label} className="max-h-40 max-w-xs border border-gray-200 rounded-lg p-2 bg-white" />
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => void run(() => deleteImage(password, imageKey))}>
            Supprimer
          </Button>
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-2">Aucune image.</p>
      )}
      <input
        type="file"
        accept="image/png,image/jpeg"
        disabled={busy}
        className={fileInputClassName}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void run(() => uploadImage(password, imageKey, file));
        }}
      />
      {busy && <p className="text-sm text-gray-500 mt-1">Envoi en cours...</p>}
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}

// Commun à tous les corps de métier : le sélecteur de métier en haut de l'admin n'a pas d'effet ici.
export function BrandingSection({ password }: BrandingSectionProps) {
  const [adresses, setAdresses] = useState<Partial<Record<Entreprise, string>>>({});
  const [imageUrls, setImageUrls] = useState<Partial<Record<string, string>>>({});
  const [savingAdresse, setSavingAdresse] = useState<Entreprise | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await getBranding(password);
      setAdresses(Object.fromEntries(result.entreprises.map((e) => [e.nom, e.adresse])));
      setImageUrls(result.imageUrls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }, [password]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleSaveAdresse(nom: Entreprise) {
    setSavingAdresse(nom);
    setError(null);
    try {
      await saveEntrepriseAdresse(password, nom, adresses[nom] ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSavingAdresse(null);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Logos & organigramme</h3>
        <p className="text-sm text-gray-600">
          Communs à tous les corps de métier. Le logo de l'entreprise choisie au démarrage du mémoire est placé sur
          la page de garde et dans l'en-tête de chaque page. L'organigramme est inséré automatiquement dans la
          section qui traite des moyens humains (question contenant « moyens humains », « équipe », « encadrement »,
          « personnel », « effectif » ou « organigramme »). Formats acceptés : PNG ou JPG.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {ENTREPRISES.map((nom) => (
        <div key={nom} className="space-y-4 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900">{nom}</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <div className="flex gap-2">
              <Input
                value={adresses[nom] ?? ''}
                onChange={(e) => setAdresses((prev) => ({ ...prev, [nom]: e.target.value }))}
                placeholder="ex. 2 rue des Brosses – 37270 LARÇAY"
              />
              <Button onClick={() => void handleSaveAdresse(nom)} disabled={savingAdresse === nom}>
                {savingAdresse === nom ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
          <ImageField
            label="Logo"
            imageKey={`logo:${nom}`}
            imageUrl={imageUrls[`logo:${nom}`]}
            password={password}
            onChanged={refresh}
          />
        </div>
      ))}

      <div className="border border-gray-200 rounded-lg p-4">
        <ImageField
          label="Organigramme (commun aux deux entreprises)"
          imageKey="organigramme"
          imageUrl={imageUrls.organigramme}
          password={password}
          onChanged={refresh}
        />
      </div>
    </div>
  );
}
