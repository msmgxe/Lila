# ADR-004 · El panel, la autenticación y la importación desde Word

**Estado:** aceptado · Fase 5
**Guía de uso:** [GUIA-PANEL.md](GUIA-PANEL.md)

---

## Auth.js con un usuario en variables de entorno, y no un proveedor gestionado

El encargo pide «Auth.js (NextAuth) v5 con un único usuario administrador». Se ha
implementado tal cual, y merece justificarse porque el aviso automático de la
plataforma sugiere lo contrario (Clerk, Descope, Auth0).

**Para un solo usuario, un proveedor gestionado es peor negocio:**

- Añade una cuenta más, una factura más y un tercero en la ruta de acceso al
  panel de un sitio de poesía.
- Su valor está en lo que aquí no hace falta: registro, recuperación de clave,
  SSO, organizaciones, multi-inquilino.
- Introduce una dependencia externa para autenticar a una persona que ya es
  dueña del despliegue.

Lo que sí se ha hecho con cuidado, porque es donde este enfoque se puede hacer
mal:

- La clave se guarda como hash **scrypt** (`salt:hash`), nunca en claro.
  `scrypt` es lento a propósito: probar claves a lo bruto sale caro. Viene en
  Node, sin dependencias.
- La comparación usa `timingSafeEqual`. Comparar con `===` filtra cuántos bytes
  coinciden y permite adivinar el hash byte a byte.
- Sesión en JWT firmado con `AUTH_SECRET`, doce horas. El panel no consulta la
  base de datos para saber quién eres.
- Regenerar la clave cambia también `AUTH_SECRET`, así que **invalida todas las
  sesiones abiertas**. Es la palanca de emergencia.

## Las Server Actions se protegen una a una

La decisión de diseño más importante del panel, y la más fácil de equivocar.

`app/panel/(privado)/layout.tsx` redirige a quien no ha entrado — pero **eso solo
protege las vistas**. Una Server Action es un endpoint POST con su propia
dirección: se puede invocar sin pasar por ninguna página y sin ejecutar ningún
layout.

Por eso **cada acción de `acciones.ts` empieza llamando a `exigirSesion()`**.
Confiar en el layout habría dejado abierto el borrado de un volumen.

El grupo de rutas `(privado)` existe además por un motivo práctico: si el muro
estuviera en `app/panel/layout.tsx`, la propia pantalla de entrada quedaría
dentro y habría un bucle de redirección.

## Se separan las consultas públicas de las del panel

`lib/db/consultas.ts` sirve el sitio y **solo lee lo publicado**.
`lib/db/panel.ts` ve también los borradores y escribe.

Están en archivos distintos a propósito: mezclarlos invita a que un
`where publicado = true` se caiga en una refactorización y aparezca en el sitio
un poema que el poeta no había terminado.

## Las categorías se derivan de los datos

`Categoria` era una unión cerrada de TypeScript (`'sonetos' | 'verso libre' | …`)
mientras las categorías estaban escritas a mano. Ahora que el poeta las crea
desde el panel, eso obligaría a tocar el código para añadir una forma nueva.

Se ha abierto a `string`, y la barra lateral del anaquel se construye con
`lib/categorias.ts` a partir de lo que hay publicado. Con una sola categoría el
filtro no aparece, porque no filtraría nada.

---

## La importación desde `.docx`

Los ocho capítulos del *Pentapoemario lila* llegaron como documentos de Word.
`scripts/importar-docx.py` los convierte en el archivo de contenido.

### El título se reconoce por la negrita, no por la posición

Lo evidente sería «la primera línea de cada bloque es el título». No funciona:
los documentos no son homogéneos. En el capítulo 5, Word pegó los títulos al
final del verso anterior sin salto de línea:

```
paisaje pintado dentro de ilusionado corazónPrometedores sueños húmedosEntre contagiosos bostezos…
```

Dentro del XML, en cambio, el título va en `<w:b/>` — en negrita. Eso es una
señal estructural del documento, no una corazonada, y separa los cinco poemas
del capítulo sin ambigüedad.

