// Splitly: JavaScript de la landing y la calculadora.
// Regla de oro: este archivo NO calcula el reparto. Solo recoge datos,
// llama a la API (/api/dividir) y pinta lo que responde.

// ---------- Referencias a elementos ----------
const navbar = document.querySelector(".navbar");
const botonMenu = document.getElementById("menu-toggle");
const menu = document.getElementById("menu");
const formulario = document.getElementById("formulario");
const campoMonto = document.getElementById("monto");
const campoPersonas = document.getElementById("personas");
const cajaError = document.getElementById("error");
const boton = document.getElementById("boton-calcular");
const textoBoton = boton.querySelector(".boton__texto");
const tarjetaResultado = document.querySelector(".resultado");
const resultadoVacio = document.getElementById("resultado-vacio");
const resultado = document.getElementById("resultado");
const resultadoEtiqueta = document.getElementById("resultado-etiqueta");
const resultadoBase = document.getElementById("resultado-base");
const resultadoTotal = document.getElementById("resultado-total");
const resultadoPersonas = document.getElementById("resultado-personas");
const distribucion = document.getElementById("distribucion");
const resultadoNota = document.getElementById("resultado-nota");
const anio = document.getElementById("anio");

// ---------- Año del footer ----------
anio.textContent = new Date().getFullYear();

// ---------- Menú móvil ----------
const pantallaEscritorio = window.matchMedia("(min-width: 768px)");

function menuEstaAbierto() {
  return navbar.classList.contains("navbar--abierto");
}

function abrirMenu() {
  navbar.classList.add("navbar--abierto");
  botonMenu.setAttribute("aria-expanded", "true");
  botonMenu.setAttribute("aria-label", "Cerrar menú");
}

function cerrarMenu() {
  navbar.classList.remove("navbar--abierto");
  botonMenu.setAttribute("aria-expanded", "false");
  botonMenu.setAttribute("aria-label", "Abrir menú");
}

// Clic en el botón: alterna entre abierto y cerrado
botonMenu.addEventListener("click", () => {
  if (menuEstaAbierto()) {
    cerrarMenu();
  } else {
    abrirMenu();
  }
});

// Clic en cualquier enlace del menú: se cierra
menu.addEventListener("click", (evento) => {
  if (evento.target.closest("a")) {
    cerrarMenu();
  }
});

// Tecla Escape: se cierra y el foco vuelve al botón (solo si estaba abierto)
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && menuEstaAbierto()) {
    cerrarMenu();
    botonMenu.focus();
  }
});

// Clic fuera del header: se cierra
document.addEventListener("click", (evento) => {
  if (!navbar.contains(evento.target)) {
    cerrarMenu();
  }
});

// Al pasar a pantalla de escritorio: se cierra
pantallaEscritorio.addEventListener("change", (evento) => {
  if (evento.matches) {
    cerrarMenu();
  }
});

// ---------- Formato de moneda ----------
// minimumFractionDigits: 0 es necesario porque el COP tiene 2 decimales por
// defecto en el estándar, y algunos navegadores lanzan error si solo pones
// maximumFractionDigits en 0.
const formatoCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

function formatear(valor) {
  return formatoCOP.format(valor);
}

// Elige entre singular y plural según la cantidad
function plural(cantidad, singular, pluralTexto) {
  return cantidad === 1 ? singular : pluralTexto;
}

// ---------- Preparar lo que escribe el usuario ----------
// Aquí solo se limpia el FORMATO (puntos de miles). No se decide si el valor
// es válido: de eso se encarga el backend, que responde 422 si algo está mal.

// Cuenta cuántos caracteres de un texto son dígitos
function contarDigitos(texto) {
  let cantidad = 0;
  for (const caracter of texto) {
    if (caracter >= "0" && caracter <= "9") {
      cantidad++;
    }
  }
  return cantidad;
}

// Busca la posición justo después del dígito número "cantidad" del texto
function posicionTrasDigitos(texto, cantidad) {
  if (cantidad === 0) {
    return 0;
  }
  let vistos = 0;
  for (let i = 0; i < texto.length; i++) {
    if (texto[i] >= "0" && texto[i] <= "9") {
      vistos++;
      if (vistos === cantidad) {
        return i + 1;
      }
    }
  }
  return texto.length;
}

// Mientras se escribe en #monto: "90000" -> "90.000", sin mover el cursor
function formatearMientrasEscribe() {
  const texto = campoMonto.value;
  const digitos = texto.replace(/[.\s]/g, "");

  // Si hay letras, comas, signo menos, etc., no se toca: el backend lo rechaza
  if (digitos === "" || !/^\d+$/.test(digitos) || digitos.length > 15) {
    return;
  }

  const digitosAntesDelCursor = contarDigitos(texto.slice(0, campoMonto.selectionStart));
  const conPuntos = Number(digitos).toLocaleString("es-CO");

  if (conPuntos !== texto) {
    campoMonto.value = conPuntos;
    const posicion = posicionTrasDigitos(conPuntos, digitosAntesDelCursor);
    campoMonto.setSelectionRange(posicion, posicion);
  }
}

// Convierte el texto del campo en lo que se envía a la API.
//   "90.000"   -> 90000 (número)
//   "-5000"    -> -5000 (número; el backend lo rechaza por no ser positivo)
//   "2.5"      -> "2.5" (texto; el backend lo rechaza)
//   "diez mil" -> "diez mil" (texto; el backend lo rechaza)
function prepararValor(texto) {
  const limpio = texto.trim();
  const conPuntosDeMiles = /^-?\d{1,3}(\.\d{3})+$/;
  const soloDigitos = /^-?\d+$/;

  if (conPuntosDeMiles.test(limpio) || soloDigitos.test(limpio)) {
    const numero = Number(limpio.replace(/\./g, ""));
    // Si es demasiado grande para ser exacto, se envía como texto
    if (Number.isSafeInteger(numero)) {
      return numero;
    }
  }
  return limpio;
}

