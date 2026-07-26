#!/usr/bin/env python3
"""
Importador de los originales en .docx  →  src/lib/contenido/pentapoemario.ts

    python3 scripts/importar-docx.py

Se ejecuta a mano, cuando llegan capítulos nuevos. No forma parte del sitio en
funcionamiento: su salida es un archivo TypeScript que sí se versiona, de modo
que el proyecto no depende de Word ni de Python para arrancar.

Por qué está en Python y no en TypeScript: un .docx es un ZIP con XML dentro, y
Python trae `zipfile` en la biblioteca estándar. Node no lee ZIP sin añadir una
dependencia, y no compensa arrastrarla por una tarea que se hace de uvas a peras.

── Cómo se reconoce un poema ──────────────────────────────────────────────────
El primer párrafo es la cabecera del capítulo y se descarta. Después, cada poema
es un título seguido de sus versos.

El título NO se detecta por posición ni por «la primera línea del bloque»: se
detecta porque **va en negrita**. Es una señal estructural del documento, no una
corazonada. Hace falta porque los capítulos no son homogéneos — en el 5, Word
pegó los títulos al final del verso anterior sin salto de línea, y solo la
negrita permite separarlos.
"""

import html
import re
import unicodedata
import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ORIGEN = RAIZ / 'origen'
DESTINO = RAIZ / 'src' / 'lib' / 'contenido' / 'pentapoemario.ts'
PORTADAS = RAIZ / 'public' / 'portadas'

AUTOR = 'José Andrés Saldarriaga Medina'
OBRA = 'Pentapoemario lila'

ORDINALES = [
    '', 'primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto',
    'séptimo', 'octavo', 'noveno', 'décimo', 'undécimo', 'duodécimo',
]
ROMANOS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']


def parrafos(ruta):
    """Devuelve una lista de párrafos, cada uno como [(texto, negrita)]."""
    xml = zipfile.ZipFile(ruta).read('word/document.xml').decode('utf-8')
    salida = []
    for parrafo in re.findall(r'<w:p\b.*?</w:p>|<w:p\b[^>]*/>', xml, re.S):
        runs = []
        for run in re.findall(r'<w:r\b.*?</w:r>', parrafo, re.S):
            props = re.search(r'<w:rPr>(.*?)</w:rPr>', run, re.S)
            # <w:b/> activa negrita; <w:b w:val="0"/> la desactiva.
            negrita = False
            if props:
                m = re.search(r'<w:b\b([^>]*)/?>', props.group(1))
                negrita = bool(m) and 'w:val="0"' not in m.group(1)
            texto = re.sub(r'<w:br\s*/>', '\n', run)
            texto = html.unescape(''.join(re.findall(r'<w:t[^>]*>(.*?)</w:t>', texto, re.S)))
            if texto:
                runs.append((texto, negrita))
        salida.append(runs)
    return salida


def limpiar(s):
    """Quita espacios sobrantes y el punto final que arrastran algunos títulos."""
    return re.sub(r'\s+', ' ', s).strip().rstrip('.').strip()


def poemas_de(ruta):
    """
    Recorre los párrafos y separa títulos de versos.

    La regla fina: Word parte un mismo título en varios `run` seguidos —el
    corrector ortográfico va cortando— de forma que «Púrpura letanía» llega como
    ('P') + ('úrpura letanía'). Por eso **un título nuevo empieza solo cuando la
    negrita ARRANCA**, no en cada run en negrita; los siguientes se le pegan.
    Un fin de párrafo cierra el título y cierra el verso en curso.
    """
    ps = parrafos(ruta)[1:]  # el primer párrafo es «Poemas del capítulo N…»
    poemas, actual = [], None
    buffer_verso = ''
    en_titulo = False

    def cerrar_verso():
        nonlocal buffer_verso
        v = re.sub(r'\s+', ' ', buffer_verso).strip()
        buffer_verso = ''
        if v and actual is not None:
            actual['versos'].append(v)

    for runs in ps:
        for texto, negrita in runs:
            if negrita:
                if texto.strip():
                    if not en_titulo:
                        cerrar_verso()
                        actual = {'titulo': texto, 'versos': []}
                        poemas.append(actual)
                        en_titulo = True
                    else:
                        actual['titulo'] += texto
                elif en_titulo:
                    # Run en negrita con solo un espacio: es la separación entre
                    # dos trozos del mismo título. Si se descarta, las palabras
                    # se pegan («Platónicaensoñación»).
                    actual['titulo'] += texto
            else:
                if texto.strip():
                    en_titulo = False
                # Un <w:br/> dentro del run también separa versos.
                trozos = texto.split('\n')
                buffer_verso += trozos[0]
                for t in trozos[1:]:
                    cerrar_verso()
                    buffer_verso = t
        cerrar_verso()
        en_titulo = False

    for p in poemas:
        p['titulo'] = limpiar(p['titulo'])
    return [p for p in poemas if p['versos'] and p['titulo']]


def slug(s):
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()
    return re.sub(r'-+$', '', re.sub(r'^-+', '', re.sub(r'[^a-z0-9]+', '-', s)))


