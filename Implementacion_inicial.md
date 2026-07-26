#  CLAUDE CODE — Proyecto "Pepe"

> Sustituye a la versión 1. Cambios principales: **la base de datos pasa de Supabase a
> Neon.tech**, con todo lo que eso arrastra (almacenamiento, autenticación y acceso a
> datos), y se añade la **dirección visual E**, que es la que se está tomando como base.
>
> Estado: los prototipos de Fase 0 ya existen (A, B, C, D, E). El trabajo empieza en la
> Fase 1 sobre la dirección elegida.

---

## 0. Configuración previa

1. **Skills**
   - `frontend-design` — obligatoria para toda la capa visual.
   - `theme-factory` — para derivar los tokens del prototipo ganador.
   - `web-artifacts-builder` — solo si aparecen vistas multi-componente complejas.

2. **Subagentes** (`.claude/agents/`)
   | Subagente | Responsabilidad |
   |---|---|
   | `arquitecto` | Esquema Drizzle, migraciones, rutas, ADRs cortos |
   | `disenador-ui` | Sistema visual y componentes. Usa `frontend-design` |
   | `motor-libro` | Pliego, pase de página, responsive, teclado, táctil |
   | `buscador` | Búsqueda full-text en español con `unaccent` y `ts_headline` |
   | `voz` | Pipeline poema → SSML → TTS → caché en almacenamiento de objetos |
   | `qa-a11y` | Accesibilidad, `prefers-reduced-motion`, contraste, Lighthouse |

3. **MCP**: el de Neon si está disponible; si no, acceso por `psql` / Drizzle Kit.

4. **`CLAUDE.md`** en la raíz: stack, convenciones en español, estructura de carpetas,
   y la regla de que **ninguna credencial de base de datos puede llegar al cliente**.

---

## 1. Contexto

Sitio de un artista con dos cuerpos de obra:

- **Poesía** — se implementa primero. Es el foco de este prompt.
- **Obra plástica / exposiciones** — fase posterior. La arquitectura debe dejarle sitio,
  y de hecho la dirección E ya la integra: cada poema se muestra junto a su *plancha*.

Público general, mayoritariamente móvil, llegando desde redes. Debe sentirse como un
objeto editado, no como un blog.

---

## 2. Stack

| Capa | Elección | Nota |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | desplegado en Vercel |
| Estilos | **Tailwind** + tokens CSS del prototipo | |
| Base de datos | **Neon.tech (Postgres serverless)** | |
| ORM / migraciones | **Drizzle ORM + Drizzle Kit** | encaja mejor que Prisma con el driver serverless |
| Driver | `@neondatabase/serverless` | HTTP para lecturas sueltas; WebSocket para transacciones |
| Autenticación | **Auth.js (NextAuth) v5** con un único usuario administrador | Neon no trae auth |
| Almacenamiento | **Vercel Blob** (alternativa: Cloudflare R2) | Neon no trae almacenamiento de objetos |
| Pase de página | evaluar `react-pageflip` vs. implementación propia con CSS 3D | documentar en un ADR |
| Fuentes | `next/font`, autoalojadas | |

### 2.1 Lo que cambia respecto a Supabase — leer antes de empezar

Esto no es un cambio de cadena de conexión. Hay cuatro consecuencias reales:

1. **No hay almacenamiento de objetos.** Los audios de las lecturas y las imágenes de las
   planchas necesitan un servicio aparte: **Vercel Blob** por proximidad al despliegue, o
   Cloudflare R2 si el volumen crece (sin coste de salida). El esquema guarda **URLs**,
   nunca binarios en Postgres.
2. **No hay autenticación integrada ni RLS.** Con Supabase, el navegador hablaba con la
   base de datos y las políticas RLS protegían las filas. Con Neon **todo el acceso a
   datos ocurre en el servidor** (Server Components y Route Handlers) y `DATABASE_URL`
   jamás se expone al cliente. Es más simple y más seguro, pero implica que no existe un
   cliente de datos en el navegador: si un componente necesita datos, o los recibe por
   props desde un Server Component o pasa por una Route Handler.
