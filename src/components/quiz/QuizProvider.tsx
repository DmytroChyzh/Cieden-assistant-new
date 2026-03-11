"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// Quiz types
interface QuizQuestion {
  id: string;
  question: string;
  type: 'yesno' | 'range' | 'choice' | 'cards';
  options?: Array<{
    value: string;
    label?: string;
    title?: string;
    points?: string[];
  }>;
  followUp?: {
    condition: string;
    question: string;
    type: string;
    options: Array<{
      value: string;
      label: string;
    }>;
  };
}

interface Quiz {
  _id?: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  conversationId?: string;
  userId?: string;
  isActive?: boolean;
  createdAt?: number;
}

interface QuizState {
  currentQuestion: number;
  answers: Record<string, string>;
  showResults: boolean;
  isProcessing: boolean;
  isClosing: boolean;  // New: prevents flicker by keeping processing screen during close
  processingStage: 'analyzing' | 'calculating' | null;
  overlay: {
    type: string;
    data: any;
  } | null;
  closeRequestedCounter?: number;
}

interface QuizContextType {
  isActive: boolean;
  currentQuiz: Quiz | null;
  quizState: QuizState;
  updateQuizState: (update: Partial<QuizState>) => void;
  setCurrentQuiz: (quiz: Quiz | null) => void;
  handleToolCall: (toolCall: string) => boolean;
  showOverlay: (cardType: string, data: any) => void;
  closeOverlay: () => void;
  resetQuiz: () => void;
  startProcessing: () => void;
  updateProcessingStage: (stage: 'analyzing' | 'calculating') => void;
  completeProcessing: () => void;
  requestCloseOverlay: () => void;
  closeQuizAtomic: () => void;  // New: atomic close to prevent flicker
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export function useQuiz() {
  const context = useContext(QuizContext);
  if (context === undefined) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
}

interface QuizProviderProps {
  children: React.ReactNode;
  conversationId?: Id<"conversations"> | null;
}

export function QuizProvider({ children, conversationId }: QuizProviderProps) {
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestion: 0,
    answers: {},
    showResults: false,
    isProcessing: false,
    isClosing: false,
    processingStage: null,
    overlay: null,
    closeRequestedCounter: 0
  });

  const updateQuizState = useCallback((update: Partial<QuizState>) => {
    setQuizState(prev => ({ ...prev, ...update }));
  }, []);

  const requestCloseOverlay = useCallback(() => {
    setQuizState(prev => ({ ...prev, closeRequestedCounter: (prev.closeRequestedCounter || 0) + 1 }));
  }, []);

  const startProcessing = useCallback(() => {
    setQuizState(prev => ({
      ...prev,
      isProcessing: true,
      processingStage: 'analyzing',
      showResults: false
    }));
  }, []);

  const updateProcessingStage = useCallback((stage: 'analyzing' | 'calculating') => {
    setQuizState(prev => ({
      ...prev,
      processingStage: stage
    }));
  }, []);

  const completeProcessing = useCallback(() => {
    setQuizState(prev => ({
      ...prev,
      isProcessing: false,
      processingStage: null
    }));
  }, []);

  // Atomic close: prevents flicker by setting isProcessing=false AND isClosing=true in single update
  // The render guard checks both flags, so UI stays on processing screen until modal closes
  const closeQuizAtomic = useCallback(() => {
    console.log('🔒 [QUIZ_NAV] Atomic close triggered');
    setQuizState(prev => ({
      ...prev,
      isProcessing: false,
      isClosing: true,
      processingStage: null,
      closeRequestedCounter: (prev.closeRequestedCounter || 0) + 1
    }));
  }, []);

  // Validate that all questions have answers before allowing processing
  // Returns true if all questions (and required follow-ups) have answers
  const allQuestionsAnswered = useCallback((answers: Record<string, string>, questions: QuizQuestion[]): boolean => {
    for (const question of questions) {
      const answer = answers[question.id];
      if (!answer) {
        console.log('⚠️ [QUIZ_NAV] Missing answer for question:', question.id);
        return false;
      }
      // Check follow-up if required
      if (question.followUp && answer === question.followUp.condition) {
        const followUpAnswer = answers[`${question.id}_followup`];
        if (!followUpAnswer) {
          console.log('⚠️ [QUIZ_NAV] Missing follow-up answer for question:', question.id);
          return false;
        }
      }
    }
    return true;
  }, []);

  // Track last processed contextual update content to avoid replays
  const lastProcessedRef = useRef<string | null>(null);

  // Timer refs for cleanup (mirrors QuizComponent pattern)
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

  // Convex mutation to create messages for tool calls
  const createMessage = useMutation(api.messages.create);

  // Generate lending options payload from collected answers (lightweight mirror of QuizComponent)
  const generateLendingOptionsFromAnswers = useCallback((answersOverride?: Record<string, string>) => {
    const answers = answersOverride || quizState.answers;
    const loanAmountRange = answers.loanAmount || '100000-300000';
    const monthlyIncomeRange = answers.monthlyIncome || '25000-40000';
    const loanTenure = parseInt(answers.loanTenure || '36');
    const employmentType = answers.employmentType || 'salaried';
    const creditScoreRange = answers.creditScore === 'yes' ? (answers as any).creditScore_followup : '650-700';

    const loanAmount = loanAmountRange.includes('+') ? 1000000 : parseInt(loanAmountRange.split('-')[1]) || 300000;
    const monthlyIncome = monthlyIncomeRange.includes('+') ? 100000 : parseInt(monthlyIncomeRange.split('-')[1]) || 40000;
    const existingEMIAmount = 0;

    let baseRate = 12;
    if (creditScoreRange.includes('750+')) baseRate = 9.5;
    else if (creditScoreRange.includes('700-750')) baseRate = 10.5;
    else if (creditScoreRange.includes('650-700')) baseRate = 11.5;
    else if (creditScoreRange.includes('600-650')) baseRate = 13;
    else if (creditScoreRange.includes('below-600')) baseRate = 15;
    if (employmentType === 'self_employed') baseRate += 1;

    const monthlyRate = baseRate / (12 * 100);
    const emi = Math.round((loanAmount * monthlyRate * Math.pow(1 + monthlyRate, loanTenure)) / (Math.pow(1 + monthlyRate, loanTenure) - 1));
    const totalInterest = (emi * loanTenure) - loanAmount;

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

    return {
      options: loanOptions,
      currency: 'USD',
      userProfile: {
        creditScore: creditScoreRange.includes('750+') ? 750 : (creditScoreRange.includes('700') ? 725 : 650),
        monthlyIncome: monthlyIncome,
        existingEMI: existingEMIAmount,
        employmentType: employmentType
      }
    };
  }, [quizState.answers]);

  // Core logic to process quiz updates - shared between Convex messages and DOM events
  const processQuizUpdate = useCallback((data: any): boolean => {
    // Map snake_case from voice tool to camelCase for UI
    const questionId = data.questionId || data.question_id;
    const selectedValue = data.selectedValue || data.selected_value;
    const action = data.action;
    
    // Deduplicate identical updates to prevent replays
    const dedupKey = JSON.stringify({ questionId, action, selectedValue });
    if (lastProcessedRef.current === dedupKey) {
      console.log('🧩 [QUIZ_NAV] Duplicate update ignored:', { questionId, action, selectedValue });
      return true;
    }
    lastProcessedRef.current = dedupKey;

    // Guard: If already processing (e.g. triggered by click), ignore further updates to prevent double-triggering
    if (quizState.isProcessing) {
      console.log('⚠️ [QUIZ_NAV] Update ignored - Quiz is already in processing state', { action });
      return true;
    }

    // Guard: If quiz is closing, skip updates to prevent re-triggering during close transition
    if (quizState.isClosing) {
      console.log('⏭️ [QUIZ_NAV] Skipped update - quiz is closing', { action });
      return true;
    }

    // Update quiz state based on agent's tool call
    if (action === 'selectOption') {
      if (questionId && selectedValue) {
        // Guard: If answer is already set to this value (e.g. via click), skip side effects
        if (quizState.answers[questionId] === selectedValue) {
          console.log('⚠️ [QUIZ_NAV] Value already selected (likely via click), skipping auto-advance/completion logic', { questionId, selectedValue });
          return true;
        }

        const prevIndex = quizState.currentQuestion;
        const prevId = currentQuiz?.questions?.[prevIndex]?.id;
        const totalQuestions = currentQuiz?.questions?.length || 0;
        console.log('🧭 [QUIZ_NAV] selectOption received', { questionId, selectedValue, prevIndex, prevId, totalQuestions });

        // Create new answers object immediately to capture this update
        const newAnswers = {
          ...quizState.answers,
          [questionId]: selectedValue
        };

        setQuizState(prev => ({
          ...prev,
          answers: newAnswers
        }));

        // Clear any pending timers to prevent double-fire
        if (answerDelayTimerRef.current) clearTimeout(answerDelayTimerRef.current);
        if (allSetTimerRef.current) clearTimeout(allSetTimerRef.current);

        // Auto-progression logic (aligned with QuizComponent 2-step flow)
        console.log('⏳ [QUIZ_NAV] Auto-advance scheduled in 1.0s');
        answerDelayTimerRef.current = setTimeout(() => {
          setQuizState(prev => {
            // Guard: Skip if already processing or closing
            if (prev.isProcessing || prev.isClosing) {
              console.log('⏭️ [QUIZ_NAV] Skipped auto-advance - already processing/closing');
              return prev;
            }

            const lastIndex = totalQuestions - 1;
            const isLast = prev.currentQuestion >= lastIndex;

            if (!isLast) {
              const nextQuestion = Math.min(prev.currentQuestion + 1, lastIndex);
              const nextId = currentQuiz?.questions?.[nextQuestion]?.id;
              console.log('➡️ [QUIZ_NAV] Auto-advanced', { fromIndex: prev.currentQuestion, toIndex: nextQuestion, nextId });
              return { ...prev, currentQuestion: nextQuestion };
            }

            // Last question answered - validate all answers before entering "All Set" state
            console.log('✅ [QUIZ_NAV] Last question answered via agent updates - validating answers');

            // Validate all questions have answers before starting processing
            if (!allQuestionsAnswered(newAnswers, currentQuiz?.questions || [])) {
              console.warn('⚠️ [QUIZ_NAV] Cannot start processing - not all questions answered');
              return prev;
            }

            console.log('✅ [QUIZ_NAV] All answers validated - entering All Set state');

            // Step 1: Move to "All Set" state (index = total count)
            // Schedule Step 2 (processing) after 1.0s dwell
            if (allSetTimerRef.current) clearTimeout(allSetTimerRef.current);
            allSetTimerRef.current = setTimeout(() => {
              console.log('🚀 [QUIZ_NAV] All Set dwell complete - starting processing flow');

              // Clear stage timers before starting new ones
              if (calculatingTimerRef.current) clearTimeout(calculatingTimerRef.current);
              if (generateOptionsTimerRef.current) clearTimeout(generateOptionsTimerRef.current);

              // Start processing flow (mirroring QuizComponent logic)
              startProcessing();

              // Stage 2: Move to calculating stage after 1.5 seconds
              calculatingTimerRef.current = setTimeout(() => {
                updateProcessingStage('calculating');
              }, 1500);

              // Stage 3: Generate loan options after 4.5 seconds total
              generateOptionsTimerRef.current = setTimeout(() => {
                if (conversationId) {
                  // Use logic mirroring QuizComponent but adapted for provider
                  const payload = generateLendingOptionsFromAnswers(newAnswers);
                  const toolCallMessage = `TOOL_CALL:showLendingOptions:${JSON.stringify(payload)}`;

                  createMessage({
                    conversationId,
                    content: toolCallMessage,
                    role: 'assistant',
                    source: 'contextual'
                  }).then(() => {
                    console.log('📤 [QUIZ_NAV] Lending options dispatched via Convex');
                    // Atomic close: prevents flicker by setting isProcessing=false AND isClosing=true in single update
                    closeQuizAtomic();
                  }).catch((e) => console.error('❌ Failed to dispatch lending options:', e));
                } else {
                  // Fallback if no conversation ID - still use atomic close
                  closeQuizAtomic();
                }
              }, 4500);
            }, 1000); // 1.0s dwell on "All Set" state

            // Return with currentQuestion = totalQuestions (sentinel for "All Set" view)
            return { ...prev, currentQuestion: totalQuestions };
          });
        }, 1000); // 1.0s delay for user to see their selection
      }
    } else if (action === 'nextQuestion') {
      const prevIndex = quizState.currentQuestion;
      setQuizState(prev => {
        const nextQuestion = Math.min(prev.currentQuestion + 1, (currentQuiz?.questions?.length || 1) - 1);
        const nextId = currentQuiz?.questions?.[nextQuestion]?.id;
        console.log('➡️ [QUIZ_NAV] nextQuestion', { fromIndex: prevIndex, toIndex: nextQuestion, nextId });
        return { 
          ...prev, 
          currentQuestion: nextQuestion
        };
      });
    } else if (action === 'prevQuestion') {
      const prevIndex = quizState.currentQuestion;
      setQuizState(prev => { 
        const toIndex = Math.max(prev.currentQuestion - 1, 0);
        const toId = currentQuiz?.questions?.[toIndex]?.id;
        console.log('⬅️ [QUIZ_NAV] prevQuestion', { fromIndex: prevIndex, toIndex, toId });
        return { ...prev, currentQuestion: toIndex };
      });
    } else if (action === 'showResults') {
      console.log('🏁 [QUIZ_NAV] showResults requested - validating answers first');

      // Validate all questions have answers before showing results
      if (!allQuestionsAnswered(quizState.answers, currentQuiz?.questions || [])) {
        console.warn('⚠️ [QUIZ_NAV] Cannot show results - not all questions answered');
        return true; // Still handled, but validation failed
      }

      console.log('✅ [QUIZ_NAV] All answers validated - triggering lending options');
      if (conversationId) {
        const payload = generateLendingOptionsFromAnswers();
        const toolCallMessage = `TOOL_CALL:showLendingOptions:${JSON.stringify(payload)}`;
        createMessage({
          conversationId,
          content: toolCallMessage,
          role: 'assistant',
          source: 'contextual'
        }).then(() => {
          console.log('📤 [QUIZ_NAV] Lending options dispatched via Convex');
          // Atomic close after dispatch
          closeQuizAtomic();
        }).catch((e) => console.error('❌ Failed to dispatch lending options:', e));
      } else {
        // No conversation - just close atomically
        closeQuizAtomic();
      }
      setQuizState(prev => ({ ...prev, showResults: false }));
    }
    
    return true; // Tool call handled
  }, [currentQuiz, quizState, conversationId, createMessage, closeQuizAtomic, startProcessing, updateProcessingStage, generateLendingOptionsFromAnswers, allQuestionsAnswered]);

  const handleToolCall = useCallback((toolCall: string): boolean => {
    if (toolCall.startsWith('TOOL_CALL:update_quiz:')) {
      try {
        const data = JSON.parse(toolCall.replace('TOOL_CALL:update_quiz:', ''));
        return processQuizUpdate(data);
      } catch (error) {
        console.error('Failed to parse quiz update tool call:', error);
        return false;
      }
    }
    return false; // Tool call not handled
  }, [processQuizUpdate]);

  // Enable instant updates via window event (bypassing Convex latency for same-tab)
  useEffect(() => {
    const handleQuizUpdateEvent = (event: CustomEvent) => {
      console.log('⚡️ [QUIZ_NAV] Received quiz-update event:', event.detail);
      processQuizUpdate(event.detail);
    };

    window.addEventListener('quiz-update', handleQuizUpdateEvent as EventListener);
    return () => {
      window.removeEventListener('quiz-update', handleQuizUpdateEvent as EventListener);
    };
  }, [processQuizUpdate]);

  const showOverlay = useCallback((cardType: string, data: any) => {
    setQuizState(prev => ({
      ...prev,
      overlay: { type: cardType, data }
    }));
  }, []);

  const closeOverlay = useCallback(() => {
    setQuizState(prev => ({
      ...prev,
      overlay: null
    }));
  }, []);

  const resetQuiz = useCallback(() => {
    // Clear all pending timers to prevent cross-quiz processing
    if (allSetTimerRef.current) clearTimeout(allSetTimerRef.current);
    if (calculatingTimerRef.current) clearTimeout(calculatingTimerRef.current);
    if (generateOptionsTimerRef.current) clearTimeout(generateOptionsTimerRef.current);
    if (answerDelayTimerRef.current) clearTimeout(answerDelayTimerRef.current);
    allSetTimerRef.current = null;
    calculatingTimerRef.current = null;
    generateOptionsTimerRef.current = null;
    answerDelayTimerRef.current = null;

    setQuizState({
      currentQuestion: 0,
      answers: {},
      showResults: false,
      isProcessing: false,
      isClosing: false,  // Reset on reopen so quiz can function again
      processingStage: null,
      overlay: null,
      closeRequestedCounter: 0
    });
    setCurrentQuiz(null);
  }, []);

  // Note: Cross-tab updates come via Convex messages; DOM events are intentionally not used here

  // Subscribe to all messages to watch for contextual quiz updates
  const allMessages = useQuery(api.messages.list, conversationId ? { conversationId } : "skip");
  
  // Process contextual messages for quiz updates
  useEffect(() => {
    if (!allMessages || !conversationId) return;
    
    // Filter for contextual messages with quiz updates
    const contextualQuizMessages = allMessages.filter(msg => 
      msg.role === 'system' && 
      msg.source === 'contextual' && 
      msg.content.startsWith('TOOL_CALL:update_quiz:')
    );
    
    // Process the most recent contextual message
    const latestMessage = contextualQuizMessages[contextualQuizMessages.length - 1];
    if (latestMessage) {
      console.log('📝 QuizProvider processing contextual message:', latestMessage.content);
      handleToolCall(latestMessage.content);
    }
  }, [allMessages, conversationId, handleToolCall]);

  const contextValue: QuizContextType = {
    isActive: !!currentQuiz?.isActive,
    currentQuiz,
    quizState,
    updateQuizState,
    setCurrentQuiz,
    handleToolCall,
    showOverlay,
    closeOverlay,
    resetQuiz,
    startProcessing,
    updateProcessingStage,
    completeProcessing,
    requestCloseOverlay,
    closeQuizAtomic
  };

  return (
    <QuizContext.Provider value={contextValue}>
      {children}
    </QuizContext.Provider>
  );
}

// Export types for use in other components
export type { Quiz, QuizQuestion, QuizState };