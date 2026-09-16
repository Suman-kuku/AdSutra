import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/authentication';

const NAV = [
  { to: '/', label: 'Shows', end: true },
  { to: '/skill-files', label: 'Skill Files', end: false },
];

/** Chrome shared by every signed-in page: brand, current user, sign out. */
export function AppShell(): React.JSX.Element {
  const { person, signOut } = useAuth();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900">
      <header className="shrink-0 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[96rem] items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-semibold tracking-tight">
              ScriptCraft
            </Link>
            <nav className="flex items-center gap-4">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `text-sm transition ${
                      isActive ? 'font-medium text-slate-900' : 'text-slate-500 hover:text-slate-900'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {person && (
            <div className="flex items-center gap-3">
              {person.avatarUrl && (
                <img src={person.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
              )}
              <div className="hidden text-right sm:block">
                <p className="text-sm leading-tight">{person.name ?? person.email}</p>
                <p className="text-xs leading-tight text-slate-500">{person.role}</p>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full min-h-0 max-w-[96rem] flex-1 flex-col overflow-y-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
