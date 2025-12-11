// ============================================================================
// src/App.tsx - Main Application Component
// ============================================================================

import React, { useState } from 'react';
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

// ============================================================================
// src/components/ChatInterface.tsx - Chat Component
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import MessageBubble from './MessageBubble';
import { ChatMessage } from '@/lib/types';

interface ChatInterfaceProps {
  selectedCrosstabId: string | null;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ selectedCrosstabId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      crosstabId: selectedCrosstabId || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          crosstabId: selectedCrosstabId,
          history: messages.slice(-5), // Last 5 messages for context
        }),
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        analysisType: data.analysisType,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedPrompts = [
    "What crosstabs do I have about social media?",
    "Analyze my latest Tesla crosstab",
    "Compare UK vs Germany markets",
    "Show me trending behaviors over time",
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gwi-dark mb-2">
                Welcome to GWI Crosstab Analysis
              </h2>
              <p className="text-gray-600">
                Ask me anything about your crosstabs and I'll provide insights
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt)}
                  className="p-4 text-left bg-white border border-gray-200 rounded-lg hover:border-gwi-blue hover:shadow-md transition-all"
                >
                  <div className="text-sm text-gray-700">{prompt}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(message => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        
        {loading && (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="animate-bounce">●</div>
            <div className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</div>
            <div className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your crosstabs..."
              className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gwi-blue focus:border-transparent"
              rows={1}
              style={{ minHeight: '52px', maxHeight: '200px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="px-6 py-3 bg-gwi-blue text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500 text-center">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;

// ============================================================================
// src/components/MessageBubble.tsx - Individual Message Component
// ============================================================================

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '@/lib/types';

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3xl ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-lg p-4 ${
            isUser
              ? 'bg-gwi-blue text-white'
              : 'bg-white border border-gray-200'
          }`}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <ReactMarkdown
              className="prose prose-sm max-w-none"
              components={{
                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-3 mb-2" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-2 mb-1" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc list-inside my-2" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal list-inside my-2" {...props} />,
                li: ({ node, ...props }) => <li className="my-1" {...props} />,
                p: ({ node, ...props }) => <p className="my-2" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                code: ({ node, inline, ...props }: any) =>
                  inline ? (
                    <code className="bg-gray-100 px-1 rounded text-sm" {...props} />
                  ) : (
                    <code className="block bg-gray-100 p-2 rounded my-2 text-sm" {...props} />
                  ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1 px-2">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;

// ============================================================================
// src/components/CrosstabList.tsx - Sidebar Crosstab List
// ============================================================================

import React, { useState, useEffect } from 'react';
import { CrosstabSummary } from '@/lib/types';

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

// ============================================================================
// src/main.tsx - Application Entry Point
// ============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ============================================================================
// src/index.css - Tailwind CSS Base Styles
// ============================================================================

/*
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.prose {
  color: #374151;
}

.prose strong {
  color: #111827;
}

.prose h1,
.prose h2,
.prose h3 {
  color: #111827;
}
*/