### Dos trampas que costaron una pasada cada una

1. **Word parte un título en varios `run` seguidos** (el corrector va cortando):
   `('P')` + `('úrpura letanía')`. Abrir un poema nuevo en cada run en negrita se
   comía la primera letra. Un título empieza solo cuando la negrita **arranca**;
   los siguientes se le pegan.

2. **Los `run` que solo contienen un espacio** también van en negrita, y
   descartarlos por estar «vacíos» pegaba las palabras:
   «Platónicaensoñación».

### Por eso el importador se comprueba a sí mismo

En esta obra **todos los títulos empiezan por P** y **todos los poemas tienen
cinco versos**. Son invariantes verificables, y el importador falla ruidosamente
si alguna se rompe. Fue lo que destapó las dos trampas anteriores.

Si algún día llega un capítulo que no las cumple, hay que relajar la
comprobación **a mano y a conciencia** — no quitarla.

### Python, y no TypeScript

Un `.docx` es un ZIP con XML dentro. Python trae `zipfile` en la biblioteca
estándar; Node no lee ZIP sin añadir una dependencia. Como el importador se
ejecuta de uvas a peras y **su salida es un `.ts` que sí se versiona**, el
proyecto no depende de Python para arrancar ni para desplegar.

---

## `npm run db:probar`: probar el esquema sin tocar Neon

Se ha añadido `@electric-sql/pglite` —Postgres compilado a WebAssembly— como
dependencia de desarrollo, y `scripts/probar-esquema.ts` ejecuta contra él las
extensiones, la migración generada por Drizzle y las consultas reales.

**No es un lujo: encontró un error que habría reventado la primera migración.**

La columna generada usaba `array_to_string(temas, ' ')`, y Postgres la rechazaba
con `generation expression is not immutable`. La razón: `array_to_string` es
`STABLE`, no `IMMUTABLE`, porque para un array de cualquier tipo tiene que llamar
a la función de salida del elemento, y esa puede depender de la sesión. La
solución es la misma que ya se usaba con `unaccent`: un envoltorio acotado a
`text[]`, `public.f_unir`, marcado `IMMUTABLE`.

De la misma tanda salió un segundo ajuste, este medido en vez de supuesto: el
respaldo por erratas usaba `similarity()`, que compara las cadenas **enteras**.
«cancon» contra «Canción de prueba» da 0.25 y nunca saltaba, porque el título es
mucho más largo que la consulta. `word_similarity()` da 0.571. Y el umbral va
escrito en la consulta en lugar de usar el operador `<%`, porque ese operador lee
`pg_trgm.word_similarity_threshold` —estado de sesión— y con el driver HTTP de
Neon cada consulta es una petición independiente donde ese ajuste no sobrevive.

PGlite no es Neon y no sustituye a probar en una rama, pero coge los fallos de
SQL cuando aún no cuestan nada.

---

## Lo que el panel todavía NO hace

Honestamente delimitado:

- **No genera audio.** La Fase 4 necesita una clave de un proveedor de TTS. Lo
  que sí está es toda la prosodia (`lib/voz/prosodia.ts`) y la vista previa del
  SSML con su huella, de modo que conectar el proveedor sea añadir una
  implementación de la interfaz y nada más.
- **No genera imágenes** ni sube archivos a Vercel Blob. Las planchas se
  referencian por ruta o dirección. La subida llega con `BLOB_READ_WRITE_TOKEN`.
- **No tiene editor visual del cuerpo del poema.** Es un área de texto a
  propósito: cualquier editor enriquecido acabaría normalizando espacios o
  metiendo `<p>`, y la regla que no se negocia es que los saltos del poema se
  conservan tal cual.
- **Las operaciones de escritura no se han ejecutado contra Neon**, porque en
  este entorno no hay ninguna base de datos disponible. Lo que sí está
  verificado: el esquema y las consultas contra Postgres real (PGlite), y el
  flujo de sesión completo en el navegador.
