import React, { useState } from "react";
import { HiOutlineX, HiOutlineMenu } from "react-icons/hi";
import { LuMessageSquare } from "react-icons/lu";
import Notifications from "../Notifications";
import MessagingModal from "../MessagingModal";
import SideMenu from "./SideMenu";

export default function Navbar({ activeMenu }) {
  const [openSideMenu, setOpenSideMenu] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  return (
    <div className="flex gap-5 bg-white border border-b border-gray-200/50 backdrop-blur-[2px] py-4 px-7 sticky top-0 z-30">
      <button
        className="lg:hidden text-black"
        onClick={() => {
          setOpenSideMenu(!openSideMenu);
        }}
      >
        {openSideMenu ? (
          <HiOutlineX className="text-2xl" />
        ) : (
          <HiOutlineMenu className="text-2xl" />
        )}
      </button>
      <h2 className="text-lg font-medium text-black">Task Manager</h2>
      <div className="ml-auto flex items-center gap-4">
        <button
          className="p-2 rounded-full hover:bg-gray-100 transition-colors relative"
          onClick={() => setIsMessageModalOpen(true)}
          title="Messages"
        >
          <LuMessageSquare className="text-xl" />
        </button>
        <Notifications />
      </div>
      {openSideMenu && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 lg:hidden" onClick={() => setOpenSideMenu(false)}>
          <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl z-50" onClick={(e) => e.stopPropagation()}>
            <SideMenu activeMenu={activeMenu} />
          </div>
        </div>
      )}
      <MessagingModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
      />
    </div>
  );
}
