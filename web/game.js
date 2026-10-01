const PIPS = { 0: [], 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const COSTO_SOLDADO = 10;
const COSTO_CABALLO = 50;
const COSTO_CANON = 150;
const MIN_UNIDAD = 6;
const UMBRAL = 0.1;

const CARTAS_INFO = {
  milicia: { titulo: "Milicia", desc: "10 oro por soldado. Refuerza tu ejército para el combate." },
  caballo: { titulo: "Caballos", desc: "50 oro por unidad. Mín. 6 para combatir. Duplica bajas si ganás. Si perdés, restás caballos por diferencia de dados." },
  canon: { titulo: "Cañones", desc: "150 oro por unidad. Mín. 6 para combatir. Triplica bajas si ganás. Si perdés, restás cañones por diferencia de dados." },
};

const PROCERES_P = ["Belgrano", "Güemes", "Saavedra"];
const PROCERES_E = ["Popham", "Bird", "Wiliams"];
const PROCER_IMG = {
  Belgrano: "assets/retrato-belgrano.jpg",
  Güemes: "assets/retrato-guemes.jpg",
  Saavedra: "assets/retrato-saavedra.jpg",
  Popham: "assets/unidad-ingles.png",
  Bird: "assets/unidad-ingles.png",
  Wiliams: "assets/unidad-ingles.png",
};
const PROCER_BIO = {
  Belgrano: "https://www.argentina.gob.ar/noticias/manuel-belgrano",
  Güemes: "https://www.argentina.gob.ar/noticias/martin-miguel-de-guemes",
  Saavedra: "https://www.casarosada.gob.ar/nuestro-pais/galeria-de-presidentes/44664-cornelio-saavedra",
  Popham: "https://es.wikipedia.org/wiki/Home_Riggs_Popham",
  Bird: "https://es.wikipedia.org/wiki/Invasiones_inglesas",
  Wiliams: "https://es.wikipedia.org/wiki/Invasiones_inglesas",
};
const CARTA_DEFS = {
  milicia: { titulo: "Milicia", img: "assets/unidad-milicia.png" },
  "milicia-inglesa": { titulo: "Milicia inglesa", img: "assets/unidad-ingles.png" },
  caballos: { titulo: "Caballos", img: "assets/carta-caballos.jpg" },
  "caballos-ingleses": { titulo: "Caballos ingleses", img: "assets/carta-caballos.jpg" },
  canones: { titulo: "Cañones", img: "assets/carta-canones.jpg" },
  "canones-ingleses": { titulo: "Cañones ingleses", img: "assets/carta-canones.jpg" },
  tesoro: { titulo: "Tesoro patriota", img: "assets/carta-tesoro-patriota.jpg" },
};
const STORAGE_KEY = "epopeyas_v112";
const STATS_KEY = "epopeyas_v112_stats";
const PREGUNTAS_CICLO_KEY = "epopeyas_preguntas_ciclo_v20";
const PREGUNTAS_CICLO_MS = 3 * 24 * 60 * 60 * 1000;
const VERSION_JUEGO = "3.0";
const TXT_DADOS = "Un dado por bando. Cada punto = 100 soldados. Las bajas es por diferencia de puntaje.";

const TELEMETRY = {
  id: "",
  started: 0,
  segundos: 0,
  nivelMax: "inicio",
  timer: null,
};

function nivelActualLabel() {
  if (!G || !G.fase) return "inicio";
  return String(G.fase);
}

function telemetrySend(tipo, extra) {
  try {
    const payload = Object.assign(
      {
        tipo,
        id: TELEMETRY.id,
        segundosJuego: TELEMETRY.segundos,
        nivelMax: TELEMETRY.nivelMax,
        version: VERSION_JUEGO,
      },
      extra || {}
    );
    fetch("/api/telemetry", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch (_) {}
}

function iniciarTelemetry() {
  if (TELEMETRY.id) return;
  TELEMETRY.id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  TELEMETRY.started = Date.now();
  TELEMETRY.segundos = 0;
  TELEMETRY.nivelMax = "inicio";
  telemetrySend("sesion_inicio");
  TELEMETRY.timer = setInterval(() => {
    TELEMETRY.segundos = Math.floor((Date.now() - TELEMETRY.started) / 1000);
    TELEMETRY.nivelMax = nivelActualLabel();
    telemetrySend("sesion_tick");
  }, 30000);
  window.addEventListener("pagehide", () => {
    TELEMETRY.segundos = Math.floor((Date.now() - TELEMETRY.started) / 1000);
    TELEMETRY.nivelMax = nivelActualLabel();
    telemetrySend("sesion_fin");
  });
}

let adsPendienteCb = null;

function mostrarPublicidadEntreNiveles(luego) {
  adsPendienteCb = typeof luego === "function" ? luego : null;
  fetch("/api/ads/active", { credentials: "include" })
    .then((r) => r.json())
    .then((d) => {
      const ad = d && d.ad;
      const ov = document.getElementById("ov-ads");
      const media = document.getElementById("ads-media");
      if (!ad || !ad.archivo || !ov || !media) {
        if (adsPendienteCb) adsPendienteCb();
        adsPendienteCb = null;
        return;
      }
      media.innerHTML = "";
      if (ad.tipo === "video") {
        const v = document.createElement("video");
        v.src = ad.archivo;
        v.controls = true;
        v.autoplay = true;
        v.playsInline = true;
        v.style.maxWidth = "100%";
        media.appendChild(v);
      } else {
        const img = document.createElement("img");
        img.src = ad.archivo;
        img.alt = "Publicidad";
        img.style.maxWidth = "100%";
        media.appendChild(img);
      }
      ov.hidden = false;
      ov.classList.add("show");
    })
    .catch(() => {
      if (adsPendienteCb) adsPendienteCb();
      adsPendienteCb = null;
    });
}

function cerrarPublicidad() {
  const ov = document.getElementById("ov-ads");
  if (ov) {
    ov.classList.remove("show");
    ov.hidden = true;
  }
  const media = document.getElementById("ads-media");
  if (media) media.innerHTML = "";
  const cb = adsPendienteCb;
  adsPendienteCb = null;
  if (cb) cb();
}

const MISIONES_DEF = [
  { id: "retiro", nombre: "Retiro", desc: "Derrotar la primera línea inglesa (850)." },
  { id: "barricada", nombre: "La Barricada", desc: "Romper la línea de Popham." },
  { id: "fuerte_plaza", nombre: "Plaza Mayor", desc: "Belgrano suma 2000 milicianos." },
  { id: "fuerte_int", nombre: "El Fuerte", desc: "Última defensa inglesa." },
  { id: "victoria", nombre: "Victoria", desc: "Beresford se va por Quilmes." },
];

const TITULO_TEXTO = "Invasión inglesa de Bs As, 1806. Buenos Aires se sometió al ejército británico y Beresford ocupó el Fuerte. Algunos criollos se refugian en Montevideo para preparar la resistencia. Pasó más de un mes y los patriotas están listos para la Reconquista. ¡A por ellos!";

const INTRO = [
  { img: "assets/intro-sobremonte-huye.jpg", texto: "Se acerca una flota inglesa con una fragata, seis corbetas, dos bergantines y unos mil setecientos soldados. El virrey Sobremonte, alertado por Liniers, huye tomando el tesoro y se va a Córdoba." },
  { img: "assets/intro-desembarco-quilmes.jpg", texto: "Los ingleses desembarcan en Quilmes. Con poca resistencia, llegan al centro de Buenos Aires. Beresford, con sus hombres, toman el Fuerte y ocupan los principales puestos administrativos y militares de la ciudad." },
  { img: "assets/intro-liniers-montevideo.jpg", texto: "Buenos Aires tiene 40.000 habitantes. La mayoría jura lealtad, excepto unos pocos. Entre ellos Belgrano, Álzaga, J. M. Pueyrredón y Liniers. Éste último escapa a Montevideo para preparar la reconquista." },
  { img: "assets/intro-patriotas-reunion.jpg", texto: "Allí, Liniers reclutó unos mil trescientos soldados, con la ayuda local." },
  {
    split: true,
    imgIzq: "assets/intro-fuerte-ingles.jpg",
    imgDer: "assets/intro-liniers-prepara.jpg",
    tagIzq: "El Fuerte",
    tagDer: "Liniers",
    texto: "El Fuerte sigue en pie, pero ocupado. La primera batalla es en Retiro. Los ingleses, previniendo una gran ofensiva, preparan el terreno. En caso de superioridad, se refugiarán en el Fuerte.",
  },
  { img: "assets/intro-patriotas-marcha.jpg", texto: "Los Patriotas desembarcan en Tigre y marchan hacia la ciudad. Se une J. M. Pueyrredón con más milicianos." },
];

/** Contenido extra por pantalla. Se completa con el agente de desarrollo. */
const INFO_PANTALLAS = {
  titulo: {
    marcas: [],
    puntos: [],
    sitios: [],
    fichas: [
      {
        id: "ficha-beresford",
        titulo: "Beresford",
        img: "assets/cinematica-beresford-parte.jpg",
        cuerpo: "El 27 de junio de 1806 las tropas británicas ocuparon Buenos Aires y William Carr Beresford se autoerigió gobernador de la plaza. Dib muestra que esa ocupación —con el juramento de fidelidad al rey británico y el apresamiento del tesoro real— encendió la polémica sobre la retirada del virrey Sobremonte a Córdoba.",
        cita: "Dib, Matías. «El virrey Sobre Monte ante el dominio británico de Buenos Aires y la apropiación del tesoro real». Temas de Historia Argentina y Americana, n.º 26, Universidad Católica Argentina, 2018.",
        enlaces: [{ label: "Abrir para más información", href: "https://repositorio.uca.edu.ar/handle/123456789/6680" }],
      },
      {
        id: "ficha-fuerte",
        titulo: "Fuerte de Buenos Aires",
        img: "assets/plano-fuerte-1806.jpg",
        cuerpo: "El Fuerte de San Miguel se alzaba sobre la barranca del Río de la Plata, en el predio de la actual Casa Rosada. Tenía cuatro baluartes y, adentro, el Palacio de los Gobernadores, convertido en Palacio de los Virreyes al crearse el virreinato (1776). Ahí residían las máximas autoridades; en 1806 fue la sede que ocupó —y desde la que capituló— Beresford.",
        cita: "Schávelzon, Daniel. «Peritaje: Restos arqueológicos en Casa Rosada. El Palacio de los Virreyes». Instituto de Arte Americano e Investigaciones Estéticas «Mario J. Buschiazzo», FADU-UBA, 2018.",
        enlaces: [{ label: "Abrir para más información", href: "https://cau.iaa.fadu.uba.ar/wp-content/uploads/2018/11/Peritaje_CasaRosada_2018.pdf" }],
      },
      {
        id: "ficha-montevideo",
        titulo: "Montevideo",
        img: "assets/mapa-rio-de-la-plata-1806.jpg",
        cuerpo: "El 18 de julio de 1806 el Cabildo de Montevideo resolvió, por unanimidad, acudir en auxilio de Buenos Aires. En ausencia de Sobremonte, declaró «jefe supremo» al gobernador Ruiz Huidobro y confió la reconquista de la capital. Desde esa plaza Liniers reunió la expedición que el 12 de agosto recuperó la ciudad.",
        cita: "Aguerre, Fernando. «Lealtad, riqueza y autonomía en el Montevideo de las invasiones inglesas». Humanidades: revista de la Universidad de Montevideo, año 6, 2006, pp. 23-58.",
        enlaces: [{ label: "Abrir para más información", href: "http://revistas.um.edu.uy/index.php/revistahumanidades/article/view/105" }],
      },
      {
        id: "ficha-reconquista",
        titulo: "Reconquista",
        img: "assets/combate-victoria.jpg",
        cuerpo: "La Reconquista del 12 de agosto de 1806 no fue solo la gesta de Liniers: movilizó milicias y sectores plebeyos de la ciudad. Cuadra Centeno y Mazzoni sostienen que 1806-1807 militarizó a la sociedad porteña y anticipó las prácticas y los actores que, pocos años después, intervendrían en la Revolución de Mayo.",
        cita: "Cuadra Centeno, Pablo A. y Mazzoni, María Laura. «La invasión inglesa y la participación popular en la Reconquista y Defensa de Buenos Aires 1806-1807». Anuario del Instituto de Historia Argentina, n.º 11, UNLP, 2011, pp. 43-71.",
        enlaces: [{ label: "Abrir para más información", href: "https://www.anuarioiha.fahce.unlp.edu.ar/article/view/AHn11a03" }],
      },
      {
        id: "ficha-bsas-1806",
        titulo: "Buenos Aires en 1806",
        img: "assets/mapa-buenos-aires-5-zonas.jpg",
        cuerpo: "Según los padrones que trabaja Flores (UBA), en 1806 la población de Buenos Aires no excedía los 41 mil habitantes. Las invasiones inglesas funcionaron como bisagra: quebraron el orden colonial y dejaron una ciudad más abierta al comercio británico, registrada después en los padrones de 1806/7 y 1810.",
        cita: "Flores, Roberto Dante. «Británicos en la sociedad de Buenos Aires (1804-1810)». Antíteses, vol. 4, n.º 7, 2011, pp. 173-201. DOI: 10.5433/1984-3356.2011v4n7p173.",
        enlaces: [{ label: "Abrir para más información", href: "https://ojs.uel.br/revistas/uel/index.php/antiteses/article/view/4170" }],
      },
    ],
  },
  intro: [
    {
      marcas: [],
      puntos: [],
      sitios: [],
      fichas: [
        {
          id: "intro0-virrey-ficha",
          titulo: "Virrey",
          img: "assets/ficha-virrey.jpg",
          cuerpo: "El virrey era la máxima autoridad del Virreinato del Río de la Plata. Sáenz Berceo reconstruye a Rafael de Sobremonte como figura polémica: para unos huyó; para otros aplicó la retirada prevista si caía la capital. Tras la derrota en el puente Gálvez salió con su familia y el tesoro; desde Cañada de la Cruz pasó el mando y declaró a Córdoba capital interina.",
          cita: "Sáenz Berceo, María del Carmen. «Rafael de Sobremonte: un virrey polémico». REDUR, n.º 12, Universidad de La Rioja, diciembre 2014, pp. 113-137. ISSN 1695-078X.",
          enlaces: [{ label: "Abrir para más información", href: "https://dialnet.unirioja.es/servlet/articulo?codigo=5215926" }],
        },
        {
          id: "intro0-fragata",
          titulo: "Fragata",
          img: "assets/ficha-fragata.jpg",
          cuerpo: "Furlan documenta que la fuerza naval británica de 1806 no era una sola fragata escoltada por menores: llevaba, entre otros, las fragatas Leda (38 cañones), Narcissus (32) y Justina (26), junto a navíos de línea. Esas fragatas daban a Popham el poder de bloquear el estuario y cubrir el desembarco.",
          cita: "Furlan, Luis F. «Actividad marítima y naval del Cabildo de Buenos Aires durante las invasiones inglesas al Río de la Plata (1806-1807)». Boletín del Centro Naval, n.º 814, mayo-agosto 2006.",
          enlaces: [{ label: "Abrir para más información", href: "https://centronaval.org.ar/boletin/BCN814/814furlan.pdf" }],
        },
        {
          id: "intro0-corbeta",
          titulo: "Corbeta",
          img: "assets/ficha-corbeta.jpg",
          cuerpo: "Del lado virreinal, el Apostadero de Montevideo apenas oponía las corbetas Fuerte (26 cañones) y Atrevida (20). Furlan subraya esa desproporción: las corbetas españolas no podían disputarle el río a la escuadra británica, y eso explica la debilidad naval con la que Sobremonte enfrentó la invasión.",
          cita: "Furlan, Luis F. «Actividad marítima y naval del Cabildo de Buenos Aires durante las invasiones inglesas al Río de la Plata (1806-1807)». Boletín del Centro Naval, n.º 814, mayo-agosto 2006.",
          enlaces: [{ label: "Abrir para más información", href: "https://centronaval.org.ar/boletin/BCN814/814furlan.pdf" }],
        },
        {
          id: "intro0-bergantin",
          titulo: "Bergantín",
          img: "assets/ficha-bergantin.jpg",
          cuerpo: "En la escuadra invasora iba el bergantín Encounter (14 cañones); en la defensa, el bergantín Ligero (10). Buques chicos, de dos palos, servían para explorar el río y apoyar el desembarco. El contraste de cañones que arma Furlan muestra cuán desigual era el combate naval de 1806.",
          cita: "Furlan, Luis F. «Actividad marítima y naval del Cabildo de Buenos Aires durante las invasiones inglesas al Río de la Plata (1806-1807)». Boletín del Centro Naval, n.º 814, mayo-agosto 2006.",
          enlaces: [{ label: "Abrir para más información", href: "https://centronaval.org.ar/boletin/BCN814/814furlan.pdf" }],
        },
        {
          id: "intro0-sobremonte",
          titulo: "Sobremonte",
          img: "assets/retrato-sobremonte.jpg",
          cuerpo: "Sáenz Berceo reconstruye al marqués Rafael de Sobremonte como un virrey polémico: para unos huyó; para otros aplicó la retirada estratégica prevista. Tras la derrota en el puente Gálvez salió con su familia y el tesoro; el 1.º de julio, desde Cañada de la Cruz, pasó el mando a Huidobro y declaró a Córdoba capital interina.",
          cita: "Sáenz Berceo, María del Carmen. «Rafael de Sobremonte: un virrey polémico». REDUR, n.º 12, Universidad de La Rioja, diciembre 2014, pp. 113-137. ISSN 1695-078X.",
          enlaces: [{ label: "Abrir para más información", href: "https://dialnet.unirioja.es/servlet/articulo?codigo=5215926" }],
        },
        {
          id: "intro0-liniers",
          titulo: "Liniers",
          img: "assets/retrato-liniers.jpg",
          cuerpo: "Santiago de Liniers, militar francés al servicio de España, se hizo cargo de la reconquista de Buenos Aires. Tras el 12 de agosto fue aclamado Comandante General de Armas. Cuadra Centeno y Mazzoni lo sitúan al frente de milicias y voluntarios que, en 1806-1807, militarizaron a la sociedad porteña.",
          cita: "Cuadra Centeno, Pablo A. y Mazzoni, María Laura. «La invasión inglesa y la participación popular en la Reconquista y Defensa de Buenos Aires 1806-1807». Anuario del Instituto de Historia Argentina, n.º 11, UNLP, 2011, pp. 43-71.",
          enlaces: [{ label: "Abrir para más información", href: "https://www.anuarioiha.fahce.unlp.edu.ar/article/view/AHn11a03" }],
        },
        {
          id: "intro0-cordoba",
          titulo: "Córdoba",
          img: "assets/ficha-cordoba-1806.jpg",
          cuerpo: "Córdoba no fue un destino improvisado. Sáenz Berceo recuerda que el plan de Vértiz (1781) ya ordenaba, si caía la capital, trasladar archivos y caudales al interior. Sobremonte escribió el 30 de junio al teniente gobernador Victorino Rodríguez anunciando que Córdoba sería capital provisional del virreinato.",
          cita: "Sáenz Berceo, María del Carmen. «Rafael de Sobremonte: un virrey polémico». REDUR, n.º 12, Universidad de La Rioja, diciembre 2014, pp. 113-137. ISSN 1695-078X.",
          enlaces: [{ label: "Abrir para más información", href: "https://dialnet.unirioja.es/servlet/articulo?codigo=5215926" }],
        },
      ],
    },
    {
      marcas: [],
      puntos: [],
      sitios: [],
      fichas: [
        {
          id: "intro1-quilmes-ficha",
          titulo: "Quilmes",
          img: "assets/ficha-quilmes.jpg",
          cuerpo: "El 25 de junio de 1806 las tropas de Beresford desembarcaron en la costa de Quilmes. Furlan sitúa ese desembarco en la campaña naval de Popham: la escuadra cubrió el cruce del Río de la Plata y dejó a la infantería británica con el camino abierto hacia Buenos Aires, con escasa resistencia en la costa.",
          cita: "Furlan, Luis F. «Actividad marítima y naval del Cabildo de Buenos Aires durante las invasiones inglesas al Río de la Plata (1806-1807)». Boletín del Centro Naval, n.º 814, mayo-agosto 2006.",
          enlaces: [{ label: "Abrir para más información", href: "https://centronaval.org.ar/boletin/BCN814/814furlan.pdf" }],
        },
        {
          id: "intro1-militar-ficha",
          titulo: "Militar",
          img: "assets/ficha-militar.jpg",
          cuerpo: "Ocupar los puestos militares de Buenos Aires no fue un trámite: Cuadra Centeno y Mazzoni muestran que 1806-1807 militarizó a la sociedad porteña. Milicias, voluntarios y sectores plebeyos entraron en armas; esa experiencia, dicen, anticipó prácticas y actores que pocos años después intervendrían en la Revolución de Mayo.",
          cita: "Cuadra Centeno, Pablo A. y Mazzoni, María Laura. «La invasión inglesa y la participación popular en la Reconquista y Defensa de Buenos Aires 1806-1807». Anuario del Instituto de Historia Argentina, n.º 11, UNLP, 2011, pp. 43-71.",
          enlaces: [{ label: "Abrir para más información", href: "https://www.anuarioiha.fahce.unlp.edu.ar/article/view/AHn11a03" }],
        },
      ],
    },
    {
      marcas: [],
      puntos: [],
      sitios: [],
      fichas: [
        {
          id: "intro2-belgrano",
          titulo: "Belgrano",
          img: "assets/retrato-belgrano.jpg",
          cuerpo: "Manuel Belgrano, secretario del Consulado, se negó a jurar lealtad a los ocupantes. Cuadra Centeno y Mazzoni ubican a los criollos que no se plegaron al juramento británico en el origen de la reconquista: la negativa de figuras como Belgrano adelanta el pasaje de la defensa de la ciudad a la militarización popular de 1806-1807.",
          cita: "Cuadra Centeno, Pablo A. y Mazzoni, María Laura. «La invasión inglesa y la participación popular en la Reconquista y Defensa de Buenos Aires 1806-1807». Anuario del Instituto de Historia Argentina, n.º 11, UNLP, 2011, pp. 43-71.",
          enlaces: [{ label: "Abrir para más información", href: "https://www.anuarioiha.fahce.unlp.edu.ar/article/view/AHn11a03" }],
        },
        {
          id: "intro2-alzaga",
          titulo: "Álzaga",
          img: "assets/retrato-alzaga.jpg",
          cuerpo: "Martín de Álzaga, comerciante y alcalde, fue un organizador clave de la resistencia. Cuadra Centeno y Mazzoni documentan que en las milicias y en los batallones de esclavos aparecen apellidos de la elite —entre ellos Álzaga— y que esa militarización cruzó a amos y esclavos. En 1806 ya se lo cuenta entre quienes no juraron al invasor.",
          cita: "Cuadra Centeno, Pablo A. y Mazzoni, María Laura. «La invasión inglesa y la participación popular en la Reconquista y Defensa de Buenos Aires 1806-1807». Anuario del Instituto de Historia Argentina, n.º 11, UNLP, 2011, pp. 43-71.",
          enlaces: [{ label: "Abrir para más información", href: "https://www.anuarioiha.fahce.unlp.edu.ar/article/view/AHn11a03" }],
        },
        {
          id: "intro2-pueyrredon",
          titulo: "J. M. Pueyrredón",
          img: "assets/retrato-pueyrredon.jpg",
          cuerpo: "Juan Martín de Pueyrredón salió a la campaña a reunir gente a su costa. El trabajo de la UNLu reconstruye esa militarización rural: presentó listas de vecinos que lo acompañaron a reclutar, sostuvo a la tropa y combatió en Perdriel (1.º de agosto de 1806) antes de unirse a Liniers para la reconquista de la ciudad.",
          cita: "«La campaña porteña en movimiento: una experiencia de militarización rural durante la primera invasión inglesa al Río de la Plata». Didáctica de la Historia, Universidad Nacional de Luján.",
          enlaces: [{ label: "Abrir para más información", href: "https://www.didacticadelahistoria.unlu.edu.ar/sites/www.didacticadelahistoria.unlu.edu.ar/files/site/La%20campa%C3%B1a%20porte%C3%B1a%20en%20movimiento.pdf" }],
        },
      ],
    },
    {
      marcas: [],
      puntos: [],
      sitios: [],
      fichas: [
        {
          id: "intro3-ataque",
          titulo: "Ataque de guerra",
          img: "assets/ficha-ataque.jpg",
          cuerpo: "Furlan describe la operación británica de 1806 como una campaña naval ofensiva: la escuadra de Popham cubrió el desembarco, el avance sobre Buenos Aires y la ocupación del puerto. No fue un incidente aislado sino un ataque de guerra sobre el estuario del Plata.",
          cita: "Furlan, Luis F. «Actividad marítima y naval del Cabildo de Buenos Aires durante las invasiones inglesas al Río de la Plata (1806-1807)». Boletín del Centro Naval, n.º 814, mayo-agosto 2006.",
          enlaces: [{ label: "Abrir para más información", href: "https://centronaval.org.ar/boletin/BCN814/814furlan.pdf" }],
        },
      ],
    },
    {
      marcas: [],
      puntos: [],
      sitios: [],
      fichas: [
        {
          id: "intro4-retiro",
          titulo: "Retiro",
          img: "assets/ficha-retiro.jpg",
          cuerpo: "Retiro era la entrada norte y el predio de cuarteles. Cuadra Centeno y Mazzoni ubican ahí el primer frente de la reconquista: milicias y voluntarios chocaron con la línea británica antes de empujar hacia el centro. Si los invasores cedían, el plan era refugiarse en el Fuerte, sobre la barranca del río.",
          cita: "Cuadra Centeno, Pablo A. y Mazzoni, María Laura. «La invasión inglesa y la participación popular en la Reconquista y Defensa de Buenos Aires 1806-1807». Anuario del Instituto de Historia Argentina, n.º 11, UNLP, 2011, pp. 43-71.",
          enlaces: [{ label: "Abrir para más información", href: "https://www.anuarioiha.fahce.unlp.edu.ar/article/view/AHn11a03" }],
        },
      ],
    },
    {
      marcas: [],
      puntos: [],
      sitios: [],
      fichas: [
        {
          id: "intro5-tigre-ficha",
          titulo: "Tigre",
          img: "assets/ficha-tigre.jpg",
          cuerpo: "Los patriotas desembarcaron por el delta, en la zona de Las Conchas —hoy Tigre—. Furlan reconstruye esa vía fluvial: Liniers cruzó desde la Banda Oriental y tomó la costa norte para marchar sobre Buenos Aires, lejos de la escuadra británica apostada frente al puerto ocupado.",
          cita: "Furlan, Luis F. «Actividad marítima y naval del Cabildo de Buenos Aires durante las invasiones inglesas al Río de la Plata (1806-1807)». Boletín del Centro Naval, n.º 814, mayo-agosto 2006.",
          enlaces: [{ label: "Abrir para más información", href: "https://centronaval.org.ar/boletin/BCN814/814furlan.pdf" }],
        },
        {
          id: "intro5-patriota-ficha",
          titulo: "Patriota",
          img: "assets/ficha-patriota.jpg",
          cuerpo: "«Patriota», en 1806, no era aún el lenguaje de 1810: nombraba a quienes se negaron al juramento británico y se armaron para recuperar la ciudad. Cuadra Centeno y Mazzoni subrayan que esa identidad se forjó en la milicia urbana y rural, con participación popular que desborda el relato de los oficiales solos.",
          cita: "Cuadra Centeno, Pablo A. y Mazzoni, María Laura. «La invasión inglesa y la participación popular en la Reconquista y Defensa de Buenos Aires 1806-1807». Anuario del Instituto de Historia Argentina, n.º 11, UNLP, 2011, pp. 43-71.",
          enlaces: [{ label: "Abrir para más información", href: "https://www.anuarioiha.fahce.unlp.edu.ar/article/view/AHn11a03" }],
        },
        {
          id: "intro5-miliciano-ficha",
          titulo: "Miliciano",
          img: "assets/ficha-miliciano.jpg",
          cuerpo: "El miliciano —vecino en armas, no soldado de línea— fue la pieza masiva de 1806. Pueyrredón los reunió en la campaña; Liniers los sumó al desembarco. Cuadra Centeno y Mazzoni sostienen que esa milicia plebeya militarizó a Buenos Aires y dejó prácticas que reaparecerían en la Revolución.",
          cita: "Cuadra Centeno, Pablo A. y Mazzoni, María Laura. «La invasión inglesa y la participación popular en la Reconquista y Defensa de Buenos Aires 1806-1807». Anuario del Instituto de Historia Argentina, n.º 11, UNLP, 2011, pp. 43-71.",
          enlaces: [{ label: "Abrir para más información", href: "https://www.anuarioiha.fahce.unlp.edu.ar/article/view/AHn11a03" }],
        },
      ],
    },
  ],
  zonas: {},
};

const INFO_ITEMS = {};

const MAPA_ZONAS = [
  { id: "retiro", nombre: "Retiro", left: 72, top: 18, w: 14, h: 22 },
  { id: "barricada", nombre: "Barricada", left: 48, top: 22, w: 10, h: 28 },
  { id: "fuerte", nombre: "Fuerte", left: 38, top: 58, w: 14, h: 18 },
];

let PREGUNTAS = Array.isArray(window.BANCO_PREGUNTAS) ? window.BANCO_PREGUNTAS.slice() : [];

function d6() { return 1 + Math.floor(Math.random() * 6); }

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nuevoJuego() {
  return {
    pantalla: "sc-titulo",
    fase: "cartas",
    subfase: "",
    introIdx: 0,
    ronda: 1,
    patriotas: 1600,
    reserva: 300,
    retiroReservaUsada: false,
    ingleses: 850,
    ingFuerte: 300,
    ingPlaza: 600,
    colPat: [0, 0],
    colIng: [300, 300],
    colObjetivo: -1,
    caballosP: 0,
    canonesP: 0,
    caballosE: 0,
    canonesE: 0,
    oroP: 3000,
    oroE: 2000,
    maxP: 1600,
    maxE: 850,
    pausado: false,
    pila: [],
    log: [],
    cartasObtenidas: [],
    misiones: MISIONES_DEF.map((m) => ({ ...m, estado: m.id === "retiro" ? "activa" : "pendiente" })),
    cierreAccion: null,
    resultadosAccion: null,
    compraTipo: null,
    compraBando: "p",
    limiteRecluta: 0,
    modoCombate: "preguntas",
    preguntasPool: [],
    preguntaActual: null,
    seisSeguidosP: 0,
    seisSeguidosE: 0,
    proceresP: [],
    proceresE: [],
    historial: [],
  };
}

let G = nuevoJuego();
let STATS = {
  misionesGanadas: 0,
  oroMisiones: 0,
  correctas: 0,
  incorrectas: 0,
  proceres: 0,
  victorias: 0,
  derrotas: 0,
  soldadosPerdidos: 0,
  caballosObtenidos: 0,
  canonesObtenidos: 0,
};
let dadosToken = 0;
let preguntaRespondida = false;

function log(msg) {
  G.log.unshift(msg);
  G.log = G.log.slice(0, 14);
  ["log-cartas", "log-bat"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = G.log.map((l) => `<div>${l}</div>`).join("");
  });
}

function tituloCarta(raw) {
  const s = String(raw || "");
  const def = CARTA_DEFS[s];
  if (def) return def.titulo;
  return s.replace(/\d+/g, "").replace(/\s+/g, " ").replace(/:\s*$/, "").trim() || s;
}

function esCartaRespuesta(c) {
  if (typeof c === "string") {
    const t = tituloCarta(c).toLowerCase();
    return c === "acierto" || t.indexOf("respuesta") >= 0;
  }
  const id = String(c.id || "");
  const titulo = String(c.titulo || "").toLowerCase();
  return id === "acierto" || titulo.indexOf("respuesta") >= 0;
}

function cartasVisibles() {
  return (G.cartasObtenidas || []).filter((c) => !esCartaRespuesta(c));
}

function agregarCarta(id, extra) {
  const key = String(id || "");
  if (key === "acierto") return;
  const img = (extra && extra.img) || (CARTA_DEFS[key] && CARTA_DEFS[key].img) || "";
  const titulo = (extra && extra.titulo) || tituloCarta(key);
  if (/respuesta/i.test(titulo)) return;
  const ya = G.cartasObtenidas.some((c) => {
    if (typeof c === "string") return c === key || tituloCarta(c) === titulo;
    return c.id === key || c.titulo === titulo;
  });
  if (ya) return;
  G.cartasObtenidas.push({ id: key, titulo, img });
}

function persistirStats() {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(STATS)); } catch (e) { /* ignore */ }
}

