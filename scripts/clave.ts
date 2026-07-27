/**
 * Da de alta al administrador del panel.
 *
 *   npm run panel:clave
 *
 * Pide una clave, la cifra con scrypt y la deja puesta en los dos sitios donde
 * hace falta. La clave en claro no se guarda en ningún sitio.
 *
 * ── Por qué esto ya no es solo un `console.log` ─────────────────────────────
 * La versión anterior imprimía las tres líneas en formato .env —con comillas—
 * y debajo decía «añádelas también en Vercel». Copiar esa línea entera al panel
 * web de Vercel mete las comillas DENTRO del valor, porque allí no hay dotenv
 * que las quite. Queda un hash que no valida nunca y un formulario que responde
 * «Usuario o clave incorrectos»: el mismo mensaje que una clave mal escrita,
 * con la causa contraria. Se pierde una tarde ahí y se cambia la clave tres
 * veces sin arreglar nada.
 *
 * Así que ahora no hay que copiar nada a mano: el script escribe `.env.local`
 * y, si se le deja, lo sube a Vercel él mismo.
 */

import { randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cifrarClave } from '../src/lib/auth/clave'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const ENV = join(RAIZ, '.env.local')

const afirma = (r: string) => ['s', 'si', 'sí', 'y'].includes(r.trim().toLowerCase())

/**
 * Pregunta por consola, y también sabe leer de una tubería.
 *
 * `readline/promises` solo va bien contra una terminal de verdad: si la entrada
 * viene canalizada, la interfaz se cierra al agotarse y las preguntas quedan
 * colgadas — el proceso termina en silencio sin hacer nada. Sin esto el script
 * no se puede probar sin escribirlo a mano cada vez, que es justo como se cuela
 * un fallo en el camino que solo se recorre cuando importa.
 */
function abrirPreguntas() {
  if (stdin.isTTY) {
    const rl = createInterface({ input: stdin, output: stdout })
    return {
      preguntar: (t: string) => rl.question(t),
      cerrar: () => rl.close(),
    }
  }

  const pendientes = readFileSync(0, 'utf8').split('\n')
  return {
    preguntar: async (t: string) => {
      const linea = pendientes.shift() ?? ''
      console.log(t + linea)
      return linea
    },
    cerrar: () => {},
  }
}

/**
 * Cambia el valor de una variable en .env.local sin tocar nada más: ni los
 * comentarios, ni DATABASE_URL, ni el orden. Si no está, se añade al final.
 */
function ponerEnEnv(texto: string, clave: string, valor: string): string {
  const linea = `${clave}=${valor}`
  const patron = new RegExp(`^${clave}=.*$`, 'm')
  return patron.test(texto) ? texto.replace(patron, linea) : `${texto.trimEnd()}\n${linea}\n`
}

async function principal() {
  const { preguntar, cerrar } = abrirPreguntas()

  console.log('\n  Alta del administrador del panel\n')
  const usuario = (await preguntar('  Usuario (tu correo): ')).trim()
  const clave = (await preguntar('  Clave: ')).trim()
  const repetida = (await preguntar('  Repite la clave: ')).trim()

  if (!usuario) throw new Error('El usuario no puede quedar vacío.')
  if (clave.length < 10) {
    throw new Error('Usa al menos 10 caracteres: esta clave abre todo el panel.')
  }
  if (clave !== repetida) throw new Error('Las dos claves no coinciden.')

  const hash = cifrarClave(clave)
  const secreto = randomBytes(32).toString('base64')

  /* ── 1. En este ordenador ───────────────────────────────────────────────── */

  let escritoLocal = false
  if (existsSync(ENV)) {
    const respuesta = await preguntar('\n  ¿Escribo .env.local? [S/n]: ')
    // Vacío significa sí: es lo que se espera al pulsar Intro sobre un [S/n].
    if (respuesta.trim() === '' || afirma(respuesta)) {
      // Copia antes de tocar: este archivo no está en git y no tiene vuelta atrás.
      copyFileSync(ENV, `${ENV}.respaldo`)
      let texto = readFileSync(ENV, 'utf8')
      texto = ponerEnEnv(texto, 'ADMIN_USUARIO', usuario)
      texto = ponerEnEnv(texto, 'ADMIN_CLAVE_HASH', hash)
      // AUTH_SECRET solo se pone si está vacío: cambiarlo cierra las sesiones
      // abiertas, y quien ejecuta esto viene a cambiar la clave, no eso.
      if (/^AUTH_SECRET=\s*$/m.test(texto)) texto = ponerEnEnv(texto, 'AUTH_SECRET', secreto)
      writeFileSync(ENV, texto)
      escritoLocal = true
      console.log('  ✓ .env.local actualizado (copia en .env.local.respaldo)')
      console.log('    Si tenías «npm run dev» abierto, reinícialo: lee el archivo al arrancar.')
    }
  }

  /* ── 2. En producción ───────────────────────────────────────────────────── */

  const subir = afirma(await preguntar('\n  ¿Lo subo también a Vercel (producción)? [s/N]: '))
  cerrar()

  if (subir) {
    for (const [nombre, valor] of [
      ['ADMIN_USUARIO', usuario],
      ['ADMIN_CLAVE_HASH', hash],
    ] as const) {
      try {
        // Se borra antes porque `env add` no sobrescribe: sin esto quedan dos
        // valores para la misma variable y no se sabe cuál gana.
        execFileSync('npx', ['vercel', 'env', 'rm', nombre, 'production', '--yes'], {
          cwd: RAIZ,
          stdio: 'ignore',
        })
      } catch {
        // No existía. Es lo normal la primera vez.
      }
      execFileSync('npx', ['vercel', 'env', 'add', nombre, 'production'], {
        cwd: RAIZ,
        input: valor,
        stdio: ['pipe', 'ignore', 'inherit'],
      })
      console.log(`  ✓ ${nombre} guardada en Vercel`)
    }
    console.log('\n  ⚠ Falta lo que más se olvida: VUELVE A DESPLEGAR.')
    console.log('    Cambiar una variable no toca el despliegue que ya está corriendo.')
    console.log('\n      npx vercel --prod\n')
  } else {
    console.log('\n  ── Para pegarlo a mano en Vercel ─────────────────────────')
    console.log('  Settings → Environment Variables. SIN COMILLAS: el panel web')
    console.log('  guarda el valor tal cual y unas comillas de más lo invalidan.\n')
    console.log(`  ADMIN_USUARIO      ${usuario}`)
    console.log(`  ADMIN_CLAVE_HASH   ${hash}`)
    console.log('\n  Y después vuelve a desplegar:  npx vercel --prod')
  }

  if (!escritoLocal) {
    console.log('\n  ── Para .env.local (aquí sí van las comillas) ────────────\n')
    console.log(`AUTH_SECRET="${secreto}"`)
    console.log(`ADMIN_USUARIO="${usuario}"`)
    console.log(`ADMIN_CLAVE_HASH="${hash}"`)
  }

  console.log('\n  Ninguna lleva el prefijo NEXT_PUBLIC_: son de servidor.\n')
}

principal().catch((e) => {
  console.error(`\n  ✗ ${e.message}\n`)
  process.exit(1)
})
