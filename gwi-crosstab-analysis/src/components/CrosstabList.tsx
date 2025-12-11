import { useState, useEffect } from 'react';
import type { CrosstabSummary } from '@/lib/types';

interface CrosstabListProps {
  onSelectCrosstab: (id: string | null) => void;
  selectedId: string | null;
}

// Extract UUID from URL or return as-is if already a UUID
function extractCrosstabId(input: string): string | null {
  const trimmed = input.trim();

  // UUID pattern
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

    // Check if already exists
    const allCrosstabs = [...crosstabs, ...manualCrosstabs];
    if (allCrosstabs.some(ct => ct.id === id)) {
      setAddError('This crosstab is already in your list');
      return;
    }

    setAddingCrosstab(true);
    setAddError(null);

    try {
      // Try to fetch crosstab info
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
      // Even if fetch fails, add it with a placeholder name
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
      <div className="p-4 space-y-3">
        <input
          type="text"
          placeholder="Search crosstabs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gwi-blue text-sm"
        />

        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full px-3 py-2 text-sm text-gwi-blue border border-gwi-blue rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Crosstab
          </button>
        ) : (
          <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
            <input
              type="text"
              placeholder="Paste crosstab URL or ID..."
              value={newCrosstabInput}
              onChange={(e) => {
                setNewCrosstabInput(e.target.value);
                setAddError(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gwi-blue text-sm"
              autoFocus
            />
            {addError && (
              <p className="text-xs text-red-500">{addError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleAddCrosstab}
                disabled={addingCrosstab || !newCrosstabInput.trim()}
                className="flex-1 px-3 py-1.5 text-sm bg-gwi-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {addingCrosstab ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewCrosstabInput('');
                  setAddError(null);
                }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : filteredCrosstabs.length === 0 ? (
          <div className="text-center text-gray-500 py-8 text-sm">
            {searchQuery ? 'No matches found' : 'No crosstabs yet. Add one above!'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCrosstabs.map(ct => {
              const isManual = manualCrosstabs.some(m => m.id === ct.id);

              return (
                <div
                  key={ct.id}
                  className={`relative group rounded-lg transition-colors ${
                    ct.id === selectedId
                      ? 'bg-gwi-blue text-white'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <button
                    onClick={() => onSelectCrosstab(ct.id === selectedId ? null : ct.id)}
                    className="w-full text-left p-3"
                  >
                    <div className="font-medium text-sm line-clamp-2 pr-6">{ct.name}</div>
                    <div className={`text-xs mt-1 ${ct.id === selectedId ? 'text-blue-100' : 'text-gray-500'}`}>
                      {new Date(ct.created_at).toLocaleDateString()}
                      {isManual && ' • Added manually'}
                    </div>
                  </button>

                  {isManual && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveCrosstab(ct.id);
                      }}
                      className={`absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                        ct.id === selectedId ? 'hover:bg-blue-600' : 'hover:bg-gray-200'
                      }`}
                      title="Remove from list"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
