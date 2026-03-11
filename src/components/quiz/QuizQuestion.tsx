"use client";

import React from 'react';
import { motion } from "framer-motion";
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import type { QuizQuestion as QuizQuestionType } from './QuizProvider';

interface QuizQuestionProps {
  question: QuizQuestionType;
  selectedAnswer?: string;
  followUpAnswer?: string;
  needsFollowUp: boolean;
  onAnswerSelect: (questionId: string, value: string) => void;
  onFollowUpSelect: (questionId: string, value: string) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onUserAction?: (text: string) => void;
  canNavigateNext: boolean;
  canNavigatePrev: boolean;
  isLastQuestion: boolean;
}

export function QuizQuestion({
  question,
  selectedAnswer,
  followUpAnswer,
  needsFollowUp,
  onAnswerSelect,
  onFollowUpSelect,
  onNavigate,
  onUserAction,
  canNavigateNext,
  canNavigatePrev,
  isLastQuestion
}: QuizQuestionProps) {
  
  const handleOptionClick = (value: string) => {
    onAnswerSelect(question.id, value);
    onUserAction?.(`Selected "${value}" for question "${question.question}"`);
  };

  const handleFollowUpClick = (value: string) => {
    onFollowUpSelect(question.id, value);
    onUserAction?.(`Selected "${value}" for follow-up question`);
  };

  // Animation variants for selection pulse
  const selectionAnimation = {
    scale: [1, 1.05, 1],
    transition: { duration: 0.3, ease: "easeInOut" }
  };

  return (
    <div className="quiz-question space-y-6 text-white">
      {/* Question title */}
      <h3 className="text-xl font-semibold text-white mb-6">
        {question.question}
      </h3>
      
      {/* Yes/No Questions */}
      {question.type === 'yesno' && (
        <div className="space-y-3">
          {['yes', 'no'].map(option => (
            <motion.button
              key={option}
              onClick={() => handleOptionClick(option)}
              className={cn(
                "block w-full p-4 text-left border rounded-2xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0",
                selectedAnswer === option 
                  ? "border-indigo-400/50 bg-indigo-400/10 text-white shadow-[0_0_0_1px_rgba(99,102,241,0.35)]" 
                  : "border-white/10 hover:border-white/20 hover:bg-white/10"
              )}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              animate={selectedAnswer === option ? selectionAnimation : {}}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </span>
                {selectedAnswer === option && (
                  <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Range/Choice Questions */}
      {(question.type === 'range' || question.type === 'choice') && question.options && (
        <div className="space-y-3">
          {question.options.map(option => (
            <motion.button
              key={option.value}
              onClick={() => handleOptionClick(option.value)}
              className={cn(
                "block w-full p-4 text-left border rounded-2xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0",
                selectedAnswer === option.value 
                  ? "border-indigo-400/50 bg-indigo-400/10 text-white shadow-[0_0_0_1px_rgba(99,102,241,0.35)]" 
                  : "border-white/10 hover:border-white/20 hover:bg-white/10"
              )}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              animate={selectedAnswer === option.value ? selectionAnimation : {}}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {option.label || option.value}
                </span>
                {selectedAnswer === option.value && (
                  <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Card Selection Questions */}
      {question.type === 'cards' && question.options && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {question.options.map(option => (
            <motion.div
              key={option.value}
              onClick={() => handleOptionClick(option.value)}
              className={cn(
                "p-5 border-2 rounded-2xl cursor-pointer transition-all",
                selectedAnswer === option.value 
                  ? "border-indigo-400/50 bg-indigo-400/10" 
                  : "border-white/10 hover:border-white/20 hover:bg-white/10"
              )}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOptionClick(option.value);
                }
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              animate={selectedAnswer === option.value ? selectionAnimation : {}}
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className={cn(
                  "font-bold text-lg",
                  selectedAnswer === option.value ? 'text-white' : 'text-white/90'
                )}>
                  {option.title || option.label}
                </h4>
                {selectedAnswer === option.value && (
                  <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </div>
              {option.points && (
                <ul className="space-y-2">
                  {option.points.map((point, index) => (
                    <li key={index} className={cn(
                      "text-sm flex items-start",
                      selectedAnswer === option.value ? 'text-white/90' : 'text-white/70'
                    )}>
                      <span className="mr-2 mt-1">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Follow-up question */}
      {needsFollowUp && question.followUp && (
        <div className="mt-8 p-4 bg-amber-400/10 border border-amber-300/20 rounded-2xl">
          <h4 className="font-semibold text-amber-200 mb-4">
            {question.followUp.question}
          </h4>
          <div className="space-y-2">
            {question.followUp.options.map(option => (
              <motion.button
                key={option.value}
                onClick={() => handleFollowUpClick(option.value)}
                className={cn(
                  "block w-full p-3 text-left border rounded-2xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0",
                  followUpAnswer === option.value 
                    ? "border-amber-400/50 bg-amber-400/10 text-amber-100" 
                    : "border-white/10 hover:border-white/20 hover:bg-white/10"
                )}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                animate={followUpAnswer === option.value ? selectionAnimation : {}}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{option.label}</span>
                  {followUpAnswer === option.value && (
                    <div className="w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation buttons - only Previous (auto-progression handles Next) */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
        <Button
          onClick={() => onNavigate('prev')}
          disabled={!canNavigatePrev}
          variant="outline"
          className="flex items-center gap-2 border-white/20 bg-white/10 text-white rounded-2xl hover:bg-white/20"
        >
          <ChevronLeft size={16} />
          Previous
        </Button>
        
        <div className="text-sm text-white/60">
          {selectedAnswer && (
            <span className="text-emerald-300 flex items-center gap-1">
              <CheckCircle2 size={16} />
              Answer recorded - moving to next question...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}