import React, { useState, useEffect, useRef } from "react";
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
  const [successMessage, setSuccessMessage] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0); // 0-5 scale for password strength
  const firstNameRef = useRef(null); // Ref for first input field

  // Common passwords to prevent
  const commonPasswords = [
    'password', '12345678', 'qwertyui', 'password123', 'admin123',
    'welcome1', 'letmein1', 'monkey12', 'dragon12', 'master12',
    'Password1', 'Password1!', '123456789', 'qwerty123', 'abc123'
  ];

  const {updateUser} = useContext(UserContext)
    const navigate = useNavigate();

  // Calculate password strength in real-time
  useEffect(() => {
    if (password) {
      let strength = 0;
      if (password.length >= 8) strength++;
      if (/[A-Z]/.test(password)) strength++;
      if (/[a-z]/.test(password)) strength++;
      if (/[0-9]/.test(password)) strength++;
      if (/[^A-Za-z0-9]/.test(password)) strength++;
      
      // Bonus point for longer passwords
      if (password.length >= 12) strength++;
      
      setPasswordStrength(Math.min(strength, 5));
    } else {
      setPasswordStrength(0);
    }
  }, [password]);

  // Focus the first input field on component mount
  useEffect(() => {
    if (firstNameRef.current) {
      firstNameRef.current.focus();
    }
  }, []);

  // Function to clear error and specific form fields
  const clearErrorAndField = (fieldToClear) => {
    setError("");
    setSuccessMessage("");
    
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
      setTimeout(() => setError(""), 2000);
      return;
    }
    
    // Validate full name: only A-Z, a-z, and spaces
    const nameRegex = /^[A-Za-z ]+$/;
    if (!nameRegex.test(fullName)) {
      setError("Full name can only contain letters (A-Z, a-z) and spaces");
      setTimeout(() => setError(""), 2000);
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      setTimeout(() => setError(""), 2000);
      return;
    }
    
    // Additional email validation: a-z, A-Z, 0-9, @, starts with lowercase letter, no spaces
    const emailRegex = /^[a-z][a-zA-Z0-9]*@[a-zA-Z0-9]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setError("Email must start with lowercase letter, contain only letters/numbers/@, and no spaces");
      setTimeout(() => setError(""), 2000);
      return;
    }

    if (!password) {
      setError("Please enter the password");
      setTimeout(() => setError(""), 2000);
      return;
    }
    
    // Validate password: min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char, no spaces
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d\s]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError("Password must be at least 8 chars with uppercase, lowercase, digit, special char, no spaces");
      setTimeout(() => setError(""), 2000);
      return;
    }
    
    // Check for common passwords
    if (commonPasswords.includes(password.toLowerCase())) {
      setError("Please choose a stronger password. This password is too common.");
      setTimeout(() => setError(""), 2000);
      return;
    }
    
    // Check password strength - must be at least medium (3/5)
    if (passwordStrength < 3) {
      setError("Password is too weak. Please choose a stronger password.");
      setTimeout(() => setError(""), 2000);
      return;
    }

    setError("");
    
    // Show immediate loading feedback
    setSuccessMessage("Processing registration...");

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

          // Show success message for email verification
          setSuccessMessage("Registration successful! You can now login.");
          // Clear success message after 2 seconds
          setTimeout(() => {
            setSuccessMessage("");
            // Redirect to login page
            navigate("/login");
          }, 2000);
          // Clear form fields
          setFullName("");
          setEmail("");
          setPassword("");
          setAdminInviteToken("");
          setProfilePic(null);

        }catch(err){
          // Clear success message if there was one
          setSuccessMessage("");
          
          if(err.response && err.response.data.message){
            setError(err.response.data.message);
          }else{
            setError("Something went wrong. Please try again")
          }
          
          // Clear error message after 2 seconds
          setTimeout(() => setError(""), 2000);
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
              ref={firstNameRef}
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
            {/* Password strength indicator */}
            {password && (
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span>Password Strength:</span>
                  <span className={
                    passwordStrength <= 1 ? "text-red-500 font-medium" :
                    passwordStrength <= 3 ? "text-yellow-500 font-medium" :
                    "text-green-500 font-medium"
                  }>
                    {passwordStrength <= 1 ? "Weak" :
                     passwordStrength <= 3 ? "Medium" :
                     "Strong"}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ease-in-out ${
                      passwordStrength <= 1 ? "bg-red-500" :
                      passwordStrength <= 3 ? "bg-yellow-500" :
                      "bg-green-500"
                    }`} 
                    style={{ width: `${(passwordStrength / 5) * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {passwordStrength <= 1 && "Add uppercase, number, and special character"}
                  {passwordStrength === 2 && "Good start! Add more character types"}
                  {passwordStrength === 3 && "Almost there! Try a longer password"}
                  {passwordStrength >= 4 && "Great password!"}
                </div>
              </div>
            )}

            <Input
              value={adminInviteToken}
              onChange={({ target }) => setAdminInviteToken(target.value)}
              label="Admin Invite Token"
              placeholder="6 Digit Code"
              type="text"
            />
          </div>
          {error && <p className="text-red-500 text-xs pb-2.5">{error}</p>}
          {successMessage && <p className="text-green-500 text-xs pb-2.5">{successMessage}</p>}
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
