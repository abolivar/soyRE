# Crecimiento Público De SoyPMS

## Propósito

Este documento fija el contrato de posicionamiento, contenido y adquisición de
la superficie pública de SoyPMS. El objetivo no es maximizar visitas
indiscriminadas, sino atraer agencias y equipos inmobiliarios que necesitan
control operativo de su cartera y convertir ese interés en una conversación de
demo trazable.

## Posicionamiento

- Categoría: software de operación inmobiliaria.
- Mercado: Latinoamérica.
- Cliente ideal: owners, brokers, responsables de operaciones y equipos con
  varios agentes y una cartera compartida.
- Diferenciador: SoyPMS toma la continuidad operativa desde la captación hasta
  la comisión sin obligar al equipo a reemplazar su CRM.
- Estado comercial: alpha guiada.

`PMS inmobiliario` pertenece a la marca, pero no se usa como keyword genérica
principal porque puede confundirse con property management y hospitality.

## Arquitectura De Intención

El home responde la intención de categoría `software inmobiliario para agencias
y equipos`. Las páginas públicas profundizan intenciones distintas:

- producto y recorrido operativo;
- mandatos y expedientes;
- comisiones;
- comparación entre CRM y software operativo.

No se crean páginas por país hasta que exista oferta, vocabulario, soporte y
evidencia reales para esa jurisdicción.

## Claims Permitidos

El contenido puede describir comportamiento verificable del producto, su
arquitectura multiusuario, el aislamiento por organización y los recorridos
implementados. Debe declarar cuándo una vista es ilustrativa o cuándo una
capacidad sigue en alpha.

No se publican:

- cifras de ahorro o productividad sin metodología;
- clientes, logos o testimonios sin autorización;
- ratings, precios u ofertas inexistentes;
- cumplimiento legal o regulatorio automático;
- funciones planificadas como si ya estuvieran disponibles.

## Descubribilidad En IA

La estrategia usa contenido visible, semántico, original y consistente con el
producto. Se permiten crawlers de búsqueda y citación, y se bloquean tokens de
entrenamiento conocidos según `docs/architecture/public-site.md`.

No se mantiene `llms.txt` porque no forma parte del contrato de Google Search.

## Métricas

Las métricas primarias son demos recibidas y calificadas, conversión del
formulario, consultas orgánicas relevantes, páginas citadas y Core Web Vitals.
Tráfico bruto o posiciones sin conversión son señales diagnósticas, no objetivos
finales.
