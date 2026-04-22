/**
 * Entrée Rollup dédiée : le CSS agrégé est référencé depuis index.html (preload → stylesheet).
 * Évite la chaîne critique document → main.js → ce CSS.
 */
import "./assets/vendor/remixicon/fonts/remixicon.css";
import "./assets/vendor/phosphor-icons/Fonts/duotone/style.css";
import "./assets/vendor/phosphor-icons/Fonts/fill/style.css";
