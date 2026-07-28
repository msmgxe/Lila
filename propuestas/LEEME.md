# Propuestas para elegir

Dos archivos HTML **autónomos**: llevan dentro las tipografías y las imágenes, así
que se abren con doble clic y se pueden enviar por correo o por WhatsApp sin que
haga falta servidor ni conexión.

| Archivo | Qué contiene | Peso |
|---|---|---|
| [`01-colores-y-estilos.html`](01-colores-y-estilos.html) | Cinco paletas y parejas tipográficas, con el mismo pliego y el mismo poema en cada una | 359 KB |
| [`02-portadas.html`](02-portadas.html) | Cinco maquetas de página de entrada, cada una apostando por algo distinto | 729 KB |
| [`03-el-autor.html`](03-el-autor.html) | Seis secciones para presentar al autor —poeta, dibujante y profesor— debajo del poemario | 156 KB |
| [`04-lista-de-capitulos.html`](04-lista-de-capitulos.html) | Tres maneras de listar los capítulos en el panel: fila, rejilla y carrusel con tabla | 152 KB |

---

## Las cinco direcciones de color

| | Nombre | Carácter |
|---|---|---|
| 1 | La sala oscura | Lo que hay ahora: penumbra y papel crema |
| 2 | Lila | Asume el color que la obra lleva en el nombre |
| 3 | Papel y tinta | Todo papel, sin habitación oscura. La mejor para leer largo |
| 4 | Nocturno mineral | Obsidiana y azul acero. La más severa |
| 5 | Sala blanca | Galería contemporánea. Útil si entra la obra plástica |

## Las cinco portadas

| | Nombre | Apuesta por | Cuándo elegirla |
|---|---|---|---|
| 1 | El verso | El texto | Si quieres que se note que es literatura |
| 2 | La galería | La imagen | Si el público llega por redes |
| 3 | El objeto | El libro | Si vas a vender el manuscrito |
| 4 | El recital | El sonido | Si quieres enseñar lo que nadie más tiene |
| 5 | Editorial | La estructura | Si quieres explicarte y aparecer en buscadores |

---

## Las dos decisiones son independientes

El color y la portada se eligen por separado: se puede coger la paleta **3** con
la portada **5**, o la **2** con la **1**. Son quince combinaciones posibles.

## Qué NO cambia con ninguna

El lector con su pliego, el corte entre estrofas, la búsqueda, la narración y el
panel de administración. Estas propuestas solo tocan **la piel** y **la puerta de
entrada**.

---

## Cómo se regeneran

Los dos archivos se montan a partir de las fuentes del proyecto —los poemas
salen de `src/lib/contenido/pentapoemario.ts` y las portadas de
`public/portadas/`—, así que **todos los versos que aparecen en ellos son de la
obra**, no textos de relleno.

Si cambian los poemas o las portadas, hay que volver a generarlos para que no se
queden desfasados.