function cargarStats() {
  try {
    let raw = localStorage.getItem(STATS_KEY);
    if (!raw) raw = localStorage.getItem("epopeyas_v111_stats");
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && typeof data === "object") STATS = Object.assign(STATS, data);
  } catch (e) { /* ignore */ }
}

function renovarCicloPreguntasSiCorresponde(forzar) {
  const now = Date.now();
  let inicio = 0;
  try {
    const raw = localStorage.getItem(PREGUNTAS_CICLO_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      inicio = Number(data && data.inicio) || 0;
    }
  } catch (e) { /* ignore */ }
  const vencido = !inicio || forzar || (now - inicio) >= PREGUNTAS_CICLO_MS;
  if (!vencido) return false;
  try {
    localStorage.setItem(PREGUNTAS_CICLO_KEY, JSON.stringify({ inicio: now, version: VERSION_JUEGO }));
  } catch (e) { /* ignore */ }
  if (PREGUNTAS.length) G.preguntasPool = shuffle(PREGUNTAS.map((_, i) => i));
  else G.preguntasPool = [];
  return true;
}

function statsTextoMision(m) {
  if (!m) return "";
  switch (m.id) {
    case "retiro":
      return `P ${G.patriotas} · E ${G.ingleses} · 🐎${G.caballosP} 💣${G.canonesP}`;
    case "barricada": {
      const p = (G.colPat[0] || 0) + (G.colPat[1] || 0);
      const e = (G.colIng[0] || 0) + (G.colIng[1] || 0);
      return `Columnas P ${p || G.patriotas} · E ${e || G.ingleses}`;
    }
    case "fuerte_plaza":
      return `P ${G.patriotas} · Plaza ${G.ingPlaza || 0} · Oro ${G.oroP}`;
    case "fuerte_int":
      return `P ${G.patriotas} · Fuerte ${G.ingFuerte || G.ingleses} · 🐎${G.caballosP} 💣${G.canonesP}`;
    case "victoria":
      return `Oro ${G.oroP} · 🐎${G.caballosP} · 💣${G.canonesP}`;
    default:
      return `P ${G.patriotas} · E ${G.ingleses}`;
  }
}

