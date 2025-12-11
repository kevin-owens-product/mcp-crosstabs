import { useState } from 'react';

interface PromptCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  prompts: Prompt[];
}

interface Prompt {
  id: string;
  title: string;
  prompt: string;
  description: string;
}

const promptCategories: PromptCategory[] = [
  {
    id: 'discovery',
    name: 'Discovery',
    icon: 'search',
    description: 'Find and explore your crosstabs',
    prompts: [
      {
        id: 'd1',
        title: 'List All Crosstabs',
        prompt: 'What crosstabs do I have?',
        description: 'View all your saved crosstabs'
      },
      {
        id: 'd2',
        title: 'Search by Topic',
        prompt: 'Show me crosstabs about social media',
        description: 'Find crosstabs related to a specific topic'
      },
      {
        id: 'd3',
        title: 'Recent Crosstabs',
        prompt: 'Show me my most recent crosstabs',
        description: 'View recently created or updated crosstabs'
      },
      {
        id: 'd4',
        title: 'Search by Brand',
        prompt: 'Find crosstabs mentioning Tesla',
        description: 'Search for brand-specific analyses'
      }
    ]
  },
  {
    id: 'analysis',
    name: 'Analysis',
    icon: 'chart',
    description: 'Deep-dive into your data',
    prompts: [
      {
        id: 'a1',
        title: 'Full Analysis',
        prompt: 'Analyze this crosstab and give me all insights',
        description: 'Comprehensive analysis with all templates'
      },
      {
        id: 'a2',
        title: 'Key Findings',
        prompt: 'What are the top 5 key findings from this data?',
        description: 'Quick summary of most important insights'
      },
      {
        id: 'a3',
        title: 'Statistical Summary',
        prompt: 'Show me the statistical breakdown of this crosstab',
        description: 'Index values, sample sizes, and significance'
      },
      {
        id: 'a4',
        title: 'Over-indexed Behaviors',
        prompt: 'What behaviors are most over-indexed for this audience?',
        description: 'Find what makes your audience unique'
      },
      {
        id: 'a5',
        title: 'Under-indexed Behaviors',
        prompt: 'What behaviors are under-indexed for this audience?',
        description: 'Identify gaps and negative affinities'
      }
    ]
  },
  {
    id: 'audience',
    name: 'Audience Profiling',
    icon: 'users',
    description: 'Understand your target audience',
    prompts: [
      {
        id: 'au1',
        title: 'Audience Profile',
        prompt: 'Create a detailed profile of this audience',
        description: 'Demographics, behaviors, and characteristics'
      },
      {
        id: 'au2',
        title: 'Defining Traits',
        prompt: 'What are the defining characteristics of this audience?',
        description: 'Top traits that differentiate this audience'
      },
      {
        id: 'au3',
        title: 'Media Habits',
        prompt: 'How does this audience consume media?',
        description: 'Platform preferences and media consumption'
      },
      {
        id: 'au4',
        title: 'Purchase Behavior',
        prompt: 'What are the purchase behaviors of this audience?',
        description: 'Shopping habits and brand preferences'
      }
    ]
  },
  {
    id: 'markets',
    name: 'Market Comparison',
    icon: 'globe',
    description: 'Compare across markets',
    prompts: [
      {
        id: 'm1',
        title: 'Market Breakdown',
        prompt: 'Break down the results by market',
        description: 'See how each market performs'
      },
      {
        id: 'm2',
        title: 'Compare Two Markets',
        prompt: 'Compare UK vs Germany in this data',
        description: 'Head-to-head market comparison'
      },
      {
        id: 'm3',
        title: 'Market Variations',
        prompt: 'Which behaviors vary most across markets?',
        description: 'Find regional differences'
      },
      {
        id: 'm4',
        title: 'Universal Behaviors',
        prompt: 'What behaviors are consistent across all markets?',
        description: 'Identify global trends'
      },
      {
        id: 'm5',
        title: 'Market Strategy',
        prompt: 'What market-specific strategies would you recommend?',
        description: 'Localization recommendations'
      }
    ]
  },
  {
    id: 'trends',
    name: 'Trends & Time',
    icon: 'trending',
    description: 'Track changes over time',
    prompts: [
      {
        id: 't1',
        title: 'Trend Analysis',
        prompt: 'How have these behaviors changed over time?',
        description: 'Track temporal changes'
      },
      {
        id: 't2',
        title: 'Growing Behaviors',
        prompt: 'Which behaviors are growing the fastest?',
        description: 'Identify emerging trends'
      },
      {
        id: 't3',
        title: 'Declining Trends',
        prompt: 'Which behaviors are declining?',
        description: 'Spot fading trends'
      },
      {
        id: 't4',
        title: 'Quarter Comparison',
        prompt: 'Compare Q3 vs Q4 performance',
        description: 'Period-over-period analysis'
      }
    ]
  },
  {
    id: 'strategy',
    name: 'Strategy & Actions',
    icon: 'lightbulb',
    description: 'Get actionable recommendations',
    prompts: [
      {
        id: 's1',
        title: 'Recommendations',
        prompt: 'What actions would you recommend based on this data?',
        description: 'Strategic recommendations'
      },
      {
        id: 's2',
        title: 'Targeting Strategy',
        prompt: 'How should I target this audience?',
        description: 'Targeting and segmentation advice'
      },
      {
        id: 's3',
        title: 'Content Strategy',
        prompt: 'What content themes would resonate with this audience?',
        description: 'Content and messaging ideas'
      },
      {
        id: 's4',
        title: 'Channel Strategy',
        prompt: 'Which channels should I prioritize for this audience?',
        description: 'Media channel recommendations'
      },
      {
        id: 's5',
        title: 'Opportunities',
        prompt: 'What opportunities do you see in this data?',
        description: 'Identify growth opportunities'
      }
    ]
  },
  {
    id: 'spark',
    name: 'GWI Data Queries',
    icon: 'spark',
    description: 'AI-powered questions about GWI data',
    prompts: [
      {
        id: 'sp1',
        title: 'Gen Z Social Media',
        prompt: 'What percentage of Gen Z use TikTok daily?',
        description: 'Social media usage by generation'
      },
      {
        id: 'sp2',
        title: 'Millennial Comparison',
        prompt: 'How do millennials in the UK differ from Germany?',
        description: 'Cross-market demographic comparison'
      },
      {
        id: 'sp3',
        title: 'Gamer Platforms',
        prompt: 'What are the top social platforms for gamers?',
        description: 'Platform preferences by interest group'
      },
      {
        id: 'sp4',
        title: 'Sustainability Attitudes',
        prompt: 'Compare attitudes toward sustainability by age group',
        description: 'Generational attitudes analysis'
      },
      {
        id: 'sp5',
        title: 'Luxury Purchase Drivers',
        prompt: 'What drives purchase decisions for luxury brands?',
        description: 'Consumer motivation insights'
      },
      {
        id: 'sp6',
        title: 'Streaming Preferences',
        prompt: 'Which streaming services are most popular among 18-34 year olds?',
        description: 'Entertainment consumption by age'
      },
      {
        id: 'sp7',
        title: 'Brand Discovery',
        prompt: 'How do consumers discover new brands?',
        description: 'Brand awareness and discovery channels'
      },
      {
        id: 'sp8',
        title: 'Global Social Trends',
        prompt: 'What social media trends are growing globally?',
        description: 'Worldwide social platform trends'
      },
      {
        id: 'sp9',
        title: 'Purchase Influencers',
        prompt: 'Who influences purchase decisions for tech products?',
        description: 'Influencer and recommendation impact'
      },
      {
        id: 'sp10',
        title: 'Work-Life Attitudes',
        prompt: 'How have attitudes toward work-life balance changed?',
        description: 'Evolving workplace sentiment'
      }
    ]
  }
];

