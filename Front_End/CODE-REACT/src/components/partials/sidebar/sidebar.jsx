import React, { useEffect, useMemo } from "react"
import { Link } from "react-router-dom"

// Import Component
import Logo from "../../logo"
import VerticalNav from "./vertical-nav"
import Scrollbar from "smooth-scrollbar";

// Import selectors & action from setting store
import * as SettingSelector from "../../../store/setting/selectors";

// Redux Selector / Action
import { useSelector } from "react-redux";
import { useSidebarLayout } from "../../../context/SidebarLayoutContext";
import { toggleMainSidebar } from "../../../utils/mainSidebar";

const Sidebar = () => {
   const { isDesktop, narrowDrawerOpen, toggleNarrowDrawer, openNarrowDrawer } = useSidebarLayout();

   const sidebarColor = useSelector(SettingSelector.sidebar_color);
   const sidebarType = useSelector(SettingSelector.sidebar_type);
   const sidebarMenuStyle = useSelector(SettingSelector.sidebar_menu_style);

   /** Sous 1200px : ignorer sidebar-mini/hover du Redux et les piloter via narrowDrawerOpen. */
   const appliedSidebarTypes = useMemo(() => {
      const types = sidebarType.filter(Boolean);
      if (isDesktop) return types.join(" ");
      const core = types.filter((t) => t !== "sidebar-mini" && t !== "sidebar-hover");
      if (narrowDrawerOpen) return core.join(" ");
      return [...core, "sidebar-mini", "sidebar-hover"].join(" ");
   }, [isDesktop, narrowDrawerOpen, sidebarType]);

   useEffect(() => {
      const el = document.querySelector("#my-scrollbar");
      if (el) {
         try {
            Scrollbar.init(el);
         } catch {
            /* déjà initialisé */
         }
      }
   }, []);

   /**
    * Desktop : toggle mini (thème Xray).
    * Étroit : ouverture/fermeture du tiroir (React).
    * forceExpand === true : menu desktop « more » → tout déplier.
    */
   const handleSidebar = (forceExpand) => {
      if (!isDesktop) {
         if (forceExpand === true) openNarrowDrawer();
         else toggleNarrowDrawer();
         return;
      }
      toggleMainSidebar(forceExpand === true ? true : undefined);
   };

   return (
      <>
         <aside
            className={`sidebar sidebar-base sidebar-default ${sidebarColor} ${appliedSidebarTypes} ${sidebarMenuStyle}${!isDesktop && narrowDrawerOpen ? " mf-sidebar-drawer-open" : ""}`.replace(/\s+/g, " ").trim()}
            id="first-tour" data-toggle="main-sidebar" data-sidebar="responsive">
            <div className="sidebar-header d-flex align-items-center justify-content-center position-relative">
               <Link to="/dashboard" className="navbar-brand pt-3">
                  <Logo />
               </Link>{" "}
               <div className="wrapper-menu d-flex d-none d-xl-block" onClick={() => { handleSidebar(true) }}>
                  <div className="main-circle" role="button"><i className="ri-more-fill"></i></div>
               </div>
               <li className="nav-item d-block d-xl-none" onClick={() => handleSidebar()}>
                  <a className="wrapper-menu" data-toggle="sidebar" data-active="true" href="#menu" onClick={(e) => e.preventDefault()}>
                     <div className="main-circle "><i className="ri-more-fill"></i></div>
                  </a>
               </li>
            </div>
            <div id="my-scrollbar" className="sidebar-body pt-0 data-scrollbar">
               <div className="sidebar-list">
                  <VerticalNav />
               </div>
            </div>
            <div className="sidebar-footer"></div>
         </aside>
      </>
   )
}

export default Sidebar