3. **No hay API REST autogenerada.** Cada endpoint que haga falta se escribe a mano. Para
   este proyecto son pocos: publicar poema, generar audio, generar imagen, buscar.
4. **Scale-to-zero.** Neon suspende la base de datos cuando no hay tráfico, así que la
   primera consulta tras un periodo inactivo tarda unos cientos de milisegundos. Para un
   sitio de poesía es irrelevante **si el contenido se sirve estático**: generar las
   páginas con SSG/ISR y revalidar solo al publicar. La base de datos casi no se toca en
   lectura pública. Aprovechar esto es la decisión de rendimiento más importante del
   proyecto.

### 2.2 Detalles de Neon que hay que usar bien

- **Dos cadenas de conexión**: usar siempre la **agrupada** (`...-pooler...`) desde
  funciones serverless. La directa solo para migraciones y scripts.
- **Extensiones**: habilitar `unaccent` (búsqueda sin acentos) y `pg_trgm` (tolerancia a
  erratas). Ambas están disponibles.
- **Ramas (branching)**: activar la integración Neon–Vercel para que cada *preview
  deployment* tenga su propia rama de base de datos con una copia de los datos. Es la
  ventaja grande frente a Supabase; usarla para probar migraciones sin miedo.
- **Variables de entorno**: `DATABASE_URL` (agrupada), `DATABASE_URL_UNPOOLED` (directa),
  `BLOB_READ_WRITE_TOKEN`, `AUTH_SECRET`, y las claves del proveedor de TTS e imagen.
  Todas server-side; ninguna con prefijo `NEXT_PUBLIC_`.

---

## 3. Modelo de datos

Definir con Drizzle. Borrador que el `arquitecto` afina:

```
libros
  id, slug, volumen, titulo, subtitulo, descripcion, categoria,
  orden, color_acento, portada_url, anio, publicado, pagina_base

poemas
  id, libro_id, slug, titulo, cuerpo, forma, dedicatoria, nota_autor,
  anio, orden, temas (text[]), publicado,
  busqueda (tsvector generado)

planchas                       -- la obra plástica que acompaña al poema
  id, poema_id, numero, titulo, tecnica, url, prompt_generacion, orden

audios
  id, poema_id, voz ('masculina'|'femenina'), proveedor,
  url, duracion_ms, ssml_hash, creado_en

registro                       -- auditoría de publicaciones y generaciones
  id, entidad, entidad_id, accion, detalle_json, creado_en
```

Puntos que no se negocian:

- El **cuerpo del poema conserva saltos de línea y estrofas** (`\n` entre versos, `\n\n`
  entre estrofas). Ningún proceso puede normalizar esos espacios.
- Columna generada para búsqueda:
  ```sql
  to_tsvector('spanish', unaccent(titulo || ' ' || cuerpo || ' ' || array_to_string(temas,' ')))
  ```
  con índice GIN. `unaccent` debe estar marcada como `IMMUTABLE` en el wrapper para poder
  usarla en una columna generada; si da problemas, usar un trigger `BEFORE INSERT/UPDATE`.
- `ssml_hash` permite detectar cuándo hay que regenerar el audio.
- `pagina_base` es el número de página con el que arranca cada volumen, para que la
  numeración se vea continua entre libros.

---

## 4. Funcionalidades

### 4.1 Anaquel (pantalla previa a los libros)
Es la puerta de entrada, no un detalle: **primero se ven los volúmenes, luego se abre uno**.

- Barra lateral con las **categorías** (todos, sonetos, verso libre, breves, borradores)
  que filtran la estantería.
