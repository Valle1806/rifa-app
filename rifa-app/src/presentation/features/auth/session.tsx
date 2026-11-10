import { LogOut, ShieldAlert } from 'lucide-react';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Session } from '../../../application/ports';
import { useServices } from '../../shared/services';
import { Button } from '../../shared/ui/Button';
import { PageLoader } from '../../shared/ui/Spinner';

type SessionState = { status: 'loading' } | { status: 'ready'; session: Session | null };

const SessionContext = createContext<SessionState>({ status: 'loading' });

/** Solo envuelve las rutas que necesitan sesión, así la vista pública no carga Auth. */
export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const { auth } = useServices();
  const [state, setState] = useState<SessionState>({ status: 'loading' });

  useEffect(() => auth.watchSession((session) => setState({ status: 'ready', session })), [auth]);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSession = (): Session | null => {
  const state = useContext(SessionContext);
  return state.status === 'ready' ? state.session : null;
};

/**
 * Protege rutas de administración. Es solo para la experiencia de uso:
 * la protección real de los datos la hacen las reglas de Firestore.
 */
export const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const state = useContext(SessionContext);
  const location = useLocation();
  const { auth } = useServices();

  if (state.status === 'loading') return <PageLoader />;
  if (!state.session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!state.session.isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center gap-4">
        <ShieldAlert size={56} className="text-rose-400" />
        <h1 className="text-2xl font-bold text-slate-900">Acceso denegado</h1>
        <p className="text-slate-500">Tu cuenta no tiene permisos de administrador.</p>
        <Button onClick={() => auth.signOut()} icon={<LogOut size={18} />}>
          Cerrar sesión
        </Button>
      </div>
    );
  }
  return <>{children}</>;
};
