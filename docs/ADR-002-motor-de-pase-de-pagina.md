# ADR-002 · El motor de pase de página

**Estado:** aceptado · Fase 1
**Decide:** implementación propia con CSS 3D. Descartada `react-pageflip`.

---

## El problema

El encargo pide evaluar `react-pageflip` frente a una implementación propia, y
documentarlo. El pliego tiene que pasar página con teclado, ratón y dedo, apilarse
en móvil, y desactivar el giro con `prefers-reduced-motion`.

## Por qué se descarta la librería

`react-pageflip` (y las de su familia, tipo `turn.js`) resuelven un problema
distinto del nuestro:

1. **Quieren gobernar el tamaño.** Piden alto y ancho en píxeles y calculan el
   pliego a partir de ahí. Nuestro pliego es `clamp()` y `aspect-ratio` puro, y
   se reorganiza de dos columnas a una sola pila en móvil. Pelearse con eso
   acabaría en `ResizeObserver` y medidas a mano — más código del que ahorramos.

2. **Asumen páginas simétricas.** Nuestro pliego **no lo es**: a la izquierda va
   la plancha, que **no gira** —cambia con un fundido—, y a la derecha el poema,
   que sí. Esa asimetría es la idea central de la dirección E. Una librería de
   libro simétrico la contradice.

3. **Traen su propio manejo del táctil y del foco**, que hay que desmontar para
   cumplir accesibilidad, y compiten con nuestra navegación por teclado.

4. **Peso**. Entre 15 y 40 KB para una animación que son 20 líneas de CSS.

## Lo que hacemos

Un solo elemento, `.giro`, con `transform-style: preserve-3d`, dos caras con
`backface-visibility: hidden` y una transición de `rotateY`.

**Hacia delante:** la cara frontal de la hoja muestra la página **actual**, y la
página de debajo pasa ya a mostrar el **destino**. La hoja gira de `0°` a `-180°`
y va descubriendo lo que hay debajo.

**Hacia atrás:** al revés. La hoja entra desde `-180°` mostrando el destino y
aterriza encima.

**La plancha, en paralelo:** a los 300 ms baja su opacidad, a los 480 ms se
sustituye, y vuelve. Así el arte «cambia» en mitad del giro sin girar él mismo.

Está en [`src/componentes/lector/Lector.tsx`](../src/componentes/lector/Lector.tsx),
en la función `ir()`.

### Cuándo NO hay giro

| Situación | Qué pasa en su lugar |
|---|---|
| `prefers-reduced-motion: reduce` | Cambio instantáneo. El giro se elimina con `display: none` |
| Ancho ≤ 860 px | El pliego se apila y el cambio es instantáneo |
| Modo Sala (dirección B) | Deslizamiento lateral silencioso |

El encargo dice «no sacrificar la legibilidad por el efecto de giro». Por eso el
giro es lo primero que se cae en cuanto estorba.

---

## La decisión de fondo: **la paginación se calcula en el servidor**

Es la parte de este ADR que más consecuencias tiene.

Un motor de libro «de verdad» mediría el DOM y repartiría el texto según lo que
cabe en la pantalla de cada visitante. **No lo hacemos**, y es deliberado:

- Si cada dispositivo corta el poema por un sitio distinto, **la URL de un pliego
  deja de significar nada**. El encargo pide que cada pliego tenga dirección
  propia y tarjeta OG. Eso exige que el corte sea el mismo para todos.
- Medir el DOM obliga a paginar en el navegador, lo que impide generar las
  páginas estáticas (SSG) — que es la decisión de rendimiento más importante del
  proyecto, porque mantiene a Neon prácticamente sin tráfico de lectura.

Así que [`src/lib/paginar.ts`](../src/lib/paginar.ts) reparte por un **presupuesto
en «alturas de verso»**, calibrado contra el pliego real, y es determinista.

**Las tres reglas que respeta:**

1. Una estrofa **nunca** se parte. Los cortes caen siempre entre estrofas.
2. Si un poema entero se pasa poco del presupuesto, **no se corta: se compone más
   apretado**. Un soneto son catorce versos y una sola respiración; partirlo en
   dos pliegos lo estropea. De ahí las densidades `denso` y `muy-denso`, que
   ajustan cuerpo e interlínea sin bajar de 15 px.
3. La viñeta decorativa es lo primero que se sacrifica cuando la página va justa.
   La obra de verdad está en la plancha de la izquierda.

**El precio, dicho claramente:** en una pantalla más baja de lo calibrado, una
página puede quedarse corta y haber que desplazar un poco dentro de ella.
`.hoja-int` tiene `overflow-y: auto` justo para eso, así que **nunca se corta
texto**; en el peor caso se desplaza. Se ha preferido eso a perder las URLs
estables y el renderizado estático.

Si algún día se cambia la tipografía del poema, se recalibra `PRESUPUESTO` en
`paginar.ts` y en ningún otro sitio.

## Consecuencias

- Cero dependencias para el pliego.
- El corte de un poema es el mismo en un móvil y en un portátil, así que
  `/libro/poema` siempre lleva al mismo sitio.
- `generateStaticParams` puede prerenderizar todos los poemas en build.
- La calibración es un número y está en un solo archivo.
