import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/authentication';

const NAV = [
  { to: '/', label: 'Shows', end: true, adminOnly: false },
  { to: '/skill-files', label: 'Skill Files', end: false, adminOnly: false },
  { to: '/people', label: 'People', end: false, adminOnly: true },
];

/** Chrome shared by every signed-in page: brand, current user, sign out. */
export function AppShell(): React.JSX.Element {
  const { person, signOut } = useAuth();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900">
      <header className="shrink-0 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[96rem] items-center justify-between gap-4 px-6 py-2">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm font-semibold tracking-tight">
              AdSutra
            </Link>

            <nav className="flex items-center gap-3">
              {NAV.filter((item) => !item.adminOnly || person?.role === 'admin').map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `text-xs transition ${
                      isActive
                        ? 'font-medium text-slate-900'
                        : 'text-slate-500 hover:text-slate-900'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {person && (
            <div className="flex items-center gap-2">
              {person.avatarUrl && (
                <img
                  src={person.avatarUrl}
                  alt=""
                  className="h-6 w-6 rounded-full"
                />
              )}

              <div className="hidden text-right sm:block">
                <p className="text-xs leading-tight">
                  {person.name ?? person.email}
                </p>
                <p className="text-[11px] leading-tight text-slate-500">
                  {person.role}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-50"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* No top padding: content starts directly under the header, so a
          full-height page gets every pixel below it. */}
      <main className="mx-auto flex w-full min-h-0 max-w-[96rem] flex-1 flex-col overflow-y-auto px-6 pb-6 pt-0">
        <Outlet />
      </main>
    </div>
  );
}