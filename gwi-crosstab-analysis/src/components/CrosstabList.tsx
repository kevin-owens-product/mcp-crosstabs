import { useState, useEffect } from 'react';
import type { CrosstabSummary } from '@/lib/types';

interface CrosstabListProps {
  onSelectCrosstab: (id: string | null) => void;
  selectedId: string | null;
}

// Extract UUID from URL or return as-is if already a UUID
function extractCrosstabId(input: string): string | null {
  const trimmed = input.trim();
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = trimmed.match(uuidPattern);
  return match ? match[0] : null;
}

const CrosstabList: React.FC<CrosstabListProps> = ({ onSelectCrosstab, selectedId }) => {
  const [crosstabs, setCrosstabs] = useState<CrosstabSummary[]>([]);
  const [manualCrosstabs, setManualCrosstabs] = useState<CrosstabSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCrosstabInput, setNewCrosstabInput] = useState('');
  const [addingCrosstab, setAddingCrosstab] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    fetchCrosstabs();
    loadManualCrosstabs();
  }, []);

  const fetchCrosstabs = async () => {
    try {
      const response = await fetch('/api/crosstabs');
      const data = await response.json();
      setCrosstabs(data.crosstabs || []);
    } catch (error) {
      console.error('Failed to fetch crosstabs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadManualCrosstabs = () => {
    try {
      const stored = localStorage.getItem('manualCrosstabs');
      if (stored) {
        setManualCrosstabs(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load manual crosstabs:', error);
    }
  };

  const saveManualCrosstabs = (crosstabs: CrosstabSummary[]) => {
    localStorage.setItem('manualCrosstabs', JSON.stringify(crosstabs));
    setManualCrosstabs(crosstabs);
  };

  const handleAddCrosstab = async () => {
    const id = extractCrosstabId(newCrosstabInput);

    if (!id) {
      setAddError('Please enter a valid crosstab URL or ID');
      return;
    }

    const allCrosstabs = [...crosstabs, ...manualCrosstabs];
    if (allCrosstabs.some(ct => ct.id === id)) {
      setAddError('This crosstab is already in your list');
      return;
    }

    setAddingCrosstab(true);
    setAddError(null);

    try {
      const response = await fetch(`/api/crosstabs/${id}?includeData=false`);

      if (!response.ok) {
        throw new Error('Failed to fetch crosstab');
      }

      const data = await response.json();

      const newCrosstab: CrosstabSummary = {
        id: id,
        uuid: data.uuid || id,
        name: data.name || `Crosstab ${id.substring(0, 8)}...`,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
      };

      const updated = [...manualCrosstabs, newCrosstab];
      saveManualCrosstabs(updated);
      setNewCrosstabInput('');
      setShowAddForm(false);
    } catch (error) {
      const newCrosstab: CrosstabSummary = {
        id: id,
        uuid: id,
        name: `Crosstab ${id.substring(0, 8)}...`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updated = [...manualCrosstabs, newCrosstab];
      saveManualCrosstabs(updated);
      setNewCrosstabInput('');
      setShowAddForm(false);
    } finally {
      setAddingCrosstab(false);
    }
  };

  const handleRemoveCrosstab = (id: string) => {
    const updated = manualCrosstabs.filter(ct => ct.id !== id);
    saveManualCrosstabs(updated);
    if (selectedId === id) {
      onSelectCrosstab(null);
    }
  };

  const allCrosstabs = [...crosstabs, ...manualCrosstabs];
  const filteredCrosstabs = allCrosstabs.filter(ct =>
    ct.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-3 space-y-2">
        {/* Search input */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-700 border-none rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          />
        </div>

        {/* Add crosstab button/form */}
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Crosstab
          </button>
        ) : (
          <div className="space-y-2 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <input
              type="text"
              placeholder="Paste crosstab URL or ID..."
              value={newCrosstabInput}
              onChange={(e) => {
                setNewCrosstabInput(e.target.value);
                setAddError(null);
              }}
              className="w-full px-3 py-2 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
            {addError && (
              <p className="text-xs text-red-500 dark:text-red-400">{addError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleAddCrosstab}
                disabled={addingCrosstab || !newCrosstabInput.trim()}
                className="flex-1 px-3 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {addingCrosstab ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewCrosstabInput('');
                  setAddError(null);
                }}
                className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Crosstab list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex gap-1">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        ) : filteredCrosstabs.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {searchQuery ? 'No matches found' : 'No crosstabs yet'}
            </p>
            {!searchQuery && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Add one above to get started
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredCrosstabs.map(ct => {
              const isManual = manualCrosstabs.some(m => m.id === ct.id);
              const isSelected = ct.id === selectedId;

              return (
                <div
                  key={ct.id}
                  className={`relative group rounded-xl transition-all ${
                    isSelected
                      ? 'bg-primary-600 text-white shadow-soft'
                      : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <button
                    onClick={() => onSelectCrosstab(isSelected ? null : ct.id)}
                    className="w-full text-left p-3"
                  >
                    <div className={`font-medium text-sm line-clamp-2 pr-6 ${
                      isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-200'
                    }`}>
                      {ct.name}
                    </div>
                    <div className={`text-xs mt-1.5 flex items-center gap-1.5 ${
                      isSelected ? 'text-primary-100' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(ct.created_at).toLocaleDateString()}
                      {isManual && (
                        <span className={`inline-flex items-center gap-0.5 ${
                          isSelected ? 'text-primary-200' : 'text-slate-400'
                        }`}>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          Manual
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Remove button for manual crosstabs */}
                  {isManual && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveCrosstab(ct.id);
                      }}
                      className={`absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                        isSelected
                          ? 'hover:bg-primary-500 text-primary-200 hover:text-white'
                          : 'hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                      }`}
                      title="Remove from list"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CrosstabList;