// ---------- Errores ----------
function mostrarError(mensajes) {
  const parrafos = mensajes.map((mensaje) => {
    const parrafo = document.createElement("p");
    parrafo.textContent = mensaje;
    return parrafo;
  });
  cajaError.replaceChildren(...parrafos);
  cajaError.hidden = false;

  // Se oculta el resultado viejo: ya no corresponde a lo que hay en el formulario
  resultado.hidden = true;
  resultadoVacio.hidden = false;
}

function ocultarError() {
  cajaError.hidden = true;
  cajaError.replaceChildren();
}

// ---------- Estado de carga ----------
function ponerCargando(activo) {
  boton.disabled = activo;
  if (activo) {
    boton.setAttribute("aria-busy", "true");
  } else {
    boton.removeAttribute("aria-busy");
  }
  textoBoton.textContent = activo ? "Calculando…" : "Calcular división";
}

// ---------- Pintar el resultado ----------
// Crea un <li> de la distribución con el marcado que espera el CSS
function crearItemDistribucion(grupo, montoBase) {
  const item = document.createElement("li");
  item.className = "distribucion__item";

  const detalle = document.createElement("span");
  detalle.className = "distribucion__detalle";

  const personas = document.createElement("span");
  personas.className = "distribucion__personas";
  personas.textContent = `${grupo.personas} ${plural(grupo.personas, "persona paga", "personas pagan")}`;
  detalle.append(personas);

  // El chip solo aparece en el grupo que paga más que el monto base
  if (grupo.monto > montoBase) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = "+1 peso";
    detalle.append(chip);
  }

  const monto = document.createElement("span");
  monto.className = "distribucion__monto";
  monto.textContent = formatear(grupo.monto);

  item.append(detalle, monto);
  return item;
}

// Texto de la nota cuando sobraron pesos
function textoDeLaNota(sobrante) {
  if (sobrante === 1) {
    return "Sobró 1 peso al dividir. Lo asume la primera persona para que la suma sea exacta.";
  }
  return `Sobraron ${sobrante} pesos al dividir. Las primeras ${sobrante} personas pagan 1 peso más para que la suma sea exacta.`;
}

// Si la tarjeta no se ve en pantalla (en móvil queda debajo), se lleva a la vista
function llevarResultadoALaVista() {
  const caja = tarjetaResultado.getBoundingClientRect();
  const estaVisible = caja.top >= 0 && caja.bottom <= window.innerHeight;
  if (!estaVisible) {
    const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    tarjetaResultado.scrollIntoView({
      block: "nearest",
      behavior: reducirMovimiento ? "auto" : "smooth"
    });
  }
}

function mostrarResultado(datos) {
  resultadoEtiqueta.textContent =
    datos.personas_con_extra === 0 ? "Cada persona paga" : "Cada persona paga al menos";
  resultadoBase.textContent = formatear(datos.monto_base);
  resultadoTotal.textContent = formatear(datos.total);
  resultadoPersonas.textContent = `${datos.personas} ${plural(datos.personas, "persona", "personas")}`;

  const items = datos.distribucion.map((grupo) => crearItemDistribucion(grupo, datos.monto_base));
  distribucion.replaceChildren(...items);

  if (datos.personas_con_extra === 0) {
    resultadoNota.hidden = true;
  } else {
    resultadoNota.textContent = textoDeLaNota(datos.personas_con_extra);
    resultadoNota.hidden = false;
  }

  // Para reiniciar la animación CSS de entrada hay que ocultar el elemento,
  // forzar al navegador a recalcular el layout (offsetWidth) y mostrarlo otra vez.
  resultado.hidden = true;
  void resultado.offsetWidth;
  resultado.hidden = false;
  resultadoVacio.hidden = true;

  llevarResultadoALaVista();
}

// ---------- Comunicación con la API ----------
async function calcularDivision(evento) {
  evento.preventDefault();
  ocultarError();

  // Ayuda de interfaz (no es una regla de negocio): campos vacíos
  const campoVacio = [campoMonto, campoPersonas].find((campo) => campo.value.trim() === "");
  if (campoVacio) {
    mostrarError(["Completa los dos campos para calcular."]);
    campoVacio.focus();
    return;
  }

  const datosEnviados = {
    monto: prepararValor(campoMonto.value),
    personas: prepararValor(campoPersonas.value)
  };

  ponerCargando(true);
  try {
    const respuesta = await fetch("/api/dividir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datosEnviados)
    });
    const datos = await respuesta.json().catch(() => null);

    // fetch NO lanza error con respuestas 422 o 500: por eso se revisa respuesta.ok
    if (respuesta.ok) {
      mostrarResultado(datos);
    } else if (datos && Array.isArray(datos.errores)) {
      mostrarError(datos.errores);
    } else {
      mostrarError([`El servidor respondió con un error inesperado (código ${respuesta.status}).`]);
    }
  } catch (error) {
    // fetch solo lanza error cuando no hay conexión con el servidor
    mostrarError(["No se pudo conectar con el servidor. Revisa que uvicorn esté corriendo."]);
  } finally {
    ponerCargando(false);
  }
}

// ---------- Eventos ----------
formulario.addEventListener("submit", calcularDivision);
campoMonto.addEventListener("input", formatearMientrasEscribe);
campoMonto.addEventListener("input", ocultarError);
campoPersonas.addEventListener("input", ocultarError);
