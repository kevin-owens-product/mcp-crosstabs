import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '@/lib/types';
import { IndexBarChart, SuggestedActions } from './visualizations';

interface MessageBubbleProps {
  message: ChatMessage;
  onSelectCrosstab?: (id: string) => void;
  onSendMessage?: (message: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onSelectCrosstab,
  onSendMessage,
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // User message - simple right-aligned bubble
  if (isUser) {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-2xl">
          <div className="px-4 py-3 bg-primary-600 text-white rounded-2xl rounded-br-md shadow-soft">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
          </div>
        </div>
        {/* User Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-sm font-medium">
          U
        </div>
      </div>
    );
  }

  // Assistant message - left-aligned with avatar and actions
  return (
    <div
      className="flex gap-4 group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* AI Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-soft">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        {/* Message content */}
        <div className="relative">
          <ReactMarkdown
            className="prose prose-slate dark:prose-invert max-w-none text-sm"
            components={{
              h1: ({ ...props }) => <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-6 mb-3 first:mt-0" {...props} />,
              h2: ({ ...props }) => <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-5 mb-2" {...props} />,
              h3: ({ ...props }) => <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-4 mb-2" {...props} />,
              h4: ({ ...props }) => <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-3 mb-1" {...props} />,
              ul: ({ ...props }) => <ul className="list-disc pl-5 my-3 space-y-1.5" {...props} />,
              ol: ({ ...props }) => <ol className="list-decimal pl-5 my-3 space-y-1.5" {...props} />,
              li: ({ ...props }) => <li className="text-slate-700 dark:text-slate-300 leading-relaxed" {...props} />,
              p: ({ ...props }) => <p className="my-3 text-slate-700 dark:text-slate-300 leading-relaxed first:mt-0 last:mb-0" {...props} />,
              strong: ({ ...props }) => <strong className="font-semibold text-slate-900 dark:text-slate-100" {...props} />,
              hr: ({ ...props }) => <hr className="my-4 border-slate-200 dark:border-slate-700" {...props} />,
              blockquote: ({ ...props }) => <blockquote className="border-l-4 border-primary-300 dark:border-primary-600 pl-4 my-3 italic text-slate-600 dark:text-slate-400" {...props} />,
              a: ({ ...props }) => <a className="text-primary-600 dark:text-primary-400 hover:underline" {...props} />,
              code: ({ className, children, ...props }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-primary-700 dark:text-primary-300 rounded text-sm font-mono" {...props}>{children}</code>
                ) : (
                  <code className="block bg-slate-900 text-slate-100 p-4 rounded-lg my-3 text-sm font-mono overflow-x-auto" {...props}>{children}</code>
                );
              },
              pre: ({ ...props }) => <pre className="bg-slate-900 rounded-lg overflow-hidden my-3" {...props} />,
            }}
          >
            {message.content}
          </ReactMarkdown>

          {/* Message actions - show on hover */}
          <div className={`flex items-center gap-1 mt-3 transition-opacity duration-200 ${showActions ? 'opacity-100' : 'opacity-0'}`}>
            <button
              onClick={handleCopy}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Copy message"
            >
              {copied ? (
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            <button
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Good response"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
            </button>
            <button
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Bad response"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Render visualizations if available */}
        {message.visualizations && message.visualizations.length > 0 && (
          <div className="mt-5 space-y-4">
            {message.visualizations.map((viz) => (
              <IndexBarChart key={viz.id} visualization={viz} />
            ))}
          </div>
        )}

        {/* Render clickable crosstab buttons if available */}
        {message.crosstabs && message.crosstabs.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Select a crosstab to analyze:</p>
            <div className="flex flex-wrap gap-2">
              {message.crosstabs.map((ct, index) => (
                <button
                  key={ct.id}
                  onClick={() => onSelectCrosstab?.(ct.id)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-900/30 text-slate-700 dark:text-slate-300 hover:text-primary-700 dark:hover:text-primary-300 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600 transition-all group"
                >
                  <span className="w-5 h-5 flex items-center justify-center bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-xs font-medium rounded-full group-hover:bg-primary-600 group-hover:text-white transition-colors">
                    {index + 1}
                  </span>
                  <span className="truncate max-w-xs font-medium">{ct.name}</span>
                  <svg
                    className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Render suggested actions if available */}
        {message.suggestedActions && message.suggestedActions.length > 0 && onSendMessage && (
          <SuggestedActions
            actions={message.suggestedActions}
            onActionClick={onSendMessage}
          />
        )}

        {/* Timestamp - subtle, shown on hover or always for the last message */}
        <div className={`text-2xs text-slate-400 mt-2 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
