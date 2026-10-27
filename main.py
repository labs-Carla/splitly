"""Splitly: API para dividir un gasto en pesos colombianos (COP) entre varias personas."""

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

FRONTEND_DIR = Path(__file__).resolve().parent / "frontend"

app = FastAPI(
    title="Splitly API",
    description="Divide un gasto en COP entre varias personas, sin perder pesos por redondeo.",
    version="2.0.0",
)


# ---------- Modelos de datos ----------

class SolicitudDivision(BaseModel):
    """Datos que envía el frontend."""

    # strict=True: solo acepta enteros de verdad (rechaza "90000", 90000.5 y true).
    monto: int = Field(gt=0, strict=True, description="Valor total del gasto en COP")
    personas: int = Field(ge=1, le=100, strict=True, description="Personas que comparten el gasto")

    model_config = {"json_schema_extra": {"examples": [{"monto": 10000, "personas": 3}]}}


class GrupoDePago(BaseModel):
    """Un grupo de personas que paga el mismo valor."""

    personas: int = Field(description="Cuántas personas pagan este valor")
    monto: int = Field(description="Valor que paga cada una, en COP")


class ResultadoDivision(BaseModel):
    """Respuesta que devuelve la API."""

    total: int
    personas: int
    monto_base: int
    personas_con_extra: int
    distribucion: list[GrupoDePago]


class ErrorValidacion(BaseModel):
    """Respuesta cuando los datos no son válidos."""

    errores: list[str]


# ---------- Regla de negocio ----------

def calcular_division(monto: int, personas: int) -> ResultadoDivision:
    # divmod devuelve (división entera, residuo). Ej: divmod(10000, 3) -> (3333, 1)
    monto_base, personas_con_extra = divmod(monto, personas)

    # El residuo siempre es menor que el número de personas, así que basta con
    # que las primeras "personas_con_extra" paguen 1 peso más.
    distribucion = []
    if personas_con_extra > 0:
        distribucion.append(GrupoDePago(personas=personas_con_extra, monto=monto_base + 1))
    # Siempre queda al menos una persona sin extra, por la misma razón.
    distribucion.append(GrupoDePago(personas=personas - personas_con_extra, monto=monto_base))

    return ResultadoDivision(
        total=monto,
        personas=personas,
        monto_base=monto_base,
        personas_con_extra=personas_con_extra,
        distribucion=distribucion,
    )


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

@app.post(
    "/api/dividir",
    response_model=ResultadoDivision,
    responses={422: {"model": ErrorValidacion, "description": "Datos inválidos"}},
)
def dividir_gasto(solicitud: SolicitudDivision) -> ResultadoDivision:
    return calcular_division(solicitud.monto, solicitud.personas)


# ---------- Frontend ----------
# Se monta al final para que /api/dividir y /docs tengan prioridad.
# Solo se publica la carpeta frontend/, así que main.py no se puede descargar.

app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
