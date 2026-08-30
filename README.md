# El Paisa - Tony · Fidelización

App de fidelización con QR: el cliente escanea, deja sus datos, responde una
encuesta corta y juega en la "máquina de la suerte" por un premio.
El panel de admin te deja cambiar premios, encuesta, términos y ver el
historial de jugadas.

Esta versión ya NO depende de Claude ni de tener cuenta ahí — es una web
normal que cualquiera puede abrir desde su celular.

---

## 1. Crea el proyecto en Supabase (la base de datos, gratis)

1. Ve a https://supabase.com y crea una cuenta gratis.
2. Click en "New project". Ponle un nombre (ej. `paisa-tony`) y una
   contraseña de base de datos (guárdala, no la necesitarás seguido).
3. Cuando el proyecto termine de crearse, ve a la sección **SQL Editor**
   (ícono de la izquierda).
4. Abre el archivo `supabase.sql` de esta carpeta, copia TODO su contenido,
   pégalo en el editor y dale **Run**. Esto crea las 3 tablas que necesita
   la app.
5. Ve a **Project Settings → API**. Ahí vas a ver:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **anon public key** (una clave larga)

   Vas a necesitar esos dos valores en el paso 3.

## 2. Prueba la app en tu computadora (opcional pero recomendado)

```bash
npm install
cp .env.example .env
```

Abre el archivo `.env` y reemplaza los valores con tu **Project URL** y tu
**anon public key** de Supabase.

```bash
npm run dev
```

Abre el link que te muestra la terminal (normalmente `http://localhost:5173`)
y prueba todo el flujo: entra al panel admin (contraseña `1234`, cámbiala),
ajusta premios y textos, y prueba jugar como cliente.

## 3. Sube el código a GitHub

1. Crea una cuenta gratis en https://github.com si no tienes.
2. Crea un repositorio nuevo (puede ser privado).
3. Sube esta carpeta a ese repositorio (GitHub te muestra los comandos
   exactos apenas creas el repo, o puedes arrastrar los archivos desde la
   web de GitHub si prefieres no usar la terminal).

## 4. Publícalo en Vercel (gratis, con URL propia)

1. Ve a https://vercel.com y entra con tu cuenta de GitHub.
2. Click en **Add New → Project** y elige el repositorio que acabas de subir.
3. Vercel detecta automáticamente que es un proyecto Vite — no cambies nada
   en "Build settings".
4. Antes de darle "Deploy", abre la sección **Environment Variables** y
   agrega las mismas dos que usaste en el `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click en **Deploy**. En un par de minutos te da una URL como
   `https://paisa-tony.vercel.app` — esa es la página real de tu restaurante.

## 5. Genera el QR (ya es automático)

Abre la URL que te dio Vercel. En la pantalla principal vas a ver un código
QR real, generado automáticamente a partir de esa misma URL — no necesitas
ninguna herramienta externa. Tómale una captura o ábrela en una pantalla más
grande, y desde ahí puedes imprimirla o mandarla a hacer en una gráfica
local para ponerla en el mostrador.

Cada vez que cambies de dominio (por ejemplo si luego conectas un dominio
propio como `elpaisa-tony.com`), el QR se actualiza solo, porque siempre
apunta a la URL desde la que se está viendo la página.

## 6. Administra tu negocio

Desde la misma URL pública, toca "Panel del negocio" abajo, entra con tu
contraseña (cámbiala en la pestaña General ni bien entres) y ajusta:

- Nombre, frase y términos del restaurante
- La pregunta y opciones de la encuesta
- Las 10 fichas de premios (recuerda: la ficha 1 es la menos probable y la
  10 la más probable)
- El historial de jugadas, y puedes desbloquear un celular manualmente si
  alguien necesita jugar antes de las 24 horas

---

## Nota de seguridad (importante, léela)

Esta app no tiene servidor propio: el navegador habla directo con Supabase.
Eso significa que la contraseña de admin es una traba simple de interfaz,
no seguridad real — alguien con conocimientos técnicos podría llegar a leer
o modificar la configuración directamente. Para un piloto con bajo riesgo
(un restaurante local) esto es razonable. Si más adelante vendes esto a
varios negocios o manejas premios de alto valor, el siguiente paso es mover
las escrituras de administrador a una Supabase Edge Function con
autenticación real. Cuando llegue ese momento, retómalo con Claude.
