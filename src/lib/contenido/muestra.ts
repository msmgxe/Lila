/**
 * Contenido de muestra.
 *
 * Doble función:
 *  1. Es la semilla que `npm run db:semilla` vuelca en Neon.
 *  2. Es el respaldo con el que el sitio arranca cuando NO hay DATABASE_URL,
 *     para poder revisar el diseño sin montar la base de datos.
 *
 * Todos los textos son de muestra, escritos para este prototipo. No se
 * atribuyen a ningún poeta real.
 */

import type { Libro } from '../tipos'

export const AUTOR = 'A. VÉLEZ'

/* Atajo: escribir el poema con \n y \n\n como se guardará en la base de datos. */
const e = (bloques: string[][]) => bloques

export const LIBROS_MUESTRA: Libro[] = [
  /* ─────────────────────────── Volumen IV ─────────────────────────────── */
  {
    id: 'lib-ecos',
    slug: 'ecos-del-vacio',
    volumen: 'Volumen IV',
    titulo: 'Ecos del vacío',
    subtitulo: 'poemas · 2019–2025',
    descripcion: 'La casa después de la casa. Poemas largos, sin metro fijo.',
    categoria: 'verso libre',
    orden: 0,
    colorAcento: '#3b2f28',
    portadaUrl: null,
    anio: 2025,
    publicado: true,
    paginaBase: 34,
    poemas: [
      {
        id: 'poe-inventario',
        slug: 'inventario-de-la-casa-vacia',
        titulo: 'Inventario de la casa vacía',
        forma: 'verso libre',
        dedicatoria: null,
        notaAutor: null,
        anio: 2023,
        temas: ['casa', 'duelo', 'objetos'],
        orden: 0,
        publicado: true,
        estrofas: e([
          [
            'Primero se fueron los ruidos:',
            'la puerta que no cerraba bien,',
            'el hervidor con su silbido de tren,',
            'el paso corto de tus zapatillas',
            'midiendo el pasillo de punta a punta.',
          ],
          [
            'Después se fue la luz de las seis,',
            'esa que entraba de costado',
            'y encendía el polvo como si el polvo',
            'tuviera algo que decir.',
          ],
          [
            'Quedaron las cosas.',
            'Un vaso con la marca de tu boca.',
            'Dos libros abiertos boca abajo,',
            'tercos en su página,',
            'esperando que alguien vuelva a leerlos',
            'por donde los dejaste.',
          ],
          [
            'Hice inventario.',
            'Conté las tazas: siete.',
            'Conté las sillas: cuatro.',
            'Conté las veces que dije tu nombre',
            'en voz alta, para ver si la casa',
            'me lo devolvía.',
            'La casa no devuelve nada.',
            'La casa aprende rápido a callarse.',
          ],
          [
            'Ahora vivo aquí como quien alquila',
            'una memoria ajena:',
            'piso despacio,',
            'no muevo los muebles,',
            'dejo la puerta que no cierra',
            'sin arreglar,',
            'por si el ruido volviera',
            'y encontrara su sitio.',
          ],
        ]),
        planchas: [
          {
            id: 'pl-tazas',
            numero: 'Plancha VII',
            titulo: 'Siete tazas',
            tecnica: 'carbón y ceniza sobre tabla',
            url: null,
            orden: 0,
          },
          {
            id: 'pl-tazas-det',
            numero: 'Plancha VII · detalle',
            titulo: 'Siete tazas (fragmento)',
            tecnica: 'carbón y ceniza sobre tabla',
            url: null,
            orden: 1,
          },
        ],
        audios: [],
      },
      {
        id: 'poe-madre',
        slug: 'retrato-de-mi-madre-cosiendo',
        titulo: 'Retrato de mi madre cosiendo',
        forma: 'verso libre',
        dedicatoria: null,
        notaAutor: null,
        anio: 2021,
        temas: ['madre', 'oficio', 'manos'],
        orden: 1,
        publicado: true,
        estrofas: e([
          [
            'Baja la cabeza como quien reza',
            'y no reza: cuenta.',
            'Un punto, otro punto,',
            'la aguja entrando en la tela',
            'igual que entra la tarde en la ventana,',
            'sin pedir permiso.',
          ],
          [
            'No la interrumpo.',
            'He aprendido que hay una clase de silencio',
            'que es trabajo,',
            'y otra que es sólo ausencia,',
            'y que se parecen mucho de lejos.',
          ],
          [
            'Cuando termina, muerde el hilo.',
            'Ese gesto pequeño, animal,',
            'es lo único suyo',
            'que he sabido heredar.',
          ],
        ]),
        planchas: [
          {
            id: 'pl-aguja',
            numero: 'Plancha II',
            titulo: 'La aguja y la tarde',
            tecnica: 'punta seca sobre cobre',
            url: null,
            orden: 0,
          },
        ],
        audios: [],
      },
      {
        id: 'poe-agua',
        slug: 'los-nombres-del-agua',
        titulo: 'Los nombres del agua',
        forma: 'verso libre',
        dedicatoria: null,
        notaAutor: 'Escrito en el margen de un cuaderno de campo.',
        anio: 2024,
        temas: ['agua', 'lenguaje', 'infancia'],
        orden: 2,
        publicado: true,
        estrofas: e([
          [
            'De niño le puse nombre a cada charco',
            'y ninguno duró hasta el día siguiente.',
          ],
          [
            'Aprendí así que hay cosas',
            'que sólo aceptan un nombre provisional:',
            'la lluvia, el sueño,',
            'lo que sentimos por alguien',
            'la primera semana.',
          ],
          [
            'El agua no discute.',
            'Toma la forma del hueco que encuentra',
            'y se va',
            'sin dejar dicho cómo se llamaba.',
          ],
        ]),
        planchas: [
          {
            id: 'pl-charco',
            numero: 'Plancha XII',
            titulo: 'Charco con nombre provisional',
            tecnica: 'aguada sobre papel de algodón',
            url: null,
            orden: 0,
          },
        ],
        audios: [],
      },
    ],
  },

  /* ─────────────────────────── Volumen VII ────────────────────────────── */
  {
    id: 'lib-geometrias',
    slug: 'geometrias-etereas',
    volumen: 'Volumen VII',
    titulo: 'Geometrías etéreas',
    subtitulo: 'sonetos · 2020–2024',
    descripcion: 'Catorce versos, una sola respiración. La forma como refugio.',
    categoria: 'sonetos',
    orden: 1,
    colorAcento: '#2f3138',
    portadaUrl: null,
    anio: 2024,
    publicado: true,
    paginaBase: 12,
    poemas: [
      {
        id: 'poe-ausencia',
        slug: 'ausencia',
        titulo: 'Ausencia',
        forma: 'soneto',
        dedicatoria: 'A quien ya no pregunta.',
        notaAutor: null,
        anio: 2022,
        temas: ['ausencia', 'tiempo', 'casa'],
        orden: 0,
        publicado: true,
        estrofas: e([
          [
            'No sé qué nombre dar a lo que queda',
            'cuando se apaga el sol de tu costado:',
            'un cuarto que no acaba de ser cuarto,',
            'un reloj que se obstina y no rueda.',
          ],
          [
            'Camino por la casa como pueda,',
            'tocando lo que fue por ti tocado,',
            'y encuentro en cada mueble un recado',
            'de tu costumbre mansa, tibia y leda.',
          ],
          [
            'Si el tiempo fuera río, yo sería',
            'la piedra que se queda en la corriente,',
            'mojada de una sola travesía.',
          ],
          [
            'Pero el tiempo es apenas lo presente,',
            'y en él, sin ti, se me deshace el día',
            'como se deshace la sal en la frente.',
          ],
        ]),
        planchas: [
          {
            id: 'pl-silencio',
            numero: 'Plancha IV',
            titulo: 'La arquitectura del silencio',
            tecnica: 'óleo sobre lienzo, 120 × 90',
            url: null,
            orden: 0,
          },
        ],
        audios: [],
      },
      {
        id: 'poe-domingo',
        slug: 'domingo',
        titulo: 'Domingo',
        forma: 'soneto',
        dedicatoria: null,
        notaAutor: null,
        anio: 2023,
        temas: ['tiempo', 'costumbre', 'luz'],
        orden: 1,
        publicado: true,
        estrofas: e([
          [
            'Se levanta el domingo sin oficio,',
            'con esa lentitud de animal viejo',
            'que ya no busca sombra ni reflejo',
            'y hace de la desgana su ejercicio.',
          ],
          [
            'La luz entra despacio, sin bullicio,',
            'y pone sobre el mármol un espejo',
            'donde el pan de ayer, ya medio lejos,',
            'sostiene todavía su artificio.',
          ],
          [
            'No pasa nada. Y es que no pasar',
            'también es una forma de la historia:',
            'la única que aprende a no doler.',
          ],
          [
            'Uno se sienta, deja de contar,',
            'y descubre, sin pena y sin victoria,',
            'que hay días que se limitan a ser.',
          ],
        ]),
        planchas: [
          {
            id: 'pl-marmol',
            numero: 'Plancha IX',
            titulo: 'Mármol con pan',
            tecnica: 'óleo sobre tabla, 40 × 30',
            url: null,
            orden: 0,
          },
        ],
        audios: [],
      },
    ],
  },

  /* ─────────────────────────── Volumen IX ─────────────────────────────── */
  {
    id: 'lib-himnos',
    slug: 'himnos-nocturnos',
    volumen: 'Volumen IX',
    titulo: 'Himnos nocturnos',
    subtitulo: 'breves · 2018–2025',
    descripcion: 'Apuntes de madrugada. Nada dura más de seis versos.',
    categoria: 'breves',
    orden: 2,
    colorAcento: '#252f3d',
    portadaUrl: null,
    anio: 2025,
    publicado: true,
    paginaBase: 78,
    poemas: [
      {
        id: 'poe-umbral',
        slug: 'umbral',
        titulo: 'Umbral',
        forma: 'poema breve',
        dedicatoria: null,
        notaAutor: null,
        anio: 2019,
        temas: ['mar', 'memoria', 'noche'],
        orden: 0,
        publicado: true,
        estrofas: e([
          [
            'Toda la noche estuvo el mar',
            'diciendo una palabra.',
            'Al amanecer',
            'la había olvidado,',
            'y volvió a empezar.',
          ],
        ]),
        planchas: [
          {
            id: 'pl-mar',
            numero: 'Plancha I',
            titulo: 'El mar que repite',
            tecnica: 'tinta sobre papel de algodón',
            url: null,
            orden: 0,
          },
        ],
        audios: [],
      },
      {
        id: 'poe-regreso',
        slug: 'regreso',
        titulo: 'Regreso',
        forma: 'poema breve',
        dedicatoria: null,
        notaAutor: null,
        anio: 2021,
        temas: ['viaje', 'casa', 'noche'],
        orden: 1,
        publicado: true,
        estrofas: e([
          [
            'Volví por ver si el pueblo',
            'me reconocía.',
            'El perro sí.',
            'Los demás preguntaron',
            'de quién era yo hijo.',
          ],
        ]),
        planchas: [
          {
            id: 'pl-perro',
            numero: 'Plancha XV',
            titulo: 'El perro que recuerda',
            tecnica: 'grafito sobre papel',
            url: null,
            orden: 0,
          },
        ],
        audios: [],
      },
      {
        id: 'poe-insomnio',
        slug: 'insomnio-con-perro',
        titulo: 'Insomnio con perro',
        forma: 'poema breve',
        dedicatoria: null,
        notaAutor: null,
        anio: 2025,
        temas: ['noche', 'animal', 'insomnio'],
        orden: 2,
        publicado: true,
        estrofas: e([
          [
            'A las tres el perro se levanta,',
            'da tres vueltas',
            'y se echa en el mismo sitio.',
            'Yo llevo años haciendo lo mismo',
            'con un solo pensamiento.',
          ],
        ]),
        planchas: [
          {
            id: 'pl-tresvueltas',
            numero: 'Plancha XVIII',
            titulo: 'Tres vueltas',
            tecnica: 'monotipo sobre papel japonés',
            url: null,
            orden: 0,
          },
        ],
        audios: [],
      },
    ],
  },

  /* ─────────────────────────── Volumen XI ─────────────────────────────── */
  {
    id: 'lib-obsidiana',
    slug: 'el-fragmento-de-obsidiana',
    volumen: 'Volumen XI',
    titulo: 'El fragmento de obsidiana',
    subtitulo: 'cuaderno de trabajo',
    descripcion: 'Versiones descartadas, tachaduras y notas que no llegaron a la edición.',
    categoria: 'borradores',
    orden: 3,
    colorAcento: '#3a2a2c',
    portadaUrl: null,
    anio: 2026,
    publicado: true,
    paginaBase: 3,
    poemas: [
      {
        id: 'poe-borrador-i',
        slug: 'borrador-i',
        titulo: 'Borrador I',
        forma: 'borrador',
        dedicatoria: null,
        notaAutor: 'Primera versión. El tercer verso todavía no está.',
        anio: 2026,
        temas: ['obsidiana', 'piedra', 'oficio'],
        orden: 0,
        publicado: true,
        estrofas: e([
          [
            'La obsidiana no se talla:',
            'se rompe con puntería.',
            'Todo lo que corta',
            'viene de un accidente bien mirado.',
          ],
        ]),
        planchas: [
          {
            id: 'pl-obsidiana',
            numero: 'Plancha XXI',
            titulo: 'Lasca',
            tecnica: 'ceniza y goma laca sobre tabla',
            url: null,
            orden: 0,
          },
        ],
        audios: [],
      },
      {
        id: 'poe-borrador-ii',
        slug: 'borrador-ii',
        titulo: 'Borrador II',
        forma: 'borrador',
        dedicatoria: null,
        notaAutor: null,
        anio: 2026,
        temas: ['obsidiana', 'espejo', 'oficio'],
        orden: 1,
        publicado: true,
        estrofas: e([
          [
            'Los antiguos hacían espejos',
            'con esta piedra negra.',
            'Sabían lo que hacían:',
            'para verse de verdad',
            'hace falta algo de oscuridad detrás.',
          ],
        ]),
        planchas: [
          {
            id: 'pl-espejo',
            numero: 'Plancha XXII',
            titulo: 'Espejo negro',
            tecnica: 'ceniza y goma laca sobre tabla',
            url: null,
            orden: 0,
          },
        ],
        audios: [],
      },
    ],
  },
]

export const CATEGORIAS = [
  { clave: 'todos', nombre: 'Biblioteca', icono: 'M4 5h7a2 2 0 012 2v12a2 2 0 00-2-2H4zM20 5h-7a2 2 0 00-2 2v12a2 2 0 012-2h7z' },
  { clave: 'sonetos', nombre: 'Sonetos', icono: 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5' },
  { clave: 'verso libre', nombre: 'Verso libre', icono: 'M4 7h16M4 12h10M4 17h13' },
  { clave: 'breves', nombre: 'Breves', icono: 'M12 3l2.4 6.4L21 12l-6.6 2.6L12 21l-2.4-6.4L3 12l6.6-2.6z' },
  { clave: 'borradores', nombre: 'Borradores', icono: 'M4 6h11M4 12h16M4 18h8M17 4l3 3-7 7-3.5.5.5-3.5z' },
] as const
