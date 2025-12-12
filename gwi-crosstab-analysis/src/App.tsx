import { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import ChatInterface, { ChatInterfaceHandle } from './components/ChatInterface';
import CrosstabList from './components/CrosstabList';
import PromptLibrary from './components/PromptLibrary';
import type { PromptMetadata } from './lib/types';
import './index.css';

function App() {
  const [selectedCrosstab, setSelectedCrosstab] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    // Check for saved preference or system preference
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const chatRef = useRef<ChatInterfaceHandle>(null);

  // Apply dark mode class to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const handleNewChat = () => {
    chatRef.current?.clearChat();
    setSelectedCrosstab(null);
  };

  const handleSelectPrompt = (prompt: string, metadata?: PromptMetadata) => {
    chatRef.current?.sendPrompt(prompt, metadata);
  };

  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 theme-transition">
      {/* Header */}
      <Header
        onNewChat={handleNewChat}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onOpenPromptLibrary={() => setShowPromptLibrary(true)}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col theme-transition">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Your Crosstabs
              </h2>
            </div>
            <CrosstabList
              onSelectCrosstab={setSelectedCrosstab}
              selectedId={selectedCrosstab}
            />
          </div>
        )}

        {/* Main Chat Area */}
        <ChatInterface
          ref={chatRef}
          selectedCrosstabId={selectedCrosstab}
          onOpenPromptLibrary={() => setShowPromptLibrary(true)}
          onSelectCrosstab={setSelectedCrosstab}
        />
      </div>

      {/* Prompt Library Modal */}
      <PromptLibrary
        isOpen={showPromptLibrary}
        onClose={() => setShowPromptLibrary(false)}
        onSelectPrompt={handleSelectPrompt}
      />
    </div>
  );
}

export default App;
