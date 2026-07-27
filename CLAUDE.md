# Lila — notas del proyecto

Sitio de un artista con dos cuerpos de obra: **poesía** (lo que hay) y **obra
plástica** (fase posterior). Debe sentirse como un objeto editado, no como un blog.
Público general, mayoritariamente móvil, llegando desde redes.

**La obra:** *Pentapoemario lila*, de José Andrés Saldarriaga Medina. Ocho
capítulos, cinco poemas cada uno, cinco versos cada poema. Todos los títulos
empiezan por P — es la restricción de la obra, y el importador la usa como
comprobación.

Estado: **Fases 1 y 5 terminadas** (cimientos y panel de administración).
Pendientes: 2–4, 6 y 7 (ver `Implementacion_inicial.md`).

---

## Stack

| Capa | Elección |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Estilos | Tailwind 4 (tokens) + CSS propio en `src/app/globals.css` |
| Base de datos | Neon (Postgres serverless) |
| ORM | Drizzle + Drizzle Kit |
| Driver | `@neondatabase/serverless` — HTTP en runtime, WebSocket en scripts |
| Autenticación | Auth.js v5, un solo administrador (ADR-004) |
| Almacenamiento | Vercel Blob (ADR-001). Aún sin implementar |
| Tipografías | `next/font`, autoalojadas: Playfair Display + Archivo |

---

## Reglas que no se negocian

1. **Ninguna credencial llega al cliente.** `src/lib/db/*` y `src/lib/datos.ts`
   empiezan por `import 'server-only'`. Ninguna variable lleva `NEXT_PUBLIC_`.
2. **El cuerpo del poema conserva sus saltos.** `\n` entre versos, `\n\n` entre
   estrofas. Ningún proceso normaliza esos espacios.
3. **Los cortes de página caen entre estrofas.** Nunca a mitad de estrofa, nunca a
   mitad de verso. Ver `src/lib/paginar.ts`.
4. **No se genera audio ni imagen en la petición de un visitante.** Se genera una
   vez, se aprueba y se guarda.
5. **Nada de binarios en Postgres.** El esquema guarda URLs.
6. **La legibilidad manda sobre el efecto.** El giro 3D se desactiva con
   `prefers-reduced-motion`, en móvil y en modo Sala.
7. **Cada Server Action del panel comprueba la sesión por su cuenta.** El
   layout solo protege las vistas; una acción es un endpoint propio.
8. **`src/lib/contenido/pentapoemario.ts` es un archivo generado.** No editarlo a
   mano: lo reescribe `npm run contenido:importar`. Para cambiar un poema, el
   panel.

---

## Convenciones

- **Todo en español**: nombres de archivo, variables, funciones, comentarios,
  ramas y mensajes de commit. `traerLibro`, no `getBook`.
- Los comentarios explican **por qué**, no qué. Si el código ya lo dice, sobra.
- Componentes de servidor por defecto. `'use client'` solo cuando hace falta
  estado, efectos o eventos.
- Los componentes cliente **nunca** importan de `src/lib/db/`.

---

## Estructura

```
src/
  app/                      rutas (App Router)
    page.tsx                anaquel
    [libro]/page.tsx        volumen abierto por la portada
    [libro]/[poema]/        pliego concreto — URL propia por poema
    api/buscar/route.ts     búsqueda global
  componentes/
    Anaquel.tsx
    lector/
      Lector.tsx            orquestador: navegación, giro, preferencias
      PaginaPliego.tsx      la página derecha (papel)
      Plancha.tsx           la página izquierda (obra)
      Buscador.tsx          campo + modal de resultados
      useNarracion.ts       Web Speech (provisional, Fase 4 lo sustituye)
  app/panel/                el panel: (privado) exige sesión; entrar/ no
  auth.ts                   Auth.js v5, un solo administrador
  lib/
    db/esquema.ts           ← el esquema Drizzle
    db/consultas.ts         SQL público: SOLO lee lo publicado
    db/panel.ts             SQL del panel: ve borradores y escribe
    categorias.ts           la barra del anaquel, derivada de los datos
    voz/voces.ts            reconoce el género de las voces del sistema
    sitio.ts                nombre y lema del sitio ← cámbialos AQUÍ, en un sitio
    datos.ts                capa que decide Neon o archivo
    paginar.ts              reparto en pliegos ← la pieza delicada
    voz/prosodia.ts         dónde y cuánto se calla ← la pieza diferenciadora
    contenido/pentapoemario.ts   GENERADO — la obra. Semilla y respaldo
scripts/                    extensiones, migrar, semilla, probar, clave, importar
origen/                     los .docx y las portadas originales
docs/                       ADRs y guías
prototipos/                 los HTML de referencia (A, B, E)
```

