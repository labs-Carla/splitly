// ---------- Referencias a los elementos de la página ----------
const formulario = document.getElementById("formulario");
const campoMonto = document.getElementById("monto");
const campoPersonas = document.getElementById("personas");
const boton = document.getElementById("boton-dividir");
const cajaError = document.getElementById("error");
const resultadoVacio = document.getElementById("resultado-vacio");
const resultado = document.getElementById("resultado");
const etiqueta = resultado.querySelector(".etiqueta");
const montoBase = document.getElementById("monto-base");
const resumen = document.getElementById("resumen");
const detalle = document.getElementById("detalle");

// Formatea un entero como pesos colombianos: 33333 -> "$ 33.333"
const formatoCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function formatear(valor) {
  return formatoCOP.format(valor);
}

function plural(cantidad, singular, pluralTexto) {
  return cantidad === 1 ? singular : pluralTexto;
}

// ---------- Mostrar y ocultar mensajes ----------
function mostrarError(mensajes) {
  // Un párrafo por mensaje; textContent evita que se interprete como HTML.
  cajaError.replaceChildren(
    ...mensajes.map((mensaje) => {
      const parrafo = document.createElement("p");
      parrafo.textContent = mensaje;
      return parrafo;
    })
  );
  cajaError.hidden = false;
  resultado.hidden = true;
  resultadoVacio.hidden = false;
}

function ocultarError() {
  cajaError.hidden = true;
}

function mostrarResultado(datos) {
  const { total, personas, monto_base, personas_con_extra } = datos;

  etiqueta.textContent = personas_con_extra === 0 ? "Cada persona paga" : "Cada persona paga al menos";
  montoBase.textContent = formatear(monto_base);

  let texto = `Total ${formatear(total)} entre ${personas} ${plural(personas, "persona", "personas")}`;
  if (personas_con_extra === 0) {
    texto += " · división exacta";
  } else {
    texto += ` · ${personas_con_extra} ${plural(personas_con_extra, "persona paga", "personas pagan")} ${formatear(1)} extra`;
  }
  resumen.textContent = texto;

  // Las primeras "personas_con_extra" personas pagan 1 peso más.
  const filas = [];
  for (let i = 1; i <= personas; i++) {
    const tieneExtra = i <= personas_con_extra;

    const fila = document.createElement("li");
    const nombre = document.createElement("span");
    nombre.textContent = `Persona ${i}`;
    if (tieneExtra) {
      const insignia = document.createElement("span");
      insignia.className = "insignia";
      insignia.textContent = "+1 peso";
      nombre.append(insignia);
    }
    const valor = document.createElement("span");
    valor.className = "valor";
    valor.textContent = formatear(monto_base + (tieneExtra ? 1 : 0));

    fila.append(nombre, valor);
    filas.push(fila);
  }
  detalle.replaceChildren(...filas);

  resultadoVacio.hidden = true;
  resultado.hidden = false;
}

// ---------- Comunicación con la API ----------
async function dividirGasto(evento) {
  evento.preventDefault(); // Evita que el formulario recargue la página.
  ocultarError();

  if (campoMonto.value === "" || campoPersonas.value === "") {
    mostrarError(["Completa los dos campos con números enteros."]);
    return;
  }

  // La validación de verdad la hace el backend; aquí solo convertimos el texto a número.
  const datosEnviados = {
    monto: Number(campoMonto.value),
    personas: Number(campoPersonas.value),
  };

  boton.disabled = true;
  boton.textContent = "Calculando…";

  try {
    const respuesta = await fetch("/api/dividir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datosEnviados),
    });

    // Si el servidor no devuelve JSON (por ejemplo, un error 500), datos queda en null.
    const datos = await respuesta.json().catch(() => null);

    if (respuesta.ok) {
      mostrarResultado(datos);
    } else if (datos && Array.isArray(datos.errores)) {
      mostrarError(datos.errores);
    } else {
      mostrarError([`El servidor respondió con un error (código ${respuesta.status}). Intenta de nuevo.`]);
    }
  } catch (error) {
    // fetch solo lanza error cuando no hay conexión con el servidor.
    mostrarError(["No se pudo conectar con el servidor. Revisa que uvicorn esté corriendo."]);
  } finally {
    boton.disabled = false;
    boton.textContent = "Dividir gasto";
  }
}

formulario.addEventListener("submit", dividirGasto);

// Al volver a escribir, el error anterior desaparece.
campoMonto.addEventListener("input", ocultarError);
campoPersonas.addEventListener("input", ocultarError);
