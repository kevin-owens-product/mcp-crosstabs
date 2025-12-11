import { useState, useRef } from 'react';
import Header from './components/Header';
import ChatInterface, { ChatInterfaceHandle } from './components/ChatInterface';
import CrosstabList from './components/CrosstabList';
import PromptLibrary from './components/PromptLibrary';
import './index.css';

function App() {
  const [selectedCrosstab, setSelectedCrosstab] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const chatRef = useRef<ChatInterfaceHandle>(null);

  const handleNewChat = () => {
    chatRef.current?.clearChat();
    setSelectedCrosstab(null);
  };

  const handleSelectPrompt = (prompt: string) => {
    chatRef.current?.sendPrompt(prompt);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <Header
        onNewChat={handleNewChat}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onOpenPromptLibrary={() => setShowPromptLibrary(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
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