---

## Las dos piezas que hay que entender antes de tocar

### `lib/paginar.ts`
Reparte un volumen en pliegos, **en el servidor**, de forma determinista. No mide
el DOM: si lo midiera, cada dispositivo cortaría el poema por un sitio distinto y
las URLs por pliego dejarían de significar nada. El precio y las razones, en
ADR-002. Si cambias la tipografía del poema, recalibra `PRESUPUESTO` ahí y en
ningún otro sitio.

### `lib/voz/prosodia.ts`
Decide **qué se dice de una tirada y dónde se calla**. Lo importante es el
**encabalgamiento**: si el verso no cierra con puntuación, la frase sigue en el
siguiente — y entonces los dos versos se unen en UNA SOLA emisión.

No basta con acortar la pausa: cada emisión que recibe el sintetizador se
pronuncia como una oración completa, con su entonación descendente al final.
Diez versos sueltos = diez frases que caen. Por eso se agrupan. La voz solo
corta donde hay puntuación —punto, coma, punto y coma, dos puntos— o al acabar
la estrofa. En esta obra la mayoría de los poemas no llevan puntuación, así que
una estrofa entera suele ser una sola emisión.

Lo usan dos consumidores: el reproductor del navegador (hoy) y el generador de
SSML de la Fase 4. Al compartirlo, la maqueta y el audio final respiran igual.
La cesura del alejandrino solo se marca en SSML: ahí `<break>` va dentro de la
frase, mientras que en Web Speech obligaría a partir la emisión y sonaría peor.

---

## Comandos

```bash
npm run dev              # desarrollo
npm run build            # compilar (pásalo antes de subir nada)
npm run tipos            # solo comprobar tipos

npm run db:probar        # ← esquema + migración + consultas sobre PGlite, sin Neon
npm run db:preparar      # extensiones + migraciones + semilla, en orden
npm run db:generar       # nueva migración tras cambiar el esquema
npm run db:estudio       # visor de datos

npm run panel:clave      # da de alta al administrador
npm run contenido:importar   # relee los .docx de origen/
```

**`npm run db:probar` antes de tocar el esquema.** Levanta un Postgres real en
memoria y aplica la migración de verdad. Ya cazó un `array_to_string` que no era
IMMUTABLE y habría tumbado la primera migración contra Neon.

`db:extensiones` **debe correr antes** de la primera migración: crea la
configuración `spanish_unaccent` de la que depende la columna `poemas.busqueda`.

---

## Sobre el diseño

La base es la **dirección E (Biblioteca)** con la paleta **«Lila»** (propuesta 2
de `propuestas/01-colores-y-estilos.html`): el color que la obra lleva en el
nombre. Anaquel oscuro en violeta, y pliego con la plancha a la izquierda y el
poema sobre papel malva a la derecha.

La portada del sitio es la dirección **«La galería»** (propuesta 2 de
`propuestas/02-portadas.html`): mosaico a sangre con las portadas de capítulo.
Va **encima** del anaquel, no en su lugar — `src/componentes/Portada.tsx`.

Se le han integrado las funcionalidades de las otras dos:

- **De A (Códice):** portada de volumen, índice con puntos guía, colofón, letra
  capital (conmutable) y la textura verjurada del papel.
- **De B (Sala blanca):** el modo **Sala** —galería clara, una columna,
  deslizamiento silencioso—, la barra de progreso y el atenuado de los versos que
  no se están leyendo.

Paleta (no inventar colores nuevos sin motivo):

```
--primario   #F4EEF8   malva claro, el papel
--secundario #2A1B3D   violeta casi negro, la tinta
--terciario  #C9A6E8   lila, resaltado
--neutro     #8A7E99   etiquetas
--fondo      #150C22   la sala violeta
```

**Cuidado con el lila `--terciario`:** sobre el papel da **1.8:1** — no cumple ni
de lejos. Se usa solo como fondo de resaltado y como texto sobre el fondo oscuro
(9.1:1). Para texto acentuado sobre papel va `--tinta-acento` (`#7B3FA8`, 5.9:1).
El cuerpo del poema es `#2A1B3D` sobre `#F4EEF8`: **13.9:1**.

Tipografía: Playfair Display para titulares y poemas (en cursiva), Archivo para
la interfaz en versalitas muy interletradas. **No usar Inter, Roboto ni fuentes
de sistema.**

---

## Qué NO hacer todavía

- La sección de obra plástica (Fase 6).
- Analítica y boletín (Fase 7).
- Cambiar `useNarracion` por un TTS de pago sin pasar por `prosodia.ts`.
