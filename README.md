# Piano Virtual Interactivo con Inteligencia Artificial y Visión por Computador

Aplicación web interactiva que utiliza Inteligencia Artificial y Visión Artificial en tiempo real para permitir la interpretación de un piano virtual a través del rastreo de gestos y puntos clave de las manos mediante una cámara web estándar.

---

## Descripción del Proyecto

Este proyecto aborda la dependencia de interfaces físicas o hardware musical tradicional (teclados MIDI, periféricos) mediante el procesamiento de video en tiempo real. Utilizando la cámara del dispositivo, el sistema detecta los marcadores articulares de las manos, los proyecta sobre una interfaz interactiva de teclas musicales y sintetiza sonido con latencia ultra baja.

El proyecto incluye dos modos de funcionamiento:
1. **Modo Libre:** Permite la interpretación de notas en una escala de Do4 a Do5 (C4 a C5) utilizando los dedos índice y medio de ambas manos.
2. **Modo Aprendizaje (Jingle Bells):** Guía al usuario paso a paso indicando la tecla que debe presionar para aprender a tocar la melodía de *Jingle Bells*.

---

## Arquitectura y Tecnologías Utilizadas

| Tecnología / Biblioteca | Función en el Proyecto |
| :--- | :--- |
| **HTML5 & CSS3** | Estructuración de la interfaz, lienzo de renderizado (Canvas API) y estilos visuales adaptativos. |
| **JavaScript (ES6+)** | Lógica principal de interacción, cálculo geométrico de colisiones, filtrado de señal y máquina de estados. |
| **Google MediaPipe Hands** | Modelo de aprendizaje profundo para la detección y seguimiento en 3D de 21 marcadores clave (*landmarks*) de las manos. |
| **Web Audio API** | Motor de síntesis de sonido mediante osciladores de onda triangular y envolvente ADSR nativa. |
| **VS Code + Live Server** | Entorno de desarrollo local y servidor HTTP local para ejecución con políticas de seguridad de cámara. |

El proyecto funciona íntegramente en el cliente (*Client-Side Execution*), lo que elimina la necesidad de entornos de ejecución de servidor, dependencias C++ o compiladores locales.

---

## Algoritmos y Procesamiento de Señal

Para lograr una respuesta precisa y estable frente a una cámara web convencional, el sistema implementa las siguientes técnicas de visión por computador y procesamiento de señales:

1. **Transformación Matricial y Corrección Espejo:** Se aplica una inversión horizontal sobre el lienzo de renderizado para alinear la perspectiva espacial del usuario con los puntos detectados $(px, py)$.
2. **Máquina de Estados con Histéresis y Antirrebote:**
   * **Antirrebote (*Debounce*):** Requiere un intervalo mínimo de $300\text{ ms}$ entre disparos consecutivos de una misma tecla para prevenir lecturas dobles involuntarias.
   * **Histéresis de Liberación (*Release Delay*):** Exige que el marcador articular permanezca al menos $200\text{ ms}$ continuos fuera de la región de colisión antes de liberar la tecla, eliminando falsos disparos causados por las fluctuaciones del detector (*landmark jitter*).

---

## Estructura del Repositorio

```text
proyecto-piano-virtual/
│
├── index.html       # Estructura principal, lienzo canvas y carga de MediaPipe
├── style.css        # Estilos, panel de aprendizaje y diseño adaptativo
├── app.js           # Lógica de IA, síntesis de sonido, colisiones e histéresis
└── README.md        # Documentación técnica del proyecto