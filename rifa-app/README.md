# RifaMaster

Rifas con selección de números, solicitudes aprobadas por el organizador, pagos por partes con comprobantes y un enlace personal para cada comprador. Funciona completo en el plan gratuito (Spark) de Firebase.

## Flujo

1. El comprador elige uno o varios números y envía una **solicitud**, con o sin comprobante. Los números quedan **en revisión** durante las horas configuradas en la rifa.
2. Recibe un **enlace personal** (`/mis-numeros/<token>`) y un **PIN de 6 dígitos**. Con cualquiera de los dos consulta su estado y sube comprobantes cuando pague, todo o por partes.
3. El admin **aprueba o rechaza** la solicitud desde "Por revisar" y luego **aprueba cada comprobante** confirmando el valor. El estado se calcula solo: reservado → abonado → pagado.
4. El admin también puede **asignar números directamente** (venta en persona), con o sin abono inicial.

En la grilla pública se ve el nombre abreviado ("Carlos P."). En la del panel, el nombre completo y el celular.

## Arquitectura

```
src/
  domain/          Reglas de negocio puras (sin React ni Firebase) + pruebas
  application/     Casos de uso, puertos (interfaces) y esquemas zod compartidos
  infrastructure/  Implementaciones: Firestore, Cloudinary, crypto del navegador
                   container.ts es la raíz de composición
  presentation/
    shared/        UI base, hooks (useWatch, useAsyncAction), toasts, servicios
    features/      public · buyer · auth · admin · raffle · forms
```

Las dependencias apuntan hacia adentro: `presentation → application → domain`. `infrastructure` implementa los puertos de `application`.

### Modelo de datos en Firestore

| Ruta | Quién lee | Quién escribe |
|---|---|---|
| `raffles/{r}` | público | admin |
| `raffles/{r}/public/board` | público (1 lectura por visita) | admin |
| `raffles/{r}/locks/{n}` | público | público (con su solicitud), admin borra |
| `raffles/{r}/orders/{o}` | admin | público crea pendiente, admin el resto |
| `raffles/{r}/submissions/{s}` | admin | público con token válido |
| `raffles/{r}/lookups/{sha256}` | lectura directa | público con su solicitud |
| `raffles/{r}/audit/{a}` | admin | admin, solo crear (inmutable) |
| `access/{token}` | lectura directa | público con su solicitud, admin |

`firestore.rules` valida cada documento público contra los demás del mismo lote atómico.

## Desarrollo

```bash
pnpm install
pnpm dev
```

```bash
pnpm test        # pruebas del dominio
pnpm lint
pnpm build       # typecheck + build
```

Copia `.env.example` a `.env` y completa los valores.

## Puesta en marcha (una sola vez)

1. **Cloudinary**: en el upload preset sin firma, permite solo `jpg, png, webp, heic`, limita el tamaño a 5 MB, desactiva *overwrite* y activa *unique filename*.
2. **App Check** (recomendado): en Firebase → App Check registra la web con Fraud Defense (reCAPTCHA Enterprise; el v3 clásico está obsoleto), pon la clave en `VITE_RECAPTCHA_SITE_KEY` y, después de verificar que todo funciona, activa *Enforce* para Firestore.
3. **Admin**: en Firestore crea `users/<uid>` con `role: "admin"`, donde `<uid>` es tu usuario de Authentication.
4. **Desplegar** reglas y web juntas, porque el código nuevo y las reglas nuevas dependen entre sí:

   ```bash
   pnpm build
   pnpm dlx firebase-tools deploy --only firestore:rules,hosting
   ```

5. **Migrar** cada rifa existente: entra al panel y pulsa **Migrar ahora** en el aviso amarillo. Hasta que lo hagas, la página pública muestra todos los números como disponibles.
