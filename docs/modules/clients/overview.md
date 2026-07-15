# Módulo De Clientes

## Propósito

Clientes mantiene el registro central de personas y empresas que participan en
la operación inmobiliaria. Un cliente puede tener varios roles comerciales sin
duplicar su identidad: comprador, vendedor, arrendador, arrendatario,
inversionista, lead, referidor o contacto relacionado.

El cliente no reemplaza a `organization`, que sigue siendo la frontera SaaS, ni
convierte SoyPMS en un CRM genérico.

## Alta De Personas

El alta completa y la creación rápida desde el wizard de negocios deben aceptar:

- Entrada manual.
- Pasaporte mediante imagen y lectura MRZ TD3.
- Cédula de Colombia.
- Cédula de Panamá.

Colombia y Panamá son los únicos países habilitados inicialmente para cédula y
deben mostrarse en ese orden. El parser conserva el país emisor y aplica reglas
de número específicas:

- Colombia: número de ciudadanía de 6 a 10 dígitos, normalizado sin puntos ni
  separadores.
- Panamá: número con formato nacional y prefijos válidos cuando correspondan.

Los datos detectados son una precarga editable. La persona que registra debe
revisar nombre, apellido y número antes de guardar. La lectura local de imagen
no constituye KYC ni validación oficial de identidad.

## Documentos De Identidad

El documento se guarda junto con el cliente y queda aislado por organización.
El registro conserva tipo, número, país emisor, archivo, texto OCR y metadatos
del parser. La descarga exige sesión, pertenencia activa y permisos del servidor.

El almacenamiento binario actual en PostgreSQL es transitorio. La migración a
Storage privado y su política de retención se siguen mediante el issue de deuda
técnica #11.

## Creación Rápida En Negocios

La creación rápida debe persistir primero el cliente y su documento y después
agregarlo como participante del borrador. Para alquiler, el rol del cliente es
`LESSEE`; para venta y otras operaciones de adquisición, `BUYER` salvo selección
posterior del usuario.

El flujo no puede crear una persona anónima dentro del negocio ni mantener una
copia separada que no exista en Clientes.

## Permisos Y Auditoría

- Solo roles con escritura de clientes pueden crear registros.
- Toda consulta y alta se limita a la organización activa.
- La creación y descarga de documentos deja auditoría.
- Nunca se confía en la selección o validación visual como control de acceso.
