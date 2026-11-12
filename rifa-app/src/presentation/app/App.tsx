import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { Services } from '../../infrastructure/container';
import { RequireAdmin, SessionProvider } from '../features/auth/session';
import { LatestRaffleRedirect } from '../features/public/LatestRaffleRedirect';
import { PublicRafflePage } from '../features/public/PublicRafflePage';
import { ServicesProvider } from '../shared/services';
import { ToastProvider } from '../shared/toast';
import { PageLoader } from '../shared/ui/Spinner';

// Las páginas que no ve el comprador se cargan aparte, para que la rifa pública abra rápido.
const AdminDashboardPage = lazy(() => import('../features/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const LoginPage = lazy(() => import('../features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const MyNumbersPage = lazy(() => import('../features/buyer/MyNumbersPage').then((m) => ({ default: m.MyNumbersPage })));
const WinnerPage = lazy(() => import('../features/public/WinnerPage').then((m) => ({ default: m.WinnerPage })));
const AdvisorSalesPage = lazy(() => import('../features/advisor/AdvisorSalesPage').then((m) => ({ default: m.AdvisorSalesPage })));
const FindMyNumbersPage = lazy(() => import('../features/buyer/FindMyNumbersPage').then((m) => ({ default: m.FindMyNumbersPage })));

const withSession = (page: ReactNode) => <SessionProvider>{page}</SessionProvider>;
const adminOnly = (page: ReactNode) => withSession(<RequireAdmin>{page}</RequireAdmin>);

export const App = ({ services }: { services: Services }) => (
  <ServicesProvider services={services}>
    <ToastProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LatestRaffleRedirect />} />
            <Route path="/r/:raffleId" element={<PublicRafflePage />} />
            <Route path="/r/:raffleId/consultar" element={<FindMyNumbersPage />} />
            <Route path="/r/:raffleId/ganador" element={<WinnerPage />} />
            <Route path="/r/:raffleId/asesor/:advisorId" element={<AdvisorSalesPage />} />
            <Route path="/mis-numeros/:token" element={<MyNumbersPage />} />
            <Route path="/login" element={withSession(<LoginPage />)} />
            <Route path="/admin" element={adminOnly(<AdminDashboardPage />)} />
            <Route path="/admin/:raffleId" element={adminOnly(<AdminDashboardPage />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  </ServicesProvider>
);
