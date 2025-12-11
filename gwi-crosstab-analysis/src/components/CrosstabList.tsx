import { useState, useEffect } from 'react';
import type { CrosstabSummary } from '@/lib/types';

interface CrosstabListProps {
  onSelectCrosstab: (id: string | null) => void;
  selectedId: string | null;
}

const CrosstabList: React.FC<CrosstabListProps> = ({ onSelectCrosstab, selectedId }) => {
  const [crosstabs, setCrosstabs] = useState<CrosstabSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCrosstabs();
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

  const filteredCrosstabs = crosstabs.filter(ct =>
    ct.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4">
        <input
          type="text"
          placeholder="Search crosstabs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gwi-blue"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : filteredCrosstabs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {searchQuery ? 'No matches found' : 'No crosstabs available'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCrosstabs.map(ct => (
              <button
                key={ct.id}
                onClick={() => onSelectCrosstab(ct.id === selectedId ? null : ct.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  ct.id === selectedId
                    ? 'bg-gwi-blue text-white'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="font-medium text-sm line-clamp-2">{ct.name}</div>
                <div className={`text-xs mt-1 ${ct.id === selectedId ? 'text-blue-100' : 'text-gray-500'}`}>
                  {new Date(ct.created_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CrosstabList;
