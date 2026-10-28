# Splitly

Divide cualquier gasto en pesos colombianos entre varias personas, al peso y sin redondeos.

Splitly es una página de aterrizaje con una calculadora integrada. El frontend está hecho con HTML, CSS y JavaScript sin frameworks, y la lógica de reparto vive en una API construida con FastAPI. Es un proyecto del taller práctico Reto Full Stack del SENA.

## Captura

<!-- Agrega aquí una captura: guarda la imagen en docs/captura.png y descomenta la línea de abajo -->
<!-- ![Splitly en escritorio y móvil](docs/captura.png) -->

## Funcionalidades

- Calculadora conectada a la API: el navegador envía el monto y el número de personas, y pinta lo que responde el servidor.
- Asistente paso a paso en lugar del formulario de la v2: una pregunta por pantalla (monto, personas y nombres opcionales), y el resultado muestra cuánto paga cada persona por su nombre.
- Dictado por voz con la Web Speech API del navegador: se dice «120 mil entre 4» y Splitly lee el resultado en voz alta. Funciona en Chrome y Edge, sin claves ni servicios pagos; en Firefox el botón explica que hay que usar otro navegador.
- Reparto exacto con distribución de sobrantes: la suma de lo que paga cada persona siempre es igual al total.
- Mensajes de error en español, tanto de la API como de la interfaz.
- Formato de moneda COP (por ejemplo, `$ 3.334`) y separador de miles mientras se escribe el monto.
- Landing con navbar, hero, beneficios, cómo funciona y footer.
- Menú móvil accesible.
- Diseño responsive desde 320 px hasta escritorio.
- Respeto a `prefers-reduced-motion`.

## Tecnologías

| Capa | Tecnologías |
| --- | --- |
| Frontend | HTML5 semántico, CSS3 (variables, grid, `clamp()`, `:focus-within`, `backdrop-filter`), JavaScript vanilla con Fetch API |
| Backend | Python 3, FastAPI, Pydantic, Uvicorn |

El proyecto no usa base de datos, ni frameworks de frontend, ni dependencias externas en el navegador.

## Arquitectura

```text
+-------------+        GET /  (HTML, CSS, JS)         +---------------------------+
|             | <------------------------------------ |  FastAPI (main.py)        |
|  Navegador  |                                       |                           |
|             |   POST /api/dividir {monto, personas} |  StaticFiles -> frontend/ |
|             | ------------------------------------> |  Pydantic valida          |
|             | <------------------------------------ |  divmod calcula           |
+-------------+        200 con el reparto / 422       +---------------------------+
```

FastAPI sirve la carpeta `frontend/` con `StaticFiles` y expone `POST /api/dividir`. Esa ruta valida los datos con Pydantic y calcula el reparto con `divmod`.

El frontend no calcula nada: solo da formato al texto que escribe la persona, llama a la API y muestra la respuesta. El backend es la única fuente de las reglas de negocio, tanto de la validación como del reparto. Así, si una regla cambia, se modifica en un solo lugar.

## Estructura del proyecto

```text
splitly-charla/
├── main.py             # API FastAPI: modelos, regla de reparto, errores en español y archivos estáticos
├── requirements.txt    # Dependencias de Python (fastapi, uvicorn)
├── README.md           # Este archivo
├── .gitignore          # Excluye .venv/ y __pycache__/
└── frontend/
    ├── index.html      # Landing y calculadora (marcado semántico)
    ├── style.css       # Estilos: variables, componentes con nombres tipo BEM, responsive
    ├── script.js       # Menú móvil, formato de monto y comunicación con la API
    └── flujos.js       # Asistente paso a paso y dictado por voz (usa funciones de script.js)
```

## Cómo ejecutarlo

Requisitos: Python 3. El proyecto se desarrolló con Python 3.14.

En Linux, macOS o WSL:

```bash
git clone <url-de-tu-repositorio>
cd splitly-charla   # o el nombre de la carpeta de tu repositorio
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

En Windows PowerShell, el entorno virtual se activa con:

```powershell
.venv\Scripts\Activate.ps1
```

El resto de los comandos es igual.

Luego abre:

- La aplicación: http://127.0.0.1:8001/
- La documentación interactiva de la API: http://127.0.0.1:8001/docs

Se usa el puerto 8001 porque el 8000 suele estar ocupado por otros programas. Si la página "no abre" o responde algo inesperado, prueba otro puerto con `--port`.

## API

### `POST /api/dividir`

Divide un monto entre un número de personas.

**Campos de entrada (JSON)**

| Campo | Tipo | Regla |
| --- | --- | --- |
| `monto` | entero | Mayor que 0. Estricto. |
| `personas` | entero | Entre 1 y 100. Estricto. |

"Estricto" significa que solo se aceptan enteros reales: no se aceptan textos como `"90000"`, decimales ni booleanos.

**Ejemplo de solicitud**

```json
{ "monto": 10000, "personas": 3 }
```

**Respuesta 200**

```json
{
  "total": 10000,
  "personas": 3,
  "monto_base": 3333,
  "personas_con_extra": 1,
  "distribucion": [
    { "personas": 1, "monto": 3334 },
    { "personas": 2, "monto": 3333 }
  ]
}
```

`total`, `personas`, `monto_base` y `personas_con_extra` son el contrato original de la API. El campo `distribucion` se añadió después para que el frontend pueda mostrar el reparto sin tener que calcularlo.

**Respuesta 422 (datos inválidos)**

```json
{ "errores": ["El monto debe ser un número entero mayor que 0."] }
```

Los mensajes que devuelve la API son:

- `El monto debe ser un número entero mayor que 0.`
- `El número de personas debe ser un entero entre 1 y 100.`

Si ambos campos son inválidos, la lista incluye los dos mensajes. Si falta uno de los campos, la API responde con el mensaje de ese campo. Si el cuerpo no es JSON válido o no es un objeto, responde `La solicitud no tiene el formato esperado.`

**Ejemplo con curl**

```bash
curl -X POST http://127.0.0.1:8001/api/dividir \
  -H "Content-Type: application/json" \
  -d '{"monto": 10000, "personas": 3}'
