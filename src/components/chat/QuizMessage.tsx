"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Maximize2, Brain, CheckCircle } from 'lucide-react';
import { 
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContent,
  MorphingDialogContainer
} from '@/src/components/ui/morphing-dialog';
import { QuizComponent } from '@/src/components/quiz/QuizComponent';
import { useQuiz, type Quiz } from '@/src/components/quiz/QuizProvider';
import { SavingsCardContainer } from '@/src/components/charts/SavingsCardContainer';
import type { Id } from "@/convex/_generated/dataModel";

interface QuizMessageProps {
  data: {
    quizId?: string;
    quiz_id?: string;  // Support both naming conventions
    quiz_json?: string; // JSON-encoded quiz data
    title?: string;
    questions?: any[];
  };
  onUserAction?: (action: string, data?: any) => void;
  messageId?: Id<"messages">;
}

const QUIZ_STATE_STORAGE_PREFIX = "quiz-display-state:";

interface PersistedQuizState {
  collapsed: boolean;
  hasClosedOnce: boolean;
}

const readStoredQuizState = (key: string): PersistedQuizState | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const collapsed = typeof parsed.collapsed === 'boolean' ? parsed.collapsed : false;
    const hasClosedOnce = typeof parsed.hasClosedOnce === 'boolean' ? parsed.hasClosedOnce : collapsed;
    return { collapsed, hasClosedOnce };
  } catch (error) {
    console.warn('Failed to read quiz state from sessionStorage', error);
    return null;
  }
};

const writeStoredQuizState = (key: string, state: PersistedQuizState) => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to persist quiz state to sessionStorage', error);
  }
};