const iconMap: { [key: string]: JSX.Element } = {
  search: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  chart: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  globe: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  trending: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  lightbulb: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  spark: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
};

interface PromptLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: string) => void;
}

const PromptLibrary: React.FC<PromptLibraryProps> = ({ isOpen, onClose, onSelectPrompt }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('discovery');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const currentCategory = promptCategories.find(c => c.id === selectedCategory);

  const filteredPrompts = searchQuery
    ? promptCategories.flatMap(cat =>
        cat.prompts.filter(p =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase())
        ).map(p => ({ ...p, category: cat.name }))
      )
    : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gwi-dark">Prompt Library</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gwi-blue"
            />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Categories sidebar */}
          {!searchQuery && (
            <div className="w-56 border-r border-gray-200 p-2 overflow-y-auto">
              {promptCategories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-gwi-blue text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={selectedCategory === category.id ? 'text-white' : 'text-gray-500'}>
                      {iconMap[category.icon]}
                    </span>
                    <div>
                      <div className="font-medium text-sm">{category.name}</div>
                      <div className={`text-xs ${selectedCategory === category.id ? 'text-blue-100' : 'text-gray-500'}`}>
                        {category.prompts.length} prompts
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Prompts grid */}
          <div className="flex-1 p-4 overflow-y-auto">
            {searchQuery ? (
              <>
                <h3 className="text-sm font-medium text-gray-500 mb-3">
                  {filteredPrompts?.length || 0} results for "{searchQuery}"
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredPrompts?.map(prompt => (
                    <button
                      key={prompt.id}
                      onClick={() => {
                        onSelectPrompt(prompt.prompt);
                        onClose();
                      }}
                      className="text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 hover:border-gwi-blue transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-xs text-gwi-blue font-medium mb-1">{prompt.category}</div>
                          <div className="font-medium text-gray-900 group-hover:text-gwi-blue transition-colors">
                            {prompt.title}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">{prompt.description}</div>
                          <div className="text-xs text-gray-400 mt-2 italic">"{prompt.prompt}"</div>
                        </div>
                        <svg className="w-5 h-5 text-gray-300 group-hover:text-gwi-blue transition-colors ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{currentCategory?.name}</h3>
                  <p className="text-sm text-gray-500">{currentCategory?.description}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentCategory?.prompts.map(prompt => (
                    <button
                      key={prompt.id}
                      onClick={() => {
                        onSelectPrompt(prompt.prompt);
                        onClose();
                      }}
                      className="text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 hover:border-gwi-blue transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 group-hover:text-gwi-blue transition-colors">
                            {prompt.title}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">{prompt.description}</div>
                          <div className="text-xs text-gray-400 mt-2 italic">"{prompt.prompt}"</div>
                        </div>
                        <svg className="w-5 h-5 text-gray-300 group-hover:text-gwi-blue transition-colors ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <p className="text-xs text-gray-500 text-center">
            Click any prompt to use it, or customize it in the chat input
          </p>
        </div>
      </div>
    </div>
  );
};

export default PromptLibrary;
