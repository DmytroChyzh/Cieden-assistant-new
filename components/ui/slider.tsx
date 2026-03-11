"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ value, onValueChange, min = 0, max = 100, step = 1, className, disabled, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!disabled) {
        onValueChange([parseFloat(e.target.value)]);
      }
    };

    return (
      <div
        ref={ref}
        className={cn("relative flex w-full touch-none select-none items-center", className)}
        {...props}
      >
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0] || min}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            "w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer",
            "slider::-webkit-slider-thumb:appearance-none",
            "slider::-webkit-slider-thumb:h-5",
            "slider::-webkit-slider-thumb:w-5", 
            "slider::-webkit-slider-thumb:rounded-full",
            "slider::-webkit-slider-thumb:bg-primary",
            "slider::-webkit-slider-thumb:cursor-pointer",
            "slider::-moz-range-thumb:h-5",
            "slider::-moz-range-thumb:w-5",
            "slider::-moz-range-thumb:rounded-full",
            "slider::-moz-range-thumb:bg-primary",
            "slider::-moz-range-thumb:cursor-pointer",
            "slider::-moz-range-thumb:border-none",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${((value[0] - min) / (max - min)) * 100}%, hsl(var(--secondary)) ${((value[0] - min) / (max - min)) * 100}%, hsl(var(--secondary)) 100%)`
          }}
        />
      </div>
    );
  }
);

Slider.displayName = "Slider";

export { Slider };