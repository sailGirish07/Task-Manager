import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import AuthLayout from "../../components/layouts/AuthLayout";
import UserContext from "../../context/UserContext";

export default function LoginVerify() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(30); // 30 seconds

  const { updateUser } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Get email from URL query parameter or state
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const emailFromUrl = urlParams.get("email") || location.state?.email;
    
    if (emailFromUrl) {
      setEmail(emailFromUrl);
    } else {
      // If no email, redirect to login
      navigate("/login");
    }
  }, [location.search, location.state, navigate]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle input change
  const handleInputChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (newCode.every(digit => digit !== "") && newCode.join("").length === 6) {
      handleSubmit(newCode.join(""));
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

  // Submit verification code
  const handleSubmit = async (verificationCode) => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.VERIFY_LOGIN_CODE, {
        email,
        code: verificationCode
      });

      if (response.data.success) {
        setMessage(response.data.message);
        
        // Save token and user data
        localStorage.setItem("token", response.data.token);
        updateUser(response.data);
        
        // Redirect to dashboard based on role
        setTimeout(() => {
          if (response.data.role === "admin") {
            navigate("/admin/dashboard");
          } else {
            navigate("/user/dashboard");
          }
        }, 2000);
      }
    } catch (err) {
      if (err.response && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
      
      // Clear the code inputs
      setCode(["", "", "", "", "", ""]);
      // Focus first input
      setTimeout(() => {
        const firstInput = document.getElementById("code-0");
        if (firstInput) firstInput.focus();
      }, 100);
    } finally {
      setIsLoading(false);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.RESEND_CODE, {
        email
      });

      setMessage(response.data.message);
      // Reset countdown
      setCountdown(30);
      // Clear code inputs
      setCode(["", "", "", "", "", ""]);
      
      // Focus first input
      setTimeout(() => {
        const firstInput = document.getElementById("code-0");
        if (firstInput) firstInput.focus();
      }, 100);
    } catch (err) {
      if (err.response && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Failed to resend code. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="lg:w-[70%] h-3/4 md:h-full flex flex-col justify-center">
        <h3 className="text-xl font-semibold text-black">Verify Your Email</h3>
        
        <p className="text-xs text-slate-700 mt-[5px] mb-6">
          We sent a 6-digit code to <strong>{email}</strong>. This code will expire in 30 seconds.
        </p>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">
            Enter the verification code:
          </p>
          
          <div className="flex justify-center space-x-3 mb-4">
            {code.map((digit, index) => (
              <input
                key={index}
                id={`code-${index}`}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-12 text-2xl text-center border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                disabled={isLoading}
              />
            ))}
          </div>

          <div className="text-center text-sm text-gray-500 mb-4">
            Code expires in: <span className="font-semibold">{formatTime(countdown)}</span>
          </div>

          {(error || message) && (
            <div className={`text-sm text-center p-2 rounded mb-4 ${error ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
              {error || message}
            </div>
          )}

          <button
            onClick={() => handleSubmit(code.join(""))}
            disabled={isLoading || code.some(digit => digit === "")}
            className={`w-full btn-primary ${isLoading || code.some(digit => digit === "") ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? "Verifying..." : "Verify Code"}
          </button>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Didn't receive the code?
          </p>
          <button
            onClick={handleResendCode}
            disabled={isLoading}
            className={`text-primary underline font-medium mt-1 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Resend Code
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}