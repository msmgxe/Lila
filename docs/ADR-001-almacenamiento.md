# ADR-001 · Dónde se guardan los audios y las imágenes

**Estado:** aceptado · Fase 1
**Decide:** Vercel Blob

---

## El problema

Neon es Postgres y nada más. A diferencia de Supabase, **no trae almacenamiento
de objetos**. Los audios de las lecturas y las imágenes de las planchas tienen
que vivir en otro sitio, y hay que elegir cuál antes de escribir el esquema —
porque el esquema guarda **URLs**, y esas URLs son las de ese servicio.

Guardar los binarios dentro de Postgres queda descartado de entrada: hincha las
copias de seguridad, encarece cada consulta y obliga a servir archivos a través
de una función en vez de desde una red de distribución.

## Las opciones

| | Vercel Blob | Cloudflare R2 | AWS S3 |
|---|---|---|---|
| Puesta en marcha | una variable de entorno | cuenta aparte, claves, CORS | cuenta aparte, IAM, políticas |
| Coste de almacenamiento | más caro por GB | el más barato | intermedio |
| Coste de salida (*egress*) | incluido hasta el límite del plan | **cero** | caro |
| Red de distribución | la de Vercel, ya integrada | la de Cloudflare | requiere CloudFront |
| Trabajo de integración | mínimo | medio | alto |

## La decisión

**Vercel Blob.**

El argumento decisivo no es el precio, es el **volumen real**. Hagamos la cuenta:

- Un poema leído dura entre 40 y 90 segundos. En MP3 a 96 kbps son ~1 MB.
- Dos voces por poema (M y F) → ~2 MB por poema.
- Con 200 poemas publicados → **~400 MB de audio**.
- Las planchas, en WebP a 2000 px, rondan 300 KB. Con 300 planchas → **~90 MB**.

**Medio giga en total.** A esa escala, la diferencia de precio entre los tres
servicios es de céntimos al mes. Lo que sí cuesta es el tiempo de integración, y
ahí Vercel Blob gana sin discusión: el despliegue ya está en Vercel, la variable
`BLOB_READ_WRITE_TOKEN` se inyecta sola y no hay que configurar CORS ni firmar
URLs.

Optimizar el coste de salida antes de tener visitas sería resolver un problema
que no existe.

## Cuándo habría que cambiar

Si el sitio crece hasta que la salida mensual pase de ~100 GB —lo que significaría
un éxito considerable—, R2 pasa a compensar por su salida gratuita.

**La migración está prevista y es barata**, porque el esquema no guarda nada
específico de Vercel: `planchas.url` y `audios.url` son texto libre. Cambiar de
servicio sería copiar los archivos y hacer un `UPDATE` de las dos columnas. No
hay que tocar ni el modelo de datos ni los componentes.

## Consecuencias

- El esquema guarda **solo URLs**. Ningún binario entra en Postgres.
- Todas las subidas pasan por el servidor (Route Handler). El navegador nunca ve
  el *token* de escritura.
- El audio se genera **una vez**, se aprueba en el panel y se guarda. Nunca se
  sintetiza en la petición de un visitante.
- `audios.ssml_hash` detecta cuándo el texto ha cambiado y el audio se ha quedado
  viejo.

## Sin implementar todavía

Esta decisión fija el **contrato**, no el código. La subida real llega en la
Fase 4 (audio) y la Fase 5 (panel). En la Fase 1 las columnas `url` admiten
`NULL` y, mientras están vacías, la plancha se dibuja con un SVG generativo
determinista (`src/lib/arte.ts`) que marca el sitio de la obra.
