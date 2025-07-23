'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface SimplePasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  id?: string;
  name?: string;
  autoComplete?: string;
}

export default function SimplePasswordInput({
  value,
  onChange,
  placeholder = "Enter password",
  disabled = false,
  error = false,
  className = '',
  id,
  name,
  autoComplete = "current-password"
}: SimplePasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        className={`
          w-full px-3 py-2 pr-10 border rounded-lg
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          transition-colors duration-200
          ${error 
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300'
          }
          ${className}
        `}
      />
      
      <button
        type="button"
        onClick={togglePasswordVisibility}
        disabled={disabled}
        className={`
          absolute inset-y-0 right-0 flex items-center pr-3
          text-gray-400 hover:text-gray-600 
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-200
        `}
        tabIndex={-1}
      >
        {showPassword ? (
          <EyeOff className="w-5 h-5" />
        ) : (
          <Eye className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
