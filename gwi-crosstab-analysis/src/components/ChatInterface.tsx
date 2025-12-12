import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import MessageBubble from './MessageBubble';
import WelcomeScreen from './WelcomeScreen';
import type { ChatMessage } from '@/lib/types';

interface ChatInterfaceProps {
  selectedCrosstabId: string | null;
  onOpenPromptLibrary: () => void;
  onSelectCrosstab: (id: string) => void;
}

export interface ChatInterfaceHandle {
  clearChat: () => void;
  setPrompt: (prompt: string) => void;
  sendPrompt: (prompt: string) => void;
}

const ChatInterface = forwardRef<ChatInterfaceHandle, ChatInterfaceProps>(
  ({ selectedCrosstabId, onOpenPromptLibrary, onSelectCrosstab }, ref) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    };

    useEffect(() => {
      scrollToBottom();
    }, [messages]);

    // Handle scroll to show/hide scroll button
    useEffect(() => {
      const container = messagesContainerRef.current;
      if (!container) return;

      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollButton(!isNearBottom && messages.length > 0);
      };

      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }, [messages.length]);

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
          crosstabs: data.crosstabs || undefined,
          visualizations: data.visualizations || undefined,
          suggestedActions: data.suggestedActions || undefined,
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

    // Auto-resize textarea
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      const textarea = e.target;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    };

    return (
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 theme-transition relative">
        {/* Messages Area */}
        {messages.length === 0 ? (
          <WelcomeScreen
            onSelectPrompt={handleSelectPrompt}
            onOpenPromptLibrary={onOpenPromptLibrary}
          />
        ) : (
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto custom-scrollbar"
          >
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className="message-enter"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <MessageBubble
                    message={message}
                    onSelectCrosstab={onSelectCrosstab}
                    onSendMessage={handleSendWithMessage}
                  />
                </div>
              ))}

              {loading && (
                <div className="flex items-start gap-4 message-enter">
                  {/* AI Avatar */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-soft">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  {/* Typing indicator */}
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-1 px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl shadow-soft">
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 ml-1">Analyzing your data...</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="h-4" />
            </div>
          </div>
        )}

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={() => scrollToBottom()}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 p-2 bg-white dark:bg-slate-800 rounded-full shadow-soft-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-primary-600 transition-all hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        )}

        {/* Input Area */}
        <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 theme-transition">
          <div className="max-w-3xl mx-auto px-4 py-4">
            {/* Context indicator */}
            {selectedCrosstabId && (
              <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Crosstab selected
                <button
                  onClick={() => onSelectCrosstab('')}
                  className="ml-1 hover:text-primary-900 dark:hover:text-primary-100"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Input container - pill style like ChatGPT */}
            <div className="relative flex items-end gap-3 p-2 bg-slate-100 dark:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-600 focus-within:border-primary-400 dark:focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 dark:focus-within:ring-primary-900/50 transition-all">
              {/* Prompt library button */}
              <button
                onClick={onOpenPromptLibrary}
                className="flex-shrink-0 p-2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors rounded-lg hover:bg-white dark:hover:bg-slate-600"
                title="Browse prompts"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </button>

              {/* Textarea */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={selectedCrosstabId
                  ? "Ask about this crosstab..."
                  : "Message GWI Analysis..."}
                className="flex-1 resize-none bg-transparent border-none text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none text-sm leading-relaxed py-2"
                rows={1}
                style={{ minHeight: '24px', maxHeight: '200px' }}
              />

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-all hover:scale-105 disabled:hover:scale-100"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>

            {/* Help text */}
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-2xs font-mono">Enter</kbd>
                <span>to send</span>
                <span className="mx-1 text-slate-300 dark:text-slate-600">|</span>
                <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-2xs font-mono">Shift + Enter</kbd>
                <span>for new line</span>
              </span>
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear
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
