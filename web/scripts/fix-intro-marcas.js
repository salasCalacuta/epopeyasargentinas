const fs = require("fs");
const path = "d:/Juego/web/game.js";
let s = fs.readFileSync(path, "utf8");
const i = s.indexOf("  intro: [");
const j = s.indexOf("\n  zonas:", i);
if (i < 0 || j < 0) throw new Error("bounds");

const intro = `  intro: [
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
  ],`;

fs.writeFileSync(path, s.slice(0, i) + intro + s.slice(j));
console.log("intro replaced");