function htmlMisionItem(m) {
  const ic = { activa: "▶", completada: "✓", pendiente: "○", fallida: "✗" };
  return `<li class="mision-item estado-${m.estado}"><span>${ic[m.estado] || "○"}</span> <strong>${m.nombre}</strong><span class="mision-stats">${statsTextoMision(m)}</span><small>${m.desc}</small></li>`;
}

function registrarPerdidas(n) {
  const cant = Math.max(0, n || 0);
  if (!cant) return;
  STATS.soldadosPerdidos = (STATS.soldadosPerdidos || 0) + cant;
  persistirStats();
}

function setMision(id, estado) {
  const m = G.misiones.find((x) => x.id === id);
  if (!m) return;
  if (estado === "completada" && m.estado !== "completada") {
    G.oroP += 1000;
    STATS.misionesGanadas += 1;
    STATS.oroMisiones += 1000;
    persistirStats();
    agregarCarta("tesoro", { titulo: "Tesoro patriota" });
    log(`+1000 al tesoro patriota por completar ${m.nombre}.`);
  }
  m.estado = estado;
}

function pctRestante(b) {
  const max = b === "p" ? G.maxP : G.maxE;
  const now = b === "p" ? G.patriotas : G.ingleses;
  return Math.max(0, Math.round((now / Math.max(max, 1)) * 100));
}

