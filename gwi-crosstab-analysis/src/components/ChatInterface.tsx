import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import MessageBubble from './MessageBubble';
import WelcomeScreen from './WelcomeScreen';
import type { ChatMessage } from '@/lib/types';

interface ChatInterfaceProps {
  selectedCrosstabId: string | null;
  onOpenPromptLibrary: () => void;
}

export interface ChatInterfaceHandle {
  clearChat: () => void;
  setPrompt: (prompt: string) => void;
  sendPrompt: (prompt: string) => void;
}

const ChatInterface = forwardRef<ChatInterfaceHandle, ChatInterfaceProps>(
  ({ selectedCrosstabId, onOpenPromptLibrary }, ref) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
      scrollToBottom();
    }, [messages]);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      clearChat: () => {
        setMessages([]);
        setInput('');
      },
      setPrompt: (prompt: string) => {
        setInput(prompt);
        inputRef.current?.focus();
      },
      sendPrompt: (prompt: string) => {
        setInput(prompt);
        // Use setTimeout to ensure state is updated before sending
        setTimeout(() => {
          handleSendWithMessage(prompt);
        }, 0);
      }
    }));

    const handleSendWithMessage = async (messageText: string) => {
      if (!messageText.trim() || loading) return;

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: messageText,
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
            message: messageText,
            crosstabId: selectedCrosstabId,
            history: messages.slice(-5),
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
        console.error('Chat error:', error);
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

    const handleSend = () => {
      handleSendWithMessage(input);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    const handleSelectPrompt = (prompt: string) => {
      handleSendWithMessage(prompt);
    };

    return (
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Messages Area */}
        {messages.length === 0 ? (
          <WelcomeScreen
            onSelectPrompt={handleSelectPrompt}
            onOpenPromptLibrary={onOpenPromptLibrary}
          />
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(message => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {loading && (
              <div className="flex items-center space-x-2 text-gray-500 p-4">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gwi-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gwi-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gwi-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm">Analyzing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-4xl mx-auto">
            {/* Context indicator */}
            {selectedCrosstabId && (
              <div className="mb-2 flex items-center text-xs text-gray-500">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Crosstab selected - your questions will reference this data
              </div>
            )}

            <div className="flex items-end space-x-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={selectedCrosstabId
                    ? "Ask about this crosstab..."
                    : "Ask about your crosstabs..."}
                  className="w-full resize-none border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-gwi-blue focus:border-transparent"
                  rows={1}
                  style={{ minHeight: '52px', maxHeight: '200px' }}
                />
                <button
                  onClick={onOpenPromptLibrary}
                  className="absolute right-3 bottom-3 p-1 text-gray-400 hover:text-gwi-blue transition-colors"
                  title="Browse prompts"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </button>
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="px-6 py-3 bg-gwi-blue text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <span>Send</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>Press Enter to send, Shift+Enter for new line</span>
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  Clear chat
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ChatInterface.displayName = 'ChatInterface';

export default ChatInterface;
