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

  // Debug logging
  if (!isUser) {
    console.log('MessageBubble - message:', message);
    console.log('MessageBubble - crosstabs:', message.crosstabs);
    console.log('MessageBubble - crosstabs length:', message.crosstabs?.length || 0);
    console.log('MessageBubble - visualizations:', message.visualizations?.length || 0);
    console.log('MessageBubble - suggestedActions:', message.suggestedActions?.length || 0);
  }

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
            <>
              <ReactMarkdown
                className="prose prose-sm max-w-none"
                components={{
                  h1: ({ ...props }) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />,
                  h2: ({ ...props }) => <h2 className="text-xl font-bold mt-3 mb-2" {...props} />,
                  h3: ({ ...props }) => <h3 className="text-lg font-semibold mt-2 mb-1" {...props} />,
                  ul: ({ ...props }) => <ul className="list-disc list-inside my-2" {...props} />,
                  ol: ({ ...props }) => <ol className="list-decimal list-inside my-2" {...props} />,
                  li: ({ ...props }) => <li className="my-1" {...props} />,
                  p: ({ ...props }) => <p className="my-2" {...props} />,
                  strong: ({ ...props }) => <strong className="font-semibold" {...props} />,
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-gray-100 px-1 rounded text-sm" {...props}>{children}</code>
                    ) : (
                      <code className="block bg-gray-100 p-2 rounded my-2 text-sm" {...props}>{children}</code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>

              {/* Render visualizations if available */}
              {message.visualizations && message.visualizations.length > 0 && (
                <div className="mt-4">
                  {message.visualizations.map((viz) => (
                    <IndexBarChart key={viz.id} visualization={viz} />
                  ))}
                </div>
              )}

              {/* Render clickable crosstab buttons if available */}
              {message.crosstabs && message.crosstabs.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-gray-500 font-medium">Select a crosstab to analyze:</p>
                  <div className="flex flex-wrap gap-2">
                    {message.crosstabs.map((ct, index) => (
                      <button
                        key={ct.id}
                        onClick={() => onSelectCrosstab?.(ct.id)}
                        className="inline-flex items-center px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-gwi-blue rounded-lg border border-blue-200 transition-colors group"
                      >
                        <span className="w-5 h-5 flex items-center justify-center bg-gwi-blue text-white text-xs rounded-full mr-2">
                          {index + 1}
                        </span>
                        <span className="truncate max-w-xs">{ct.name}</span>
                        <svg
                          className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
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
            </>
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
