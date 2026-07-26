# Aurelia — notas del proyecto

Sitio de un artista con dos cuerpos de obra: **poesía** (lo que hay) y **obra
plástica** (fase posterior). Debe sentirse como un objeto editado, no como un blog.
Público general, mayoritariamente móvil, llegando desde redes.

Estado: **Fase 1 terminada**. Fases 2–7 pendientes (ver `Implementacion_inicial.md`).

---

## Stack

| Capa | Elección |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Estilos | Tailwind 4 (tokens) + CSS propio en `src/app/globals.css` |
| Base de datos | Neon (Postgres serverless) |
| ORM | Drizzle + Drizzle Kit |
| Driver | `@neondatabase/serverless` — HTTP en runtime, WebSocket en scripts |
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
7. **Los poemas no se atribuyen a poetas reales.** Textos propios, de dominio
   público, o marcados como muestra.

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
  lib/
    db/esquema.ts           ← el esquema Drizzle
    db/consultas.ts         SQL: lectura y búsqueda
    datos.ts                capa que decide Neon o muestra
    paginar.ts              reparto en pliegos ← la pieza delicada
    voz/prosodia.ts         dónde y cuánto se calla ← la pieza diferenciadora
    contenido/muestra.ts    semilla y respaldo
scripts/                    extensiones, migrar, semilla
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
Decide las pausas. Lo importante es el **encabalgamiento**: si el verso no cierra
con puntuación, la frase sigue en el siguiente y ahí casi no se para. Es lo que
separa una lectura de poesía de una lectura de la lista de la compra. Ante la
duda, pausa mínima.

Lo usan dos consumidores: el reproductor del navegador (hoy) y el generador de
SSML de la Fase 4. Al compartirlo, la maqueta y el audio final respiran igual.

---

## Comandos

```bash
npm run dev              # desarrollo
npm run build            # compilar (pásalo antes de subir nada)
npm run tipos            # solo comprobar tipos

npm run db:preparar      # extensiones + migraciones + semilla, en orden
npm run db:generar       # nueva migración tras cambiar el esquema
npm run db:estudio       # visor de datos
```

`db:extensiones` **debe correr antes** de la primera migración: crea la
configuración `spanish_unaccent` de la que depende la columna `poemas.busqueda`.

---

## Sobre el diseño

La base es la **dirección E (Biblioteca)**: anaquel oscuro, y pliego con la
plancha a la izquierda y el poema sobre papel crema a la derecha.

Se le han integrado las funcionalidades de las otras dos:

- **De A (Códice):** portada de volumen, índice con puntos guía, colofón, letra
  capital (conmutable) y la textura verjurada del papel.
- **De B (Sala blanca):** el modo **Sala** —galería clara, una columna,
  deslizamiento silencioso—, la barra de progreso y el atenuado de los versos que
  no se están leyendo.

Paleta (no inventar colores nuevos sin motivo):

```
--primario   #F5F5F0   crema, el papel
--secundario #2D1B1B   marrón casi negro, la tinta
--terciario  #FDF2F3   rosa pálido, acento cálido
--neutro     #787776   etiquetas
--fondo      #0E0C0C   la sala oscura
```

**Cuidado con el rosa `--terciario`:** sobre crema **no cumple contraste como
texto**. Se usa solo como fondo de resaltado. Para texto acentuado sobre papel va
`--tinta-acento` (`#8A3D33`), que sí cumple AA.

Tipografía: Playfair Display para titulares y poemas (en cursiva), Archivo para
la interfaz en versalitas muy interletradas. **No usar Inter, Roboto ni fuentes
de sistema.**

---

## Qué NO hacer todavía

- El panel de administración (Fase 5).
- La sección de obra plástica (Fase 6).
- Analítica y boletín (Fase 7).
- Cambiar `useNarracion` por un TTS de pago sin pasar por `prosodia.ts`.
