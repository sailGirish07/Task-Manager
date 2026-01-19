import React, { createContext, useState, useEffect } from "react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // New state to track loading

  useEffect(() => {
    const initializeUser = async () => {
      const accessToken = localStorage.getItem("accessToken");
      
      if (!accessToken) {
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Check if we already have user data
      if (!user) {
        try {
          const response = await axiosInstance.get(API_PATHS.AUTH.GET_PROFILE);
          setUser(response.data);
        } catch (error) {
          console.error("User not authenticated", error);
          clearUser();
        }
      }
      
      setLoading(false);
    };
    
    initializeUser();
  }, []); // Run only on initial mount
  
  // Listen for storage events to handle login/logout from other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Only respond to changes in our own tokens
      if (e.key === 'accessToken') {
        if (!e.newValue && user) {
          // Token was removed, clear user
          setUser(null);
        } else if (e.newValue && !user) {
          // Token was added, fetch user
          const fetchUser = async () => {
            try {
              const response = await axiosInstance.get(API_PATHS.AUTH.GET_PROFILE);
              setUser(response.data);
            } catch (error) {
              console.error("User not authenticated", error);
              clearUser();
            }
          };
          fetchUser();
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user]);

  const updateUser = (userData) => {
    // If userData contains tokens but not full user profile, fetch the profile
    if (userData.accessToken && !userData._id) {
      // Store tokens first
      localStorage.setItem("accessToken", userData.accessToken);
      localStorage.setItem("refreshToken", userData.refreshToken);
      
      // Then fetch the full user profile
      const fetchUserProfile = async () => {
        try {
          const response = await axiosInstance.get(API_PATHS.AUTH.GET_PROFILE);
          setUser(response.data);
        } catch (error) {
          console.error("Error fetching user profile after login", error);
          clearUser();
        }
      };
      
      fetchUserProfile();
    } else {
      // If full user data is provided, set it directly
      setUser(userData);
      if (userData.accessToken) {
        localStorage.setItem("accessToken", userData.accessToken);
      }
      if (userData.refreshToken) {
        localStorage.setItem("refreshToken", userData.refreshToken);
      }
      setLoading(false);
    }
  };

  const clearUser = () => {
    setUser(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  };

  return (
    <UserContext.Provider value={{ user, loading, updateUser, clearUser }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;