def ts(valor, sangria=0):
    """Serializa a TypeScript legible, con las comillas escapadas."""
    pad = '  ' * sangria
    if valor is None:
        return 'null'
    if isinstance(valor, bool):
        return 'true' if valor else 'false'
    if isinstance(valor, (int, float)):
        return str(valor)
    if isinstance(valor, str):
        return "'" + valor.replace('\\', '\\\\').replace("'", "\\'") + "'"
    if isinstance(valor, list):
        if not valor:
            return '[]'
        cuerpo = ',\n'.join(pad + '  ' + ts(v, sangria + 1) for v in valor)
        return '[\n' + cuerpo + ',\n' + pad + ']'
    if isinstance(valor, dict):
        cuerpo = ',\n'.join(
            f'{pad}  {k}: {ts(v, sangria + 1)}' for k, v in valor.items()
        )
        return '{\n' + cuerpo + ',\n' + pad + '}'
    raise TypeError(type(valor))


def main():
    archivos = sorted(
        ORIGEN.glob('*.docx'),
        key=lambda p: int(re.search(r'cap[ií]tulo\s*(\d+)', p.name, re.I).group(1)),
    )
    if not archivos:
        raise SystemExit(f'No hay .docx en {ORIGEN}')

    # Portadas ya copiadas a public/portadas/capitulo-N.jpg
    disponibles = {
        int(m.group(1))
        for f in PORTADAS.glob('capitulo-*.jpg')
        if (m := re.search(r'capitulo-(\d+)', f.name))
    } if PORTADAS.exists() else set()

    libros, folio = [], 1
    total_poemas = 0

    for ruta in archivos:
        n = int(re.search(r'cap[ií]tulo\s*(\d+)', ruta.name, re.I).group(1))
        ps = poemas_de(ruta)
        total_poemas += len(ps)

        libros.append({
            'id': f'cap-{n}',
            'slug': f'capitulo-{n}',
            'volumen': OBRA,
            'titulo': f'Capítulo {ORDINALES[n]}',
            'subtitulo': f'{len(ps)} poemas · capítulo {ROMANOS[n]}',
            'descripcion': 'Cinco versos por poema. Todos los títulos empiezan por la misma letra.',
            'categoria': 'pentapoemas',
            'orden': n - 1,
            'colorAcento': '#8B5CF6',
            'portadaUrl': f'/portadas/capitulo-{n}.jpg' if n in disponibles else None,
            'anio': 2026,
            'publicado': True,
            'paginaBase': folio,
            'poemas': [
                {
                    'id': f'cap{n}-p{i}',
                    'slug': slug(p['titulo']),
                    'titulo': p['titulo'],
                    'forma': 'pentapoema',
                    'dedicatoria': None,
                    'notaAutor': None,
                    'anio': 2026,
                    'temas': [],
                    'orden': i,
                    'publicado': True,
                    'estrofas': [p['versos']],
                    'planchas': [],
                    'audios': [],
                }
                for i, p in enumerate(ps)
            ],
        })
        # portada + índice + un pliego por poema + colofón, a dos caras cada uno
        folio += (3 + len(ps)) * 2

    cabecera = f'''/**
 * {OBRA} — {AUTOR}
 *
 * ARCHIVO GENERADO. No editar a mano: lo reescribe
 *     python3 scripts/importar-docx.py
 * a partir de los .docx de origen/. Para cambiar un poema, usa el panel de
 * administración (/panel) o edita el .docx y vuelve a importar.
 *
 * {len(libros)} capítulos · {total_poemas} poemas
 */

import type {{ Libro }} from '../tipos'

export const AUTOR = '{AUTOR}'
export const OBRA = '{OBRA}'

export const LIBROS_PENTAPOEMARIO: Libro[] = '''

    DESTINO.write_text(cabecera + ts(libros) + '\n', encoding='utf-8')

    print(f'\n  ✓ {len(libros)} capítulos, {total_poemas} poemas')
    for l in libros:
        marca = '🖼' if l['portadaUrl'] else '  '
        print(f"    {marca} {l['titulo']:22} {len(l['poemas'])} poemas   pág. {l['paginaBase']:>3}")

    # ── Controles de integridad ───────────────────────────────────────────
    # Word parte los títulos en varios `run`, y una extracción ingenua se come
    # la primera letra sin avisar. Estas comprobaciones son el canario: en esta
    # obra TODOS los títulos empiezan por P y todos los poemas tienen 5 versos.
    avisos = []
    vistos = set()
    for l in libros:
        for p in l['poemas']:
            ref = f"{l['slug']}/{p['slug']}"
            versos = p['estrofas'][0]
            if not p['titulo'][:1].upper() == 'P':
                avisos.append(f'título que no empieza por P: {ref} → «{p["titulo"]}»')
            if len(versos) != 5:
                avisos.append(f'{len(versos)} versos en vez de 5: {ref}')
            if any(not v.strip() for v in versos):
                avisos.append(f'verso vacío en {ref}')
            if ref in vistos:
                avisos.append(f'slug repetido: {ref}')
            vistos.add(ref)

    if avisos:
        print(f'\n  ⚠ {len(avisos)} aviso(s):')
        for a in avisos[:20]:
            print(f'      · {a}')
        raise SystemExit('\n  Extracción sospechosa: revisa el .docx antes de seguir.\n')

    print(f'  ✓ {len(vistos)} poemas comprobados: 5 versos, título con P, slug único')
    print(f'\n  → {DESTINO.relative_to(RAIZ)}\n')


if __name__ == '__main__':
    main()
