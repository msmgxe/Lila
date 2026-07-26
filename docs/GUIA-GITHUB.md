# Guía de GitHub y publicación — paso a paso

Esta guía asume que **no has usado Git ni GitHub nunca**. Va desde cero hasta
tener el sitio publicado en internet con una dirección propia.

Tiempo estimado: **20 minutos** la primera vez. Después, subir un cambio son
30 segundos.

---

## Índice

1. [Qué es cada cosa](#1-qué-es-cada-cosa)
2. [Comprobar que Git está listo](#2-comprobar-que-git-está-listo)
3. [El repositorio local ya está creado](#3-el-repositorio-local-ya-está-creado)
4. [Crear el repositorio en GitHub](#4-crear-el-repositorio-en-github)
5. [Subirlo](#5-subirlo)
6. [Publicar en Vercel](#6-publicar-en-vercel)
7. [El día a día: subir un cambio](#7-el-día-a-día-subir-un-cambio)
8. [Trabajar con ramas](#8-trabajar-con-ramas)
9. [Si algo falla](#9-si-algo-falla)
10. [Las cinco órdenes que necesitas](#10-las-cinco-órdenes-que-necesitas)

---

## 1. Qué es cada cosa

| Palabra | Qué es, en corto |
|---|---|
| **Git** | Un programa en tu ordenador que guarda el historial de tus archivos. |
| **GitHub** | Una web donde ese historial vive en internet, como copia de seguridad. |
| **Repositorio** (*repo*) | La carpeta del proyecto con su historial dentro. |
| **Commit** | Una foto del proyecto en un momento dado, con un mensaje que la explica. |
| **Push** | Enviar tus commits a GitHub. |
| **Rama** (*branch*) | Una línea de trabajo paralela. La principal se llama `main`. |
| **Vercel** | El servicio que coge tu código de GitHub y lo publica en internet. |

La idea completa en una línea:

```
Editas archivos → commit (foto) → push (a GitHub) → Vercel publica solo
```

---

## 2. Comprobar que Git está listo

En la terminal, dentro de la carpeta del proyecto:

```bash
git --version
```

Si responde algo como `git version 2.54.0`, ya lo tienes. Si dice que no existe,
instálalo desde <https://git-scm.com/downloads>.

**Preséntate a Git** (solo hace falta una vez en tu vida, y ya puede estar hecho):

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tucorreo@ejemplo.com"
```

Usa el mismo correo con el que te registrarás en GitHub.

---

## 3. El repositorio local ya está creado

Esto ya está hecho: el proyecto tiene su repositorio iniciado y un primer commit
con todo el código. Puedes comprobarlo:

```bash
git log --oneline
```

Verás una línea con el primer commit.

```bash
git status
```

Debería decir `nothing to commit, working tree clean` (nada pendiente).

> ### ⚠️ Lo único que no puede fallar
>
> El archivo `.env.local` —el que tiene las contraseñas de la base de datos—
> **no se sube nunca**. Está en `.gitignore`, así que Git lo ignora solo.
>
> Compruébalo ahora mismo:
> ```bash
> git status --short | grep env
> ```
> **Esto no debe devolver nada.** Si devuelve `.env.local`, para y avísame.
>
> Regla general: si un archivo contiene una contraseña, una clave o un *token*,
> no va a GitHub. Nunca. Ni en un repositorio privado.

---

## 4. Crear el repositorio en GitHub

1. Entra en **<https://github.com>** y crea una cuenta si no la tienes.
2. Arriba a la derecha, **+** → **New repository**.
3. Rellena:
   - **Repository name**: `aurelia`
   - **Description**: `Obra reunida — biblioteca de poesía`
   - **Public** o **Private**: elige **Private** por ahora. Se puede cambiar
     cuando quieras, y Vercel funciona con los dos.
   - **NO marques** ninguna de las tres casillas de abajo (*Add a README*,
     *Add .gitignore*, *Choose a license*). El proyecto ya trae lo suyo, y
     marcarlas crea un conflicto que hay que resolver a mano.
4. **Create repository**.

GitHub te enseña una página con instrucciones. Fíjate solo en la dirección de
arriba, que será algo como:

```
https://github.com/tu-usuario/aurelia.git
```

---

## 5. Subirlo

Copia estas tres líneas cambiando `tu-usuario` por el tuyo:

```bash
git remote add origin https://github.com/tu-usuario/aurelia.git
git branch -M main
git push -u origin main
```

Qué hace cada una:

1. `remote add origin` — le dice a tu Git dónde vive la copia de internet.
   `origin` es solo un apodo.
2. `branch -M main` — se asegura de que la rama principal se llama `main`.
3. `push -u origin main` — envía todo. El `-u` hace que en adelante baste con
   escribir `git push`.

**Te pedirá usuario y contraseña.** GitHub ya no acepta la contraseña normal:

- Lo más cómodo es instalar **GitHub CLI** (<https://cli.github.com>) y ejecutar
  `gh auth login` una vez. Después Git no vuelve a preguntar.
- La alternativa es crear un *token*: en GitHub, **Settings → Developer settings
  → Personal access tokens → Tokens (classic) → Generate new token**, marca el
  permiso `repo`, y usa ese token como si fuera la contraseña.

Recarga la página de GitHub. Deberías ver todos tus archivos.

---

## 6. Publicar en Vercel

1. Entra en **<https://vercel.com>** y **Sign up with GitHub**.
2. **Add New → Project**.
3. Busca `aurelia` en la lista y pulsa **Import**.
4. Vercel detecta Next.js solo. **No cambies nada** de Framework Preset, Build
   Command ni Output Directory.
5. **Environment Variables** — aquí tienes dos caminos:
   - **Recomendado:** despliega ya, sin variables. El sitio funcionará con el
     contenido de muestra. Después conecta la integración de Neon, que las
     rellena sola (ver [GUIA-BASE-DE-DATOS.md, paso 8](GUIA-BASE-DE-DATOS.md#8-conectar-neon-con-vercel)).
   - **A mano:** añade `DATABASE_URL` y `DATABASE_URL_UNPOOLED` con los valores
     de tu `.env.local`. **Sin el prefijo `NEXT_PUBLIC_`.**
6. **Deploy**. Tarda entre uno y dos minutos.

Al terminar te da una dirección tipo `https://aurelia-xxx.vercel.app`. **Ya está
publicado.**

### Ponerle tu propio dominio

En el proyecto de Vercel → **Settings → Domains → Add**. Escribe tu dominio y
Vercel te dice exactamente qué dos registros DNS tienes que crear en la empresa
donde lo compraste. El certificado HTTPS lo pone Vercel solo.

---

## 7. El día a día: subir un cambio

A partir de aquí, publicar es esto:

```bash
git add .
git commit -m "Añado el poema Los nombres del agua"
git push
```

Y ya. **Vercel detecta el push y republica solo**, en un par de minutos. No hay
que hacer nada más.

- `git add .` — mete todos los cambios en la foto que vas a hacer.
- `git commit -m "..."` — hace la foto con ese mensaje. Escribe mensajes que
  expliquen *qué* cambiaste, no *cómo*: «Corrijo el corte de estrofa de Ausencia»
  vale mucho más que «cambios».
- `git push` — lo envía.

Para ver qué vas a subir antes de subirlo:

```bash
git status          # qué archivos han cambiado
git diff            # qué ha cambiado exactamente dentro
```

---

## 8. Trabajar con ramas

Cuando el cambio sea grande y no quieras tocar la web publicada:

```bash
git checkout -b nueva-seccion      # crea una rama y te cambia a ella
# ... trabajas, haces commits ...
git push -u origin nueva-seccion
```

Al subir una rama, **Vercel publica una web de previsualización aparte**, con su
propia dirección. La web de verdad no se toca. Si además tienes la integración de
Neon, esa previsualización usa **su propia copia de la base de datos**: puedes
probar migraciones sin miedo.

Cuando estés conforme, en GitHub sale un botón **Compare & pull request** →
créala → **Merge**. Al fusionar en `main`, Vercel republica la web de verdad.

Para volver a la rama principal en tu ordenador:

```bash
git checkout main
git pull                # trae los cambios fusionados
```

---

## 9. Si algo falla

| Mensaje | Qué pasa | Solución |
|---|---|---|
| `remote origin already exists` | Ya habías enlazado un repositorio | `git remote set-url origin https://github.com/tu-usuario/aurelia.git` |
| `Authentication failed` | GitHub no acepta la contraseña normal | Usa `gh auth login` o un token (ver [paso 5](#5-subirlo)) |
| `Updates were rejected` | Hay cambios en GitHub que no tienes | `git pull --rebase` y luego `git push` |
| `nothing to commit` | No has cambiado nada, o ya hiciste el commit | Comprueba con `git status` |
| El *deploy* falla en Vercel | Un error de compilación | Abre el registro en Vercel; el error suele estar en las últimas líneas. Pruébalo antes en local con `npm run build` |
| La web sale pero sin poemas | Faltan las variables de entorno | Añádelas en Vercel y vuelve a desplegar. Aun así debería salir el contenido de muestra |
| Subí `.env.local` sin querer | La contraseña está expuesta | **Cambia la contraseña en Neon inmediatamente** (Reset password). Borrar el archivo no basta: queda en el historial |

**Deshacer sin haber subido nada:**

```bash
git checkout -- archivo.tsx    # descarta los cambios de un archivo
git reset --soft HEAD~1        # deshace el último commit y conserva los cambios
```

Si ya has subido, no rehagas el historial: haz un commit nuevo que corrija.

---

## 10. Las cinco órdenes que necesitas

```bash
git status                     # ¿qué he cambiado?
git add .                      # preparo todo para la foto
git commit -m "mensaje"        # hago la foto
git push                       # la envío a GitHub (y Vercel publica)
git pull                       # traigo lo que haya de nuevo
```

Con estas cinco se cubre el 95 % del trabajo. Lo demás se busca cuando haga falta.

---

**Antes de publicar, la lista de comprobación:**

- [ ] `npm run build` termina sin errores
- [ ] `git status --short | grep env` no devuelve nada
- [ ] Has mirado el sitio en el móvil, no solo en el ordenador

**Siguiente paso:** [GUIA-BASE-DE-DATOS.md](GUIA-BASE-DE-DATOS.md) si aún no has montado Neon.
