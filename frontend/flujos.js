// Splitly: flujo de la calculadora en esta versión.
//   1. Asistente paso a paso: una pregunta por pantalla (monto, personas, nombres).
//   2. Voz: se dice "120 mil entre 4" y la respuesta se lee en voz alta.
// Usa funciones de script.js (pedirDivision, prepararValor, mostrarError...).
// Igual que script.js, este archivo NO calcula el reparto: eso lo hace la API.

// ---------- Referencias a elementos ----------
const asistente = document.getElementById("asistente");
const pasosAsistente = asistente.querySelectorAll(".asistente__paso");
const asistenteMonto = document.getElementById("asistente-monto");
const asistentePersonas = document.getElementById("asistente-personas");
const asistenteNombres = document.getElementById("asistente-nombres");
const asistenteProgreso = document.getElementById("asistente-progreso");
const asistenteAvance = document.getElementById("asistente-avance");
const botonAtras = document.getElementById("asistente-atras");
const botonSiguiente = document.getElementById("asistente-siguiente");
const botonVoz = document.getElementById("boton-voz");
const textoVoz = botonVoz.querySelector(".voz__texto");
const estadoVoz = document.getElementById("voz-estado");

const TOTAL_PASOS = 3;
// Con más personas, escribir un nombre por persona deja de ser práctico
const MAXIMO_NOMBRES = 20;

// ---------- Asistente paso a paso ----------
let pasoActual = 1;

function irAlPaso(numero) {
  pasoActual = numero;
  pasosAsistente.forEach((paso) => {
    paso.hidden = Number(paso.dataset.paso) !== numero;
  });
  asistenteProgreso.textContent = `Paso ${numero} de ${TOTAL_PASOS}`;
  asistenteAvance.style.width = `${(numero / TOTAL_PASOS) * 100}%`;
  botonAtras.hidden = numero === 1;
  botonSiguiente.textContent = numero === TOTAL_PASOS ? "Ver resultado" : "Siguiente";
  ocultarError();

  // El foco pasa al primer campo del paso nuevo, para seguir sin usar el mouse
  const primerCampo = asistente.querySelector(`[data-paso="${numero}"] input`);
  if (primerCampo) {
    primerCampo.focus();
  }
}

// Un campo de texto por persona. Conserva lo que ya se había escrito.
function prepararNombres(cantidad) {
  const escritos = [...asistenteNombres.querySelectorAll("input")].map((campo) => campo.value);
  const filas = [];
  for (let i = 0; i < cantidad; i++) {
    const fila = document.createElement("li");
    const etiqueta = document.createElement("label");
    etiqueta.className = "visualmente-oculto";
    etiqueta.htmlFor = `nombre-${i + 1}`;
    etiqueta.textContent = `Nombre de la persona ${i + 1}`;
    const campo = document.createElement("input");
    campo.className = "asistente__nombre";
    campo.type = "text";
    campo.id = `nombre-${i + 1}`;
    campo.autocomplete = "off";
    campo.placeholder = `Persona ${i + 1}`;
    campo.value = escritos[i] ?? "";
    fila.append(etiqueta, campo);
    filas.push(fila);
  }
  asistenteNombres.replaceChildren(...filas);
}

// Los nombres vacíos se muestran como "Persona 1", "Persona 2"...
function leerNombres() {
  return [...asistenteNombres.querySelectorAll("input")].map(
    (campo) => campo.value.trim() || campo.placeholder
  );
}

// Mientras espera a la API, el botón principal no se puede volver a pulsar
async function calcular(datosEnviados, nombres = []) {
  const textoAnterior = botonSiguiente.textContent;
  botonSiguiente.disabled = true;
  botonSiguiente.setAttribute("aria-busy", "true");
  botonSiguiente.textContent = "Calculando…";
  const datos = await pedirDivision(datosEnviados, nombres);
  botonSiguiente.disabled = false;
  botonSiguiente.removeAttribute("aria-busy");
  botonSiguiente.textContent = textoAnterior;
  return datos;
}

