# Guía de la base de datos — paso a paso

Esta guía asume que **no has trabajado nunca con una base de datos**. No hace falta
que entiendas SQL: solo copiar dos cadenas de texto y ejecutar tres comandos.

Tiempo estimado: **15 minutos**.

> **Antes de empezar, lo importante:** el sitio ya funciona sin base de datos.
> Si ejecutas `npm run dev` ahora mismo, verás los ocho capítulos completos: la
> obra viaja dentro del propio proyecto. La base de datos hace falta para el
> **panel**, es decir, para editar los poemas sin tocar el código. No hay prisa.

---

## Índice

1. [Qué es cada cosa](#1-qué-es-cada-cosa)
2. [Crear la cuenta y el proyecto en Neon](#2-crear-la-cuenta-y-el-proyecto-en-neon)
3. [Copiar las dos cadenas de conexión](#3-copiar-las-dos-cadenas-de-conexión)
4. [Guardarlas en tu ordenador](#4-guardarlas-en-tu-ordenador)
5. [Preparar la base de datos](#5-preparar-la-base-de-datos)
6. [Comprobar que ha funcionado](#6-comprobar-que-ha-funcionado)
7. [Ramas: probar sin miedo](#7-ramas-probar-sin-miedo)
8. [Conectar Neon con Vercel](#8-conectar-neon-con-vercel)
9. [Si algo falla](#9-si-algo-falla)
10. [Glosario](#10-glosario)

---

## 1. Qué es cada cosa

| Palabra | Qué es, en corto |
|---|---|
| **Postgres** | El programa que guarda los datos. El estándar de la industria. |
| **Neon** | Una empresa que te da un Postgres por internet, sin instalar nada. |
| **Cadena de conexión** | Una línea de texto que contiene la dirección y la contraseña de tu base de datos. **Es una credencial: trátala como una contraseña.** |
| **Migración** | Un archivo con las instrucciones para crear las tablas. Ya está escrito, en `drizzle/0000_inicial.sql`. |
| **Semilla** (*seed*) | Volcar los cuarenta poemas dentro de las tablas ya creadas. |
| **Rama** (*branch*) | Una copia de la base de datos para hacer pruebas sin romper la buena. |

---

## 2. Crear la cuenta y el proyecto en Neon

1. Entra en **<https://neon.tech>** y pulsa **Sign up**.
2. Regístrate con GitHub o con tu correo. El plan gratuito sobra para este proyecto.
3. Cuando te pida crear un proyecto:
   - **Project name**: `lila`
   - **Postgres version**: la que venga por defecto
   - **Region**: elige la más cercana a tus lectores. Si el público es español,
     **Europe (Frankfurt)** o **Europe (London)**.
4. Pulsa **Create project**.

Al terminar, Neon te enseña una pantalla con la cadena de conexión. **No cierres
esa pestaña todavía.**

---

## 3. Copiar las dos cadenas de conexión

Neon te da la misma base de datos por dos caminos distintos, y **necesitas los dos**:

| Cadena | Cómo se reconoce | Para qué |
|---|---|---|
| **Agrupada** (*pooled*) | El host lleva **`-pooler`** | La usa la web cuando está funcionando |
| **Directa** (*unpooled*) | El host **NO** lleva `-pooler` | Solo para crear las tablas y meter los poemas |

Se parecen muchísimo. Fíjate bien:

```
Agrupada:  postgresql://neondb_owner:AbC123@ep-cool-sun-12345-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
                                                                  ↑↑↑↑↑↑↑
Directa:   postgresql://neondb_owner:AbC123@ep-cool-sun-12345.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

**Cómo obtenerlas:** en el panel de Neon, en el apartado **Connect** (o *Connection
Details*) de tu proyecto, hay un desplegable o una casilla para alternar entre la
conexión **con pool** y **sin pool**. Copia cada una por separado.

> **Por qué dos.** La agrupada reparte las conexiones entre muchas peticiones, que
> es justo lo que necesita una web. Pero esa misma agrupación estorba a las
> operaciones largas —crear tablas, meter datos en bloque—, y por eso los scripts
> usan la directa.

---

## 4. Guardarlas en tu ordenador

Abre una terminal en la carpeta del proyecto y crea tu archivo de configuración
a partir del ejemplo:

```bash
cp .env.example .env.local
```

Abre `.env.local` con el editor y pega cada cadena en su sitio:

```bash
DATABASE_URL="...la que lleva -pooler..."
DATABASE_URL_UNPOOLED="...la que NO lleva -pooler..."
```

Guarda el archivo.

> ### ⚠️ Esto es lo único que no puedes equivocar
>
> `.env.local` contiene la contraseña de tu base de datos. **Nunca se sube a
> GitHub.** Ya está en `.gitignore`, así que Git lo ignora solo — pero no lo
> cambies de nombre ni lo copies a otra carpeta.
>
> Para comprobarlo en cualquier momento:
> ```bash
> git status --short
> ```
> Si en la lista aparece `.env.local`, **para y avisa**. No debería aparecer nunca.

---

## 5. Preparar la base de datos

Un solo comando hace los tres pasos:

```bash
npm run db:preparar
```

Por dentro ejecuta, en este orden:

```bash
npm run db:extensiones   # 1. instala las piezas para buscar sin acentos
npm run db:migrar        # 2. crea las tablas
npm run db:semilla       # 3. vuelca los 40 poemas
```

**El orden importa.** El paso 1 crea una configuración de búsqueda llamada
`spanish_unaccent`; la tabla de poemas la necesita para existir. Si te saltas el
paso 1, el paso 2 falla con un error que menciona `spanish_unaccent`.

Deberías ver algo así:

```
  Preparando la base de datos…

  ✓ extensión unaccent (búsqueda sin acentos)
  ✓ extensión pg_trgm (tolerancia a erratas)
  ✓ extensión pgcrypto (uuid por defecto)
  ✓ función f_unaccent, marcada IMMUTABLE
  ✓ función f_unir, marcada IMMUTABLE
  ✓ configuración de búsqueda spanish_unaccent
  ✓ comprobado: «cancion» encuentra «canción»

  Aplicando migraciones…
  ✓ migraciones al día

  Sembrando la obra…
  ✓ Pentapoemario lila — Capítulo primero
  ✓    · Provocaciones fuera de tiempo
  ...
  Listo: 8 volúmenes, 40 poemas.
```

> **Si algo va a fallar, falla aquí.** Antes de tocar Neon puedes ensayarlo
> entero contra un Postgres de mentira, en tu ordenador y sin coste:
>
> ```bash
> npm run db:probar
> ```
>
> Aplica estas mismas extensiones y esta misma migración, y comprueba que la
> búsqueda funciona. Si sale «Esquema correcto», el paso de arriba irá bien.

---

## 6. Comprobar que ha funcionado

```bash
npm run dev
```

Abre <http://localhost:3000>. **Se verá exactamente igual que antes** — y eso es
buena señal: significa que lo que hay en Neon coincide con lo que había en el
proyecto.

Para verlo con tus propios ojos, abre el visor de datos de Neon:

```bash
npm run db:estudio
```

Se abre una web local donde puedes navegar por las tablas `libros`, `poemas`,
`planchas`… y editar cualquier valor a mano.

**Prueba concreta:** en `poemas`, cambia el título de *Provocaciones fuera de
tiempo* por otra cosa, guarda, y recarga
<http://localhost:3000/capitulo-1/provocaciones-fuera-de-tiempo>. Si ves el
título nuevo, la conexión funciona de verdad.

Mejor aún: a partir de aquí ya no hace falta el visor. Monta el panel
—[GUIA-PANEL.md](GUIA-PANEL.md), cinco minutos— y edita desde el navegador.

---

## 7. Ramas: probar sin miedo

Esta es la mejor característica de Neon y el motivo por el que se eligió.

Una **rama** es una copia instantánea de tu base de datos, con los datos dentro.
Puedes destrozarla y borrarla sin consecuencias.

**Cuándo usarla:** siempre que vayas a cambiar la estructura de las tablas.

1. En Neon, apartado **Branches** → **Create branch**. Llámala `pruebas`.
2. Copia la cadena de conexión **de esa rama** (Neon te da una distinta).
3. En `.env.local`, sustituye temporalmente las dos cadenas por las de la rama.
4. Ejecuta lo que quieras probar: `npm run db:migrar`, etc.
5. Si sale bien → vuelve a poner las cadenas de la rama principal y repítelo allí.
6. Si sale mal → borra la rama. No ha pasado nada.

> Esto es lo que el encargo pide en «las migraciones corren en una rama de Neon
> antes que en la principal». No te lo saltes cuando cambies el esquema.

---

## 8. Conectar Neon con Vercel

Cuando despliegues (ver [GUIA-GITHUB.md](GUIA-GITHUB.md)), hazlo así:

1. En el panel de tu proyecto de **Vercel** → pestaña **Integrations** →
   busca **Neon** → **Add integration**.
2. Autoriza y elige tu proyecto `lila` en los dos lados.

Qué ganas con esto:

- Vercel rellena `DATABASE_URL` y `DATABASE_URL_UNPOOLED` **solo**. No tienes que
  copiar credenciales a mano en ningún panel.
- **Cada rama de Git tendrá su propia rama de base de datos.** Cuando abras una
  propuesta de cambios, Vercel te da una web de previsualización con **una copia
  de los datos**, aislada de la de verdad. Puedes probar una migración ahí y, si
  rompe algo, la producción ni se entera.

Si prefieres no usar la integración, añade las dos variables a mano en
**Settings → Environment Variables**, marcando los tres entornos (Production,
Preview, Development). **Sin el prefijo `NEXT_PUBLIC_`**: eso las publicaría en
el navegador.

---

## 9. Si algo falla

| Mensaje | Qué pasa | Solución |
|---|---|---|
| `Falta DATABASE_URL_UNPOOLED` | No existe `.env.local` o está vacío | Repite el [paso 4](#4-guardarlas-en-tu-ordenador) |
| `text search configuration "public.spanish_unaccent" does not exist` | Te saltaste el paso de extensiones | `npm run db:extensiones` y luego `npm run db:migrar` |
| `password authentication failed` | La cadena está mal copiada | Vuelve a copiarla de Neon. Suele faltar un trozo del final |
| `relation "poemas" already exists` | Las tablas ya estaban creadas | No es un error. Sigue con `npm run db:semilla` |
| `ECONNREFUSED` o se queda colgado | Neon estaba dormido | Espera unos segundos y repite. Es normal la primera vez |
| `⚠ Estás usando la cadena agrupada` | Pusiste la del `-pooler` donde va la directa | Revisa que `DATABASE_URL_UNPOOLED` **no** lleve `-pooler` |
| La web va bien pero no veo mis cambios | El contenido se sirve estático y cacheado una hora | En desarrollo, reinicia `npm run dev` |

**La opción nuclear:** si te has liado del todo, en Neon borra el proyecto,
créalo de nuevo y repite desde el [paso 2](#2-crear-la-cuenta-y-el-proyecto-en-neon).
No se pierde nada: los cuarenta poemas están en el código, en
`src/lib/contenido/pentapoemario.ts`, y `npm run db:semilla` los vuelve a poner.

---

## 10. Glosario

- **Scale to zero** — Neon apaga la base de datos cuando nadie la usa, y eso
  ahorra dinero. La primera consulta después de un rato tarda unas décimas de
  segundo en despertarla. Para este sitio da igual, porque las páginas públicas
  se generan estáticas y casi no consultan la base.
- **`unaccent`** — La pieza que hace que buscar «cancion» encuentre «canción».
- **`pg_trgm`** — La pieza que hace que buscar «inventaio» encuentre «inventario».
- **`tsvector`** — La columna donde Postgres guarda el poema ya troceado en
  palabras, para poder buscar rápido. Se rellena sola: no la toques.
- **Índice GIN** — La estructura que hace que la búsqueda sea instantánea aunque
  haya miles de poemas.

---

**Siguiente paso:** [GUIA-PANEL.md](GUIA-PANEL.md) para editar la obra desde el navegador, o [GUIA-GITHUB.md](GUIA-GITHUB.md) para publicarla.