// Preset loan application data
const PRESET_QUIZZES: Record<string, Quiz> = {
  loan_eligibility: {
    title: "Personal Loan Application",
    description: "Complete loan application assessment to get personalized loan offers",
    questions: [
      {
        id: 'loanAmount',
        question: 'How much loan amount do you need?',
        type: 'range',
        options: [
          { value: '1000-3000', label: '$1,000 - $3,000' },
          { value: '3000-5000', label: '$3,000 - $5,000' },
          { value: '5000-8000', label: '$5,000 - $8,000' },
          { value: '8000+', label: '$8,000+' }
        ]
      },
      {
        id: 'loanPurpose',
        question: 'What is the primary purpose for this loan?',
        type: 'choice',
        options: [
          { value: 'home_improvement', label: 'Home improvement' },
          { value: 'medical', label: 'Medical expenses' },
          { value: 'education', label: 'Education' },
          { value: 'debt_consolidation', label: 'Debt consolidation' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        id: 'employmentType',
        question: 'What is your current employment status?',
        type: 'cards',
        options: [
          {
            value: 'salaried',
            title: 'Salaried Employee',
            points: [
              'Regular monthly salary',
              'Fixed income source',
              'Employee benefits',
              'Easier loan processing'
            ]
          },
          {
            value: 'self_employed',
            title: 'Self-employed / Business',
            points: [
              'Own business or freelance',
              'Variable income',
              'Higher documentation needed',
              'Flexible loan options available'
            ]
          }
        ]
      },
      {
        id: 'monthlyIncome',
        question: 'What is your monthly take-home income?',
        type: 'range',
        options: [
          { value: '2500-4000', label: '$2,500 - $4,000' },
          { value: '4000-5500', label: '$4,000 - $5,500' },
          { value: '5500-7000', label: '$5,500 - $7,000' },
          { value: '7000+', label: '$7,000+' }
        ]
      },
      {
        id: 'loanTenure',
        question: 'What loan repayment tenure do you prefer?',
        type: 'choice',
        options: [
          { value: '12', label: '1 Year (Higher EMI, Lower Interest)' },
          { value: '24', label: '2 Years (Balanced Option)' },
          { value: '36', label: '3 Years (Popular Choice)' },
          { value: '48', label: '4 Years (Lower EMI)' },
          { value: '60', label: '5 Years (Lowest EMI, Higher Interest)' }
        ]
      }
    ]
  },
  credit_health: {
    title: "Credit Health Checkup",
    description: "Assess your credit profile and get improvement tips",
    questions: [
      {
        id: 'credit_score_knowledge',
        question: 'Do you know your current credit score?',
        type: 'yesno'
      },
      {
        id: 'payment_history',
        question: 'How often do you pay your bills on time?',
        type: 'choice',
        options: [
          { value: 'always', label: 'Always on time' },
          { value: 'usually', label: 'Usually on time' },
          { value: 'sometimes', label: 'Sometimes late' },
          { value: 'often', label: 'Often late' }
        ]
      },
      {
        id: 'credit_utilization',
        question: 'How much of your credit card limit do you typically use?',
        type: 'range',
        options: [
          { value: '0-30', label: 'Less than 30%' },
          { value: '30-60', label: '30% - 60%' },
          { value: '60-90', label: '60% - 90%' },
          { value: '90+', label: 'More than 90%' }
        ]
      }
    ]
  }
};

export function QuizMessage({ data, onUserAction, messageId }: QuizMessageProps) {
  const storageKey = messageId ? `${QUIZ_STATE_STORAGE_PREFIX}${messageId}` : null;
  const [isExpanded, setIsExpanded] = useState(() => {
    if (!storageKey) return true;
    const stored = readStoredQuizState(storageKey);
    return stored ? !stored.collapsed : true;
  }); // Default to expanded so user sees Q1 immediately unless user previously collapsed it
  const [hasClosedOnce, setHasClosedOnce] = useState(() => {
    if (!storageKey) return false;
    const stored = readStoredQuizState(storageKey);
    return stored?.hasClosedOnce ?? false;
  });
  const { setCurrentQuiz, currentQuiz, resetQuiz, quizState, updateQuizState } = useQuiz();
  
  // Handle quiz actions including close modal
  const handleQuizAction = (action: string, actionData?: any) => {
    if (action === 'CLOSE_QUIZ_MODAL') {
      setIsExpanded(false);
      setHasClosedOnce(true);
      return;
    }
    onUserAction?.(action, actionData);
  };

  useEffect(() => {
    if (!storageKey) return;
    writeStoredQuizState(storageKey, { collapsed: !isExpanded, hasClosedOnce });
  }, [storageKey, isExpanded, hasClosedOnce]);

  // Watch for external close requests (e.g. from voice completion flow or atomic close)
  // Watch both isClosing (new atomic pattern) and closeRequestedCounter (legacy pattern)
  // IMPORTANT: Guard with `isExpanded` to prevent infinite loop - only close if currently open
  useEffect(() => {
    const shouldClose = quizState.isClosing || (quizState.closeRequestedCounter && quizState.closeRequestedCounter > 0);
    if (shouldClose && isExpanded) {
      setIsExpanded(false);
      setHasClosedOnce(true);
    }
  }, [quizState.isClosing, quizState.closeRequestedCounter, isExpanded]);
  
  // Determine quiz data - either from preset ID or inline JSON
  const quizData = React.useMemo((): Quiz | null => {
    const quizId = data.quizId || data.quiz_id;
    
    // Try preset first
    if (quizId && PRESET_QUIZZES[quizId]) {
      return PRESET_QUIZZES[quizId];
    }
    
    // Try parsing inline JSON
    if (data.quiz_json) {
      try {
        const parsedQuiz = JSON.parse(data.quiz_json);
        return {
          title: parsedQuiz.title || 'Financial Quiz',
          description: parsedQuiz.description,
          questions: parsedQuiz.questions || [],
          isActive: true
        };
      } catch (error) {
        console.error('Failed to parse quiz JSON:', error);
        return null;
      }
    }
    
    // Fallback to inline data
    if (data.questions && Array.isArray(data.questions)) {
      return {
        title: data.title || 'Financial Quiz',
        questions: data.questions,
        isActive: true
      };
    }
    
    return null;
  }, [data.quizId, data.quiz_id, data.quiz_json, data.questions, data.title]);

  useEffect(() => {
    // Reset any stale state and start a new session when quiz data mounts
    if (quizData) {
      // Prevent resetting if this quiz is already the active one to avoid state loss on re-renders
      // This is crucial because parent renders can trigger this effect repeatedly
      const isSameQuiz = currentQuiz?.title === quizData.title && 
                         currentQuiz?.questions?.length === quizData.questions?.length;
      
      if (isSameQuiz) {
        return;
      }

      resetQuiz();
      setCurrentQuiz({ ...quizData, isActive: true });
    }
  }, [quizData, resetQuiz, setCurrentQuiz, currentQuiz]);

  if (!quizData) {
    return (
      <div className="quiz-message bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-600 font-medium">Quiz Error</div>
        <div className="text-red-500 text-sm mt-1">
          Unable to load quiz data. Please try again.
        </div>
      </div>
    );
  }

  const handleExpand = () => {
    // Reset closing state to allow reopening
    updateQuizState({ 
      isClosing: false,
      closeRequestedCounter: 0 // Reset counter to prevent immediate re-close
    });
    setIsExpanded(true);
    onUserAction?.(`Expanded quiz to full screen: ${quizData.title}`);
  };

  const shouldRenderCompactCard = hasClosedOnce && !isExpanded;

  return (
    <MorphingDialog
      open={isExpanded}
      onOpenChange={(nextOpen) => {
        setIsExpanded(nextOpen);
        if (!nextOpen) {
          setHasClosedOnce(true);
        }
      }}
    >
      {/* Compact quiz card only appears after the quiz has been closed once */}
      {shouldRenderCompactCard && (
        <SavingsCardContainer accent="quiz" className="w-full max-w-sm mx-auto" contentClassName="gap-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10 shadow-lg">
                <Brain size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">{quizData.title}</h3>
                <p className="text-xs text-white/60">
                  {quizData.questions.length} questions
                </p>
              </div>
            </div>
          </div>

          {quizData.description && (
            <p className="text-sm text-white/70">{quizData.description}</p>
          )}

          <div className="mt-2">
            <MorphingDialogTrigger>
              <Button
                onClick={handleExpand}
                variant="outline"
                className="w-full border border-white/20 bg-white/10 text-white font-medium rounded-2xl hover:bg-white/20 hover:text-white"
              >
                Resume Quiz
              </Button>
            </MorphingDialogTrigger>
          </div>
        </SavingsCardContainer>
      )}

      {/* Full-screen modal content with stable frame */}
      <MorphingDialogContainer className="items-start">
        <MorphingDialogContent className="bg-black/90 border border-white/10 rounded-[28px] backdrop-blur-xl text-white w-[min(100%,_960px)] max-w-full mt-8 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.75)]">
          {/* Fixed header + scroll body to prevent layout jumps */}
          <div className="flex flex-col max-h-[calc(100dvh-96px)]">
            <div className="px-6 pt-6 pb-3 border-b border-white/10 sticky top-0 bg-black/90 z-10">
              <h3 className="font-bold text-lg text-white">{quizData.title}</h3>
              {quizData.description && (
                <p className="text-sm text-white/60 mt-1">{quizData.description}</p>
              )}
            </div>
            <div className="px-6 pb-6 overflow-y-auto h-[600px] md:h-[720px]">
              <QuizComponent 
                quiz={quizData} 
                isFullScreen={true} 
                onUserAction={handleQuizAction}
              />
            </div>
          </div>
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}