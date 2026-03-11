"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, RotateCcw } from 'lucide-react';
import type { Quiz } from './QuizProvider';

interface QuizResultsProps {
  quiz: Quiz;
  answers: Record<string, string>;
  onUserAction?: (text: string) => void;
  onRestart: () => void;
}

export function QuizResults({ 
  quiz, 
  answers, 
  onUserAction, 
  onRestart 
}: QuizResultsProps) {
  const formatCurrencyRange = (value: string | undefined) => {
    if (!value) return 'Not specified';
    if (value === 'None') return 'None';
    const normalized = value.replace(/\s/g, '');
    if (normalized.includes('-')) {
      const [minStr, maxStr] = normalized.split('-');
      const min = Number(minStr);
      const max = Number(maxStr);
      if (Number.isFinite(min) && Number.isFinite(max)) {
        return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
      }
    }
    if (normalized.includes('+')) {
      const base = Number(normalized.replace('+', ''));
      if (Number.isFinite(base)) {
        return `$${base.toLocaleString()}+`;
      }
    }
    const numericValue = Number(normalized);
    if (Number.isFinite(numericValue)) {
      return `$${numericValue.toLocaleString()}`;
    }
    return value;
  };
  
  // Generate loan application summary based on answers
  const generateApplicationSummary = () => {
    const loanAmount = answers.loanAmount || 'Not specified';
    const loanPurpose = answers.loanPurpose || 'Not specified';
    const employmentType = answers.employmentType || 'Not specified';
    const monthlyIncome = answers.monthlyIncome || 'Not specified';
    const loanTenure = answers.loanTenure || 'Not specified';
    const creditScore = answers.creditScore === 'yes' ? answers.creditScore_followup : 'Not available';
    const existingEMI = answers.existingEMIs === 'yes' ? answers.existingEMIs_followup : 'None';
    
    return {
      title: "Loan Application Summary",
      summary: "Your personalized loan offers are being displayed below based on your application details.",
      applicationDetails: [
        { label: "Loan Amount", value: formatCurrencyRange(loanAmount) },
        { label: "Purpose", value: loanPurpose.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) },
        { label: "Employment", value: employmentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) },
        { label: "Monthly Income", value: formatCurrencyRange(monthlyIncome) },
        { label: "Preferred Tenure", value: loanTenure + ' months' },
        { label: "Credit Score", value: creditScore.replace('-', ' - ').replace('+', '+') },
        { label: "Existing EMIs", value: existingEMI === 'None' ? 'None' : formatCurrencyRange(existingEMI) }
      ],
      nextSteps: [
        "Review the personalized loan offers shown below",
        "Compare interest rates, EMIs, and features", 
        "Click 'Learn More' on your preferred option",
        "Complete the formal application process"
      ]
    };
  };

  const applicationSummary = generateApplicationSummary();

  const handleRestart = () => {
    onRestart();
    onUserAction?.(`Started new application: ${quiz.title}`);
  };

  return (
    <div className="quiz-results max-w-4xl mx-auto text-white">
      {/* Header */}
      <div className="text-center mb-8">
        <CheckCircle className="mx-auto text-emerald-400 mb-4" size={64} />
        <h1 className="text-3xl font-bold text-white mb-2">
          Application Complete!
        </h1>
        <p className="text-white/70 max-w-2xl mx-auto">
          {applicationSummary.summary}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Application Details */}
        <div className="rounded-[24px] p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.65)] border border-white/10 bg-white/5 backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-white mb-4">
            📋 {applicationSummary.title}
          </h2>
          
          <div className="space-y-3">
            {applicationSummary.applicationDetails.map((detail, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="font-medium text-white/70">{detail.label}:</span>
                <span className="text-white font-semibold">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        <div className="rounded-[24px] p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.65)] border border-white/10 bg-white/5 backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-white mb-4">
            ✅ Next Steps
          </h2>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-white mb-3">Action Items:</h3>
            <ul className="space-y-3">
              {applicationSummary.nextSteps.map((step, index) => (
                <li key={index} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-emerald-400/20 text-emerald-200 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {index + 1}
                  </div>
                  <span className="text-white/80">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Your Responses Summary */}
      <div className="mt-8 rounded-[24px] p-6 border border-white/10 bg-white/5 backdrop-blur-xl">
        <h3 className="text-xl font-semibold text-white mb-4">
          📝 Your Responses Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quiz.questions.map((question, index) => {
            const answer = answers[question.id];
            const followUpAnswer = answers[`${question.id}_followup`];
            
            return (
              <div key={question.id} className="p-4 rounded-2xl border border-white/10 bg-white/5">
                <h4 className="font-medium text-white mb-2">
                  Q{index + 1}: {question.question}
                </h4>
                <p className="text-indigo-300 font-medium">
                  {answer || 'No answer provided'}
                </p>
                {followUpAnswer && (
                  <p className="text-sm text-white/70 mt-1">
                    Follow-up: {followUpAnswer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 text-center space-y-4">
        <Button 
          onClick={handleRestart}
          variant="outline"
          className="flex items-center gap-2 border-white/20 bg-white/10 text-white rounded-2xl hover:bg-white/20"
        >
          <RotateCcw size={16} />
          New Application
        </Button>
        
        <p className="text-sm text-white/60">
          Want to explore more financial tools? Ask me about your balance, savings goals, or other loan options!
        </p>
      </div>
    </div>
  );
}