'use client';

import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  showStrengthIndicator?: boolean;
  className?: string;
  containerClassName?: string;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(({
  label,
  error,
  helperText,
  showStrengthIndicator = false,
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    text: '',
    color: ''
  });

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const calculatePasswordStrength = (password: string) => {
    if (!password) {
      return { score: 0, text: '', color: '' };
    }

    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    // Calculate score based on criteria met
    if (checks.length) score += 1;
    if (checks.lowercase) score += 1;
    if (checks.uppercase) score += 1;
    if (checks.numbers) score += 1;
    if (checks.symbols) score += 1;

    // Determine strength level
    let text = '';
    let color = '';
    
    if (score <= 2) {
      text = 'Weak';
      color = 'text-red-600';
    } else if (score <= 3) {
      text = 'Fair';
      color = 'text-yellow-600';
    } else if (score <= 4) {
      text = 'Good';
      color = 'text-blue-600';
    } else {
      text = 'Strong';
      color = 'text-green-600';
    }

    return { score, text, color };
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    
    if (showStrengthIndicator) {
      setPasswordStrength(calculatePasswordStrength(password));
    }
    
    // Call original onChange if provided
    if (props.onChange) {
      props.onChange(e);
    }
  };

  const getStrengthBarColor = (index: number) => {
    if (index < passwordStrength.score) {
      if (passwordStrength.score <= 2) return 'bg-red-500';
      if (passwordStrength.score <= 3) return 'bg-yellow-500';
      if (passwordStrength.score <= 4) return 'bg-blue-500';
      return 'bg-green-500';
    }
    return 'bg-gray-200';
  };

  return (
    <div className={`password-input-container ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          className={`
            w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition-colors duration-200
            ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
            ${className}
          `}
          {...props}
          onChange={handlePasswordChange}
        />
        
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Password Strength Indicator */}
      {showStrengthIndicator && props.value && (
        <div className="mt-2">
          <div className="flex space-x-1 mb-1">
            {[1, 2, 3, 4, 5].map((index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${getStrengthBarColor(index)}`}
              />
            ))}
          </div>
          {passwordStrength.text && (
            <p className={`text-xs font-medium ${passwordStrength.color}`}>
              Password strength: {passwordStrength.text}
            </p>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <span className="mr-1">⚠️</span>
          {error}
        </p>
      )}

      {/* Helper Text */}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}

      {/* Password Requirements (when showing strength) */}
      {showStrengthIndicator && props.value && (
        <div className="mt-2 text-xs text-gray-600">
          <p className="font-medium mb-1">Password requirements:</p>
          <ul className="space-y-1">
            <li className={`flex items-center ${(props.value as string).length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-1">{(props.value as string).length >= 8 ? '✓' : '○'}</span>
              At least 8 characters
            </li>
            <li className={`flex items-center ${/[a-z]/.test(props.value as string) ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-1">{/[a-z]/.test(props.value as string) ? '✓' : '○'}</span>
              One lowercase letter
            </li>
            <li className={`flex items-center ${/[A-Z]/.test(props.value as string) ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-1">{/[A-Z]/.test(props.value as string) ? '✓' : '○'}</span>
              One uppercase letter
            </li>
            <li className={`flex items-center ${/\d/.test(props.value as string) ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-1">{/\d/.test(props.value as string) ? '✓' : '○'}</span>
              One number
            </li>
            <li className={`flex items-center ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(props.value as string) ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-1">{/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(props.value as string) ? '✓' : '○'}</span>
              One special character
            </li>
          </ul>
        </div>
      )}
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
