/**
 * Convierte un enlace de YouTube o Vimeo en su dirección para incrustar.
 *
 * Vive en su propio archivo porque lo usan un componente de servidor y otro de
 * cliente; dejarlo dentro de `ElAutor` obligaría al cliente a importar de ahí,
 * arrastrando lo que no necesita.
 *
 * Se pega el enlace normal —el que sale al pulsar «Compartir»— y aquí se
 * traduce. Pedirle a nadie que averigüe la dirección «de incrustar» es pedirle
 * que se pelee con la interfaz de YouTube; y pegar la normal en un `<iframe>`
 * no funciona, así que sin esto la sección se quedaría en blanco sin decir por
 * qué. Lo que no reconoce se deja tal cual: puede ser un mp4 propio.
 */
export function urlParaIncrustar(url: string): { tipo: 'iframe' | 'video'; src: string } {
  const t = url.trim()

  const youtube = t.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  )
  if (youtube) return { tipo: 'iframe', src: `https://www.youtube-nocookie.com/embed/${youtube[1]}` }

  const vimeo = t.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo) return { tipo: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}` }

  return { tipo: 'video', src: t }
}

/**
 * La miniatura de un vídeo, sin llamar a ninguna API.
 *
 * YouTube publica la portada de cada vídeo en una dirección predecible a partir
 * de su identificador, así que se arma sin pedir permiso ni clave. Vimeo no —su
 * miniatura solo se consigue por API— y un mp4 propio tampoco tiene: en esos
 * casos devuelve null y la lámina cae en su motivo de reserva.
 *
 * Sirve para que el carrusel enseñe las láminas de los lados como IMAGEN y no
 * como reproductor. Dos ventajas de golpe: el giro en 3D no toca ningún
 * `<iframe>` —que es donde se rompía— y la página deja de traerse seis
 * reproductores de YouTube para enseñar uno.
 */
export function miniaturaDe(url: string): string | null {
  const youtube = url
    .trim()
    .match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return youtube ? `https://i.ytimg.com/vi/${youtube[1]}/hqdefault.jpg` : null
}
