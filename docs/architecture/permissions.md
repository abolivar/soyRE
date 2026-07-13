# Permissions Architecture

## Roles Iniciales Futuros

- `owner`
- `admin`
- `broker`
- `agent`
- `operations`
- `finance`
- `external-agent`
- `readonly`

## Principios

- Los permisos deben evaluarse por organización.
- Los documentos pueden requerir permisos más estrictos que la propiedad.
- Las comisiones deben tener permisos financieros separados.
- La auditoría debe registrar cambios críticos de permisos.

## Backoffice De Plataforma

El backoffice interno de SoyPMS no usa roles de organización como fuente de
verdad. Para alpha, el acceso se controla con la variable de runtime
`PLATFORM_ADMIN_EMAILS`, una lista separada por comas de usuarios autenticados
que pueden operar rutas `/api/platform/*`.

Este acceso permite administrar organizaciones y usuarios desde la perspectiva
del propietario del SaaS. No convierte al usuario en `OWNER` de todas las
organizaciones ni debe usarse para permisos operativos dentro de una
organización cliente.
