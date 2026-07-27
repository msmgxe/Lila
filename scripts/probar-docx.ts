/**
 * Banco de pruebas del lector de .docx contra los documentos de verdad.
 *
 * Existe porque las dos veces que este lector falló, falló en silencio: se
 * comía la primera letra de un título o pegaba dos palabras. Nada reventaba —
 * simplemente la obra salía mal escrita. Aquí se ve de un vistazo.
 *
 *   npm run docx:probar
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { leerDocx, revisarForma } from '../src/lib/docx'

const DIR = process.argv[2] ?? '/Users/marco/Proyectos/Pepe/origen'

if (!existsSync(DIR)) {
  console.error(`No existe la carpeta ${DIR}`)
  process.exit(1)
}

const archivos = readdirSync(DIR)
  .filter((f) => f.endsWith('.docx') && !f.startsWith('~$'))
  .sort()

let limpios = 0
let conAvisos = 0

for (const nombre of archivos) {
  try {
    const { poemas, encabezado, avisos } = leerDocx(new Uint8Array(readFileSync(`${DIR}/${nombre}`)))
    const todos = [...avisos, ...revisarForma(poemas)]
    todos.length === 0 ? limpios++ : conAvisos++

    console.log(`\n${todos.length === 0 ? '✓' : '⚠'} ${nombre}`)
    if (encabezado) console.log(`   encabezado: ${encabezado}`)
    for (const p of poemas) {
      const versos = p.estrofas.reduce((n, e) => n + e.length, 0)
      console.log(`   · ${p.titulo}  (${versos} versos)`)
    }
    for (const a of todos) console.log(`   ↳ ${a}`)
  } catch (error) {
    conAvisos++
    console.log(`\n✗ ${nombre}\n   ${(error as Error).message}`)
  }
}

console.log(`\n${limpios} limpios, ${conAvisos} con avisos, de ${archivos.length}`)
process.exit(conAvisos > 0 ? 1 : 0)
