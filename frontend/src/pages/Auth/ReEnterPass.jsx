import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import AuthLayout from "../../components/layouts/AuthLayout";
import Input from "../../components/Inputs/Input";

export default function ReEnterPass() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const passwordRef = useRef(null);
  const [resetToken, setResetToken] = useState("");
  const [email, setEmail] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  // Get reset token and email from location state
  useEffect(() => {
    if (location.state?.resetToken && location.state?.email) {
      setResetToken(location.state.resetToken);
      setEmail(location.state.email);
    } else {
      // If no token, redirect to forgot password
      navigate("/forgot-password");
    }
  }, [location.state, navigate]);

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
    if (passwordRef.current) {
      passwordRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password) {
      setError("Please enter a new password");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your new password");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setTimeout(() => setError(""), 3000);
      return;
    }

    // Check password strength - must be at least medium (3/5)
    if (passwordStrength < 3) {
      setError("Password is too weak. Please choose a stronger password.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      // Reset password with token
      const response = await axiosInstance.post(API_PATHS.AUTH.RESET_PASSWORD, { 
        token: resetToken,
        newPassword: password,
        email: email
      });
      
      setMessage(response.data.message);
      
      // Redirect to success page after 2 seconds
      setTimeout(() => {
        navigate("/reset-success");
      }, 2000);
    } catch (err) {
      if (err.response && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Something went wrong. Please try again");
      }
    } finally {
      setIsLoading(false);
      // Clear messages after 5 seconds
      setTimeout(() => {
        setMessage("");
        setError("");
      }, 5000);
    }
  };

  return (
    <AuthLayout>
      <div className="lg:w-[70%] h-3/4 md:h-full flex flex-col justify-center">
        <h3 className="text-xl font-semibold text-black">Reset Password</h3>
        <p className="text-xs text-slate-700 mt-[5px] mb-6">
          Enter your new password below for <span className="font-medium">{email}</span>.
        </p>

        <form onSubmit={handleSubmit}>
          <Input
            ref={passwordRef}
            value={password}
            onChange={({ target }) => setPassword(target.value)}
            label="New Password"
            placeholder="Enter new password"
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
            value={confirmPassword}
            onChange={({ target }) => setConfirmPassword(target.value)}
            label="Confirm New Password"
            placeholder="Confirm new password"
            type="password"
          />

          {error && <p className="text-red-500 text-xs pb-2.5">{error}</p>}
          {message && <p className="text-green-500 text-xs pb-2.5">{message}</p>}

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <p className="text-[13px] text-slate-800 mt-3">
          <button
            type="button"
            className="font-medium text-primary underline"
            onClick={() => navigate("/forgot-password")}
          >
            Back to Forgot Password
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}