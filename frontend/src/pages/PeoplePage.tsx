import { useState } from 'react';
import { ActivePeopleTab, WaitlistTab, useWaitlistCount } from '../features/people';
import { TeamsTab } from '../features/teams';

type Tab = 'active' | 'waitlist' | 'team';

/**
 * Admin-only. Three tabs: who has access today, who is asking for it, and how
 * people are grouped. Login activity and invite links are separate features and
 * are not stubbed here.
 */
export function PeoplePage(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('active');
  const waitlistCount = useWaitlistCount();

  const tabs: { id: Tab; label: string; badge: number | null }[] = [
    { id: 'active', label: 'Active people', badge: null },
    { id: 'waitlist', label: 'Waitlist', badge: waitlistCount },
    { id: 'team', label: 'Team', badge: null },
  ];

  return (
    <div className="flex flex-col gap-5 py-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">People</h1>
      </header>

      <div className="flex gap-6 border-b border-slate-200">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? 'page' : undefined}
            className={`-mb-px flex items-center gap-2 border-b-2 pb-2 text-sm transition ${
              tab === item.id
                ? 'border-slate-900 font-medium text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {item.label}
            {item.badge !== null && item.badge > 0 && (
              <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'active' && <ActivePeopleTab />}
      {tab === 'waitlist' && <WaitlistTab />}
      {tab === 'team' && <TeamsTab />}
    </div>
  );
}
