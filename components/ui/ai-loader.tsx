import * as React from "react";
import Image from "next/image";

interface LoaderProps {
  size?: number;
  text?: string;
}

export const Component: React.FC<LoaderProps> = ({ size = 180, text = "Generating" }) => {
  const letters = text ? text.split("") : [];
  const showText = text && text.trim() !== "";

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      {/* Glowing purple background effect */}
      <div
        className="absolute inset-0 rounded-full animate-loaderGlow z-0"
        style={{
          background:
            "radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, rgba(168, 85, 247, 0.2) 40%, rgba(168, 85, 247, 0.1) 70%, transparent 100%)",
          top: "48px",
          transform: "scale(1.5)",
          filter: "blur(20px)",
        }}
      />
      
      {/* Only show text if provided */}
      {showText &&
        letters.map((letter, index) => (
          <span
            key={index}
            className="inline-block text-white opacity-40 animate-loaderLetter relative z-30"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {letter}
          </span>
        ))}

      {/* Existing animated circle blob */}
      <div
        className="absolute rounded-full animate-loaderCircle relative z-20"
        style={{
          width: "100%",
          height: "100%",
          background: "rgba(30, 30, 35, 0.9)",
        }}
      />

      <style jsx>{`
        @keyframes loaderCircle {
          0% {
            transform: rotate(0deg);
            box-shadow: 0 6px 12px 0 #c084fc inset, /* purple-400 */ 0 12px 18px 0 #a855f7 inset, /* purple-500 */ 0 36px 36px 0 #7c3aed inset, /* purple-600 */ 0 0 3px 1.2px rgba(192, 132, 252, 0.35), /* purple-400 */ 0 0 6px 1.8px rgba(168, 85, 247, 0.22); /* purple-500 */
          }
          50% {
            transform: rotate(180deg);
            box-shadow: 0 6px 12px 0 #d8b4fe inset, /* purple-300 */ 0 12px 6px 0 #7c3aed inset, /* purple-600 */ 0 24px 36px 0 #c084fc inset, /* purple-400 */ 0 0 3px 1.2px rgba(216, 180, 254, 0.32), /* purple-300 */ 0 0 6px 1.8px rgba(168, 85, 247, 0.22); /* purple-500 */
          }
          100% {
            transform: rotate(360deg);
            /* Match starting shadow to avoid visual lag */
            box-shadow: 0 6px 12px 0 #c084fc inset, /* purple-400 */ 0 12px 18px 0 #a855f7 inset, /* purple-500 */ 0 36px 36px 0 #7c3aed inset, /* purple-600 */ 0 0 3px 1.2px rgba(192, 132, 252, 0.35), /* purple-400 */ 0 0 6px 1.8px rgba(168, 85, 247, 0.22); /* purple-500 */
          }
        }
        
        @keyframes loaderGlow {
          0%,
          100% {
            opacity: 0.6;
            transform: translateY(20px) scale(1.5);
          }
          50% {
            opacity: 0.9;
            transform: translateY(20px) scale(1.7);
          }
        }
      `}
      </style>

      <style jsx>{`
        @keyframes loaderLetter {
          0%,
          100% {
            opacity: 0.4;
            transform: translateY(0);
          }
          20% {
            opacity: 1;
            transform: scale(1.15);
          }
          40% {
            opacity: 0.7;
            transform: translateY(0);
          }
        }

        .animate-loaderCircle {
          animation: loaderCircle 5s linear infinite;
        }

        .animate-loaderLetter {
          animation: loaderLetter 3s infinite;
        }

        /* Slow fade-in / fade-out for the decorative blob */
        @keyframes loaderBlobFade {
          0%,
          100% {
            opacity: 0.55; /* less fade out */
          }
          50% {
            opacity: 1; /* full visibility */
          }
        }

        .animate-loaderBlobFade {
          animation: loaderBlobFade 3s ease-in-out infinite;
        }

        .animate-loaderGlow {
          animation: loaderGlow 4s ease-in-out infinite;
        }

        @media (prefers-color-scheme: dark) {
          .animate-loaderCircle {
            box-shadow: 0 6px 12px 0 #4b5563 inset, 0 12px 18px 0 #6b7280 inset, 0 36px 36px 0 #9ca3af inset, 0 0 3px 1.2px rgba(107, 114, 128, 0.3), 0 0 6px 1.8px rgba(156, 163, 175, 0.2);
          }
        }
      `}</style>
    </div>
  );
};
