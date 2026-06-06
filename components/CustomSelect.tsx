import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
  variant?: 'filter' | 'form';
}

const CustomSelect: React.FC<CustomSelectProps> = ({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Select...', 
  className = '',
  icon,
  variant = 'filter'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  // Base styles
  const baseStyles = "relative flex items-center justify-between cursor-pointer transition-colors";
  
  // Variant styles
  const variantStyles = variant === 'filter' 
    ? "bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 px-3 py-2 rounded-lg hover:border-slate-300 dark:hover:border-gray-500 gap-2"
    : "w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none";

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div 
        className={`${baseStyles} ${variantStyles}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {icon}
          <span className={`truncate ${variant === 'filter' ? 'text-xs font-bold' : 'text-sm'} text-gray-900 dark:text-white`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown size={12} className="text-slate-600 dark:text-gray-500 ml-2 flex-shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[150px] bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
          {options.map((option) => (
            <div
              key={option.value}
              className={`px-3 py-2 text-xs font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white ${
                value === option.value ? 'bg-slate-50 dark:bg-gray-700/50' : ''
              }`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
