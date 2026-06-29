# API Architecture

## Estilo

REST API preparada para documentación OpenAPI.

## Convenciones

- Rutas en plural.
- Recursos en inglés.
- Validación de input en DTOs.
- Lógica de negocio en services.
- Acceso a datos en repositories o Prisma services.
- Guards y policies para permisos.
- Errores controlados.

## Ruta Técnica Inicial

```txt
/api/health
```

## Rutas Futuras de Ejemplo

```txt
/api/properties
/api/properties/:propertyId/documents
/api/properties/:propertyId/offers
/api/deals
/api/commissions
```
