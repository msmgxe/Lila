# ADR-003 · El esquema y la búsqueda en español

**Estado:** aceptado · Fase 1
**Esquema completo:** [`src/lib/db/esquema.ts`](../src/lib/db/esquema.ts)

---

## El poema se guarda en una sola columna de texto

`poemas.cuerpo` es `text`, con `\n` entre versos y `\n\n` entre estrofas.

Se consideró trocearlo en filas (`versos`, `estrofas`) y se descartó:

- El poema es **una unidad tipográfica**. Trocearlo obliga a recomponerlo en cada
  lectura, con un `ORDER BY` que es una promesa frágil.
- Una estrofa de un solo verso y un blanco intencionado dejan de distinguirse.
- La búsqueda full-text necesita el texto entero de todas formas.

**La regla dura:** ningún proceso normaliza esos espacios. La conversión va y
vuelve por `aEstrofas()` / `aCuerpo()` en [`src/lib/texto.ts`](../src/lib/texto.ts),
y no toca el interior del verso.

Las marcas manuales del poeta (`/` pausa breve, `//` pausa larga) viajan dentro
del cuerpo, son invisibles al maquetar y solo las lee el motor de voz.

---

## El problema de `unaccent` en una columna generada

El encargo pide una columna `tsvector` generada con `unaccent`, y avisa de que
puede dar guerra. Da guerra, y esta es la razón exacta:

**`unaccent(text)` es `STABLE`, no `IMMUTABLE`.** Con un solo argumento tiene que
consultar cuál es el diccionario por omisión, y eso depende de la configuración
de la sesión. Postgres solo admite expresiones `IMMUTABLE` en columnas generadas
y en índices, así que rechaza la columna.

El encargo sugiere dos salidas: un envoltorio `IMMUTABLE`, o un *trigger*.
**Se ha tomado una tercera, que es mejor que las dos.**

### La solución: una configuración de búsqueda propia

```sql
CREATE TEXT SEARCH CONFIGURATION public.spanish_unaccent (COPY = pg_catalog.spanish);
ALTER TEXT SEARCH CONFIGURATION public.spanish_unaccent
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, spanish_stem;
```

En lugar de llamar a `unaccent()` sobre el texto, se mete el diccionario
`unaccent` **dentro del pipeline del español**. Después:

```sql
to_tsvector('public.spanish_unaccent', titulo || ' ' || cuerpo || ' ' || …)
```

`to_tsvector(regconfig, text)` **sí es `IMMUTABLE`**, así que la columna generada
funciona sin trucos.

### Por qué esto es mejor que el envoltorio

Aquí está el detalle que decide la cuestión, y no es el rendimiento:

Con un envoltorio `f_unaccent`, para resaltar el fragmento habría que llamar a
`ts_headline('spanish', f_unaccent(cuerpo), …)` — y entonces **el fragmento que se
le enseña al lector sale sin acentos**. «La habia olvidado». Inaceptable en un
sitio de poesía.

Con la configuración propia, `ts_headline` corre sobre el **texto original**:

```sql
ts_headline('public.spanish_unaccent', p.cuerpo, tq, 'StartSel=<mark>, …')
```

La comparación sigue siendo insensible a acentos, porque el diccionario los quita
al analizar — pero **lo que se devuelve es el texto tal cual lo escribió el poeta**,
con sus tildes y su puntuación.

El envoltorio `f_unaccent` se crea igualmente, porque los índices de trigramas
(`pg_trgm`) sí lo necesitan.

---

## La búsqueda, capa por capa

En [`src/lib/db/consultas.ts`](../src/lib/db/consultas.ts):

1. **`websearch_to_tsquery`** en vez de `plainto_tsquery`: acepta la sintaxis que
   la gente ya conoce de cualquier buscador — comillas para frase exacta, `-` para
   excluir, `OR`.
2. **Índice GIN** sobre `poemas.busqueda`. Instantáneo aunque haya miles de poemas.
3. **Respaldo por trigramas.** Si no hay coincidencia full-text, el operador `%`
   de `pg_trgm` sobre el título salva las erratas: «inventaio» encuentra
   «inventario». Puntúa la mitad, para que nunca gane a una coincidencia real.
4. **`ts_headline`** para el fragmento, con `<mark>` alrededor del término.

## Sin base de datos, la búsqueda sigue funcionando

[`src/lib/datos.ts`](../src/lib/datos.ts) implementa la **misma forma de
resultado** en memoria sobre el contenido de muestra. No es un juguete: permite
revisar el sitio entero antes de montar Neon, y hace que `next build` no dependa
de que la base de datos esté despierta.

Las dos ramas devuelven `ResultadoBusqueda[]` idéntico, así que la interfaz no
sabe —ni le importa— de dónde vienen los datos.

---

## Dónde vive el acceso a datos

**Todo en el servidor. Sin excepciones.**

- `src/lib/db/cliente.ts` y `consultas.ts` empiezan por `import 'server-only'`.
  Si alguien los importa desde un componente cliente, **la compilación falla**.
  No es una convención que haya que recordar: es una barrera.
- Los componentes cliente (`Lector`, `Anaquel`, `Buscador`) reciben datos ya
  resueltos por props, o pasan por `/api/buscar`.
- `DATABASE_URL` no lleva `NEXT_PUBLIC_`, así que Next nunca la mete en un bundle.

**Verificado, no supuesto:**

```bash
npm run build
grep -r "postgresql://" .next/static/ ; echo "salida vacía = correcto"
```

## Las dos cadenas de conexión

- **Agrupada** (`-pooler`) → la aplicación, siempre. `src/lib/db/cliente.ts`.
- **Directa** → migraciones y scripts, siempre. `scripts/_conexion.ts`, que
  además **avisa por consola** si detecta que le han pasado la agrupada.

## Consecuencias

- Buscar «cancion» encuentra «canción», y el fragmento sale con la tilde puesta.
- `scripts/extensiones.ts` **debe ejecutarse antes de la primera migración**. El
  script lo comprueba de verdad al final: verifica que `'canción'` casa con
  `'cancion'` y falla ruidosamente si no.
- `npm run db:preparar` encadena los tres pasos en el orden correcto, para que no
  haya que recordarlo.
