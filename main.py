"""Splitly: API para dividir un gasto en pesos colombianos (COP) entre varias personas."""

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="Splitly API",
    description="Divide un gasto en COP entre varias personas.",
    version="1.0.0",
)


# ---------- Modelos de datos ----------

class SolicitudDivision(BaseModel):
    """Datos que envía el frontend."""

    # strict=True: solo acepta enteros de verdad (rechaza "90000", 90000.5 y true).
    monto: int = Field(gt=0, strict=True, description="Valor total del gasto en COP")
    personas: int = Field(ge=1, le=100, strict=True, description="Personas que comparten el gasto")

    model_config = {"json_schema_extra": {"examples": [{"monto": 90000, "personas": 3}]}}


class ResultadoDivision(BaseModel):
    """Respuesta que devuelve la API."""

    total: int
    personas: int
    monto_base: int
    personas_con_extra: int


# ---------- Errores de validación en español ----------

MENSAJES_POR_CAMPO = {
    "monto": "El monto debe ser un número entero mayor que 0.",
    "personas": "El número de personas debe ser un entero entre 1 y 100.",
}


@app.exception_handler(RequestValidationError)
async def manejar_error_validacion(request: Request, exc: RequestValidationError) -> JSONResponse:
    errores = []
    for error in exc.errors():
        campo = error["loc"][-1] if error["loc"] else None
        mensaje = MENSAJES_POR_CAMPO.get(campo, "La solicitud no tiene el formato esperado.")
        if mensaje not in errores:
            errores.append(mensaje)
    return JSONResponse(status_code=422, content={"errores": errores})


# ---------- API ----------

@app.post("/api/dividir", response_model=ResultadoDivision)
def dividir_gasto(solicitud: SolicitudDivision) -> ResultadoDivision:
    # divmod devuelve (división entera, residuo). Ej: divmod(100000, 3) -> (33333, 1)
    monto_base, personas_con_extra = divmod(solicitud.monto, solicitud.personas)
    return ResultadoDivision(
        total=solicitud.monto,
        personas=solicitud.personas,
        monto_base=monto_base,
        personas_con_extra=personas_con_extra,
    )


# ---------- Frontend ----------
# Se sirven solo estos tres archivos, para no exponer main.py ni otros archivos de la carpeta.

@app.get("/", include_in_schema=False)
def pagina_principal() -> FileResponse:
    return FileResponse(BASE_DIR / "index.html")


@app.get("/style.css", include_in_schema=False)
def hoja_de_estilos() -> FileResponse:
    return FileResponse(BASE_DIR / "style.css")


@app.get("/script.js", include_in_schema=False)
def script_frontend() -> FileResponse:
    return FileResponse(BASE_DIR / "script.js")
