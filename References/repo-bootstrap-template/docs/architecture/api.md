# API Architecture

## Estilo

REST API con documentación OpenAPI.

## Convenciones

- Rutas en plural.
- Recursos en inglés.
- Validación de input en DTOs.
- Lógica de negocio en services.
- Acceso a datos en repositories o Prisma services.
- Guards/policies para permisos.
- Errores controlados.

## Rutas futuras ejemplo

```txt
/api/properties
/api/properties/:propertyId/documents
/api/properties/:propertyId/offers
/api/deals
/api/commissions
```
