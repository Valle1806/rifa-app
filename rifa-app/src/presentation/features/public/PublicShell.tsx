import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface PublicShellProps {
  title: string;
  homeHref: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Marco común de las páginas públicas (rifa, consulta y "Mis números"). */
export const PublicShell = ({ title, homeHref, actions, children }: PublicShellProps) => (
  <div className="min-h-screen bg-slate-50 pb-28">
    <nav className="bg-white/95 backdrop-blur border-b border-slate-100 sticky top-0 z-30 px-4 sm:px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <Link to={homeHref} className="text-lg font-black text-indigo-700 truncate">
          {title}
        </Link>
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      </div>
    </nav>
    <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-10">{children}</main>
  </div>
);

export const CenteredMessage = ({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center gap-3">
    <div className="text-slate-300">{icon}</div>
    <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
    {children && <div className="text-slate-500 max-w-md">{children}</div>}
  </div>
);
