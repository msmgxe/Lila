import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

/**
 * Verificación de la clave del administrador.
 *
 * Un solo usuario, así que no hay tabla de usuarios: la clave vive cifrada en
 * una variable de entorno. `scrypt` es deliberadamente lento —está pensado para
 * que probar claves a lo bruto salga caro— y viene en Node, sin dependencias.
 *
 * El formato guardado es `salt:hash`, ambos en hexadecimal.
 * Para generar uno:  npm run panel:clave
 */

const LONGITUD = 64
const COSTE = { N: 16384, r: 8, p: 1 }

export function cifrarClave(clave: string): string {
  const sal = randomBytes(16)
  const hash = scryptSync(clave.normalize('NFKC'), sal, LONGITUD, COSTE)
  return `${sal.toString('hex')}:${hash.toString('hex')}`
}

/**
 * Un hash guardado son 32 caracteres hex, dos puntos, y 128 más: 161 en total.
 *
 * Existe porque los dos fallos de configuración más probables —pegar la clave
 * en vez del hash, o pegarlo con comillas— hacían que `comprobarClave`
 * devolviera `false`, exactamente igual que una clave equivocada. Mismo
 * mensaje, causa opuesta, y a buscar el problema donde no está.
 */
export function formatoDeHashValido(guardado: string): boolean {
  return /^[0-9a-f]{32}:[0-9a-f]{128}$/i.test(limpiarGuardado(guardado))
}

/**
 * Quita lo que sobra de un copiar y pegar: espacios, saltos de línea y comillas
 * alrededor. En un hash hexadecimal ninguna de las tres cosas puede ser
 * legítima, así que quitarlas no enmascara nada — y el panel de Vercel guarda
 * el valor tal cual se pega, comillas incluidas.
 */
function limpiarGuardado(guardado: string): string {
  return guardado.trim().replace(/^["']|["']$/g, '')
}

export function comprobarClave(clave: string, guardadoBruto: string): boolean {
  const guardado = limpiarGuardado(guardadoBruto)
  const [salHex, hashHex] = guardado.split(':')
  if (!salHex || !hashHex) return false

  let esperado: Buffer
  try {
    esperado = Buffer.from(hashHex, 'hex')
  } catch {
    return false
  }
  if (esperado.length !== LONGITUD) return false

  const calculado = scryptSync(
    clave.normalize('NFKC'),
    Buffer.from(salHex, 'hex'),
    LONGITUD,
    COSTE,
  )
  // Comparación en tiempo constante: comparar con === filtra información sobre
  // cuántos bytes coinciden y permite adivinar el hash byte a byte.
  return timingSafeEqual(calculado, esperado)
}
