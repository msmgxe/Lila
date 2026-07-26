# Guía del panel de administración — paso a paso

El panel vive en **`/panel`**. Desde ahí se dan de alta y se editan volúmenes y
poemas, se ordenan, se publican y se retiran, sin tocar una línea de código.

Tiempo de puesta en marcha: **5 minutos**, una sola vez.

---

## Antes de empezar: necesita la base de datos

El sitio público funciona sin base de datos —sirve la obra desde el propio
proyecto— pero **el panel no puede**: no tendría dónde guardar lo que escribes.

Si aún no la has montado, ve primero a
[GUIA-BASE-DE-DATOS.md](GUIA-BASE-DE-DATOS.md). Son quince minutos.

---

## 1. Crear tu usuario

Un solo comando:

```bash
npm run panel:clave
```

Te pregunta tres cosas y escupe tres líneas:

```
  Usuario (tu correo): jose@ejemplo.com
  Clave: ··············
  Repite la clave: ··············

  ── Pega estas tres líneas en .env.local ──────────────────

AUTH_SECRET="k3nF9…"
ADMIN_USUARIO="jose@ejemplo.com"
ADMIN_CLAVE_HASH="a1b2…:c3d4…"
```

Pégalas al final de tu archivo **`.env.local`** y reinicia el servidor.

> **La clave en claro no se guarda en ningún sitio.** Lo que va al archivo es un
> hash *scrypt*: de él no se puede volver a la clave. Si la pierdes, ejecuta el
> comando otra vez y sustituye las tres líneas.

Para que funcione también en internet, añade esas tres variables en Vercel:
**Settings → Environment Variables**. Ninguna lleva el prefijo `NEXT_PUBLIC_`.

---

## 2. Entrar

```bash
npm run dev
```

Abre <http://localhost:3000/panel>. Te pedirá el usuario y la clave que acabas
de crear. La sesión dura doce horas.

---

## 3. Lo que puedes hacer

### Volúmenes

La portada del panel lista los volúmenes con una franja de color a la izquierda:
**verde** si está en el sitio, **ámbar** si es un borrador.

- **Nuevo volumen** — título, obra a la que pertenece, categoría, año y la
  página por la que empieza.
- **Publicar / Retirar** — un botón. El cambio sale al sitio al momento.
- **Borrar** — se lleva por delante sus poemas y sus planchas. No hay deshacer.

**La categoría importa más de lo que parece:** es lo que agrupa la estantería
del anaquel. La barra lateral se arma sola con las categorías que existan; si
solo hay una, el filtro no aparece, porque no filtraría nada.

### Poemas

Dentro de un volumen tienes la lista de sus poemas, con flechas para
reordenarlos y un botón para publicar o retirar cada uno.

En el editor de un poema:

| Campo | Para qué |
|---|---|
| **Título** | También genera la dirección web del poema |
| **Forma** | «pentapoema», «soneto»… Se imprime en versalitas sobre el título |
| **Versos** | El poema. Un verso por línea |
| **Dedicatoria** | Se ve, pero **no se lee en voz alta** |
| **Nota del autor** | Tampoco se lee |
| **Temas** | Separados por comas. Entran en la búsqueda |

> ### Cómo se escriben los versos
>
> - **Un verso por línea.** Los espacios se respetan tal cual: nada los
>   normaliza.
> - **Una línea en blanco separa estrofas.** Es la unidad que importa: cuando un
>   poema no cabe en una página, **el corte cae siempre entre estrofas**, nunca
>   dentro de una.
> - Para ajustar la lectura en voz alta a mano, al final de un verso: `/` marca
>   una pausa breve y `//` una larga. **No se imprimen.**

### Las dos previsiones

Debajo del editor, el panel enseña dos cosas que no se pueden adivinar de otro
modo, calculadas con las mismas funciones que usa el sitio:

1. **En cuántos pliegos va a caer el poema** y por dónde se corta. Si el poema se
   pasa poco de la caja, verás que en lugar de partirse se compone «apretado» —
   así un soneto no se rompe nunca en dos páginas.
2. **Cómo lo va a leer la voz**: cuántos encabalgamientos tiene (versos que no
   cierran, donde la voz casi no se para) y el SSML exacto que se enviará al
   proveedor cuando llegue la Fase 4.

### Planchas

La obra plástica que acompaña al poema, en la página izquierda del pliego. Se
añaden con su número, título, técnica y la ruta de la imagen.

Mientras un poema no tenga plancha, se pinta un motivo generado a partir de su
título y teñido con el color del volumen. **No se le pone cartela**: un rótulo
que diga «pieza no asignada» debajo de cada poema no informa de nada.

---

## 4. Publicar de verdad

Un poema sale al sitio cuando **su volumen y él** están publicados. Al cambiar
cualquiera de los dos, el sitio se regenera solo — no hay que desplegar nada.

---

## 5. Seguridad, en corto

- Un solo usuario. No hay registro ni recuperación de clave por correo.
- La clave se guarda cifrada con *scrypt*, y se compara en tiempo constante.
- **Cada acción del panel comprueba la sesión por su cuenta**, no solo la
  pantalla. Da igual por dónde se intente entrar.
- `/panel` no se indexa en buscadores.
- Si sospechas que alguien tiene tu clave: `npm run panel:clave` otra vez y
  sustituye las tres líneas. Todas las sesiones abiertas dejan de valer, porque
  cambia también `AUTH_SECRET`.

---

## 6. Si algo falla

| Qué ves | Qué pasa | Solución |
|---|---|---|
| «El panel no está configurado» | Faltan las tres variables | `npm run panel:clave` y reinicia |
| «El panel necesita la base de datos» | Falta `DATABASE_URL` | [GUIA-BASE-DE-DATOS.md](GUIA-BASE-DE-DATOS.md) |
| «Usuario o clave incorrectos» | No coinciden | Ojo a las mayúsculas del usuario. Si dudas, vuelve a generar la clave |
| Guardo y no cambia nada en el sitio | El volumen está en borrador | Publícalo también a él, no solo el poema |
| Me echa al entrar | `AUTH_SECRET` cambió | Vuelve a entrar |

---

## Importar desde Word

Si tienes los poemas en `.docx`, hay un importador aparte que los lee
directamente —usa la negrita del documento para distinguir los títulos de los
versos— y comprueba lo que ha extraído antes de escribir nada:

```bash
npm run contenido:importar
```

Lee los archivos de `origen/` y regenera
`src/lib/contenido/pentapoemario.ts`. Después, `npm run db:semilla` los vuelca
en la base de datos.

Es la vía rápida para cargar una obra entera; para el día a día, el panel.
