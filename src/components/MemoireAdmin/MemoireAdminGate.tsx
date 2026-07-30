import { useState } from 'react';
import { useMemoireStore } from '../../store/useMemoireStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { verifyAdminPassword } from '../../lib/memoire/memoireApi';
import { MemoireAdminPanel } from './MemoireAdminPanel';

export function MemoireAdminGate() {
  const { adminUnlocked, unlockAdmin, lockAdmin, setView } = useMemoireStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setChecking(true);
    try {
      await verifyAdminPassword(password);
      unlockAdmin(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setChecking(false);
    }
  }

  if (adminUnlocked) {
    return (
      <MemoireAdminPanel
        onLogout={() => {
          lockAdmin();
          setView('wizard');
        }}
      />
    );
  }

  return (
    <div className="max-w-sm mx-auto py-20">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Espace admin</h2>
      <p className="text-sm text-gray-600 mb-6">
        Base entreprise, prompt système et mémoires de référence.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="password"
          label="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error ?? undefined}
          autoFocus
        />
        <div className="flex justify-between">
          <Button type="button" variant="secondary" onClick={() => setView('wizard')}>
            Retour
          </Button>
          <Button type="submit" disabled={!password || checking}>
            {checking ? 'Vérification...' : 'Déverrouiller'}
          </Button>
        </div>
      </form>
    </div>
  );
}
