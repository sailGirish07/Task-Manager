import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SIDE_MENU_DATA, SIDE_MENU_USER_DATA } from "../../utils/data";
import { UserContext } from "../../context/UserContext";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import uploadImage from "../../utils/uploadImage";
import { socket } from "../../components/utils/socket";
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
    document.getElementById("profileImageInput").click();
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
        profileImageUrl,
      });

      // Update user context with new data
      updateUser(response.data);

      // Emit profile update event to notify other users
      socket.emit("profileUpdate", {
        userId: response.data._id,
        profileImageUrl: response.data.profileImageUrl,
        name: response.data.name,
      });

      // Update own profile in conversations
      window.dispatchEvent(
        new CustomEvent("profileUpdated", {
          detail: {
            userId: response.data._id,
            profileImageUrl: response.data.profileImageUrl,
            name: response.data.name,
          },
        })
      );
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
    if (user) {
      setSideMenuData(
        user?.role === "admin" ? SIDE_MENU_DATA : SIDE_MENU_USER_DATA
      );
    }
    return () => {};
  }, [user]);
  return (
    <div className="w-64 h-[calc(100vh-61px)] bg-white border-r border-gray-200/50 sticky top-[61px] z-20 lg:w-64 lg:static lg:h-auto lg:z-auto lg:top-auto lg:border-r lg:border-b-0">
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
          <div className="relative group">
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

            <div
              className="absolute bottom-0 right-6 w-5 h-5 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow cursor-pointer"
              onClick={triggerFileInput}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 text-black"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </div>
            <div
              className="absolute bottom-0 right-0 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow cursor-pointer"
              onClick={() => {
                // Function to remove profile image
                axiosInstance
                  .put(API_PATHS.AUTH.UPDATE_PROFILE, {
                    profileImageUrl: "",
                  })
                  .then((response) => {
                    updateUser(response.data);

                    // Emit profile update event to notify other users
                    socket.emit("profileUpdate", {
                      userId: response.data._id,
                      profileImageUrl: response.data.profileImageUrl,
                      name: response.data.name,
                    });

                    // Update own profile in conversations
                    window.dispatchEvent(
                      new CustomEvent("profileUpdated", {
                        detail: {
                          userId: response.data._id,
                          profileImageUrl: response.data.profileImageUrl,
                          name: response.data.name,
                        },
                      })
                    );
                  })
                  .catch((err) => {
                    console.error("Error removing profile image:", err);
                  });
              }}
            >
              <svg
                className="w-4 h-4 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M9 3a1 1 0 00-1 1v1H5a1 1 0 000 2h1v13a2 2 0 002 2h8a2 2 0 002-2V7h1a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm2 4a1 1 0 012 0v10a1 1 0 11-2 0V7zm-4 0a1 1 0 012 0v10a1 1 0 11-2 0V7zm8 0a1 1 0 012 0v10a1 1 0 11-2 0V7z" />
              </svg>
            </div>
          </div>
        ) : (
          <div className="relative group">
            <div className="w-20 h-20 bg-slate-400 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {user?.name?.charAt(0) || "U"}
              </span>
            </div>

            <div
              className="absolute bottom-0 right-6 w-5 h-5 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              onClick={triggerFileInput}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 text-gray-900"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </div>
          </div>
        )}

        <div className="text-[10px] font-medium text-white bg-primary px-3 py-0.5 rounded mt-1">
          {user?.role === "admin" ? "Admin" : "Member"}
        </div>

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
          <item.icon className="text-xl" />
          {item.label}
        </button>
      ))}
    </div>
  );
}
