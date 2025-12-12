interface QuickAction {
  icon: JSX.Element;
  title: string;
  description: string;
  prompt: string;
  gradient: string;
}

const quickActions: QuickAction[] = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    title: 'List crosstabs',
    description: 'See your saved data',
    prompt: 'What crosstabs do I have?',
    gradient: 'from-blue-500 to-blue-600'
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Analyze data',
    description: 'Get key insights',
    prompt: 'Analyze this crosstab and give me all insights',
    gradient: 'from-emerald-500 to-emerald-600'
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    title: 'Compare markets',
    description: 'Cross-market analysis',
    prompt: 'Compare UK vs Germany in this data',
    gradient: 'from-violet-500 to-violet-600'
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'Marketing strategy',
    description: 'Actionable recommendations',
    prompt: 'Based on this analysis, what marketing strategy would you recommend?',
    gradient: 'from-amber-500 to-orange-500'
  }
];

const suggestedQuestions = [
  'What are the top over-indexed behaviors?',
  'Which platforms should I prioritize?',
  'What makes this audience unique?',
  'Show me a chart of the data',
];

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
  onOpenPromptLibrary: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectPrompt, onOpenPromptLibrary }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-2xl w-full">
        {/* Hero section - clean and centered like Claude */}
        <div className="text-center mb-12">
          {/* Gradient orb icon */}
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl rotate-6 opacity-20"></div>
            <div className="relative w-full h-full bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-soft">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
            How can I help you today?
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base max-w-md mx-auto">
            Ask questions about your crosstab data in natural language.
          </p>
        </div>

        {/* Quick actions grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => onSelectPrompt(action.prompt)}
              className="group relative flex flex-col items-start p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-soft transition-all text-left"
            >
              <div className={`w-9 h-9 bg-gradient-to-br ${action.gradient} rounded-lg flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform shadow-sm`}>
                {action.icon}
              </div>
              <span className="font-medium text-slate-800 dark:text-slate-200 text-sm mb-0.5">
                {action.title}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {action.description}
              </span>
              {/* Hover arrow */}
              <svg
                className="absolute top-4 right-4 w-4 h-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        {/* Suggested questions */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-center gap-2">
            {suggestedQuestions.map((question, i) => (
              <button
                key={i}
                onClick={() => onSelectPrompt(question)}
                className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-700 dark:hover:text-primary-300 rounded-full transition-colors border border-transparent hover:border-primary-200 dark:hover:border-primary-700"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt library link */}
        <div className="text-center">
          <button
            onClick={onOpenPromptLibrary}
            className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Browse prompt library</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Subtle tip */}
        <div className="mt-10 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            <span className="inline-flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Select a crosstab from the sidebar to set context
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