async function avanzarAsistente(evento) {
  evento.preventDefault();
  ocultarError();

  // Ayuda de interfaz (no es una regla de negocio): no avanzar con el campo vacío
  if (pasoActual === 1) {
    if (asistenteMonto.value.trim() === "") {
      mostrarError(["Escribe cuánto fue la cuenta o díctalo en voz alta."]);
      asistenteMonto.focus();
      return;
    }
    irAlPaso(2);
    return;
  }

  if (pasoActual === 2) {
    if (asistentePersonas.value.trim() === "") {
      mostrarError(["Escribe entre cuántas personas se divide."]);
      asistentePersonas.focus();
      return;
    }
    const cantidad = prepararValor(asistentePersonas.value);
    if (Number.isInteger(cantidad) && cantidad >= 1 && cantidad <= MAXIMO_NOMBRES) {
      prepararNombres(cantidad);
      irAlPaso(3);
      return;
    }
    // Sin paso de nombres: se envía tal cual y el backend decide si es válido
  }

  const datosEnviados = {
    monto: prepararValor(asistenteMonto.value),
    personas: prepararValor(asistentePersonas.value)
  };
  await calcular(datosEnviados, pasoActual === 3 ? leerNombres() : []);
}

// Botones − y + del paso 2
function cambiarPersonas(evento) {
  const boton = evento.target.closest("[data-cambio]");
  if (!boton) {
    return;
  }
  const actual = prepararValor(asistentePersonas.value);
  const base = Number.isInteger(actual) ? actual : 1;
  // Límites del control (1 a 100), los mismos que acepta la API
  asistentePersonas.value = String(Math.min(100, Math.max(1, base + Number(boton.dataset.cambio))));
  ocultarError();
}

asistente.addEventListener("submit", avanzarAsistente);
asistente.addEventListener("click", cambiarPersonas);
botonAtras.addEventListener("click", () => irAlPaso(pasoActual - 1));
asistenteMonto.addEventListener("input", formatearMientrasEscribe);
asistenteMonto.addEventListener("input", ocultarError);
asistentePersonas.addEventListener("input", ocultarError);

// ---------- Voz ----------
// Web Speech API: viene en Chrome y Edge, sin claves ni costo. Firefox no la
// trae; ahí el botón explica que hay que abrir la página en otro navegador.
const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;

// Traduce frases como "120 mil", "$120.000" o "ciento veinte mil" a número.
// Es solo lectura de lo que se dijo; la API valida el valor como siempre.
const PALABRAS_NUMERO = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14,
  quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiun: 21, veintiuno: 21, veintidos: 22, veintitres: 23,
  veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27,
  veintiocho: 28, veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50,
  sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100,
  doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500,
  seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900
};

function textoANumero(texto) {
  const limpio = texto
    .replace(/medio millon/g, "500000")
    // "1,5 millones" -> "1500000"
    .replace(/(\d+)[.,](\d{1,2})\s*millon(es)?/g, (_, enteros, decimales) =>
      String(Math.round(Number(`${enteros}.${decimales}`) * 1000000)))
    // Separadores de miles: "120.000", "120,000" o "120 000" -> "120000"
    .replace(/(\d)[.,\s](?=\d{3}\b)/g, "$1");

  let total = 0;
  let grupo = 0;
  let encontrado = false;
  for (const palabra of limpio.match(/\d+|[a-z]+/g) ?? []) {
    if (/^\d+$/.test(palabra)) {
      grupo += Number(palabra);
    } else if (palabra in PALABRAS_NUMERO) {
      grupo += PALABRAS_NUMERO[palabra];
    } else if (palabra === "mil") {
      total += (grupo || 1) * 1000;
      grupo = 0;
    } else if (palabra === "millon" || palabra === "millones") {
      total = (total + (grupo || 1)) * 1000000;
      grupo = 0;
    } else {
      continue; // "y", "pesos", "personas", "la cuenta"... no son números
    }
    encontrado = true;
  }
  return encontrado ? total + grupo : null;
}

