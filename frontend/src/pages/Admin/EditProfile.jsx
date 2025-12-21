import React, { useState, useContext, useEffect } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import ProfilePhotoSelector from "../../components/Inputs/ProfilePhotoSelector";
import Input from "../../components/Inputs/Input";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import UserContext from "../../context/UserContext";
import uploadImage from "../../utils/uploadImage";
import { validateEmail } from "../../utils/helper";
import toast from "react-hot-toast";

export default function EditProfile() {
  const { user, updateUser } = useContext(UserContext);
  const [profilePic, setProfilePic] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load current user data
  useEffect(() => {
    if (user) {
      setFullName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  // Function to clear error and specific form fields
  const clearErrorAndField = (fieldToClear) => {
    setError("");
    
    // Only clear the specific field that had the error
    switch(fieldToClear) {
      case 'fullName':
        setFullName("");
        break;
      case 'email':
        setEmail("");
        break;
      case 'currentPassword':
        setCurrentPassword("");
        break;
      case 'newPassword':
        setNewPassword("");
        break;
      case 'confirmPassword':
        setConfirmPassword("");
        break;
      default:
        // If no specific field, clear all fields
        setFullName("");
        setEmail("");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
    }
  };

  // Handle profile update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Client-side validation
      if (!fullName) {
        setError("Please enter full name");
        setTimeout(() => clearErrorAndField('fullName'), 2000);
        setLoading(false);
        return;
      }

      if (!validateEmail(email)) {
        setError("Please enter a valid email address");
        setTimeout(() => clearErrorAndField('email'), 2000);
        setLoading(false);
        return;
      }

      if ((newPassword || confirmPassword) && newPassword !== confirmPassword) {
        setError("New password and confirm password do not match");
        setTimeout(() => clearErrorAndField(), 2000);
        setLoading(false);
        return;
      }

      // Upload image if present
      let profileImageUrl = user?.profileImageUrl || "";
      if (profilePic) {
        try {
          const imgUploadRes = await uploadImage(profilePic);
          profileImageUrl = imgUploadRes.imageUrl || "";
        } catch (uploadErr) {
          setError("Failed to upload profile image");
          setTimeout(() => clearErrorAndField(), 2000);
          setLoading(false);
          return;
        }
      }

      // Prepare update data
      const updateData = {
        name: fullName,
        email,
        profileImageUrl
      };

      // Only include password if user wants to change it
      if (newPassword) {
        updateData.password = newPassword;
      }

      // Make API call to update profile
      const response = await axiosInstance.put(API_PATHS.AUTH.UPDATE_PROFILE, updateData);
      
      // Update user context with new data
      updateUser(response.data);
      
      toast.success("Profile updated successfully");
      
      // Clear all form fields after successful update
      setFullName("");
      setEmail("");
      setProfilePic(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
    } catch (err) {
      if (err.response && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Something went wrong. Please try again");
      }
      
      // Clear error message after 2 seconds
      setTimeout(() => clearErrorAndField(), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout activeMenu="Edit Profile">
      <div className="mt-5">
        <div className="grid grid-cols-1 md:grid-cols-4 mt-4">
          <div className="form-card col-span-3">
            <h2 className="text-xl md:text-xl font-medium mb-6">
              Edit Profile
            </h2>

            <form onSubmit={handleUpdateProfile}>
              <ProfilePhotoSelector image={profilePic} setImage={setProfilePic} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  value={fullName}
                  onChange={({ target }) => setFullName(target.value)}
                  label="Full Name"
                  placeholder="Enter your Name"
                  type="text"
                />

                <Input
                  value={email}
                  onChange={({ target }) => setEmail(target.value)}
                  label="Email Address"
                  placeholder="Enter your Email"
                  type="text"
                />
              </div>

              <div className="border-t border-gray-200 my-6 pt-6">
                <h3 className="text-lg font-medium mb-4">Change Password</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    value={newPassword}
                    onChange={({ target }) => setNewPassword(target.value)}
                    label="New Password"
                    placeholder="Enter new password"
                    type="password"
                  />

                  <Input
                    value={confirmPassword}
                    onChange={({ target }) => setConfirmPassword(target.value)}
                    label="Confirm New Password"
                    placeholder="Confirm new password"
                    type="password"
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-xs pb-2.5">{error}</p>}
              
              <div className="flex justify-end mt-7">
                <button
                  type="submit"
                  className="add-btn"
                  disabled={loading}
                >
                  {loading ? "UPDATING..." : "UPDATE PROFILE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}