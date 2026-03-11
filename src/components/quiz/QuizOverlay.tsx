"use client";

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Import existing message components that we'll reuse in overlays
import { CreditScoreMessage } from '@/src/components/chat/CreditScoreMessage';
import { BalanceMessage } from '@/src/components/chat/BalanceMessage';
import { LoansMessage } from '@/src/components/chat/LoansMessage';
import { LendingOptionsMessage } from '@/src/components/chat/LendingOptionsMessage';
import { EMIMessage } from '@/src/components/chat/EMIMessage';
import { SavingsMessage } from '@/src/components/chat/SavingsMessage';

interface QuizOverlayProps {
  type: string;
  data: any;
  onClose: () => void;
}

export function QuizOverlay({ type, data, onClose }: QuizOverlayProps) {
  const renderOverlayContent = () => {
    const commonProps = {
      data,
      onUserAction: () => {} // Empty function since we don't need contextual updates in overlay
    };

    switch (type.toLowerCase()) {
      case 'creditscore':
        return <CreditScoreMessage {...commonProps} />;
      
      case 'accountbalance':
        return <BalanceMessage {...commonProps} />;
      
      case 'loans':
        return <LoansMessage {...commonProps} />;
      
      case 'lendingoptions':
        return <LendingOptionsMessage {...commonProps} />;
      
      case 'emiinfo':
        return <EMIMessage {...commonProps} />;
      
      case 'savingsgoal':
        return <SavingsMessage {...commonProps} />;
      
      default:
        return (
          <div className="text-center p-8">
            <div className="text-white/70 text-lg mb-2">Unknown card type</div>
            <div className="text-sm text-white/60">Type: {type}</div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-black/90 rounded-[28px] border border-white/10 backdrop-blur-xl text-white max-w-4xl w-full mx-4 relative max-h-[90vh] overflow-y-auto shadow-[0_24px_60px_-20px_rgba(0,0,0,0.75)]">
        {/* Close button */}
        <div className="sticky top-0 right-0 z-10 flex justify-end p-4 bg-black/90 border-b border-white/10">
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white"
          >
            <X size={20} />
          </Button>
        </div>
        
        {/* Content */}
        <div className="p-6 pt-0">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">
              Financial Information
            </h2>
            <p className="text-sm text-white/60">
              You can review this information and then return to your quiz
            </p>
          </div>
          
          {renderOverlayContent()}
          
          {/* Return to quiz button */}
          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <Button onClick={onClose} className="px-8 border-white/20 bg-white/10 text-white rounded-2xl hover:bg-white/20">
              Return to Quiz
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}