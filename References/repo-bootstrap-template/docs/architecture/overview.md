# Architecture Overview

## Tipo de arquitectura

Monorepo con monolito modular.

El frontend vive en `apps/web` y el backend en `apps/api`. Los paquetes compartidos viven en `packages/*`.

## Principio central

El sistema se organiza alrededor del inmueble como producto. Las entidades futuras como propietarios, documentos, mandatos, ofertas, deals y comisiones se relacionan con `property`.

## SaaS multi-tenant

El concepto de cliente SaaS será `organization`. Todas las entidades críticas futuras deberán pertenecer a una organización o derivar su acceso desde una organización.
