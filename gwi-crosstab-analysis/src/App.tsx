import { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import CrosstabList from './components/CrosstabList';
import './index.css';

function App() {
  const [selectedCrosstab, setSelectedCrosstab] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gwi-dark">GWI Crosstab Analysis</h1>
            <p className="text-sm text-gray-600 mt-1">AI-Powered Market Insights</p>
          </div>
          <CrosstabList
            onSelectCrosstab={setSelectedCrosstab}
            selectedId={selectedCrosstab}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="text-sm text-gray-600">
            {selectedCrosstab ? 'Analyzing crosstab' : 'Ask me anything about your crosstabs'}
          </div>
        </div>

        <ChatInterface selectedCrosstabId={selectedCrosstab} />
      </div>
    </div>
  );
}

export default App;
