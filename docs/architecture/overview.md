# Architecture Overview

## Tipo de Arquitectura

Monorepo con monolito modular.

El frontend vive en `apps/web` y el backend en `apps/api`. Los paquetes compartidos viven en `packages/*`.

## Principio Central

El sistema se organiza alrededor del inmueble como producto. Las entidades futuras como propietarios, documentos, mandatos, ofertas, deals y comisiones se relacionan con `property`.

## SaaS Multi-Tenant

El concepto de cliente SaaS será `organization`. Todas las entidades críticas futuras deberán pertenecer a una organización o derivar su acceso desde una organización.

## Estado Actual

El bootstrap técnico y documental ya existe.

La base inicial de identidad también existe: registro de owner/organización, login/logout, sesión por cookie httpOnly, memberships, validación de usuarios y auditoría base.

Los módulos de negocio inmobiliario todavía deben implementarse encima de esa base, respetando organización, roles, permisos y auditoría.
