import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import AuthLayout from "../../components/layouts/AuthLayout";

export default function VerifyCode() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isExpired, setIsExpired] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60); // 60 seconds

  const navigate = useNavigate();
  const location = useLocation();

  // Get email from URL query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const emailFromUrl = urlParams.get("email");
    if (emailFromUrl) {
      setEmail(emailFromUrl);
    } else {
      // If no email in URL, redirect to signup
      navigate("/signup");
    }
  }, [location.search, navigate]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      setError("Verification code has expired. Please request a new code.");
      setIsExpired(true); // Mark as expired
      // Focus first input when countdown expires
      setTimeout(() => {
        const firstInput = document.getElementById("code-0");
        if (firstInput) firstInput.focus();
      }, 100);
      return; // Don't start timer when countdown is 0 or below
    }

    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
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
      const response = await axiosInstance.post(API_PATHS.AUTH.VERIFY_CODE, {
        email,
        code: verificationCode
      });

      if (response.data.success) {
        setMessage(response.data.message);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate("/login", {
            state: {
              message: response.data.message
            }
          });
        }, 2000);
      }
    } catch (err) {
      if (err.response && err.response.data.message) {
        // Check if the error is specifically for expired code
        if (err.response.data.errorType === "CODE_EXPIRED") {
          setError("Verification code has expired");
        } else {
          setError(err.response.data.message);
        }
      } else {
        setError("Invalid or expired verification code.");
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
      // Clear error after 3 seconds
      setTimeout(() => setError(""), 3000);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    setIsLoading(true);
    setError("");
    setMessage("");
    setIsExpired(false); // Reset expired state

    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.RESEND_CODE, {
        email
      });

      setMessage(response.data.message);
      // Reset countdown
      setCountdown(60);
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
      // Clear error after 3 seconds
      setTimeout(() => setError(""), 3000);
    }
  };

  return (
    <AuthLayout>
      <div className="lg:w-[70%] h-3/4 md:h-full flex flex-col justify-center">
        <h3 className="text-xl font-semibold text-black">Verify Your Email</h3>
        
        <p className="text-xs text-slate-700 mt-[5px] mb-6">
          We sent a 6-digit code to <strong>{email}</strong>. This code will expire in 60 seconds.
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
                className={`w-12 h-12 text-2xl text-center border-2 rounded-lg focus:outline-none ${isExpired ? 'border-red-500 bg-gray-100 text-gray-400' : 'border-gray-300'} focus:border-blue-500`}
                disabled={isLoading || isExpired}
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
            disabled={isLoading || code.some(digit => digit === "") || isExpired}
            className={`w-full btn-primary ${isLoading || code.some(digit => digit === "") || isExpired ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            disabled={isLoading || countdown > 0}
            className={`text-primary underline font-medium mt-1 ${isLoading || countdown > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {countdown > 0 ? "Resend Code" : "Resend Code"}
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}