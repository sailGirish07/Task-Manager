import React, { useState } from "react";
import AuthLayout from "../../components/layouts/AuthLayout";
import ProfilePhotoSelector from "../../components/Inputs/ProfilePhotoSelector";
import Input from "../../components/Inputs/Input";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useContext } from "react";
import uploadImage from "../../utils/uploadImage";
import UserContext from "../../context/UserContext";
import { validateEmail } from "../../utils/helper";

export default function Signup() {
  const [profilePic, setProfilePic] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminInviteToken, setAdminInviteToken] = useState("");

  const [error, setError] = useState(null);

  const {updateUser} = useContext(UserContext)
    const navigate = useNavigate();

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
      case 'password':
        setPassword("");
        break;
      case 'adminInviteToken':
        setAdminInviteToken("");
        break;
      case 'profilePic':
        setProfilePic(null);
        break;
      default:
        // If no specific field, clear all fields
        setFullName("");
        setEmail("");
        setPassword("");
        setAdminInviteToken("");
        setProfilePic(null);
    }
  };

  //Handle signup form submt
  const handleSignup = async (e) => {
    e.preventDefault();

    let profileImageUrl = ''

    if (!fullName) {
      setError("Please enter full name");
      // Clear error message after 1.5 seconds
      setTimeout(() => clearErrorAndField('fullName'), 2000);
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter  a valide email address");
      // Clear error message after 1.5 seconds
      setTimeout(() => clearErrorAndField('email'), 2000);
      return;
    }

    if (!password) {
      setError("Please enter the password");
      // Clear error message after 1.5 seconds
      setTimeout(() => clearErrorAndField('password'), 2000);
      return;
    }

    setError("");

       try{

        //Upload image if present
        if(profilePic){
          const imgUploadRes = await uploadImage(profilePic);
          profileImageUrl = imgUploadRes.imageUrl || "";
        }
          const response = await axiosInstance.post(API_PATHS.AUTH.REGISTER, {
            name: fullName,
            email,
            password,
            profileImageUrl,
            adminInviteToken
          });

          const {token, role} = response.data;

          if(token){
            localStorage.setItem("token", token);
            updateUser(response.data)

            //Redirect based on the role
            if(role === "admin"){
              navigate("/admin/dashboard");

            }else{
              navigate("/user/dashboard");
            }
          }

        }catch(err){
          if(err.response && err.response.data.message){
            setError(err.response.data.message);
          }else{
            setError("Something went wrong. Please try again")
          }
          
          // Clear error message after 1.5 seconds
          setTimeout(() => clearErrorAndField(), 2000);
        }

  };

  return (
    <AuthLayout>
      <div className="lg:w-[100%] h-auto md:h-full mt-10 md:mt-0 flex flex-col justify-center">
        <h3 className="text-xl font-seminbold text-black">Create an Account</h3>
        <p className="text-xs text-slate-700 mt-[5px] mb-6">
          Join us today by entering your details below.
        </p>

        <form onSubmit={handleSignup}>
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

            <Input
              value={password}
              onChange={({ target }) => setPassword(target.value)}
              label="Password"
              placeholder="Min 8 characters"
              type="password"
            />

            <Input
              value={adminInviteToken}
              onChange={({ target }) => setAdminInviteToken(target.value)}
              label="Admin Invite Token"
              placeholder="6 Digit Code"
              type="text"
            />
          </div>
          {error && <p className="text-red-500 text-xs pb-2.5">{error}</p>}
          <button type="submit" className="btn-primary">
            Signup
          </button>

          <p className="text-[13px] text-slate-800 mt-3">
            Already an account?{" "}
            <Link className="font-medium text-primary underline" to="/login">
              Login
            </Link>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}
