import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import AuthLayout from "../../components/layouts/AuthLayout";

export default function EnterCode() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60); // 60 seconds
  const [email, setEmail] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  // Get email from location state
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    } else {
      // If no email, redirect to forgot password
      navigate("/forgot-password");
    }
  }, [location.state, navigate]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // Focus management for code inputs
  useEffect(() => {
    const firstInput = document.getElementById("code-0");
    if (firstInput) firstInput.focus();
  }, []);

  // Handle code input changes
  const handleCodeChange = (index, value) => {
    if (isNaN(value)) return; // Only allow numbers

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only take the last character
    setCode(newCode);

    // Move to next input if value entered
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
        const newCode = [...code];
        newCode[index - 1] = "";
        setCode(newCode);
      }
    }
  };

  // Resend code
  const handleResendCode = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.FORGOT_PASSWORD, { email });
      setCountdown(60); // Reset countdown
    } catch (err) {
      if (err.response && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Failed to resend code. Please try again.");
      }
    } finally {
      setIsLoading(false);
      // Clear error after 3 seconds
      setTimeout(() => setError(""), 3000);
    }
  };

  // Submit verification code
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const verificationCode = code.join("");
    
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a 6-digit code");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Verify the code with backend
      const response = await axiosInstance.post(API_PATHS.AUTH.VERIFY_PASSWORD_RESET_CODE, {
        email,
        code: verificationCode
      });

      if (response.data.success) {
        // Navigate to reset password page with reset token
        navigate("/re-enter-password", { 
          state: { 
            resetToken: response.data.resetToken,
            email: email
          } 
        });
      }
    } catch (err) {
      if (err.response && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Invalid or expired verification code");
      }
    } finally {
      setIsLoading(false);
      // Clear error after 3 seconds
      setTimeout(() => setError(""), 3000);
    }
  };

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <AuthLayout>
      <div className="lg:w-[70%] h-3/4 md:h-full flex flex-col justify-center">
        <h3 className="text-xl font-semibold text-black">Verify Your Email</h3>
        <p className="text-xs text-slate-700 mt-[5px] mb-6">
          Enter the 6-digit code sent to <span className="font-medium">{email}</span>
        </p>

        <form onSubmit={handleSubmit}>
          {/* Code Input Boxes */}
          <div className="flex justify-between mb-6">
            {code.map((digit, index) => (
              <input
                key={index}
                id={`code-${index}`}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-12 text-center text-xl border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none"
              />
            ))}
          </div>

          {error && <p className="text-red-500 text-xs pb-2.5">{error}</p>}

          {/* Resend Code Section */}
          <div className="flex justify-between items-center mb-6">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isLoading || countdown > 0}
              className={`text-sm ${countdown > 0 ? "text-gray-400" : "text-primary underline"}`}
            >
              {countdown > 0 ? `Resend code in ${formatTime(countdown)}` : "Resend Code"}
            </button>
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? "Verifying..." : "Continue"}
          </button>
        </form>

        <p className="text-[13px] text-slate-800 mt-6 text-center">
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