// "dividir 120 mil entre 4" -> { monto: 120000, personas: 4 }
function interpretarFrase(frase) {
  const texto = frase.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  // Se toma el último "entre"/"para", por si la frase menciona otro antes
  const separador = [...texto.matchAll(/\s(?:entre|para)\s/g)].pop();
  if (!separador) {
    return null;
  }
  const monto = textoANumero(texto.slice(0, separador.index));
  const personas = textoANumero(texto.slice(separador.index + separador[0].length));
  if (monto === null || personas === null) {
    return null;
  }
  return { monto, personas };
}

// Arma la frase hablada a partir de la distribución que devolvió la API
function textoParaLeer(datos) {
  const partes = datos.distribucion.map((grupo) =>
    `${grupo.personas} ${plural(grupo.personas, "persona paga", "personas pagan")} ${grupo.monto.toLocaleString("es-CO")} pesos`
  );
  return `Listo. ${partes.join(" y ")}.`;
}

function hablar(texto) {
  if (!("speechSynthesis" in window)) {
    return;
  }
  const locucion = new SpeechSynthesisUtterance(texto);
  locucion.lang = "es-CO";
  speechSynthesis.cancel(); // si estaba leyendo algo, se reemplaza
  speechSynthesis.speak(locucion);
}

function mostrarEstadoVoz(texto) {
  estadoVoz.textContent = texto;
  estadoVoz.hidden = texto === "";
}

const MENSAJES_VOZ = {
  "not-allowed": "Necesito permiso para usar el micrófono.",
  "service-not-allowed": "Necesito permiso para usar el micrófono.",
  "no-speech": "No te escuché. Toca «Dilo en voz alta» e intenta de nuevo.",
  "audio-capture": "No encontré un micrófono en este equipo.",
  network: "El dictado necesita conexión a internet.",
  aborted: ""
};

async function procesarFrase(frase) {
  const datosEnviados = interpretarFrase(frase);
  if (!datosEnviados) {
    mostrarEstadoVoz(`Escuché «${frase}», pero no encontré un monto y un número de personas. Prueba con «120 mil entre 4».`);
    return;
  }

  // Los campos del asistente quedan llenos, por si se quiere corregir algo
  asistenteMonto.value = datosEnviados.monto.toLocaleString("es-CO");
  asistentePersonas.value = String(datosEnviados.personas);
  ocultarError();
  mostrarEstadoVoz(`Escuché «${frase}».`);

  const datos = await calcular(datosEnviados);
  hablar(datos ? textoParaLeer(datos) : "No pude calcularlo. Revisa el mensaje en pantalla.");
}

let reconocimiento = null;

function terminarEscucha() {
  reconocimiento = null;
  botonVoz.classList.remove("voz__boton--escuchando");
  botonVoz.setAttribute("aria-pressed", "false");
  textoVoz.textContent = "Dilo en voz alta";
}

function alternarEscucha() {
  if (!Reconocimiento) {
    mostrarEstadoVoz("Este navegador no permite dictar. Abre Splitly en Chrome o Edge para usar la voz.");
    return;
  }

  // Segundo clic mientras escucha: se detiene
  if (reconocimiento) {
    reconocimiento.stop();
    return;
  }

  reconocimiento = new Reconocimiento();
  reconocimiento.lang = "es-CO";
  reconocimiento.interimResults = false;
  reconocimiento.maxAlternatives = 1;
  reconocimiento.addEventListener("result", (evento) => {
    procesarFrase(evento.results[0][0].transcript);
  });
  reconocimiento.addEventListener("error", (evento) => {
    mostrarEstadoVoz(MENSAJES_VOZ[evento.error] ?? "No pude reconocer tu voz. Intenta de nuevo.");
  });
  reconocimiento.addEventListener("end", terminarEscucha);

  reconocimiento.start();
  botonVoz.classList.add("voz__boton--escuchando");
  botonVoz.setAttribute("aria-pressed", "true");
  textoVoz.textContent = "Escuchando… toca para parar";
  mostrarEstadoVoz("Te escucho. Di, por ejemplo: «120 mil entre 4».");
}

if (Reconocimiento) {
  botonVoz.setAttribute("aria-pressed", "false");
}
botonVoz.addEventListener("click", alternarEscucha);