```

## Cómo se reparte el sobrante

La API usa `divmod`, que devuelve el cociente entero y el residuo de una división. Con 10.000 entre 3 personas:

```text
divmod(10000, 3) -> (3333, 1)
```

- El monto base es 3.333.
- Sobra 1 peso, así que 1 persona paga 3.334 y las otras 2 pagan 3.333.
- Comprobación: 3.334 + 3.333 × 2 = 10.000.

Nunca se pierde ni sobra un peso porque el residuo de una división entera siempre es menor que el número de personas. Por eso basta con que las primeras personas (tantas como indique el residuo) paguen 1 peso más, y siempre queda al menos una persona pagando el monto base.

## Pruebas manuales

El proyecto no incluye pruebas automatizadas. Estos son los escenarios para comprobarlo a mano:

| Monto | Personas | Resultado esperado |
| --- | --- | --- |
| 90.000 | 3 | $ 30.000 cada una |
| 10.000 | 3 | 1 persona paga $ 3.334 y 2 personas pagan $ 3.333 |
| 0, negativo o "diez mil" | cualquiera válido | Error del monto |
| cualquiera válido | 0 o 101 | Error del número de personas |
| vacío (cualquiera de los dos campos) | | "Completa los dos campos para calcular." (mensaje del frontend, no se llama a la API) |

Comprobaciones de interfaz:

- Los enlaces de la navbar llevan a sus secciones (anclas).
- Menú móvil: se abre con el botón y se cierra al pulsar un enlace, con Escape o con un clic fuera del header.
- Navegación con Tab, incluido el enlace "Saltar al contenido".
- A 320 px de ancho no aparece scroll horizontal.
- El año del footer se actualiza dinámicamente.

## Decisiones de diseño

- **Campo `distribucion` en la API.** Permite respetar la regla "el frontend no calcula": el navegador solo muestra los grupos que le entrega el servidor.
- **Campos `type="text"` con `inputmode="numeric"`.** Dejan mostrar "90.000" con separador de miles, permiten que el backend reciba y rechace textos, y evitan que "90.000" se interprete como 90.
- **`#0071E3` para texto y botones; `#007AFF` solo para elementos no textuales.** Sobre blanco, `#007AFF` no alcanza el contraste 4,5:1 de WCAG AA para texto normal; `#0071E3` sí.
- **`StaticFiles` sobre `frontend/`.** Solo se publica esa carpeta, de modo que `main.py` no se puede descargar.
- **Pydantic en modo estricto.** Rechaza textos, decimales y booleanos en lugar de convertirlos en silencio.
- **Errores de validación traducidos.** Un manejador propio convierte los errores de Pydantic en mensajes en español, sin duplicados.

## Accesibilidad

- Cada campo tiene su `label` asociado.
- Los campos usan `aria-describedby` para enlazar su texto de ayuda.
- El cuadro de error usa `role="alert"`.
- La tarjeta de resultado usa `aria-live="polite"`.
- El botón del menú móvil usa `aria-expanded` y `aria-controls`.
- El botón de calcular usa `aria-busy` mientras espera la respuesta.
- Hay un enlace "Saltar al contenido".
- El foco es visible con `:focus-visible`.
- Se respeta `prefers-reduced-motion`.
- Texto y botones usan colores con contraste WCAG AA.

## Posibles mejoras

Ninguna de estas ideas está implementada.

- Pruebas automatizadas con pytest y `TestClient` de FastAPI.
- Dividir por porcentajes o con montos distintos por persona.
- Compartir el resultado.
- Modo oscuro.

## Créditos

Proyecto desarrollado en el taller práctico Reto Full Stack SENA, con apoyo de IA como asistente de programación.

Hecho por:

- **Carla Valderrama** · [@labs-Carla](https://github.com/labs-Carla)
- **Sonia Cano G.** · [@DreamHunterG](https://github.com/DreamHunterG)
