"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CaretRight, Lightning } from '@phosphor-icons/react';
import { X } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
interface QuickActionsDrawerProps {
  onRequestSelect: (request: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export function QuickActionsDrawer({ onRequestSelect, className, children }: QuickActionsDrawerProps) {
  const [open, setOpen] = useState(false);


  // Cieden design company quick actions
  const requestCategories = {
    "About Cieden": [
      "What does Cieden do? Tell me about your company and services.",
      "What industries do you work with?",
      "Do you do development as well, or design only?"
    ],
    "Portfolio & Process": [
      "Show me your portfolio or case studies.",
      "What is your design process and timeline?",
      "Show me your best or most relevant case study."
    ],
    "Pricing & Next Steps": [
      "How much does a typical project cost? I need a rough estimate.",
      "What engagement models do you offer?",
      "How can I start a project with Cieden? What's the first step?"
    ]
  };

  const handleRequestSelect = (request: string) => {
    onRequestSelect(request);
    setOpen(false);
  };

  const RequestButton = ({ request, index }: { request: string; index: number }) => (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => handleRequestSelect(request)}
      className={cn(
        "w-full text-left p-4 rounded-xl",
        "bg-white/5 hover:bg-white/10",
        "border border-white/10 hover:border-white/20",
        "backdrop-blur-sm",
        "transition-all duration-200",
        "flex items-center justify-between group"
      )}
    >
      <span className="text-white/90 text-sm font-medium">{request}</span>
      <CaretRight size={16} className="text-white/40 group-hover:text-white/70 transition-colors" />
    </motion.button>
  );

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild className={className}>
        {children || (
          <button
            className={cn(
              "p-3 rounded-xl",
              "hover:bg-white/10",
              "transition-all duration-200"
            )}
          >
            <Lightning size={20} className="text-white/60 hover:text-white/80" />
          </button>
        )}
      </DrawerTrigger>

      <DrawerContent
        className={cn(
          "bg-black/90 backdrop-blur-2xl backdrop-saturate-150",
          "border-t border-white/20 rounded-t-3xl shadow-2xl",
          "max-w-[428px] mx-auto max-h-[70vh]"
        )}
      >
        {/* Custom drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-white/30 rounded-full" />
        </div>

        {/* Hide default vaul overlay and handle */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              [data-slot="drawer-overlay"] { background: transparent !important; }
              [data-slot="drawer-content"] > div.mx-auto.mt-4 { display: none !important; }
            `,
          }}
        />
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4">
          <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
          <DrawerClose asChild>
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white/70" />
            </motion.button>
          </DrawerClose>
        </div>

        <div className="px-6 space-y-6 overflow-y-auto scrollbar-drawer pb-8">
          {/* Categorized Requests Sections */}
          {Object.entries(requestCategories).map(([category, requests], categoryIndex) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIndex * 0.1 }}
              className="space-y-4"
            >
              <h3 className="text-white/80 text-sm font-semibold uppercase tracking-wide px-2">
                {category}
              </h3>
              <div className="space-y-3">
                {requests.map((request, index) => (
                  <RequestButton 
                    key={`${category}-${index}`} 
                    request={request} 
                    index={index + (categoryIndex * 3)} 
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}