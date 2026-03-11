"use client";

import React, { useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { cn } from '@/lib/utils';
import { useQuiz, type Quiz } from './QuizProvider';
import { QuizQuestion } from './QuizQuestion';
import { QuizResults } from './QuizResults';
import { QuizOverlay } from './QuizOverlay';
import { QuizProcessingScreen } from './QuizProcessingScreen';

interface QuizComponentProps {
  quiz: Quiz;
  isFullScreen?: boolean;
  onUserAction?: (action: string, data?: any) => void;
}

export function QuizComponent({ 
  quiz, 
  isFullScreen = false, 
  onUserAction 
}: QuizComponentProps) {
  const {
    quizState,
    updateQuizState,
    startProcessing,
    updateProcessingStage,
    closeQuizAtomic
  } = useQuiz();

  // Timer refs for cleanup
  const allSetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const calculatingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const generateOptionsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const answerDelayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (allSetTimerRef.current) clearTimeout(allSetTimerRef.current);
      if (calculatingTimerRef.current) clearTimeout(calculatingTimerRef.current);
      if (generateOptionsTimerRef.current) clearTimeout(generateOptionsTimerRef.current);
      if (answerDelayTimerRef.current) clearTimeout(answerDelayTimerRef.current);
    };
  }, []);

  // Sentinel guards
  const total = quiz.questions.length;
  const isAllSet = quizState.currentQuestion >= total;
  const progress = total ? Math.min(100, Math.round((quizState.currentQuestion / total) * 100)) : 0;
  const currentQuestion = isAllSet ? undefined : quiz.questions[quizState.currentQuestion];

  // Generate personalized loan options based on user answers
  const generateLoanOptions = useCallback(() => {
    const answers = quizState.answers;
    
    // Parse user inputs to calculate loan parameters
    const loanAmountRange = answers.loanAmount || '1000-3000';
    const monthlyIncomeRange = answers.monthlyIncome || '2500-4000';
    const existingEMI = answers.existingEMIs === 'yes' ? answers.existingEMIs_followup : '0';
    const loanTenure = parseInt(answers.loanTenure || '36');
    const creditScoreRange = answers.creditScore === 'yes' ? answers.creditScore_followup : '650-700';
    const employmentType = answers.employmentType || 'salaried';
    
    // Calculate approximate values for loan options
    const parseRangeValue = (range: string, plusFallback: number) => {
      if (!range) return plusFallback;
      if (range.includes('+')) {
        const base = Number(range.replace('+', '').trim());
        return Number.isFinite(base) ? plusFallback : plusFallback;
      }
      const [ , upper ] = range.split('-');
      const value = Number(upper);
      return Number.isFinite(value) ? value : plusFallback;
    };

    const loanAmount = parseRangeValue(loanAmountRange, 9000);
    const monthlyIncome = parseRangeValue(monthlyIncomeRange, 8000);
    const existingEMIAmount = existingEMI === '0' ? 0 : parseRangeValue(existingEMI, 500);
    
    // Determine interest rate based on credit score and employment type
    let baseRate = 12; // Default rate
    if (creditScoreRange.includes('750+')) baseRate = 9.5;
    else if (creditScoreRange.includes('700-750')) baseRate = 10.5;
    else if (creditScoreRange.includes('650-700')) baseRate = 11.5;
    else if (creditScoreRange.includes('600-650')) baseRate = 13;
    else if (creditScoreRange.includes('below-600')) baseRate = 15;
    
    if (employmentType === 'self_employed') baseRate += 1; // Higher rate for self-employed
    
    // Calculate EMI using standard formula
    const monthlyRate = baseRate / (12 * 100);
    const emi = Math.round((loanAmount * monthlyRate * Math.pow(1 + monthlyRate, loanTenure)) / (Math.pow(1 + monthlyRate, loanTenure) - 1));
    const totalInterest = (emi * loanTenure) - loanAmount;
    
    // Create second option with different terms
    const secondTenure = loanTenure === 36 ? 48 : 36;
    const secondEmi = Math.round((loanAmount * monthlyRate * Math.pow(1 + monthlyRate, secondTenure)) / (Math.pow(1 + monthlyRate, secondTenure) - 1));
    const secondTotalInterest = (secondEmi * secondTenure) - loanAmount;
    
    const loanOptions = [
      {
        id: "recommended-option",
        title: "Recommended Plan",
        loanAmount: loanAmount,
        interestRate: baseRate,
        term: loanTenure,
        monthlyPayment: emi,
        totalInterest: totalInterest,
        features: [
          "Best rate based on your profile",
          "Flexible prepayment options", 
          "No hidden charges",
          "Quick digital processing"
        ],
        recommended: true
      },
      {
        id: "alternative-option", 
        title: "Alternative Plan",
        loanAmount: loanAmount,
        interestRate: baseRate + 0.5,
        term: secondTenure,
        monthlyPayment: secondEmi,
        totalInterest: secondTotalInterest,
        features: [
          secondTenure > loanTenure ? "Lower monthly payments" : "Pay off sooner",
          "Same day approval possible",
          "Minimal documentation",
          "Customer support included"
        ],
        recommended: false
      }
    ];
    
    const lendingPayload = {
      options: loanOptions,
      currency: 'USD',
      userProfile: { 
        creditScore: creditScoreRange.includes('750+') ? 750 : (creditScoreRange.includes('700') ? 725 : 650),
        monthlyIncome: monthlyIncome,
        existingEMI: existingEMIAmount,
        employmentType: employmentType
      }
    };
    
    // Notify agent/context listeners with computed options so they don't need to call the tool again
    onUserAction?.(`QUIZ_LENDING_OPTIONS_READY:${JSON.stringify(lendingPayload)}`);

    // Trigger lending options display immediately - don't show results screen
    onUserAction?.(`TOOL_CALL:showLendingOptions:${JSON.stringify(lendingPayload)}`);

    // Atomic close: sets isProcessing=false AND isClosing=true in single update
    // This prevents the flicker by keeping the processing screen visible until modal closes
    // QuizMessage watches isClosing and closes the modal
    setTimeout(() => {
      closeQuizAtomic();
    }, 500);
  }, [quizState.answers, closeQuizAtomic, onUserAction]);

  // Enhanced processing flow with stages - uses refs for cleanup
  const startProcessingFlow = useCallback(() => {
    // Clear any existing timers to prevent double-processing
    if (calculatingTimerRef.current) clearTimeout(calculatingTimerRef.current);
    if (generateOptionsTimerRef.current) clearTimeout(generateOptionsTimerRef.current);

    onUserAction?.('Quiz completed - starting processing flow');

    // Stage 1: Start processing immediately (analyzing stage)
    startProcessing();

    // Stage 2: Move to calculating stage after 1.5 seconds
    calculatingTimerRef.current = setTimeout(() => {
      updateProcessingStage('calculating');
      onUserAction?.('Processing stage: calculating loan options');
    }, 1500);

    // Stage 3: Generate loan options after 3.0 seconds of calculation (4.5s total for readability)
    generateOptionsTimerRef.current = setTimeout(() => {
      generateLoanOptions();
    }, 4500);
  }, [startProcessing, updateProcessingStage, generateLoanOptions, onUserAction]);

  const handleAnswerSelect = useCallback((questionId: string, value: string) => {
    // Clear any pending timers to prevent double-fire
    if (answerDelayTimerRef.current) clearTimeout(answerDelayTimerRef.current);
    if (allSetTimerRef.current) clearTimeout(allSetTimerRef.current);

    updateQuizState({
      answers: { ...quizState.answers, [questionId]: value }
    });

    // Notify agent through unified onUserAction flow
    onUserAction?.(`Selected "${value}" for question "${questionId}"`);

    // Auto-progress after answering (if no follow-up required)
    const question = quiz.questions[quizState.currentQuestion];
    const needsFollowUp = question?.followUp && value === question.followUp.condition;

    if (!needsFollowUp) {
      const isLast = quizState.currentQuestion >= quiz.questions.length - 1;

      answerDelayTimerRef.current = setTimeout(() => {
        if (!isLast) {
          updateQuizState({ currentQuestion: quizState.currentQuestion + 1 });
          onUserAction?.('Auto-progressed to next question');
        } else {
          // Last question: move to "All Set" state (index = total count)
          updateQuizState({ currentQuestion: quiz.questions.length });
          onUserAction?.('All questions answered - showing All Set');

          // After 1.0s dwell on "All Set", start processing flow
          allSetTimerRef.current = setTimeout(() => {
            startProcessingFlow();
          }, 1000);
        }
      }, 1000); // 1.0 second delay for user to see their selection
    }
  }, [quizState.answers, quizState.currentQuestion, quiz.questions, updateQuizState, startProcessingFlow, onUserAction]);

  const handleFollowUpSelect = useCallback((questionId: string, value: string) => {
    // Clear any pending timers to prevent double-fire
    if (answerDelayTimerRef.current) clearTimeout(answerDelayTimerRef.current);
    if (allSetTimerRef.current) clearTimeout(allSetTimerRef.current);

    updateQuizState({
      answers: { ...quizState.answers, [`${questionId}_followup`]: value }
    });

    // Notify agent
    onUserAction?.(`Selected "${value}" for follow-up question "${questionId}"`);

    const isLast = quizState.currentQuestion >= quiz.questions.length - 1;

    // Auto-progress after follow-up answer
    answerDelayTimerRef.current = setTimeout(() => {
      if (!isLast) {
        updateQuizState({
          currentQuestion: quizState.currentQuestion + 1
        });
        onUserAction?.('Auto-progressed to next question after follow-up');
      } else {
        // Last question: move to "All Set" state (index = total count)
        updateQuizState({ currentQuestion: quiz.questions.length });
        onUserAction?.('All questions answered - showing All Set');

        // After 1.0s dwell on "All Set", start processing flow
        allSetTimerRef.current = setTimeout(() => {
          startProcessingFlow();
        }, 1000);
      }
    }, 1000); // 1.0 second delay
  }, [quizState.answers, quizState.currentQuestion, quiz.questions, updateQuizState, startProcessingFlow, onUserAction]);

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    // Only allow previous navigation - next is handled automatically
    if (direction === 'prev' && quizState.currentQuestion > 0) {
      updateQuizState({
        currentQuestion: quizState.currentQuestion - 1
      });
      onUserAction?.('Moved to previous question');
    }
  }, [quizState.currentQuestion, updateQuizState, onUserAction]);

  // Show processing screen if processing OR closing (prevents flicker during close transition)
  if (quizState.isProcessing || quizState.isClosing) {
    return (
      <div className={cn("quiz-container", isFullScreen && "full-screen")}>
        <QuizProcessingScreen
          stage={quizState.processingStage || 'analyzing'}
          isFullScreen={isFullScreen}
        />
        {quizState.overlay && (
          <QuizOverlay
            type={quizState.overlay.type}
            data={quizState.overlay.data}
            onClose={() => updateQuizState({ overlay: null })}
          />
        )}
      </div>
    );
  }

  if (quizState.showResults) {
    return (
      <motion.div 
        className={cn("quiz-container", isFullScreen && "full-screen")}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <QuizResults 
          quiz={quiz} 
          answers={quizState.answers} 
          onUserAction={onUserAction}
          onRestart={() => {
            updateQuizState({
              currentQuestion: 0,
              answers: {},
              showResults: false
            });
            onUserAction?.('Started new application');
          }}
        />
        {quizState.overlay && (
          <QuizOverlay
            type={quizState.overlay.type}
            data={quizState.overlay.data}
            onClose={() => updateQuizState({ overlay: null })}
          />
        )}
      </motion.div>
    );
  }

  // Use sentinel-guarded currentQuestion from above
  const selectedAnswer = currentQuestion ? quizState.answers[currentQuestion.id] : undefined;
  const followUpCondition = currentQuestion?.followUp?.condition;
  const needsFollowUp = !!(followUpCondition && selectedAnswer === followUpCondition);
  const followUpAnswer = currentQuestion ? quizState.answers[`${currentQuestion.id}_followup`] : undefined;

  return (
    <motion.div 
      className={cn("quiz-container relative", isFullScreen && "full-screen")}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* Progress indicator - moved here to persist across question changes */}
      <div className="mb-6 text-white">
        <div className="flex justify-between text-sm text-white/60 mb-2">
          <span>
            {isAllSet
              ? "All questions answered"
              : `Question ${quizState.currentQuestion + 1} of ${total}`
            }
          </span>
          <span>{progress}% complete</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden" aria-hidden="true">
          <motion.div
            className="h-2 rounded-full bg-gradient-to-r from-indigo-400 via-purple-300 to-sky-300"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label="Quiz progress"
          />
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {/* "All Set" completion view */}
        {isAllSet && !quizState.isProcessing && (
          <motion.div
            key="all-set"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4, type: "spring", stiffness: 200 }}
            >
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="text-2xl font-bold text-white mb-2"
            >
              All Set!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="text-white/80"
            >
              We have everything we need.
            </motion.p>
          </motion.div>
        )}

        {/* Question card */}
        {currentQuestion && (
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <QuizQuestion
              question={currentQuestion}
              selectedAnswer={selectedAnswer}
              followUpAnswer={followUpAnswer}
              needsFollowUp={needsFollowUp}
              onAnswerSelect={handleAnswerSelect}
              onFollowUpSelect={handleFollowUpSelect}
              onNavigate={handleNavigate}
              onUserAction={onUserAction}
              canNavigateNext={!!selectedAnswer && (!needsFollowUp || !!followUpAnswer)}
              canNavigatePrev={quizState.currentQuestion > 0}
              isLastQuestion={quizState.currentQuestion === quiz.questions.length - 1}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Overlay system */}
      {quizState.overlay && (
        <QuizOverlay
          type={quizState.overlay.type}
          data={quizState.overlay.data}
          onClose={() => updateQuizState({ overlay: null })}
        />
      )}
    </motion.div>
  );
}