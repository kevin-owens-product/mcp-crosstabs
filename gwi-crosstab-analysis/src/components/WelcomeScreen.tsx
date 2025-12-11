interface QuickPrompt {
  icon: JSX.Element;
  title: string;
  prompt: string;
  color: string;
}

const quickPrompts: QuickPrompt[] = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    title: 'List my crosstabs',
    prompt: 'What crosstabs do I have?',
    color: 'bg-blue-500'
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Analyze data',
    prompt: 'Analyze this crosstab and give me all insights',
    color: 'bg-green-500'
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Compare markets',
    prompt: 'Compare UK vs Germany in this data',
    color: 'bg-purple-500'
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    title: 'Find trends',
    prompt: 'What trends do you see over time?',
    color: 'bg-orange-500'
  }
];

const examplePrompts = [
  'What crosstabs do I have about social media?',
  'Show me the top over-indexed behaviors for this audience',
  'What makes this audience different from the general population?',
  'Which platforms should I prioritize for this audience?',
  'Compare Q3 vs Q4 performance',
  'What content themes would resonate with this audience?'
];

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
  onOpenPromptLibrary: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectPrompt, onOpenPromptLibrary }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
      <div className="max-w-3xl w-full text-center">
        {/* Hero section */}
        <div className="mb-10">
          <div className="w-16 h-16 bg-gwi-blue rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gwi-dark mb-3">
            Welcome to GWI Crosstab Analysis
          </h1>
          <p className="text-gray-600 text-lg">
            AI-powered insights from your crosstab data. Ask questions in natural language.
          </p>
        </div>

        {/* Quick action cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {quickPrompts.map((item, i) => (
            <button
              key={i}
              onClick={() => onSelectPrompt(item.prompt)}
              className="flex flex-col items-center p-4 bg-white border border-gray-200 rounded-xl hover:border-gwi-blue hover:shadow-lg transition-all group"
            >
              <div className={`${item.color} p-3 rounded-lg text-white mb-3 group-hover:scale-110 transition-transform`}>
                {item.icon}
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-gwi-blue transition-colors">
                {item.title}
              </span>
            </button>
          ))}
        </div>

        {/* Example prompts */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Try asking
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {examplePrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => onSelectPrompt(prompt)}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gwi-blue hover:text-white text-gray-700 rounded-full transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt library button */}
        <button
          onClick={onOpenPromptLibrary}
          className="inline-flex items-center space-x-2 px-6 py-3 border-2 border-gwi-blue text-gwi-blue rounded-lg hover:bg-gwi-blue hover:text-white transition-colors font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span>Browse Prompt Library</span>
        </button>

        {/* Tips */}
        <div className="mt-10 p-4 bg-blue-50 rounded-lg text-left">
          <h3 className="font-semibold text-gwi-dark mb-2">Tips</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>* Select a crosstab from the sidebar to set context for your questions</li>
            <li>* Use natural language - ask questions as you would to a colleague</li>
            <li>* I automatically apply specialized analysis templates based on your data</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
