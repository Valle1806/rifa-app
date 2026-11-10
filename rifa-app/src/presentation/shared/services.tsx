import { createContext, useContext, type ReactNode } from 'react';
import type { Services } from '../../infrastructure/container';

const ServicesContext = createContext<Services | null>(null);

/** Inyecta las dependencias; en pruebas se puede pasar un doble. */
export const ServicesProvider = ({ services, children }: { services: Services; children: ReactNode }) => (
  <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
);

// eslint-disable-next-line react-refresh/only-export-components
export const useServices = (): Services => {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error('useServices debe usarse dentro de <ServicesProvider>');
  return ctx;
};