- Rejilla de portadas de volumen con número, título, autor y número de poemas.
- Tarjetas inferiores: nueva incorporación, sala de lectura, recital.
- Rutas: `/` (anaquel), `/[libro-slug]` (volumen abierto por el índice),
  `/[libro-slug]/[poema-slug]` (pliego concreto).

### 4.2 El pliego
- Página izquierda: **la plancha** (obra asociada) con su cartela — número, título,
  técnica. Página derecha: **el poema** sobre papel crema.
- Pase de página animado sobre la hoja derecha; la plancha cambia con un fundido.
- Navegación: flechas del teclado, arrastre táctil, botones ‹ ›, `Home` / `End`.
- En móvil el pliego se apila: plancha arriba, poema debajo, y el giro 3D se desactiva.
- Los poemas largos ocupan varios pliegos, **cortando siempre entre estrofas**.
- Cada pliego tiene URL propia, con metadatos y tarjeta OG generada por poema.

### 4.3 Índice
- Cajón lateral con los poemas del volumen y su número de página; marca el actual.
- Índice global de temas que cruza volúmenes.

### 4.4 Búsqueda
- Global sobre toda la obra, con atajo `/`.
- Insensible a acentos y mayúsculas, con fragmento y término resaltado (`ts_headline`).
- Resultados agrupados por volumen; al elegir uno, abre el volumen en ese pliego.

### 4.5 Audio
Función diferenciadora. Requisitos:

- Conmutador **M / F** en la barra superior, persistido en `localStorage`.
- Controles en la barra inferior: narrar/detener y tempo (0.9× / 1× / 1.1×).
- Resaltado del verso que se está leyendo.
- **Respeto de la forma métrica.** El pipeline convierte el poema a SSML aplicando:
  - pausa corta al final de verso (≈250–350 ms);
  - pausa larga entre estrofas (≈700–900 ms);
  - **sin pausa en los encabalgamientos** — cuando el verso no cierra con puntuación y la
    frase continúa en el siguiente. Es lo que separa una lectura de poesía de una lectura
    de lista de la compra. Ante la duda, pausa mínima;
  - cesura breve en versos largos (alejandrinos 7+7);
  - el título se lee y va seguido de una pausa larga;
  - **la dedicatoria y las notas del autor no se leen.**
- Marcas manuales opcionales en el texto para que el poeta ajuste a mano (`/` pausa breve,
  `//` pausa larga), invisibles en el render.
- **Proveedor de TTS** — evaluar y recomendar:
  - *ElevenLabs*: mejor prosodia en español, la más cara, control fino.
  - *Google Cloud TTS*: SSML completo (`<break>`, `<prosody>`), barata, predecible.
  - *OpenAI TTS*: voz natural, control de pausas limitado.
  - *Web Speech API*: solo prototipos; calidad insuficiente para producción.
  Encapsular tras una interfaz `ProveedorTTS` para poder cambiarlo sin tocar el resto.
- **El audio se genera una vez y se guarda** en Vercel Blob por (poema, voz), con la URL
  en la tabla `audios`. Generación desde el panel de administración, con escucha y
  aprobación del artista antes de publicar. Nunca en la petición del visitante.

### 4.6 Planchas e imágenes
- Cada poema puede llevar una o varias planchas: obra real del artista subida a mano, o
  imagen generada.
- Si es generada: desde el panel se propone un prompt derivado del poema más un estilo
  base fijo por volumen (para que la serie sea coherente), se generan 3–4 variantes, el
  artista elige, y se guarda con el prompt usado en `prompt_generacion`.
- Evaluar Replicate (FLUX), Google Imagen o gpt-image, con costes por imagen.
- Nunca generar en tiempo real desde la vista pública.

---

## 5. Direcciones visuales disponibles

Los cinco prototipos existen como HTML autocontenidos:

