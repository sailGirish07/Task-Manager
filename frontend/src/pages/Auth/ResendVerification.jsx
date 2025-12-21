import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import AuthLayout from "../../components/layouts/AuthLayout";
import Input from "../../components/Inputs/Input";

export default function ResendVerification() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const emailRef = useRef(null); // Ref for first input field
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Auto-send if email is provided from login page
  useEffect(() => {
    if (location.state?.email) {
      const emailFromState = location.state.email;
      setEmail(emailFromState);
      // Automatically send verification email
      sendVerificationEmail(emailFromState);
    }
  }, [location.state]);
  
  // Focus the first input field on component mount
  useEffect(() => {
    if (emailRef.current) {
      emailRef.current.focus();
    }
  }, []);
  
  const sendVerificationEmail = async (emailAddress) => {
    setIsLoading(true);
    setError("");
    setMessage("");
    
    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.RESEND_CODE, { email: emailAddress });
      setMessage(response.data.message);
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      if (err.response && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Something went wrong. Please try again");
      }
      // Clear error message after 3 seconds
      setTimeout(() => setError(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError("Please enter your email address");
      setTimeout(() => setError(""), 3000);
      return;
    }
    
    sendVerificationEmail(email);
  };
  
  return (
    <AuthLayout>
      <div className="lg:w-[70%] h-3/4 md:h-full flex flex-col justify-center">
        <h3 className="text-xl font-semibold text-black">Resend Verification Code</h3>
        <p className="text-xs text-slate-700 mt-[5px] mb-6">
          Enter your email to receive a new verification code
        </p>
        
        <form onSubmit={handleSubmit}>
          <Input
            ref={emailRef}
            value={email}
            onChange={({ target }) => setEmail(target.value)}
            label="Email Address"
            placeholder="Enter your Email"
            type="email"
          />
          
          {error && <p className="text-red-500 text-xs pb-2.5">{error}</p>}
          {message && <p className="text-green-500 text-xs pb-2.5">{message}</p>}
          
          <button 
            type="submit" 
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Resend Verification Code"}
          </button>
          
          <p className="text-[13px] text-slate-800 mt-3">
            Remember your password?{" "}
            <button 
              type="button"
              className="font-medium text-primary underline"
              onClick={() => navigate("/login")}
            >
              Login
            </button>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}