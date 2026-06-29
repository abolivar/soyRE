# Documento Fundacional Inicial

## Producto

soyRE es una plataforma SaaS para brokers inmobiliarios.

No es un CRM genérico. El producto se organiza alrededor del inmueble como producto operativo, documental, comercial, financiero y transaccional.

## Entidad Central

La entidad central futura será `property`.

El sistema debe permitir entender y operar el ciclo completo de una propiedad:

- Captación.
- Consignación o mandato.
- Validación documental.
- Preparación comercial.
- Publicación.
- Visitas.
- Ofertas.
- Venta o alquiler.
- Cierre.
- Comisiones.
- Archivo.
- Auditoría.

## Cliente SaaS

El cliente SaaS se modelará como `organization`.

`organization` representa la inmobiliaria, broker, equipo o empresa que opera dentro de soyRE. Las entidades críticas futuras deberán pertenecer a una organización o derivar su acceso desde una organización.

## Nota de Alcance

Este documento es una base inicial. Antes de implementar módulos de negocio, debe ampliarse con reglas, estados, permisos, excepciones operativas y prioridades definidas por arquitectura/producto.