| | Dirección | Rasgo |
|---|---|---|
| A | Códice | libro antiguo, papel verjurado, giro 3D a doble página |
| B | Sala blanca | minimalismo de galería, deslizamiento silencioso |
| C | Nocturno | oscuro y cinematográfico, el audio como protagonista |
| D | Manuscrito vivo | cuaderno del poeta, texturas y notas al margen |
| **E** | **Biblioteca** | **anaquel oscuro + pliego con plancha a la izquierda y poema a la derecha** |

**La dirección E es la base de trabajo.** Su sistema visual:

```css
--primario:   #F5F5F0;   /* crema: el papel de la página derecha */
--secundario: #2D1B1B;   /* marrón casi negro: la tinta */
--terciario:  #FDF2F3;   /* rosa pálido: acento cálido, resaltados */
--neutro:     #787776;   /* etiquetas y metadatos */
--fondo:      #0E0C0C;   /* la sala oscura alrededor del libro */
```

- **Titulares y poemas**: Playfair Display (los poemas en cursiva, como en la referencia).
- **Interfaz**: una grotesca de carácter para etiquetas en versalitas con mucho
  interletraje. **No usar Inter, Roboto ni fuentes de sistema**; en el prototipo se usó
  Archivo, y cualquier alternativa con personalidad es válida.
- El contraste crema sobre marrón oscuro cumple AA con holgura; **verificar el rosa pálido
  sobre crema**, que es el punto débil de la paleta.

---

## 6. Fases

1. **Fase 1 — Cimientos.** Proyecto Next.js, Neon con las dos cadenas de conexión,
   esquema Drizzle, primera migración, seed con los poemas de muestra, integración
   Neon–Vercel con ramas por preview. Anaquel y pliego funcionando con datos reales.
2. **Fase 2 — Lectura.** Motor de pliego definitivo, índice, rutas por poema, SSG/ISR,
   metadatos y tarjetas OG.
3. **Fase 3 — Búsqueda.** `unaccent`, `pg_trgm`, `ts_headline`, índice GIN, panel de
   resultados.
4. **Fase 4 — Voz.** SSML con la lógica de encabalgamiento, proveedor TTS, caché en Blob,
   reproductor integrado en la barra inferior.
5. **Fase 5 — Panel.** Auth.js con un solo administrador: alta y edición de poemas,
   generación y aprobación de audios y planchas, publicación con revalidación.
6. **Fase 6 — Obra plástica.** Sección de exposiciones reutilizando el sistema visual y la
   tabla `planchas`.
7. **Fase 7 — Cierre.** Analítica, compartir tarjeta del poema, boletín.

---

## 7. Criterios de aceptación de la Fase 1

- [ ] `DATABASE_URL` nunca aparece en un bundle de cliente (verificarlo, no suponerlo).
- [ ] Las migraciones corren en una rama de Neon antes que en la principal.
- [ ] El anaquel filtra por categoría y abre cualquier volumen.
- [ ] El pliego muestra plancha y poema, y pasa páginas con teclado, ratón y dedo.
- [ ] Ningún verso se parte por la mitad al maquetar; los cortes caen entre estrofas.
- [ ] En móvil (390 px) el poema se lee sin zoom ni desplazamiento horizontal.
- [ ] `prefers-reduced-motion` desactiva el giro.
- [ ] Contraste AA en el cuerpo del poema.

---

## 8. Qué no hacer

- No exponer la base de datos al navegador ni recrear un cliente de datos en el cliente.
- No generar audio ni imágenes en tiempo real desde la vista pública.
- No guardar binarios en Postgres.
- No sacrificar la legibilidad por el efecto de giro.
- No construir todavía el panel de administración ni la sección de obra plástica.
- No atribuir poemas a poetas reales: textos propios, de dominio público, o marcados
  claramente como muestra.

---

**Empezar por la Fase 1. Antes de escribir código, entregar: (a) el esquema Drizzle
completo, (b) la decisión sobre almacenamiento —Vercel Blob o R2— con su razón, y (c) el
ADR del motor de pase de página. Esperar confirmación antes de migrar.**