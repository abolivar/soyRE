# Properties Module

Modulo central para el registro maestro de propiedades en SoyPMS.

La propiedad representa el activo inmobiliario sobre el que despues se conectan
mandatos, publicaciones, visitas, ofertas, tareas, documentos, procesos de venta,
procesos de alquiler, comisiones y auditoria. No debe duplicar clientes ni
convertirse en un CRM paralelo: propietarios, compradores, arrendadores e
inquilinos viven en el modulo de clientes y se relacionan desde la propiedad.

## Alcance Inicial

- Listar propiedades de la organizacion activa.
- Crear una propiedad con ficha operativa suficiente para venta, alquiler o ambos.
- Consultar detalle de una propiedad.
- Retirar una propiedad del inventario activo sin hard delete.
- Asociar opcionalmente un cliente existente como propietario principal.
- Asignar un responsable interno activo de la organizacion.
- Registrar auditoria de creacion y retiro.

## Multi-Tenancy

- Toda propiedad pertenece a una `organization`.
- Toda consulta debe estar filtrada por `organization_id`.
- `assigned_user_id` debe apuntar a un usuario con membership activa dentro de la
  misma organizacion.
- `owner_client_id`, cuando exista, debe apuntar a un cliente de la misma
  organizacion.

## Permisos

Lectura:

- `OWNER`
- `ADMIN`
- `BROKER`
- `AGENT`
- `OPERATIONS`
- `FINANCE`
- `EXTERNAL_AGENT`
- `READONLY`

Escritura y retiro:

- `OWNER`
- `ADMIN`
- `BROKER`
- `AGENT`
- `OPERATIONS`

Los roles financieros pueden ver propiedades para contexto, pero no crear ni
retirar inventario en esta fase.

## Estados

`PropertyStatus`:

- `DRAFT`: ficha inicial, no lista para publicacion.
- `ACTIVE`: disponible operativamente.
- `PUBLISHED`: publicada en canales.
- `RESERVED`: separada o en negociacion avanzada.
- `UNDER_CONTRACT`: con contrato o promesa activa.
- `CLOSED`: cerrada por venta/alquiler.
- `WITHDRAWN`: retirada del inventario activo.
- `ARCHIVED`: historica, sin operacion vigente.

Retirar una propiedad cambia el estado a `WITHDRAWN` y registra auditoria. No se
elimina fisicamente.

## Modalidad

`PropertyOperation`:

- `SALE`
- `RENT`

Una propiedad puede tener una o ambas modalidades. Si incluye venta, debe tener
`salePrice`. Si incluye alquiler, debe tener `rentPrice`.

## Campos Requeridos

- Organizacion.
- Responsable asignado.
- Titulo comercial.
- Tipo de propiedad.
- Estado.
- Modalidad.
- Pais.
- Ciudad.
- Zona.
- Moneda.
- Precio correspondiente a cada modalidad activa.

## Campos Operativos Opcionales

- Cliente propietario.
- Direccion.
- Edificio o proyecto.
- Numero de unidad.
- Recamaras.
- Banos.
- Estacionamientos.
- Area construida.
- Area de lote.
- Piso.
- Ano de construccion.
- Fecha de disponibilidad.
- Fee de mantenimiento.
- Deposito de alquiler.
- Condiciones de publicacion.
- Descripcion publica.
- Notas internas.
- Amenidades.
- Tags.
- Fuente de captacion.

## Reglas De Validacion

- Debe existir al menos una modalidad.
- `salePrice` es requerido si la modalidad incluye `SALE`.
- `rentPrice` es requerido si la modalidad incluye `RENT`.
- Los montos y areas no pueden ser negativos.
- El responsable debe estar activo en la organizacion.
- El propietario, si se indica, debe pertenecer a la misma organizacion.
- Una propiedad retirada no debe aparecer como activa si se filtra inventario
  operativo, pero si debe poder consultarse historicamente.

## Auditoria

Registrar al menos:

- `properties.create`
- `properties.withdraw`

La metadata debe incluir titulo, estado, modalidades, responsable y propietario
cuando aplique.
