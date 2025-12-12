import React from 'react';
import type { SuggestedAction } from '../../lib/types';

interface SuggestedActionsProps {
  actions: SuggestedAction[];
  onActionClick: (prompt: string) => void;
}

// Icon components
const icons: Record<string, React.FC<{ className?: string }>> = {
  chart: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  target: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  compare: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  export: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  filter: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  trend: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
};

const DefaultIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

export const SuggestedActions: React.FC<SuggestedActionsProps> = ({
  actions,
  onActionClick,
}) => {
  if (!actions || actions.length === 0) return null;

  // Group actions by category
  const groupedActions = actions.reduce((acc, action) => {
    const category = action.category || 'analysis';
    if (!acc[category]) acc[category] = [];
    acc[category].push(action);
    return acc;
  }, {} as Record<string, SuggestedAction[]>);

  const categoryLabels: Record<string, string> = {
    analysis: 'Explore Further',
    visualization: 'Visualize',
    export: 'Export',
    'drill-down': 'Drill Down',
  };

  const categoryOrder = ['analysis', 'drill-down', 'visualization', 'export'];

  return (
    <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-700">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
        What would you like to do next?
      </p>

      <div className="space-y-4">
        {categoryOrder.map(category => {
          const categoryActions = groupedActions[category];
          if (!categoryActions || categoryActions.length === 0) return null;

          return (
            <div key={category}>
              {Object.keys(groupedActions).length > 1 && (
                <p className="text-2xs font-medium text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
                  {categoryLabels[category] || category}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {categoryActions.map((action) => {
                  const IconComponent = action.icon ? icons[action.icon] : DefaultIcon;

                  return (
                    <button
                      key={action.id}
                      onClick={() => onActionClick(action.prompt)}
                      className="group inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:border-primary-300 dark:hover:border-primary-600 hover:text-primary-700 dark:hover:text-primary-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
                      title={action.description}
                    >
                      {IconComponent && (
                        <IconComponent className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors" />
                      )}
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuggestedActions;
