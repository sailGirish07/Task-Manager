import React from "react";
import { useContext } from "react";
import { UserContext } from "../../context/UserContext";
import Navbar from "./Navbar";
import SideMenu from "./SideMenu";

export default function DashboardLayout({children, activeMenu}) {

    const {user} = useContext(UserContext);

    return(
        <div className="min-h-screen flex flex-col">
        <Navbar activeMenu={activeMenu}/>

        {user && (
            <div className="flex flex-1">
                <div className="hidden lg:block">
                    <SideMenu activeMenu={activeMenu}/>
                </div>

                <div className="flex-1 lg:ml-5 lg:mr-5 p-4 md:p-5">{children}</div>
                </div>
        )}
        </div>
    )
}