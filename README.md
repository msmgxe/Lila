# Aurelia · el anaquel del poeta

Obra reunida de un artista. Cada volumen agrupa los poemas por forma y por época,
con la plancha que los acompaña. **Se lee, se busca y se escucha.**

Next.js 16 · TypeScript · Neon (Postgres) · Drizzle · Tailwind 4

---

## Arrancar en 30 segundos

```bash
npm install
npm run dev
```

<http://localhost:3000>

**No hace falta base de datos para esto.** Sin `DATABASE_URL`, el sitio funciona
con el contenido de muestra y se puede navegar entero: anaquel, pliegos, índice,
búsqueda y narración. La base de datos hace falta cuando quieras editar los
poemas sin tocar el código.

---

## Guías paso a paso

Escritas para quien no conoce ninguna de las dos herramientas:

| | |
|---|---|
| 🗄️ **[Base de datos](docs/GUIA-BASE-DE-DATOS.md)** | Montar Neon, las dos cadenas de conexión, migraciones, ramas. ~15 min |
| 🐙 **[GitHub y publicación](docs/GUIA-GITHUB.md)** | Subir el proyecto y publicarlo en Vercel. ~20 min |

---

## Qué hay hecho

**Fase 1 completa**, más las funcionalidades de lectura, búsqueda y voz que
traían los prototipos.

### El anaquel
Barra lateral con las categorías (todos, sonetos, verso libre, breves,
borradores) que filtran la estantería. Rejilla de portadas con volumen, título,
autor y número de poemas. Accesos a sala de lectura y recital.

### El pliego
Página izquierda la plancha con su cartela; derecha el poema sobre papel crema.
Pase de página con giro 3D sobre la hoja derecha, y la plancha cambiando con un
fundido. Navegación con flechas, `Inicio`/`Fin`, botones y arrastre táctil. En
móvil se apila y el giro se desactiva.

Cada volumen abre por su **portada**, tiene su **índice con puntos guía** y cierra
con un **colofón** (dirección A). La **letra capital** se conmuta desde la barra.

### Modo Sala
Conmutador que convierte el lector en una galería blanca de una sola columna, con
deslizamiento silencioso en vez de giro (dirección B). Se recuerda entre visitas.

### Búsqueda
Global sobre toda la obra, atajo `/`. Insensible a acentos y mayúsculas, con
fragmento y término resaltado, agrupada por volumen. En Postgres usa índice GIN y
`ts_headline` sobre una configuración de búsqueda propia que conserva los acentos
del fragmento — ver [ADR-003](docs/ADR-003-busqueda-y-esquema.md).

### Voz
Conmutador M/F, tempo 0.9× / 1× / 1.1×, resaltado del verso que se lee y atenuado
del resto. Las pausas **respetan la forma métrica**: corta a fin de verso, larga
entre estrofas, **casi nula en los encabalgamientos**, cesura en los alejandrinos.
La dedicatoria y las notas del autor no se leen.

Hoy suena por Web Speech (maqueta). La Fase 4 la sustituye por audio pregenerado,
pero **la prosodia ya está escrita y se comparte**: `src/lib/voz/prosodia.ts`
produce tanto la cola del navegador como el SSML del proveedor.

---

## Criterios de aceptación de la Fase 1

| | Criterio | Cómo se comprueba |
|---|---|---|
| ✅ | `DATABASE_URL` nunca en un bundle de cliente | `import 'server-only'` + `grep` sobre `.next/static` |
| ✅ | Migraciones en una rama de Neon antes que en la principal | [Guía, §7](docs/GUIA-BASE-DE-DATOS.md#7-ramas-probar-sin-miedo) |
| ✅ | El anaquel filtra por categoría y abre cualquier volumen | |
| ✅ | El pliego muestra plancha y poema, y pasa páginas con teclado, ratón y dedo | |
| ✅ | Ningún verso se parte al maquetar; los cortes caen entre estrofas | `src/lib/paginar.ts` |
| ✅ | En móvil (390 px) el poema se lee sin zoom ni desplazamiento horizontal | Verificado a 390×844: cuerpo a 16 px, `scrollWidth == clientWidth` |
| ✅ | `prefers-reduced-motion` desactiva el giro | |
| ✅ | Contraste AA en el cuerpo del poema | `#3B2A29` sobre `#F5F5F0` ≈ 9.8:1 |

---

## Decisiones documentadas

- **[ADR-001](docs/ADR-001-almacenamiento.md)** — Vercel Blob y no R2, con la cuenta hecha.
- **[ADR-002](docs/ADR-002-motor-de-pase-de-pagina.md)** — motor propio y no `react-pageflip`; por qué la paginación se calcula en el servidor y qué se paga por ello.
- **[ADR-003](docs/ADR-003-busqueda-y-esquema.md)** — el esquema, y cómo se resuelve que `unaccent` no sea `IMMUTABLE` sin perder los acentos del fragmento.

---

## Comandos

```bash
npm run dev              # desarrollo
npm run build            # compilación de producción
npm run tipos            # comprobar tipos

npm run db:preparar      # extensiones + migraciones + semilla, en orden
npm run db:generar       # nueva migración tras cambiar el esquema
npm run db:estudio       # visor de datos
```

---

## Lo que viene

Fase 2 lectura · Fase 3 búsqueda sobre Neon · Fase 4 voz con TTS de pago ·
Fase 5 panel de administración · Fase 6 obra plástica · Fase 7 cierre.

Detalle en [`Implementacion_inicial.md`](Implementacion_inicial.md).

---

Los prototipos originales siguen en [`prototipos/`](prototipos/) como referencia
visual. Los textos son de muestra y no se atribuyen a ningún poeta real.
