/**
 * Toggle du menu latéral en **desktop** (classes gérées hors état React étroit).
 * En dessous de 1200px, préférer `useSidebarLayout` (contexte).
 */
export function toggleMainSidebar(forceExpand) {
  const aside = document.querySelector("aside.sidebar");
  if (!aside) return;
  if (forceExpand === true) {
    aside.classList.remove("sidebar-mini");
    aside.classList.remove("sidebar-hover");
    return;
  }
  aside.classList.toggle("sidebar-mini");
  aside.classList.toggle("sidebar-hover");
}
