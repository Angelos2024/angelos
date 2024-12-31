
  // Definimos los libros disponibles para la versión RVR1960
  const versionesBiblia = {
    RVR1960: {
      "1 Corintios": "https://raw.githubusercontent.com/xtiam57/church-utils/refs/heads/main/dist/biblia/1_corintios.json",
      "Apocalipsis": "https://raw.githubusercontent.com/xtiam57/church-utils/refs/heads/main/dist/biblia/apocalipsis.json"
    },
    Americas: {},
    Jubileos: {}
  };

  let currentVersion = "RVR1960"; // Versión predeterminada
  let dataCache = {}; // Caché de datos cargados
  let currentBook = null; // Libro actual

  // Alternar el sidebar paralelo
  function toggleParaleloSidebar() {
    const paraleloSidebar = document.getElementById("paraleloSidebar");
    const main = document.getElementById("main");

    const isOpen = paraleloSidebar.classList.contains("open");

    if (isOpen) {
      paraleloSidebar.classList.remove("open");
      main.classList.remove("shifted-left");
    } else {
      paraleloSidebar.classList.add("open");
      main.classList.add("shifted-left");
      cargarLibros(versionesBiblia[currentVersion]); // Cargar libros al abrir el sidebar
    }
  }

  function closeParaleloSidebar() {
    const paraleloSidebar = document.getElementById("paraleloSidebar");
    const main = document.getElementById("main");

    paraleloSidebar.classList.remove("open");
    main.classList.remove("shifted-left");
  }

  // Cambiar versión y cargar libros
  function cambiarVersion() {
    currentVersion = document.getElementById("versionSelector").value;
    cargarLibros(versionesBiblia[currentVersion]); // Actualizar libros al cambiar versión
  }

  // Cargar los libros en el dropdown
  function cargarLibros(libros) {
    const bookSelector = document.getElementById("bookSelector");
    bookSelector.innerHTML = '<option value="">Seleccionar</option>'; // Limpiar libros previos

    for (const bookName in libros) {
      const option = document.createElement("option");
      option.value = bookName;
      option.textContent = bookName;
      bookSelector.appendChild(option);
    }

    // Limpiar capítulos y resultados al cambiar de libro
    document.getElementById("chapterSelector").innerHTML = '<option value="">Seleccionar</option>';
    document.getElementById("results").innerHTML = "";
  }

  // Cargar capítulos del libro seleccionado
  function cargarCapitulos() {
    const bookSelector = document.getElementById("bookSelector");
    const bookName = bookSelector.value;

    if (!bookName) return; // Salir si no hay libro seleccionado

    const url = versionesBiblia[currentVersion][bookName];
    const chapterSelector = document.getElementById("chapterSelector");
    chapterSelector.innerHTML = '<option value="">Seleccionar</option>'; // Limpiar capítulos previos

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error al cargar contenido: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        dataCache = data; // Guardar datos en caché para usar en capítulos y versículos

        data.forEach((_, idx) => {
          const option = document.createElement("option");
          option.value = idx + 1;
          option.textContent = `Capítulo ${idx + 1}`;
          chapterSelector.appendChild(option);
        });
      })
      .catch((error) => {
        chapterSelector.innerHTML = '<option value="">Error al cargar capítulos</option>';
        console.error(error);
      });
  }

  // Mostrar contenido del capítulo seleccionado
  // Mostrar contenido del capítulo seleccionado
function mostrarCapitulo() {
  const chapterSelector = document.getElementById("chapterSelector");
  const chapterContent = document.getElementById("chapterContentSidebar"); // Cambiado al contenedor dentro del sidebar
  const chapterIndex = parseInt(chapterSelector.value, 10) - 1;

  if (!dataCache || !dataCache[chapterIndex]) {
    chapterContent.innerHTML = "<p>Error al cargar el capítulo.</p>";
    return;
  }

  // Mostrar los versículos del capítulo dentro del sidebar
  const chapterData = dataCache[chapterIndex];
  chapterContent.innerHTML = chapterData
    .map((verso, idx) => `<p><b>${chapterIndex + 1}:${idx + 1}</b> - ${verso}</p>`)
    .join("");
}

