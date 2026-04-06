import React from "react";

// react-router
import { Outlet } from "react-router-dom";


// Import selectors & action from setting store
import * as SettingSelector from '../store/setting/selectors'

// Redux Selector / Action
import { useSelector } from 'react-redux';

// Partials
import Header from "../components/partials/headerStyle/header";
import Footer from "../components/partials/footerStyle/footer";
import Sidebar from "../components/partials/sidebar/sidebar";
import SettingOffCanvas from "../components/setting/SettingOffCanvas";
import { SidebarLayoutProvider, useSidebarLayout } from "../context/SidebarLayoutContext";


function DefaultLayoutInner() {
  const pageLayout = useSelector(SettingSelector.page_layout)
  const { isDesktop, narrowDrawerOpen, closeNarrowDrawer } = useSidebarLayout();

  return (
    <>
      <div className="wrapper">
        {!isDesktop && narrowDrawerOpen ? (
          <button
            type="button"
            className="mf-sidebar-backdrop"
            onClick={closeNarrowDrawer}
            aria-label="Close menu"
          />
        ) : null}
        <Sidebar />
        <main className="main-content content-page ">
          <div className="position-relative">
            {/* --Nav Start-- */}
            <Header />
            {/* --Nav End-- */}
          </div>
          <div className={` ${pageLayout} content-inner pb-0`} id="page_layout">
            <Outlet />
          </div>
          <Footer />

        </main>
      </div>
      <SettingOffCanvas />

    </>
  );
}

const DefaultLayout = () => {
  return (
    <SidebarLayoutProvider>
      <DefaultLayoutInner />
    </SidebarLayoutProvider>
  );
};

export default DefaultLayout;