function bajoUmbral(b) {
  return pctRestante(b) <= Math.round(UMBRAL * 100);
}

function htmlDado(n) {
  const on = PIPS[n] || [];
  const pips = Array.from({ length: 9 }, (_, i) => `<span class="pip${on.includes(i + 1) ? " on" : ""}"></span>`).join("");
  return `<div class="dado${n ? "" : " dado-empty"}">${pips}</div>`;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function registrarInfo(item) {
  if (!item || !item.id) return item;
  INFO_ITEMS[item.id] = item;
  return item;
}

function infoDePantalla(key) {
  if (key === "titulo") return INFO_PANTALLAS.titulo || { marcas: [], puntos: [], sitios: [] };
  if (String(key).indexOf("intro-") === 0) {
    const i = parseInt(key.slice(6), 10);
    return (INFO_PANTALLAS.intro && INFO_PANTALLAS.intro[i]) || { marcas: [], puntos: [], sitios: [] };
  }
  return { marcas: [], puntos: [], sitios: [] };
}

function htmlConMarcas(texto, marcas) {
  let html = escapeHtml(texto);
  const list = (marcas || []).slice().sort((a, b) => String(b.texto || "").length - String(a.texto || "").length);
  list.forEach((m) => {
    if (!m.texto) return;
    registrarInfo(m);
    const needle = escapeHtml(m.texto).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(needle, "i");
    html = html.replace(re, (match) => `<button type="button" class="info-mark" data-info-id="${escapeHtml(m.id)}">${match}</button>`);
  });
  return html;
}

function pintarSitios(el, sitios) {
  if (!el) return;
  const list = sitios || [];
  if (!list.length) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  el.hidden = false;
  el.innerHTML = list.map((s) => {
    const href = escapeHtml(s.href || s.url || "#");
    const label = escapeHtml(s.label || s.nombre || "Sitio");
    return `<a class="info-sitio" href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  }).join("");
}

function pintarPuntos(host, puntos) {
  if (!host) return;
  const list = puntos || [];
  host.innerHTML = list.map((p) => {
    registrarInfo(p);
    return `<button type="button" class="info-punto" data-info-id="${escapeHtml(p.id)}" style="left:${p.x}%;top:${p.y}%" title="${escapeHtml(p.titulo || "")}">i</button>`;
  }).join("");
}

function pintarFichas(el, fichas) {
  if (!el) return;
  const list = fichas || [];
  if (!list.length) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  el.hidden = false;
  el.innerHTML = list.map((f) => {
    registrarInfo(f);
    return `<button type="button" class="info-ficha" data-info-id="${escapeHtml(f.id)}"><span class="info-ficha-img" style="background-image:url('${escapeHtml(f.img || "")}')"></span><span class="info-ficha-nom">${escapeHtml(f.titulo || "")}</span></button>`;
  }).join("");
}

function abrirInfo(item) {
  if (!item) return;
  document.getElementById("info-titulo").textContent = item.titulo || "Información";
  document.getElementById("info-cuerpo").textContent = item.cuerpo || item.texto || "";
  const cita = document.getElementById("info-cita");
  if (cita) {
    const txt = item.cita || "";
    cita.textContent = txt;
    cita.hidden = !txt;
  }
  const img = document.getElementById("info-img");
  if (img) {
    if (item.img) {
      img.hidden = false;
      img.style.backgroundImage = `url('${item.img}')`;
    } else {
      img.hidden = true;
      img.style.backgroundImage = "";
    }
  }
  pintarSitios(document.getElementById("info-enlaces"), item.enlaces || item.sitios || []);
  document.getElementById("ov-info").classList.add("show");
}

function pintarTituloInfo() {
  const info = infoDePantalla("titulo");
  const el = document.getElementById("titulo-texto");
  if (el) el.innerHTML = htmlConMarcas(TITULO_TEXTO, info.marcas);
  pintarSitios(document.getElementById("titulo-sitios"), info.sitios);
  pintarPuntos(document.getElementById("titulo-puntos"), info.puntos);
  pintarFichas(document.getElementById("titulo-fichas"), info.fichas);
}

function tieneInfoVisible(info) {
  return !!(
    (info.marcas && info.marcas.length) ||
    (info.puntos && info.puntos.length) ||
    (info.fichas && info.fichas.length)
  );
}

function pintarDadosOv(dp, de, roll) {
  document.getElementById("dice-pat-ov").innerHTML = htmlDado(roll ? 0 : dp);
  document.getElementById("dice-ing-ov").innerHTML = htmlDado(roll ? 0 : de);
}

function show(id, volver) {
  if (!volver && G.pantalla && G.pantalla !== id) {
    if (G.pila[G.pila.length - 1] !== G.pantalla) G.pila.push(G.pantalla);
    if (G.pila.length > 20) G.pila.shift();
  }
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("show"));
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("show");
  G.pantalla = id;
  cerrarOverlays(true);
}

function volver() {
  const overlays = ["ov-info", "ov-pregunta", "ov-dados", "ov-compra", "ov-resultados", "ov-panel-bat", "ov-recluta-post", "ov-historial", "ov-pausa", "ov-columna", "ov-stats"];
  const abierto = overlays.find((id) => document.getElementById(id)?.classList.contains("show"));
  if (abierto) {
    document.getElementById(abierto).classList.remove("show");
    if (abierto === "ov-pausa") G.pausado = false;
    if (abierto === "ov-pregunta" || abierto === "ov-dados") habilitarCombate();
    return;
  }
  if (G.introIdx > 0 && G.pantalla === "sc-intro") {
    G.introIdx -= 1;
    pintarIntro();
    return;
  }
  const p = G.pila.pop();
  if (!p || p === G.pantalla) {
    if (G.pantalla !== "sc-titulo") {
      show("sc-titulo", true);
      actualizarUI();
    }
    return;
  }
  show(p, true);
  actualizarUI();
  if (p === "sc-batalla") refrescarBatalla();
  if (p === "sc-intro") pintarIntro();
}

function tituloFase() {
  const t = {
    retiro: "Batalla de Retiro",
    barricada: "La Barricada",
    fuerte_plaza: "Plaza Mayor del Fuerte",
    fuerte_col: "Ataque por columnas",
    fuerte_int: "El Fuerte",
    fuerte_recupera: "Jabonería de Vieytes",
  };
  return t[G.fase] || "Combate";
}

function infoFase() {
  if (G.fase === "barricada" && G.subfase === "elegir_col") {
    return "Elegí qué columna patriota ataca primero.";
  }
  return "";
}

function esperaColumna() {
  return G.fase === "barricada" && G.subfase === "elegir_col";
}

function habilitarCombate() {
  const btn = document.getElementById("btn-dia");
  if (!btn) return;
  btn.disabled = esperaColumna();
}

function actualizarTiposTropa() {
  const lblCab = document.getElementById("lbl-caballos");
  const lblCan = document.getElementById("lbl-canones");
  const puedeCab = G.caballosP >= MIN_UNIDAD;
  const puedeCan = G.canonesP >= MIN_UNIDAD;
  if (lblCab) {
    lblCab.classList.toggle("disabled-tipo", !puedeCab);
    const inp = lblCab.querySelector("input");
    if (inp) {
      inp.disabled = !puedeCab;
      if (!puedeCab && inp.checked) {
        const sol = document.querySelector('input[name="tipo-p"][value="soldados"]');
        if (sol) sol.checked = true;
      }
    }
  }
  if (lblCan) {
    lblCan.classList.toggle("disabled-tipo", !puedeCan);
    const inp = lblCan.querySelector("input");
    if (inp) {
      inp.disabled = !puedeCan;
      if (!puedeCan && inp.checked) {
        const sol = document.querySelector('input[name="tipo-p"][value="soldados"]');
        if (sol) sol.checked = true;
      }
    }
  }
}

function actualizarBotonAccion() {
  const btn = document.getElementById("btn-dia");
  const tipoRow = document.querySelector(".tipo-tropa");
  const bajas = document.getElementById("bajas");
  if (!btn) return;
  G.modoCombate = "preguntas";
  btn.textContent = "Responder pregunta";
  if (tipoRow) tipoRow.hidden = false;
  if (bajas) bajas.textContent = "";
  actualizarTiposTropa();
  habilitarCombate();
}

function pintarMisiones(targetId) {
  const el = document.getElementById(targetId || "mision-list");
  if (!el) return;
  el.innerHTML = G.misiones.map((m) => htmlMisionItem(m)).join("");
}

function pintarCartasObtenidas(targetId) {
  const el = document.getElementById(targetId || "carta-list");
  if (!el) return;
  const cartas = cartasVisibles();
  if (!cartas.length) {
    el.innerHTML = '<li class="carta-item vacia">Sin cartas aún.</li>';
    return;
  }
  el.innerHTML = cartas.map((c) => {
    const v = cartaVista(c);
    const img = v.img ? `<img src="${escapeHtml(v.img)}" alt="">` : "";
    return `<li class="carta-item carta-visual">${img}<strong>${escapeHtml(v.titulo)}</strong></li>`;
  }).join("");
}

function actualizarUI() {
  const pat = document.getElementById("n-pat");
  const ing = document.getElementById("n-ing");
  if (pat) pat.textContent = G.patriotas + (G.reserva > 0 && G.fase === "cartas" ? ` (+${G.reserva})` : "");
  if (ing) ing.textContent = G.ingleses;
  ["n-oro-p", "oro-compra"].forEach((id) => {
    const e = document.getElementById(id);
    if (e && id === "n-oro-p") e.textContent = G.oroP;
  });
  const oe = document.getElementById("n-oro-e");
  if (oe) oe.textContent = G.oroE;
  const cp = document.getElementById("n-cab-p");
  if (cp) cp.textContent = G.caballosP;
  const cn = document.getElementById("n-can-p");
  if (cn) cn.textContent = G.canonesP;
  const ce = document.getElementById("n-cab-e");
  if (ce) ce.textContent = G.caballosE;
  const cne = document.getElementById("n-can-e");
  if (cne) cne.textContent = G.canonesE;
  pintarMisiones();
  pintarTituloInfo();
  if (G.pantalla === "sc-batalla") refrescarBatalla();
}

function pintarMapa() {
  const host = document.getElementById("mapa-zonas");
  if (host) host.innerHTML = "";
}

function pintarBarras() {
  const pPct = Math.max(4, (G.patriotas / Math.max(G.maxP, 1)) * 100);
  const ePct = Math.max(4, (G.ingleses / Math.max(G.maxE, 1)) * 100);
  document.getElementById("bar-pat").style.width = `${pPct}%`;
  document.getElementById("bar-ing").style.width = `${ePct}%`;
  document.getElementById("txt-pat").textContent = `${G.patriotas} 🐎${G.caballosP} 💣${G.canonesP}`;
  document.getElementById("txt-ing").textContent = `${G.ingleses} 🐎${G.caballosE} 💣${G.canonesE}`;
  document.getElementById("pct-pat").textContent = `${pctRestante("p")}%`;
  document.getElementById("pct-ing").textContent = `${pctRestante("e")}%`;
}

function pintarSoldados() {
  const n = (v) => Math.max(3, Math.min(12, Math.round(Math.max(v, 1) / 120)));
  const ap = document.getElementById("army-pat");
  const ae = document.getElementById("army-en1");
  if (!ap || !ae) return;
  ap.innerHTML = "";
  ae.innerHTML = "";
  for (let i = 0; i < n(G.patriotas); i++) {
    const s = document.createElement("div");
    s.className = "soldado ar";
    s.style.left = `${10 + (i % 4) * 20}%`;
    s.style.top = `${8 + Math.floor(i / 4) * 24}px`;
    s.innerHTML = "<i></i><b></b>";
    ap.appendChild(s);
  }
  for (let i = 0; i < n(G.ingleses); i++) {
    const s = document.createElement("div");
    s.className = "soldado en";
    s.style.left = `${10 + (i % 4) * 20}%`;
    s.style.top = `${8 + Math.floor(i / 4) * 24}px`;
    s.innerHTML = "<i></i><b></b>";
    ae.appendChild(s);
  }
}

function mapaBatalla() {
  return "assets/mapa-retiro.jpg";
}

function refrescarBatalla() {
  document.getElementById("bat-titulo").textContent = tituloFase();
  document.getElementById("bat-dia").textContent = `Día ${G.ronda}`;
  const info = document.getElementById("bat-info");
  const txt = infoFase();
  info.textContent = txt;
  info.hidden = !txt;
  const panelBtns = document.getElementById("bat-panel-btns");
  if (panelBtns) panelBtns.hidden = !(G.fase === "retiro" || G.fase === "barricada" || G.fase === "fuerte_plaza" || G.fase === "fuerte_int");
  const campo = document.getElementById("campo");
  campo.style.backgroundImage = `url('${mapaBatalla()}')`;
  campo.classList.add("mapa-retiro");
  campo.classList.remove("mapa-mision");
  const col = document.getElementById("elige-columna");
  if (col) {
    col.hidden = true;
    col.style.display = "none";
  }
  const zonas = document.getElementById("mapa-zonas");
  if (zonas) zonas.hidden = true;
  actualizarBotonAccion();
  pintarMapa();
  pintarBarras();
  pintarSoldados();
  if (esperaColumna()) abrirColumnas();
}

function iniciarFase(fase) {
  const prev = G.fase;
  G.fase = fase;
  G.subfase = "";
  G.ronda = 1;
  G.colObjetivo = -1;

  if (fase === "retiro") {
    if (prev === "cartas") {
      G.patriotas = 1600;
      G.reserva = 300;
      G.ingleses = 850;
      G.maxP = 1600;
      G.maxE = 850;
      G.retiroReservaUsada = false;
    }
    G.subfase = "combate";
    setMision("retiro", "activa");
  } else if (fase === "barricada") {
    const surv = Math.max(0, G.ingleses);
    G.ingleses = surv + 150;
    G.maxE = G.ingleses;
    G.maxP = G.patriotas;
    const mitadP = Math.floor(G.patriotas / 2);
    const mitadE = Math.floor(G.ingleses / 2);
    G.colPat = [mitadP, G.patriotas - mitadP];
    G.colIng = [mitadE, G.ingleses - mitadE];
    G.colObjetivo = -1;
    G.subfase = "elegir_col";
    G.ronda = 1;
    setMision("retiro", "completada");
    setMision("barricada", "activa");
    log("Popham se repliega a la Barricada con refuerzos (+150).");
  } else if (fase === "fuerte_plaza") {
    G.patriotas += 2000;
    G.ingleses = 600;
    G.ingPlaza = 600;
    G.ingFuerte = 300;
    G.maxP = G.patriotas;
    G.maxE = 600;
    G.subfase = "combate";
    G.colObjetivo = -1;
    setMision("barricada", "completada");
    setMision("fuerte_plaza", "activa");
    log("Belgrano suma 2000 milicianos. Los ingleses defienden la Plaza Mayor.");
  } else if (fase === "fuerte_int") {
    G.ingleses = G.ingFuerte || Math.max(50, Math.floor(G.maxE * UMBRAL));
    G.maxE = G.ingleses;
    G.maxP = G.patriotas;
    setMision("fuerte_plaza", "completada");
    setMision("fuerte_int", "activa");
    log("Los ingleses se refugian en el Fuerte. Asalto final.");
  } else if (fase === "fuerte_recupera") {
    G.maxP = G.patriotas;
    log("Retirada a la jabonería de Vieytes. Reclutá con oro.");
    show("sc-cartas");
    actualizarUI();
    return;
  }

  actualizarUI();
  show("sc-batalla");
  refrescarBatalla();
  habilitarCombate();
  if (fase === "retiro" || fase === "barricada" || fase === "fuerte_plaza" || fase === "fuerte_int") {
    guardarPunto(`Inicio · ${etiquetaFase(fase)}`);
  }
}

function pintarColumnaBotones() {
  [0, 1].forEach((i) => {
    const btn = document.getElementById(`col-pick-${i}`);
    if (!btn) return;
    const muerta = (G.colPat[i] || 0) <= 0;
    const vencida = (G.colIng[i] || 0) <= 0;
    btn.disabled = muerta || vencida;
    btn.classList.toggle("caida", muerta);
    btn.classList.toggle("vencida", vencida && !muerta);
  });
}

function abrirColumnas() {
  if (G.fase !== "barricada") return;
  G.subfase = "elegir_col";
  const hint = document.getElementById("columna-hint");
  if (hint) {
    const primera = G.colIng.every((n, i) => n <= 0 || i === 0 || G.colPat[i] <= 0) ? "primero" : "ahora";
    hint.textContent = primera === "primero" && G.colIng[0] > 0 && G.colIng[1] > 0 && G.colPat[0] > 0 && G.colPat[1] > 0
      ? "Elegí qué columna patriota ataca primero:"
      : "Elegí la columna patriota que ataca:";
  }
  pintarColumnaBotones();
  document.getElementById("ov-columna").classList.add("show");
  habilitarCombate();
}

function syncColumna() {
  if (G.fase !== "barricada" || G.colObjetivo < 0) return;
  G.colPat[G.colObjetivo] = G.patriotas;
  G.colIng[G.colObjetivo] = G.ingleses;
}

function elegirColumna(i) {
  if (G.fase !== "barricada" || G.subfase !== "elegir_col") return;
  if ((G.colPat[i] || 0) <= 0 || (G.colIng[i] || 0) <= 0) return;
  G.colObjetivo = i;
  G.patriotas = G.colPat[i];
  G.ingleses = G.colIng[i];
  G.maxP = Math.max(G.maxP, G.patriotas);
  G.maxE = Math.max(G.maxE, G.ingleses);
  G.subfase = "combate_col";
  G.ronda = 1;
  document.getElementById("ov-columna").classList.remove("show");
  log(`Columna ${i + 1}: ${G.patriotas} patriotas vs ${G.ingleses} ingleses.`);
  habilitarCombate();
  refrescarBatalla();
}

function tipoJugador() {
  const el = document.querySelector('input[name="tipo-p"]:checked');
  return el ? el.value : "soldados";
}

function validarTipo(tipo) {
  if (tipo === "caballos" && G.caballosP < MIN_UNIDAD) {
    log(`Necesitás al menos ${MIN_UNIDAD} caballos comprados.`);
    return false;
  }
  if (tipo === "canones" && G.canonesP < MIN_UNIDAD) {
    log(`Necesitás al menos ${MIN_UNIDAD} cañones comprados.`);
    return false;
  }
  return true;
}

function resolverBajas(dp, de, tipo) {
  const diff = Math.abs(dp - de);
  let bajaP = 0;
  let bajaE = 0;
  let bajaCab = 0;
  let bajaCan = 0;
  if (dp > de) {
    bajaE = diff * 100;
    if (tipo === "caballos") bajaE *= 2;
    if (tipo === "canones") bajaE *= 3;
  } else if (de > dp) {
    bajaP = diff * 100;
    if (tipo === "caballos") {
      bajaCab = diff;
      G.caballosP = Math.max(0, G.caballosP - bajaCab);
    }
    if (tipo === "canones") {
      bajaCan = diff;
      G.canonesP = Math.max(0, G.canonesP - bajaCan);
    }
  }
  G.patriotas = Math.max(0, G.patriotas - bajaP);
  G.ingleses = Math.max(0, G.ingleses - bajaE);
  if (bajaP) registrarPerdidas(bajaP);
  syncColumna();
  return { bajaP, bajaE, bajaCab, bajaCan, dp, de };
}

function otorgarProcer(bando) {
  if (bando === "p") {
    if (G.proceresP.length >= PROCERES_P.length) return null;
    const nombre = PROCERES_P[G.proceresP.length];
    G.proceresP.push(nombre);
    G.patriotas += 300;
    G.maxP += 300;
    agregarCarta("procer-" + nombre, {
      titulo: nombre,
      img: PROCER_IMG[nombre] || "assets/retrato-belgrano.jpg",
      bio: PROCER_BIO[nombre] || "",
    });
    STATS.proceres += 1;
    persistirStats();
    log(`🇦🇷 Prócer ${nombre} se une (+300 milicianos).`);
    return nombre;
  }
  if (G.proceresE.length >= PROCERES_E.length) return null;
  const nombre = PROCERES_E[G.proceresE.length];
  G.proceresE.push(nombre);
  G.ingleses += 300;
  G.maxE += 300;
  agregarCarta("procer-en-" + nombre, { titulo: nombre, img: PROCER_IMG[nombre] || "assets/unidad-ingles.png" });
  log(`🇬🇧 Prócer ${nombre} refuerza a los ingleses (+300).`);
  return nombre;
}

function registrarSeis(bando, valor) {
  if (bando === "p") {
    G.seisSeguidosP = valor === 6 ? G.seisSeguidosP + 1 : 0;
    if (G.seisSeguidosP >= 3) {
      G.seisSeguidosP = 0;
      return otorgarProcer("p");
    }
  } else {
    G.seisSeguidosE = valor === 6 ? G.seisSeguidosE + 1 : 0;
    if (G.seisSeguidosE >= 3) {
      G.seisSeguidosE = 0;
      return otorgarProcer("e");
    }
  }
  return null;
}

function etiquetaFase(fase) {
  const t = {
    cartas: "Cartas de juego",
    retiro: "Batalla de Retiro",
    barricada: "La Barricada",
    fuerte_plaza: "Plaza Mayor",
    fuerte_int: "El Fuerte",
    fuerte_recupera: "Jabonería de Vieytes",
  };
  return t[fase] || fase;
}

function snapshotEstado() {
  return JSON.parse(JSON.stringify({
    fase: G.fase,
    subfase: G.subfase,
    ronda: G.ronda,
    patriotas: G.patriotas,
    reserva: G.reserva,
    retiroReservaUsada: G.retiroReservaUsada,
    ingleses: G.ingleses,
    ingFuerte: G.ingFuerte,
    ingPlaza: G.ingPlaza,
    colPat: G.colPat,
    colIng: G.colIng,
    colObjetivo: G.colObjetivo,
    caballosP: G.caballosP,
    canonesP: G.canonesP,
    caballosE: G.caballosE,
    canonesE: G.canonesE,
    oroP: G.oroP,
    oroE: G.oroE,
    maxP: G.maxP,
    maxE: G.maxE,
    cartasObtenidas: G.cartasObtenidas,
    misiones: G.misiones,
    modoCombate: G.modoCombate,
    preguntasPool: G.preguntasPool,
    seisSeguidosP: G.seisSeguidosP,
    seisSeguidosE: G.seisSeguidosE,
    proceresP: G.proceresP,
    proceresE: G.proceresE,
    log: G.log,
    pantalla: G.pantalla,
  }));
}

function aplicarSnapshot(s) {
  Object.keys(s).forEach((k) => {
    if (k !== "historial") G[k] = s[k];
  });
  if (Array.isArray(G.cartasObtenidas)) {
    G.cartasObtenidas = G.cartasObtenidas.filter((c) => !esCartaRespuesta(c));
  }
  if (renovarCicloPreguntasSiCorresponde(false) && PREGUNTAS.length) {
    G.preguntasPool = shuffle(PREGUNTAS.map((_, i) => i));
  }
}

function persistir() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      historial: G.historial,
      actual: snapshotEstado(),
    }));
  } catch (e) { /* ignore */ }
}

function cargarPersistencia() {
  cargarStats();
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) raw = localStorage.getItem("epopeyas_v111");
    if (!raw) {
      renovarCicloPreguntasSiCorresponde(false);
      return;
    }
    const data = JSON.parse(raw);
    if (Array.isArray(data.historial)) G.historial = data.historial;
    if (data.actual && typeof data.actual === "object") {
      // Limpia cartas de "respuestas" de partidas viejas al retomar vía snapshot.
      if (Array.isArray(data.actual.cartasObtenidas)) {
        data.actual.cartasObtenidas = data.actual.cartasObtenidas.filter((c) => !esCartaRespuesta(c));
      }
    }
  } catch (e) { /* ignore */ }
  renovarCicloPreguntasSiCorresponde(false);
}

function guardarPunto(etiqueta) {
  const snap = snapshotEstado();
  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    label: etiqueta || `${etiquetaFase(G.fase)} · Día ${G.ronda}`,
    fecha: new Date().toLocaleString("es-AR"),
    estado: snap,
  };
  G.historial.unshift(item);
  G.historial = G.historial.slice(0, 30);
  persistir();
  log(`Punto guardado: ${item.label}`);
  return item;
}

function retomarPunto(id) {
  const item = G.historial.find((h) => h.id === id);
  if (!item) return;
  aplicarSnapshot(item.estado);
  G.pila = ["sc-cartas"];
  document.getElementById("ov-historial").classList.remove("show");
  document.getElementById("ov-pausa").classList.remove("show");
  G.pausado = false;
  if (G.fase === "cartas" || G.fase === "fuerte_recupera") {
    show("sc-cartas", true);
  } else {
    show("sc-batalla", true);
    refrescarBatalla();
  }
  actualizarUI();
  habilitarCombate();
  log(`Retomaste: ${item.label}`);
}

function pintarHistorial() {
  const host = document.getElementById("historial-list");
  if (!host) return;
  if (!G.historial.length) {
    host.innerHTML = '<p class="hint">Todavía no hay puntos guardados.</p>';
    return;
  }
  host.innerHTML = G.historial.map((h) => `
    <div class="historial-item">
      <span class="historial-linea">${escapeHtml(h.label)} · ${escapeHtml(h.fecha)}</span>
      <button type="button" class="act" data-retomar="${h.id}">Retomar</button>
    </div>`).join("");
  host.querySelectorAll("[data-retomar]").forEach((b) => {
    b.onclick = () => retomarPunto(b.dataset.retomar);
  });
}

function abrirHistorial() {
  pintarHistorial();
  document.getElementById("ov-historial").classList.add("show");
}

function animarFuego() {
  document.querySelectorAll(".soldado").forEach((s) => {
    if (Math.random() > 0.4) {
      s.classList.add("fuego");
      setTimeout(() => s.classList.remove("fuego"), 300);
    }
  });
}

function mostrarResultados(titulo, html, accion, img) {
  G.resultadosAccion = accion;
  document.getElementById("res-titulo").textContent = titulo;
  document.getElementById("res-stats").innerHTML = html;
  const imgEl = document.getElementById("res-img");
  if (imgEl) {
    if (img) {
      imgEl.hidden = false;
      imgEl.style.backgroundImage = `url('${img}')`;
    } else {
      imgEl.hidden = true;
      imgEl.style.backgroundImage = "";
    }
  }
  document.getElementById("ov-resultados").classList.add("show");
}

function continuarResultados() {
  document.getElementById("ov-resultados").classList.remove("show");
  const accion = G.resultadosAccion;
  G.resultadosAccion = null;
  if (accion) {
    accion();
    return;
  }
  if (G.pantalla === "sc-batalla") {
    refrescarBatalla();
    habilitarCombate();
  }
}

function usarReservaRetiro() {
  if (G.fase !== "retiro" || G.retiroReservaUsada || G.reserva <= 0) return false;
  G.patriotas += G.reserva;
  G.reserva = 0;
  G.retiroReservaUsada = true;
  G.maxP = G.patriotas;
  G.ronda = 1;
  log("Liniers acude a Pueyrredón. +300 soldados. Seguí combatiendo en Retiro.");
  G.subfase = "combate";
  refrescarBatalla();
  mostrarResultados(
    "Volvé a intentarlo",
    `<p>Pueyrredón suma 300 hombres. Total patriotas: <strong>${G.patriotas}</strong>.</p>`,
    () => {
      G.subfase = "combate";
      refrescarBatalla();
      habilitarCombate();
    },
    "assets/patriotas-huyen.jpg"
  );
  return true;
}

function abrirCierre(img, titulo, texto, accion, opts) {
  document.getElementById("cierre-img").style.backgroundImage = `url('${img}')`;
  document.getElementById("cierre-titulo").textContent = titulo;
  document.getElementById("cierre-texto").textContent = texto;
  const leyenda = document.getElementById("cierre-leyenda");
  if (leyenda) {
    const showLeyenda = !!(opts && opts.continuara);
    leyenda.hidden = !showLeyenda;
    if (showLeyenda) leyenda.textContent = opts.leyenda || "Continuará....";
  }
  G.cierreAccion = accion;
  show("sc-cierre");
}

function reiniciarJuego() {
  mostrarResultados(
    "Volvé a intentarlo",
    `<p>Los patriotas heridos huyen del combate. La reconquista se reorganiza.</p>`,
    () => abrirCierre("assets/patriotas-huyen.jpg", "Retirada a Tigre", "La reconquista fracasa. Liniers debe reorganizarse desde cero.", irInicio),
    "assets/patriotas-huyen.jpg"
  );
}

function victoriaPatriots() {
  if (G.fase === "retiro") {
    guardarPunto("Victoria en Retiro");
    mostrarResultados(
      "¡Victoria en Retiro!",
      `<p>Los ingleses retroceden a la barricada.</p>`,
      () => mostrarPublicidadEntreNiveles(() => iniciarFase("barricada")),
      "assets/ingleses-retroceden.jpg"
    );
  } else if (G.fase === "barricada") {
    syncColumna();
    if (G.subfase === "combate_col") {
      G.colIng[G.colObjetivo] = 0;
        const otraViva = G.colIng.some((n, i) => n > 0 && G.colPat[i] > 0);
      if (otraViva) {
        G.subfase = "elegir_col";
        G.colObjetivo = -1;
        log("Columna vencida. Elegí la otra columna patriota.");
        refrescarBatalla();
        abrirColumnas();
        return;
      }
    }
    G.patriotas = (G.colPat[0] || 0) + (G.colPat[1] || 0);
    G.maxP = Math.max(G.maxP, G.patriotas);
    guardarPunto("Victoria en la Barricada");
    mostrarResultados(
      "Victoria en la Barricada",
      `<p>Los ingleses retroceden hacia el Fuerte.</p>`,
      () => mostrarPublicidadEntreNiveles(abrirReclutaPostBarricada),
      "assets/ingleses-retroceden-fuerte.jpg"
    );
  } else if (G.fase === "fuerte_plaza") {
    G.oroP += 0;
    agregarCarta("tesoro", { titulo: "Tesoro de la Plaza" });
    G.ingFuerte = Math.max(G.ingFuerte, Math.ceil(300 * UMBRAL) || 300);
    guardarPunto("Plaza Mayor tomada");
    mostrarResultados(
      "Plaza Mayor tomada",
      `<p>Los ingleses se refugian en el Fuerte (${G.ingFuerte}).</p>`,
      () => mostrarPublicidadEntreNiveles(() => iniciarFase("fuerte_int")),
      "assets/plaza-fuerte-refugio.jpg"
    );
  } else if (G.fase === "fuerte_int") {
    G.patriotas += 2000;
    setMision("fuerte_int", "completada");
    setMision("victoria", "completada");
    STATS.victorias += 1;
    persistirStats();
    guardarPunto("Victoria final · Nivel 1");
    abrirCierre(
      "assets/cinematica-beresford-parte.jpg",
      "¡Victoria! Nivel 1 completo",
      "Beresford es expulsado. Liniers exige la rendición. Los ingleses se retiran por Quilmes. Suman 2000 soldados más y Liniers es nombrado Virrey.",
      irInicio,
      { continuara: true, leyenda: "Continuará...." }
    );
  }
}

function derrotaPatriots() {
  if (G.fase === "retiro" && !G.retiroReservaUsada && G.reserva > 0) {
    usarReservaRetiro();
    return;
  }
  if (G.fase === "barricada" && G.subfase === "combate_col") {
    syncColumna();
    G.colPat[G.colObjetivo] = 0;
    const otra = G.colObjetivo === 0 ? 1 : 0;
    if (G.colPat[otra] > 0 && G.colIng[otra] > 0) {
      log("La columna se quedó sin soldados. Elegí la otra.");
      G.subfase = "elegir_col";
      G.colObjetivo = -1;
      refrescarBatalla();
      abrirColumnas();
      return;
    }
  }
  if (G.patriotas <= 0) {
    STATS.derrotas += 1;
    persistirStats();
    reiniciarJuego();
    return;
  }
  if (bajoUmbral("p")) {
    if (G.fase === "retiro" && G.retiroReservaUsada) {
      STATS.derrotas += 1;
      persistirStats();
      reiniciarJuego();
      return;
    }
    if (G.fase === "barricada" || G.fase === "fuerte_plaza" || G.fase === "fuerte_int") {
      STATS.derrotas += 1;
      persistirStats();
      mostrarResultados(
        "Volvé a intentarlo",
        `<p>Quedan pocos hombres. Volvés a reorganizarte.</p>`,
        () => {
          if (G.fase === "barricada") iniciarFase("retiro");
          else iniciarFase("fuerte_recupera");
        },
        "assets/patriotas-huyen.jpg"
      );
      return;
    }
  }
  STATS.derrotas += 1;
  persistirStats();
  reiniciarJuego();
}

function resolverRonda() {
  if (bajoUmbral("e") || G.ingleses <= 0) {
    victoriaPatriots();
    return;
  }
  if (G.patriotas <= 0) {
    derrotaPatriots();
    return;
  }
  if (bajoUmbral("p")) {
    derrotaPatriots();
    return;
  }
  G.ronda += 1;
  habilitarCombate();
  refrescarBatalla();
}

function siguientePregunta() {
  if (!PREGUNTAS.length && Array.isArray(window.BANCO_PREGUNTAS) && window.BANCO_PREGUNTAS.length) {
    PREGUNTAS = window.BANCO_PREGUNTAS.slice();
  }
  if (!PREGUNTAS.length) return null;
  renovarCicloPreguntasSiCorresponde(false);
  if (!G.preguntasPool.length) G.preguntasPool = shuffle(PREGUNTAS.map((_, i) => i));
  const idx = G.preguntasPool.pop();
  return PREGUNTAS[idx] || null;
}

function registrarTodoInfo() {
  const t = INFO_PANTALLAS.titulo || {};
  (t.fichas || []).forEach(registrarInfo);
  (t.marcas || []).forEach(registrarInfo);
  (INFO_PANTALLAS.intro || []).forEach((p) => {
    (p.fichas || []).forEach(registrarInfo);
    (p.marcas || []).forEach(registrarInfo);
  });
}

function infoParaPregunta(p) {
  const t = ((p && p.pregunta) || "").toLowerCase();
  const catalogo = [
    { keys: ["beresford"], id: "ficha-beresford" },
    { keys: ["quilmes"], id: "intro1-quilmes" },
    { keys: ["retiro"], id: "intro4-retiro" },
    { keys: ["liniers"], id: "intro0-liniers" },
    { keys: ["sobremonte", "virrey"], id: "intro0-virrey" },
    { keys: ["reconquista"], id: "ficha-reconquista" },
    { keys: ["pueyrred"], id: "intro2-pueyrredon" },
    { keys: ["belgrano"], id: "intro2-belgrano" },
    { keys: ["alzaga", "álzaga"], id: "intro2-alzaga" },
    { keys: ["montevideo"], id: "ficha-montevideo" },
    { keys: ["fuerte"], id: "ficha-fuerte" },
    { keys: ["milic"], id: "intro5-miliciano" },
    { keys: ["patriot"], id: "intro5-patriota" },
    { keys: ["tigre"], id: "intro5-tigre" },
    { keys: ["ofensiva", "ataque"], id: "intro4-ofensiva" },
  ];
  for (let i = 0; i < catalogo.length; i++) {
    if (catalogo[i].keys.some((k) => t.indexOf(k) >= 0)) {
      return INFO_ITEMS[catalogo[i].id] || INFO_ITEMS["ficha-reconquista"];
    }
  }
  return INFO_ITEMS["ficha-reconquista"] || INFO_ITEMS["intro4-retiro"];
}

function htmlCartaProcer(nombre) {
  const img = PROCER_IMG[nombre] || "assets/retrato-belgrano.jpg";
  return `<img src="${img}" alt="${escapeHtml(nombre)}"><strong>${escapeHtml(nombre)}</strong>`;
}

function abrirPregunta() {
  if (G.pausado) return;
  if (esperaColumna()) {
    log("Primero elegí una columna.");
    abrirColumnas();
    return;
  }
  let p = siguientePregunta();
  if (!p) {
    G.preguntasPool = [];
    p = siguientePregunta();
  }
  if (!p) {
    log("No se pudieron cargar las preguntas.");
    habilitarCombate();
    return;
  }
  G.preguntaActual = p;
  preguntaRespondida = false;
  document.getElementById("btn-dia").disabled = true;
  document.getElementById("preg-bonus").hidden = !p.bonus;
  document.getElementById("preg-texto").textContent = p.pregunta;
  document.getElementById("preg-resultado").innerHTML = "";
  document.getElementById("btn-preg-continuar").hidden = true;
  const mas = document.getElementById("preg-mas-info");
  if (mas) {
    mas.hidden = true;
    mas.innerHTML = "";
  }
  const procerEl = document.getElementById("preg-procer");
  if (procerEl) {
    procerEl.hidden = true;
    procerEl.innerHTML = "";
  }
  const img = document.getElementById("preg-img");
  if (img) {
    img.style.backgroundImage = "url('assets/combate-batalla.jpg')";
    img.classList.remove("ok", "fail");
  }
  const host = document.getElementById("preg-opciones");
  host.innerHTML = p.opciones
    .map((op, i) => `<button type="button" class="act wide preg-opc" data-i="${i}">${op}</button>`)
    .join("");
  host.querySelectorAll(".preg-opc").forEach((b) => {
    b.onclick = () => responderPregunta(parseInt(b.dataset.i, 10));
  });
  document.getElementById("ov-pregunta").classList.add("show");
}

function mostrarMasInfoPregunta(p) {
  const mas = document.getElementById("preg-mas-info");
  if (!mas) return;
  const item = infoParaPregunta(p);
  mas.hidden = false;
  mas.innerHTML = "";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Abrir para más información";
  btn.onclick = () => {
    if (item) abrirInfo(item);
  };
  mas.appendChild(btn);
}

function responderPregunta(elegida) {
  const p = G.preguntaActual;
  if (!p || preguntaRespondida) return;
  preguntaRespondida = true;
  const pts = p.bonus ? 200 : 100;
  const ok = elegida === p.correcta;
  const tipo = tipoJugador();
  const img = document.getElementById("preg-img");
  let txt;
  let procerNom = "";
  if (ok) {
    G.ingleses = Math.max(0, G.ingleses - pts);
    STATS.correctas += 1;
    txt = `<span class="mark-ok" aria-label="Correcto">✓</span> Los ingleses pierden ${pts} soldados.`;
    if (img) {
      img.style.backgroundImage = "url('assets/combate-victoria.jpg')";
      img.classList.add("ok");
      img.classList.remove("fail");
    }
    if (p.bonus) {
      const nom = otorgarProcer("p");
      if (nom) procerNom = nom;
    }
  } else {
    G.patriotas = Math.max(0, G.patriotas - pts);
    STATS.incorrectas += 1;
    registrarPerdidas(pts);
    let extra = "";
    if (tipo === "caballos") {
      const baja = Math.min(6, G.caballosP);
      G.caballosP = Math.max(0, G.caballosP - 6);
      extra = ` · −${baja} caballos`;
    } else if (tipo === "canones") {
      const baja = Math.min(6, G.canonesP);
      G.canonesP = Math.max(0, G.canonesP - 6);
      extra = ` · −${baja} cañones`;
    }
    txt = `<span class="mark-fail" aria-label="Incorrecto">✗</span> Perdés ${pts} soldados${extra}. Respuesta: ${p.opciones[p.correcta]}`;
    if (img) {
      img.style.backgroundImage = "url('assets/combate-derrota.jpg')";
      img.classList.add("fail");
      img.classList.remove("ok");
    }
    if (p.bonus) {
      const nom = otorgarProcer("e");
      if (nom) procerNom = nom;
    }
  }
  persistirStats();
  syncColumna();
  document.getElementById("preg-resultado").innerHTML = txt;
  document.getElementById("preg-opciones").innerHTML = "";
  const procerEl = document.getElementById("preg-procer");
  if (procerEl) {
    if (procerNom) {
      procerEl.hidden = false;
      procerEl.innerHTML = htmlCartaProcer(procerNom);
    } else {
      procerEl.hidden = true;
      procerEl.innerHTML = "";
    }
  }
  mostrarMasInfoPregunta(p);
  log(ok ? `✓ Correcto (−${pts} ingleses)` : `✗ Incorrecto (−${pts} patriotas${tipo === "caballos" ? " · −6 caballos" : tipo === "canones" ? " · −6 cañones" : ""})`);
  animarFuego();
  pintarBarras();
  pintarSoldados();
  actualizarUI();
  actualizarTiposTropa();
  persistir();
  document.getElementById("btn-preg-continuar").hidden = false;
  document.getElementById("btn-preg-continuar").onclick = () => {
    document.getElementById("ov-pregunta").classList.remove("show");
    G.preguntaActual = null;
    preguntaRespondida = false;
    if (bajoUmbral("e") || G.ingleses <= 0) victoriaPatriots();
    else if (G.patriotas <= 0 || bajoUmbral("p")) derrotaPatriots();
    else resolverRonda();
  };
}

function ejecutarAccionCombate() {
  G.modoCombate = "preguntas";
  const tipo = tipoJugador();
  if (!validarTipo(tipo)) {
    habilitarCombate();
    return;
  }
  abrirPregunta();
}

function tirarDado() {
  if (G.pausado) return;
  if (esperaColumna()) {
    log("Primero elegí una columna.");
    abrirColumnas();
    return;
  }
  const tipo = tipoJugador();
  if (!validarTipo(tipo)) return;
  const token = ++dadosToken;
  document.getElementById("btn-dia").disabled = true;
  document.getElementById("ov-dados").classList.add("show");
  document.getElementById("btn-cerrar-dados").hidden = true;
  pintarDadosOv(0, 0, true);

  setTimeout(() => {
    if (token !== dadosToken) return;
    const dp = d6();
    const de = d6();
    const { bajaP, bajaE, bajaCab, bajaCan } = resolverBajas(dp, de, tipo);
    const procerP = registrarSeis("p", dp);
    const procerE = registrarSeis("e", de);
    pintarDadosOv(dp, de, false);
    let txt = `🇦🇷 dado ${dp} (−${bajaP}) · 🇬🇧 dado ${de} (−${bajaE})`;
    if (bajaCab) txt += ` · −${bajaCab} caballos`;
    if (bajaCan) txt += ` · −${bajaCan} cañones`;
    if (procerP) txt += ` · Prócer ${procerP}`;
    if (procerE) txt += ` · Prócer inglés ${procerE}`;
    document.getElementById("bajas").textContent = txt;
    document.getElementById("bajas-ov").textContent = txt;
    log(txt);
    animarFuego();
    actualizarTiposTropa();
    pintarBarras();
    pintarSoldados();
    persistir();
    document.getElementById("btn-cerrar-dados").hidden = false;
    document.getElementById("btn-cerrar-dados").onclick = () => {
      document.getElementById("ov-dados").classList.remove("show");
      if (bajoUmbral("e") || G.ingleses <= 0) victoriaPatriots();
      else if (G.patriotas <= 0 || bajoUmbral("p")) derrotaPatriots();
      else resolverRonda();
    };
  }, 700);
}

function abrirCompra(tipo, bando) {
  G.compraTipo = tipo;
  G.compraBando = bando || "p";
  G.limiteRecluta = 0;
  const info = CARTAS_INFO[tipo] || { titulo: "Comprar", desc: "" };
  document.getElementById("compra-titulo").textContent = info.titulo;
  document.getElementById("compra-desc").textContent = info.desc;
  const oro = G.compraBando === "e" ? G.oroE : G.oroP;
  document.getElementById("oro-compra").textContent = oro;
  document.getElementById("cant-compra").value = tipo === "milicia" ? 50 : 6;
  actualizarCostoCompra();
  document.getElementById("ov-compra").classList.add("show");
}

function costoUnitario(tipo) {
  if (tipo === "milicia") return COSTO_SOLDADO;
  if (tipo === "caballo") return COSTO_CABALLO;
  return COSTO_CANON;
}

function actualizarCostoCompra() {
  const n = Math.max(0, parseInt(document.getElementById("cant-compra").value, 10) || 0);
  const c = n * costoUnitario(G.compraTipo);
  document.getElementById("costo-compra").textContent = `Costo: ${c} oro`;
}

function confirmarCompra() {
  const n = Math.max(0, parseInt(document.getElementById("cant-compra").value, 10) || 0);
  const unit = costoUnitario(G.compraTipo);
  let costo = n * unit;
  if (G.limiteRecluta > 0) costo = Math.min(costo, G.limiteRecluta);
  const esEn = G.compraBando === "e";
  const oro = esEn ? G.oroE : G.oroP;
  if (costo > oro || n < 1) {
    log("No alcanza el oro.");
    return;
  }
  if (esEn) G.oroE -= costo;
  else G.oroP -= costo;
  const cant = Math.floor(costo / unit);
  if (G.compraTipo === "milicia") {
    if (esEn) {
      G.ingleses += cant;
      G.maxE += cant;
      agregarCarta("milicia-inglesa");
      log(`Ingleses +${cant} milicianos.`);
    } else {
      G.patriotas += cant;
      G.maxP += cant;
      agregarCarta("milicia");
      log(`+${cant} milicianos.`);
    }
  }
  if (G.compraTipo === "caballo") {
    if (esEn) {
      G.caballosE += cant;
      agregarCarta("caballos-ingleses");
      log(`Ingleses +${cant} caballos.`);
    } else {
      G.caballosP += cant;
      STATS.caballosObtenidos = (STATS.caballosObtenidos || 0) + cant;
      persistirStats();
      agregarCarta("caballos");
      log(`+${cant} caballos.`);
    }
  }
  if (G.compraTipo === "canon") {
    if (esEn) {
      G.canonesE += cant;
      agregarCarta("canones-ingleses");
      log(`Ingleses +${cant} cañones.`);
    } else {
      G.canonesP += cant;
      STATS.canonesObtenidos = (STATS.canonesObtenidos || 0) + cant;
      persistirStats();
      agregarCarta("canones");
      log(`+${cant} cañones.`);
    }
  }
  document.getElementById("ov-compra").classList.remove("show");
  actualizarUI();
  actualizarTiposTropa();
}

function cartaVista(c) {
  if (typeof c === "string") {
    const def = CARTA_DEFS[c] || {};
    return { titulo: tituloCarta(c), img: def.img || "", bio: "" };
  }
  const titulo = c.titulo || tituloCarta(c.id);
  const def = CARTA_DEFS[c.id] || {};
  const bio = c.bio || PROCER_BIO[titulo] || "";
  return { titulo, img: c.img || def.img || "", bio };
}

function abrirPanelBatalla(tipo) {
  const titulo = document.getElementById("panel-bat-titulo");
  const list = document.getElementById("panel-bat-list");
  if (tipo === "cartas") {
    titulo.textContent = "Cartas obtenidas";
    const cartas = cartasVisibles();
    if (!cartas.length) list.innerHTML = '<li class="carta-item vacia">Sin cartas aún.</li>';
    else {
      list.className = "panel-bat-list cartas-grid";
      list.innerHTML = cartas.map((c) => {
        const v = cartaVista(c);
        const bio = v.bio
          ? `<a class="carta-bio" href="${escapeHtml(v.bio)}" target="_blank" rel="noopener noreferrer">Biografía oficial</a>`
          : "";
        const img = v.img
          ? `<img src="${escapeHtml(v.img)}" alt="">`
          : `<span class="carta-placeholder"></span>`;
        return `<li class="carta-item carta-visual carta-grande">${img}<strong>${escapeHtml(v.titulo)}</strong>${bio}</li>`;
      }).join("");
    }
  } else {
    list.className = "panel-bat-list";
    titulo.textContent = "Misiones";
    list.innerHTML = G.misiones.map((m) => htmlMisionItem(m)).join("");
  }
  document.getElementById("ov-panel-bat").classList.add("show");
}

function abrirReclutaPostBarricada() {
  G.limiteRecluta = 2000;
  document.getElementById("oro-recluta").textContent = G.oroP;
  document.getElementById("cant-recluta").value = 100;
  document.getElementById("costo-recluta").textContent = "Costo: 1000";
  document.getElementById("ov-recluta-post").classList.add("show");
}

function confirmarReclutaPost() {
  const n = Math.max(0, parseInt(document.getElementById("cant-recluta").value, 10) || 0);
  const costo = Math.min(n * COSTO_SOLDADO, 2000, G.oroP);
  const cant = Math.floor(costo / COSTO_SOLDADO);
  G.oroP -= cant * COSTO_SOLDADO;
  G.patriotas += cant;
  G.maxP += cant;
  document.getElementById("ov-recluta-post").classList.remove("show");
  iniciarFase("fuerte_plaza");
}

function pintarIntro() {
  const s = INTRO[G.introIdx];
  const info = infoDePantalla("intro-" + G.introIdx);
  const el = document.getElementById("intro-img");
  const split = document.getElementById("intro-split");
  const izq = document.getElementById("intro-half-izq");
  const der = document.getElementById("intro-half-der");
  if (s.split) {
    el.className = "hero split";
    el.style.backgroundImage = "none";
    if (split) {
      split.hidden = false;
      split.removeAttribute("hidden");
    }
    if (izq) izq.style.backgroundImage = `url('${s.imgIzq}')`;
    if (der) der.style.backgroundImage = `url('${s.imgDer}')`;
    const tagIzq = document.getElementById("intro-tag-izq");
    const tagDer = document.getElementById("intro-tag-der");
    if (tagIzq) tagIzq.textContent = s.tagIzq || "";
    if (tagDer) tagDer.textContent = s.tagDer || "";
  } else {
    if (split) split.hidden = true;
    if (izq) izq.style.backgroundImage = "";
    if (der) der.style.backgroundImage = "";
    const tagIzq = document.getElementById("intro-tag-izq");
    const tagDer = document.getElementById("intro-tag-der");
    if (tagIzq) tagIzq.textContent = "";
    if (tagDer) tagDer.textContent = "";
    el.className = s.portrait ? "hero portrait kenburns" : "hero kenburns";
    el.style.backgroundImage = `url('${s.img}')`;
  }
  document.getElementById("intro-texto").textContent = s.texto;
  document.getElementById("intro-paso").textContent = `${G.introIdx + 1} / ${INTRO.length}`;
  document.getElementById("btn-seguir-intro").textContent = G.introIdx >= INTRO.length - 1 ? "Jugar" : "Continuar";
  pintarPuntos(document.getElementById("intro-puntos"), info.puntos);
  const sitiosEl = document.getElementById("intro-sitios");
  if (sitiosEl) {
    sitiosEl.hidden = true;
    sitiosEl.innerHTML = "";
  }
  pintarFichas(document.getElementById("intro-fichas"), info.fichas);
  const hint = document.getElementById("intro-hint");
  if (hint) {
    const hayPuntos = !!(info.puntos && info.puntos.length);
    hint.textContent = hayPuntos
      ? "Pulsá los puntos del mapa o las imágenes para más información."
      : "Pulsá las imágenes para más información.";
    hint.hidden = !(hayPuntos || (info.fichas && info.fichas.length));
  }
}

function seguirIntro() {
  if (G.introIdx >= INTRO.length - 1) {
    show("sc-cartas");
    actualizarUI();
    log("Misión 1: derrotar a los ingleses en Retiro.");
    return;
  }
  G.introIdx += 1;
  pintarIntro();
}

function irInicio() {
  const hist = G.historial;
  G = nuevoJuego();
  G.historial = hist;
  actualizarUI();
  show("sc-titulo", true);
  G.pila = [];
  persistir();
}

function cerrarOverlays(keepPausa) {
  if (!keepPausa) G.pausado = false;
  ["ov-pausa", "ov-compra", "ov-dados", "ov-resultados", "ov-recluta-post", "ov-pregunta", "ov-panel-bat", "ov-historial", "ov-info", "ov-columna", "ov-stats", "ov-ads"].forEach((id) => {
    if (keepPausa && id === "ov-pausa") return;
    const el = document.getElementById(id);
    if (el) el.classList.remove("show");
  });
}

function cancelarOverlay(id) {
  const el = document.getElementById(id);
  if (!el || (!el.classList.contains("show") && el.hidden)) return;
  if (id === "ov-ads") {
    cerrarPublicidad();
    return;
  }
  if (id === "ov-dados") {
    const ya = document.getElementById("btn-cerrar-dados");
    const resuelto = ya && !ya.hidden;
    dadosToken += 1;
    el.classList.remove("show");
    if (resuelto) {
      if (bajoUmbral("e") || G.ingleses <= 0) victoriaPatriots();
      else if (G.patriotas <= 0 || bajoUmbral("p")) derrotaPatriots();
      else resolverRonda();
    } else habilitarCombate();
    return;
  }
  if (id === "ov-pregunta") {
    el.classList.remove("show");
    if (preguntaRespondida) {
      G.preguntaActual = null;
      preguntaRespondida = false;
      if (bajoUmbral("e") || G.ingleses <= 0) victoriaPatriots();
      else if (G.patriotas <= 0 || bajoUmbral("p")) derrotaPatriots();
      else resolverRonda();
    } else {
      G.preguntaActual = null;
      habilitarCombate();
    }
    return;
  }
  el.classList.remove("show");
  if (id === "ov-pausa") G.pausado = false;
  if (id === "ov-recluta-post") iniciarFase("fuerte_plaza");
  if (id === "ov-resultados") continuarResultados();
}

function pintarStats() {
  const host = document.getElementById("stats-list");
  if (!host) return;
  const filas = [
    ["Misiones ganadas", STATS.misionesGanadas],
    ["Oro por misiones", STATS.oroMisiones],
    ["Oro actual", G.oroP],
    ["Caballos obtenidos", STATS.caballosObtenidos || 0],
    ["Cañones obtenidos", STATS.canonesObtenidos || 0],
    ["Caballos en juego", G.caballosP],
    ["Cañones en juego", G.canonesP],
    ["Respuestas correctas", STATS.correctas],
    ["Respuestas incorrectas", STATS.incorrectas],
    ["Soldados perdidos", STATS.soldadosPerdidos || 0],
    ["Próceres patriotas", STATS.proceres],
    ["Victorias de campaña", STATS.victorias],
    ["Derrotas", STATS.derrotas],
    ["Patriotas en juego", G.patriotas],
  ];
  host.innerHTML = filas.map((f) => `<li><span>${f[0]}</span><strong>${f[1]}</strong></li>`).join("");
}

function abrirStats() {
  pintarStats();
  document.getElementById("ov-stats").classList.add("show");
}

function irMision() {
  G.modoCombate = "preguntas";
  if (G.fase === "cartas") iniciarFase("retiro");
  else if (G.fase === "fuerte_recupera") iniciarFase("fuerte_int");
  else iniciarFase(G.fase);
}

function on(id, evt, fn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener(evt, fn);
}

document.getElementById("btn-intro").onclick = () => {
  const hist = G.historial;
  const prev = G.pantalla;
  G = nuevoJuego();
  G.historial = hist;
  G.introIdx = 0;
  G.pila = prev && prev !== "sc-titulo" ? [prev] : ["sc-titulo"];
  show("sc-intro", true);
  pintarIntro();
};
on("btn-seguir-intro", "click", seguirIntro);
on("btn-saltar", "click", () => {
  show("sc-cartas");
  actualizarUI();
});
document.querySelectorAll(".js-compra, .js-compra-bat").forEach((b) => {
  b.addEventListener("click", () => abrirCompra(b.dataset.tipo, b.dataset.bando || "p"));
});
on("cant-compra", "input", actualizarCostoCompra);
on("btn-confirmar-compra", "click", confirmarCompra);
on("btn-cancelar-compra", "click", () => document.getElementById("ov-compra").classList.remove("show"));
on("btn-mision-preguntas", "click", () => irMision());
on("btn-dia", "click", ejecutarAccionCombate);
on("btn-res-continuar", "click", continuarResultados);
on("btn-cierre", "click", () => {
  if (G.cierreAccion) G.cierreAccion();
});
on("btn-inicio", "click", irInicio);
on("btn-historial", "click", abrirHistorial);
on("btn-pausa", "click", () => {
  G.pausado = true;
  document.getElementById("ov-pausa").classList.add("show");
});
on("btn-volver", "click", volver);
on("btn-stats", "click", abrirStats);
on("btn-stats-cerrar", "click", () => document.getElementById("ov-stats").classList.remove("show"));
on("btn-reanudar", "click", () => cerrarOverlays());
on("btn-pausa-historial", "click", () => {
  document.getElementById("ov-pausa").classList.remove("show");
  abrirHistorial();
});
on("btn-pausa-inicio", "click", irInicio);
on("btn-historial-cerrar", "click", () => document.getElementById("ov-historial").classList.remove("show"));
on("btn-guardar-punto", "click", () => {
  guardarPunto();
  pintarHistorial();
});
on("btn-recluta-ok", "click", confirmarReclutaPost);
on("cant-recluta", "input", () => {
  const n = parseInt(document.getElementById("cant-recluta").value, 10) || 0;
  document.getElementById("costo-recluta").textContent = `Costo: ${Math.min(n * COSTO_SOLDADO, 2000)}`;
});
document.querySelectorAll("#ov-columna .col-pick").forEach((b) => {
  b.addEventListener("click", () => elegirColumna(parseInt(b.dataset.col, 10)));
});
on("btn-bat-cartas", "click", () => abrirPanelBatalla("cartas"));
on("btn-bat-misiones", "click", () => abrirPanelBatalla("misiones"));
on("btn-panel-bat-cerrar", "click", () => document.getElementById("ov-panel-bat").classList.remove("show"));
on("btn-info-cerrar", "click", () => document.getElementById("ov-info").classList.remove("show"));
document.addEventListener("click", (e) => {
  const x = e.target.closest("[data-cerrar]");
  if (x) {
    e.preventDefault();
    cancelarOverlay(x.getAttribute("data-cerrar"));
    return;
  }
  const btn = e.target.closest("[data-info-id]");
  if (!btn) return;
  const item = INFO_ITEMS[btn.getAttribute("data-info-id")];
  if (item) {
    e.preventDefault();
    abrirInfo(item);
  }
});

on("btn-ads-continuar", "click", cerrarPublicidad);

fetch("preguntas.json?v=300", { credentials: "include" })
  .then((r) => r.json())
  .then((data) => {
    if (Array.isArray(data) && data.length) {
      PREGUNTAS = data;
      log(`${PREGUNTAS.length} preguntas cargadas (${PREGUNTAS.filter((p) => p.bonus).length} bonus).`);
    } else if (PREGUNTAS.length) {
      log(`${PREGUNTAS.length} preguntas listas.`);
    }
  })
  .catch(() => {
    if (PREGUNTAS.length) log(`${PREGUNTAS.length} preguntas listas.`);
    else log("No se cargó preguntas.json");
  })
  .finally(() => {
    registrarTodoInfo();
    cargarPersistencia();
    iniciarTelemetry();
    actualizarUI();
    pintarTituloInfo();
  });
