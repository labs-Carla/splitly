// Splitly: efecto "mágico" del comprobante del hero.
// Al pasar el cursor deja una estela de destellos y suena un acorde suave;
// al hacer clic (o tocar en el celular) lanza una ráfaga. Es solo decoración:
// no cambia nada de la calculadora.

const comprobante = document.querySelector(".tarjeta-ejemplo");
const menosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");
const COLORES_DESTELLO = ["#FFE600", "#FF2E93", "#FFFFFF"];

// ---------- Destellos ----------
function crearDestello(x, y, distancia) {
  const destello = document.createElement("span");
  destello.className = "chispa";
  destello.setAttribute("aria-hidden", "true");
  const angulo = Math.random() * Math.PI * 2;
  destello.style.left = `${x}px`;
  destello.style.top = `${y}px`;
  destello.style.setProperty("--dx", `${Math.cos(angulo) * distancia}px`);
  destello.style.setProperty("--dy", `${Math.sin(angulo) * distancia}px`);
  destello.style.setProperty("--color", COLORES_DESTELLO[Math.floor(Math.random() * COLORES_DESTELLO.length)]);
  destello.style.setProperty("--tamano", `${8 + Math.random() * 10}px`);
  destello.addEventListener("animationend", () => destello.remove());
  document.body.append(destello);
}

// Estela: como mucho un destello cada 35 ms para no saturar la página
let ultimoDestello = 0;
function dejarEstela(evento) {
  if (menosMovimiento.matches || evento.pointerType === "touch") {
    return;
  }
  const ahora = performance.now();
  if (ahora - ultimoDestello < 35) {
    return;
  }
  ultimoDestello = ahora;
  crearDestello(evento.clientX, evento.clientY, 20 + Math.random() * 25);
}

function lanzarRafaga(evento) {
  if (menosMovimiento.matches) {
    return;
  }
  for (let i = 0; i < 14; i++) {
    crearDestello(evento.clientX, evento.clientY, 40 + Math.random() * 50);
  }
}

// ---------- Sonido ----------
// Se genera con Web Audio (sin archivos). Los navegadores solo dejan sonar
// después de que la persona hace clic, toca o usa el teclado en la página.
let audio = null;

function prepararAudio() {
  if (!audio && "AudioContext" in window) {
    audio = new AudioContext();
  }
  return audio ? audio.resume() : Promise.resolve();
}

// Arpegio corto y agudo, como de varita mágica
let ultimoSonido = 0;
function sonarMagia() {
  const ahora = performance.now();
  if (!audio || audio.state !== "running" || ahora - ultimoSonido < 1200) {
    return;
  }
  ultimoSonido = ahora;
  const notas = [1046.5, 1318.5, 1568, 2093]; // Do6, Mi6, Sol6, Do7
  notas.forEach((frecuencia, indice) => {
    const inicio = audio.currentTime + indice * 0.07;
    const oscilador = audio.createOscillator();
    const volumen = audio.createGain();
    oscilador.type = "sine";
    oscilador.frequency.value = frecuencia;
    volumen.gain.setValueAtTime(0.0001, inicio);
    volumen.gain.exponentialRampToValueAtTime(0.06, inicio + 0.02);
    volumen.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.45);
    oscilador.connect(volumen).connect(audio.destination);
    oscilador.start(inicio);
    oscilador.stop(inicio + 0.5);
  });
}

// ---------- Eventos ----------
document.addEventListener("pointerdown", prepararAudio, { once: true });
document.addEventListener("keydown", prepararAudio, { once: true });

comprobante.addEventListener("pointerenter", sonarMagia);
comprobante.addEventListener("pointermove", dejarEstela);
comprobante.addEventListener("click", (evento) => {
  lanzarRafaga(evento);
  // Tras el primer clic el audio tarda un instante en arrancar
  prepararAudio().then(sonarMagia);
});
