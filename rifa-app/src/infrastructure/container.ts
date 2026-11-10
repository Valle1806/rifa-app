import { createAdminUseCases, createBuyerUseCases, type Dependencies } from '../application/useCases';
import { secureRandom } from './browser/secureRandom';
import { cloudinaryStorage } from './cloudinary/imageStorage';
import { authGateway } from './firebase/authGateway';
import { createLegacyMigrator } from './firebase/legacyMigrator';
import { createOrderRepository } from './firebase/orderRepository';
import { raffleRepository } from './firebase/raffleRepository';
import { accessRepository, auditRepository, boardRepository } from './firebase/readRepositories';
import { createSubmissionRepository } from './firebase/submissionRepository';

/** Raíz de composición: el único lugar que conoce las implementaciones concretas. */
const dependencies: Dependencies = {
  auth: authGateway,
  raffles: raffleRepository,
  board: boardRepository,
  orders: createOrderRepository(secureRandom),
  submissions: createSubmissionRepository(secureRandom),
  access: accessRepository,
  audit: auditRepository,
  legacy: createLegacyMigrator(secureRandom),
  images: cloudinaryStorage,
  random: secureRandom,
};

export const services = {
  ...dependencies,
  buyer: createBuyerUseCases(dependencies),
  admin: createAdminUseCases(dependencies),
};

export type Services = typeof services;
