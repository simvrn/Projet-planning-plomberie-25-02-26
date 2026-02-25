import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TECHNICIAN_COLORS, getContrastTextColor } from '../../utils/colors';

type SettingsSection = 'technicians' | 'tasks' | 'equipment';

export function SettingsPanel() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('technicians');

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar navigation */}
      <div className="w-56 bg-gray-50 border-r border-gray-200 p-4 flex-shrink-0">
        <nav className="space-y-1">
          <button
            onClick={() => setActiveSection('technicians')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'technicians'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Techniciens
            </div>
          </button>
          <button
            onClick={() => setActiveSection('tasks')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'tasks'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Descriptions de tâche
            </div>
          </button>
          <button
            onClick={() => setActiveSection('equipment')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'equipment'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Matériel
            </div>
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeSection === 'technicians' && <TechniciansSection />}
        {activeSection === 'tasks' && <TasksSection />}
        {activeSection === 'equipment' && <EquipmentSection />}
      </div>
    </div>
  );
}

// ============ TECHNICIANS SECTION ============
function TechniciansSection() {
  const {
    technicians,
    addTechnician,
    updateTechnician,
    deactivateTechnician,
    reactivateTechnician,
    getNextAutoColor,
    interventions,
  } = useStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);
  const [error, setError] = useState('');

  const allTechnicians = Object.values(technicians).sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const activeTechnicians = allTechnicians.filter((t) => t.isActive);
  const inactiveTechnicians = allTechnicians.filter((t) => !t.isActive);

  const handleAdd = () => {
    if (!newName.trim()) {
      setError('Le nom est obligatoire');
      return;
    }
    const existing = Object.values(technicians).find(
      (t) => t.name.toLowerCase() === newName.trim().toLowerCase()
    );
    if (existing) {
      setError('Ce technicien existe déjà');
      return;
    }
    const colorToUse = newColor || getNextAutoColor();
    addTechnician(newName.trim(), colorToUse);
    setNewName('');
    setNewColor('');
    setShowAddForm(false);
    setError('');
  };

  const handleStartEdit = (tech: typeof allTechnicians[0]) => {
    setEditingId(tech.id);
    setEditName(tech.name);
    setEditColor(tech.color);
    setError('');
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) {
      setError('Le nom est obligatoire');
      return;
    }
    if (editingId) {
      updateTechnician(editingId, { name: editName.trim(), color: editColor });
      setEditingId(null);
      setError('');
    }
  };

  const getTechnicianInterventionCount = (techId: string): number => {
    return Object.values(interventions).filter((i) => i.technicianIds.includes(techId)).length;
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Gestion des techniciens</h2>
          <p className="text-sm text-gray-500 mt-1">Ajoutez, modifiez ou désactivez les techniciens</p>
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>+ Ajouter</Button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Nouveau technicien</h3>
          <div className="space-y-4">
            <Input
              label="Nom *"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setError(''); }}
              placeholder="Jean Dupont"
              autoFocus
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Couleur *</label>
              <div className="flex flex-wrap gap-2">
                {TECHNICIAN_COLORS.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => setNewColor(color.hex)}
                    className={`w-10 h-10 rounded-lg transition-all ${newColor === color.hex ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => { setShowAddForm(false); setNewName(''); setNewColor(''); setError(''); }}>Annuler</Button>
              <Button onClick={handleAdd}>Ajouter</Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">Techniciens actifs ({activeTechnicians.length})</h3>
        </div>
        {activeTechnicians.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucun technicien actif.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {activeTechnicians.map((tech) => {
              const isEditing = editingId === tech.id;
              const interventionCount = getTechnicianInterventionCount(tech.id);
              return (
                <li key={tech.id} className="px-4 py-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <Input value={editName} onChange={(e) => { setEditName(e.target.value); setError(''); }} placeholder="Nom" />
                      <div className="flex flex-wrap gap-2">
                        {TECHNICIAN_COLORS.map((color) => (
                          <button key={color.hex} type="button" onClick={() => setEditColor(color.hex)}
                            className={`w-8 h-8 rounded-lg transition-all ${editColor === color.hex ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-105'}`}
                            style={{ backgroundColor: color.hex }} title={color.name} />
                        ))}
                      </div>
                      {error && <p className="text-sm text-red-600">{error}</p>}
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => { setEditingId(null); setError(''); }}>Annuler</Button>
                        <Button size="sm" onClick={handleSaveEdit}>Enregistrer</Button>
                      </div>
                    </div>
                  ) : confirmDeactivate === tech.id ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Désactiver {tech.name} ?</span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDeactivate(null)}>Annuler</Button>
                        <Button variant="danger" size="sm" onClick={() => { deactivateTechnician(tech.id); setConfirmDeactivate(null); }}>Désactiver</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: tech.color, color: getContrastTextColor(tech.color) }}>
                          {tech.name.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <span className="font-medium text-gray-900">{tech.name}</span>
                          <span className="text-sm text-gray-400 ml-2">{interventionCount} intervention{interventionCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleStartEdit(tech)}>Modifier</Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDeactivate(tech.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">Désactiver</Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {inactiveTechnicians.length > 0 && (
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Techniciens désactivés ({inactiveTechnicians.length})</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {inactiveTechnicians.map((tech) => (
              <li key={tech.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 opacity-60">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: tech.color, color: getContrastTextColor(tech.color) }}>
                      {tech.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-medium text-gray-600">{tech.name}</span>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => reactivateTechnician(tech.id)}>Réactiver</Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============ TASKS SECTION ============
function TasksSection() {
  const { taskKeywords, addTaskKeyword, updateTaskKeyword, deleteTaskKeyword } = useStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newText, setNewText] = useState('');
  const [newShortcut, setNewShortcut] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editShortcut, setEditShortcut] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState('');

  const allTasks = Object.values(taskKeywords).sort((a, b) => b.usageCount - a.usageCount);

  const handleAdd = () => {
    if (!newText.trim()) {
      setError('La description est obligatoire');
      return;
    }
    const existing = Object.values(taskKeywords).find(
      (t) => t.text.toLowerCase() === newText.trim().toLowerCase()
    );
    if (existing) {
      setError('Cette description existe déjà');
      return;
    }
    addTaskKeyword(newText.trim(), newShortcut.trim() || undefined);
    setNewText('');
    setNewShortcut('');
    setShowAddForm(false);
    setError('');
  };

  const handleStartEdit = (task: typeof allTasks[0]) => {
    setEditingId(task.id);
    setEditText(task.text);
    setEditShortcut(task.shortcut || '');
    setError('');
  };

  const handleSaveEdit = () => {
    if (!editText.trim()) {
      setError('La description est obligatoire');
      return;
    }
    if (editingId) {
      updateTaskKeyword(editingId, { text: editText.trim(), shortcut: editShortcut.trim() || undefined });
      setEditingId(null);
      setError('');
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Descriptions de tâche</h2>
          <p className="text-sm text-gray-500 mt-1">Gérez les descriptions prédéfinies et leurs raccourcis</p>
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>+ Ajouter</Button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Nouvelle description</h3>
          <div className="space-y-4">
            <Input
              label="Description *"
              value={newText}
              onChange={(e) => { setNewText(e.target.value); setError(''); }}
              placeholder="Ex: Installation chauffe-eau"
              autoFocus
            />
            <Input
              label="Raccourci (optionnel)"
              value={newShortcut}
              onChange={(e) => setNewShortcut(e.target.value.toUpperCase())}
              placeholder="Ex: ICE"
              maxLength={5}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => { setShowAddForm(false); setNewText(''); setNewShortcut(''); setError(''); }}>Annuler</Button>
              <Button onClick={handleAdd}>Ajouter</Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">Descriptions ({allTasks.length})</h3>
        </div>
        {allTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucune description.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {allTasks.map((task) => {
              const isEditing = editingId === task.id;
              return (
                <li key={task.id} className="px-4 py-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <Input value={editText} onChange={(e) => { setEditText(e.target.value); setError(''); }} placeholder="Description" />
                      <Input value={editShortcut} onChange={(e) => setEditShortcut(e.target.value.toUpperCase())} placeholder="Raccourci" maxLength={5} />
                      {error && <p className="text-sm text-red-600">{error}</p>}
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => { setEditingId(null); setError(''); }}>Annuler</Button>
                        <Button size="sm" onClick={handleSaveEdit}>Enregistrer</Button>
                      </div>
                    </div>
                  ) : confirmDelete === task.id ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Supprimer "{task.text}" ?</span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Annuler</Button>
                        <Button variant="danger" size="sm" onClick={() => { deleteTaskKeyword(task.id); setConfirmDelete(null); }}>Supprimer</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {task.shortcut && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-mono font-bold rounded">
                            {task.shortcut}
                          </span>
                        )}
                        <div>
                          <span className="font-medium text-gray-900">{task.text}</span>
                          <span className="text-sm text-gray-400 ml-2">{task.usageCount} utilisation{task.usageCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleStartEdit(task)}>Modifier</Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(task.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">Supprimer</Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Astuce :</strong> Tapez le raccourci dans le champ description lors de la création d'une intervention pour insérer rapidement la description complète.
        </p>
      </div>
    </div>
  );
}

// ============ EQUIPMENT SECTION ============
function EquipmentSection() {
  const { equipmentKeywords, addEquipmentKeyword, updateEquipmentKeyword, deleteEquipmentKeyword } = useStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newText, setNewText] = useState('');
  const [newShortcut, setNewShortcut] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editShortcut, setEditShortcut] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState('');

  const allEquipment = Object.values(equipmentKeywords).sort((a, b) => b.usageCount - a.usageCount);

  const handleAdd = () => {
    if (!newText.trim()) {
      setError('Le matériel est obligatoire');
      return;
    }
    const existing = Object.values(equipmentKeywords).find(
      (t) => t.text.toLowerCase() === newText.trim().toLowerCase()
    );
    if (existing) {
      setError('Ce matériel existe déjà');
      return;
    }
    addEquipmentKeyword(newText.trim(), newShortcut.trim() || undefined);
    setNewText('');
    setNewShortcut('');
    setShowAddForm(false);
    setError('');
  };

  const handleStartEdit = (equip: typeof allEquipment[0]) => {
    setEditingId(equip.id);
    setEditText(equip.text);
    setEditShortcut(equip.shortcut || '');
    setError('');
  };

  const handleSaveEdit = () => {
    if (!editText.trim()) {
      setError('Le matériel est obligatoire');
      return;
    }
    if (editingId) {
      updateEquipmentKeyword(editingId, { text: editText.trim(), shortcut: editShortcut.trim() || undefined });
      setEditingId(null);
      setError('');
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Matériel à prendre</h2>
          <p className="text-sm text-gray-500 mt-1">Gérez la liste du matériel prédéfini et leurs raccourcis</p>
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>+ Ajouter</Button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Nouveau matériel</h3>
          <div className="space-y-4">
            <Input
              label="Matériel *"
              value={newText}
              onChange={(e) => { setNewText(e.target.value); setError(''); }}
              placeholder="Ex: Chauffe-eau"
              autoFocus
            />
            <Input
              label="Raccourci (optionnel)"
              value={newShortcut}
              onChange={(e) => setNewShortcut(e.target.value.toUpperCase())}
              placeholder="Ex: CE"
              maxLength={5}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => { setShowAddForm(false); setNewText(''); setNewShortcut(''); setError(''); }}>Annuler</Button>
              <Button onClick={handleAdd}>Ajouter</Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">Matériel ({allEquipment.length})</h3>
        </div>
        {allEquipment.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucun matériel.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {allEquipment.map((equip) => {
              const isEditing = editingId === equip.id;
              return (
                <li key={equip.id} className="px-4 py-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <Input value={editText} onChange={(e) => { setEditText(e.target.value); setError(''); }} placeholder="Matériel" />
                      <Input value={editShortcut} onChange={(e) => setEditShortcut(e.target.value.toUpperCase())} placeholder="Raccourci" maxLength={5} />
                      {error && <p className="text-sm text-red-600">{error}</p>}
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => { setEditingId(null); setError(''); }}>Annuler</Button>
                        <Button size="sm" onClick={handleSaveEdit}>Enregistrer</Button>
                      </div>
                    </div>
                  ) : confirmDelete === equip.id ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Supprimer "{equip.text}" ?</span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Annuler</Button>
                        <Button variant="danger" size="sm" onClick={() => { deleteEquipmentKeyword(equip.id); setConfirmDelete(null); }}>Supprimer</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {equip.shortcut && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-mono font-bold rounded">
                            {equip.shortcut}
                          </span>
                        )}
                        <div>
                          <span className="font-medium text-gray-900">{equip.text}</span>
                          <span className="text-sm text-gray-400 ml-2">{equip.usageCount} utilisation{equip.usageCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleStartEdit(equip)}>Modifier</Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(equip.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">Supprimer</Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Astuce :</strong> Tapez le raccourci dans le champ matériel lors de la création d'une intervention pour insérer rapidement le matériel.
        </p>
      </div>
    </div>
  );
}
