import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SIDE_MENU_DATA, SIDE_MENU_USER_DATA } from "../../utils/data";
import { UserContext } from "../../context/UserContext";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import uploadImage from "../../utils/uploadImage";
// import { useContext } from "react";
export default function SideMenu({ activeMenu }) {
  const [sideMenuData, setSideMenuData] = useState([]);
   const { user, clearUser, updateUser } = useContext(UserContext);
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);

  const handleClick = (route) => {
    if (route === "logout") {
      handleLogout();
      return;
    }
    navigate(route);
  };

  const triggerFileInput = () => {
    document.getElementById('profileImageInput').click();
  };

  const handleProfileImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Upload image
      const imgUploadRes = await uploadImage(file);
      const profileImageUrl = imgUploadRes.imageUrl || "";

      // Update user profile with new image URL
      const response = await axiosInstance.put(API_PATHS.AUTH.UPDATE_PROFILE, {
        profileImageUrl
      });

      // Update user context with new data
      updateUser(response.data);
    } catch (err) {
      console.error("Error updating profile image:", err);
      alert("Failed to update profile image");
    } finally {
      setIsUploading(false);
      // Reset file input
      e.target.value = "";
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    clearUser();
    navigate("/login");
  };

  useEffect(() => {
    if (user){
      setSideMenuData(user?.role === 'admin' ? SIDE_MENU_DATA : SIDE_MENU_USER_DATA)
    }
    return () => {};
  }, [user]);
  return <div className="w-64 h-[calc(100vh-61px)] bg-white border-r border-gray-200/50 sticky top-[61px] z-20">
    <div className="flex flex-col items-center justify-center mb-7 pt-5 relative">
      <input
        type="file"
        accept="image/*"
        onChange={handleProfileImageChange}
        className="hidden"
        id="profileImageInput"
        disabled={isUploading}
      />
      {user?.profileImageUrl ? (
      <div className="relative group cursor-pointer" onClick={triggerFileInput}>
          <img
          src={user?.profileImageUrl}
          alt="Profile Image"
          className="w-20 h-20 bg-slate-400 rounded-full"
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 border-t-2 border-white border-solid rounded-full animate-spin"></div>
            </div>
          )}
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white text-xs">Change</span>
          </div>
      </div>
      ) : (
      <div className="relative group cursor-pointer" onClick={triggerFileInput}>
          <div className="w-20 h-20 bg-slate-400 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">{user?.name?.charAt(0) || 'U'}</span>
          </div>
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white text-xs">Upload</span>
          </div>
      </div>
      )}

    {user?.role === "admin" &&(
        <div className="text-[10px] font-medium text-white bg-primary px-3 py-0.5 rounded mt-1">
            Admin
            </div>
    )}

    <h5 className="text-gray-95 font-medium leading-6 mt-3">
        {user?.name || ""}
    </h5>

    <p className="text-[12px] text-gray-500">{user?.email || ""}</p>
</div>

  {sideMenuData.map((item, index) => (
    <button
    key={`menu_${index}`}
    className={`w-full flex items-center gap-4 text-[15px] ${
        activeMenu == item.label
        ? "text-primary bg-linear-to-r from-blue-50/40 to-blue-100/50 border-r-3"
        : ""
    }py-3 px-6 mb-3 cursor-pointer`}
    onClick={() => handleClick(item.path)}
    >
        <item.icon className="text-xl"/>
        {item.label}
    </button>
  ))}
  </div>;
};


