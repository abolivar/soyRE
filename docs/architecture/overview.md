# Architecture Overview

## Tipo de Arquitectura

Monorepo con monolito modular.

El frontend vive en `apps/web` y el backend en `apps/api`. Los paquetes compartidos viven en `packages/*`.

## Principio Central

El sistema se organiza alrededor del inmueble como producto. Las entidades futuras como propietarios, documentos, mandatos, ofertas, deals y comisiones se relacionan con `property`.

## SaaS Multi-Tenant

El concepto de cliente SaaS será `organization`. Todas las entidades críticas futuras deberán pertenecer a una organización o derivar su acceso desde una organización.

## Límite del Bootstrap

El bootstrap crea la base técnica y documental. No implementa auth, modelos de negocio, endpoints de negocio, workflows ni UI operacional.
