 "use client";

 import React from 'react';
 import { cn } from '@/lib/utils';

 interface EmptyStateWrapperProps {
   children?: React.ReactNode;
   userName?: string;
   isVisible: boolean;
   className?: string;
 }

 /**
  * Empty-state layout styled to match the Chatbot project's
  * "Hello, ..." welcome + quick prompts grid.
  * Purely visual – the children define the actual prompt cards.
  */
 export function EmptyStateWrapper({
   children,
   userName = "there",
   isVisible,
   className
 }: EmptyStateWrapperProps) {
   if (!isVisible) {
     return null;
   }

   return (
     <div
       className={cn(
         "relative w-full h-full flex flex-col items-center justify-start pt-16",
         className
       )}
     >
       <div className="relative z-10 w-full max-w-4xl px-4 lg:px-0 text-center">
         <h1
           className="text-2xl md:text-3xl font-semibold text-white mb-2"
           style={{
             fontFamily:
              "Gilroy",
             letterSpacing: "-0.03em"
           }}
         >
           Welcome — your Cieden assistant is here 👋
         </h1>
         <p className="text-sm md:text-base text-white/70 mb-8">
           Tell me about your project or pick one of the questions below.
         </p>
       </div>

       <div className="relative z-10 w-full max-w-4xl px-4 lg:px-0">
         {children}
       </div>
     </div>
   );
 }

