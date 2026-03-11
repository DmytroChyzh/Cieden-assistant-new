'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Printer, ChevronDown, ChevronUp, Shield, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LendingTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  option: {
    id: string;
    title: string;
    loanAmount: number;
    interestRate: number;
    term: number;
    monthlyPayment: number;
    totalInterest: number;
    processingFee?: number;
    flexiFee?: number;
    maintenanceFee?: number;
    emiStructure?: {
      initialPeriod: {
        months: number;
        amount: number;
      };
      laterPeriod: {
        months: number;
        amount: number;
      };
    };
  };
  currency?: string;
  onApply?: () => void;
}

export function LendingTermsModal({ 
  isOpen, 
  onClose, 
  option, 
  currency = "USD",
  onApply 
}: LendingTermsModalProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));
  const [agreed, setAgreed] = useState(false);

  const formatCurrency = (amount: number) => {
    const resolvedCurrency = currency || "USD";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: resolvedCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // In production, this would generate a PDF
    console.log('Downloading loan agreement PDF...');
  };

  // Calculate repayment schedule
  const generateRepaymentSchedule = () => {
    const schedule = [];
    let remainingBalance = option.loanAmount;
    const monthlyInterestRate = option.interestRate / 100 / 12;

    for (let month = 1; month <= option.term; month++) {
      const interestPayment = remainingBalance * monthlyInterestRate;
      const principalPayment = option.monthlyPayment - interestPayment;
      remainingBalance -= principalPayment;

      schedule.push({
        month,
        emi: option.emiStructure 
          ? (month <= option.emiStructure.initialPeriod.months 
              ? option.emiStructure.initialPeriod.amount 
              : option.emiStructure.laterPeriod.amount)
          : option.monthlyPayment,
        principal: Math.round(principalPayment),
        interest: Math.round(interestPayment),
        balance: Math.max(0, Math.round(remainingBalance))
      });
    }
    return schedule;
  };

  const repaymentSchedule = generateRepaymentSchedule();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-[5%] bg-white rounded-2xl z-50 flex flex-col max-w-4xl mx-auto overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Loan Agreement Terms</h2>
                  <p className="text-white/80">{option.title} - Full Terms & Conditions</p>
                </div>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="icon"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Loan Summary Section */}
              <div className="mb-6">
                <button
                  onClick={() => toggleSection('summary')}
                  className="w-full flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <h3 className="text-lg font-semibold">Loan Summary</h3>
                  {expandedSections.has('summary') ? <ChevronUp /> : <ChevronDown />}
                </button>
                
                {expandedSections.has('summary') && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-sm text-gray-600">Loan Amount</div>
                        <div className="text-xl font-bold text-blue-700">
                          {formatCurrency(option.loanAmount)}
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="text-sm text-gray-600">Interest Rate</div>
                        <div className="text-xl font-bold text-green-700">
                          {option.interestRate}% p.a.
                        </div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="text-sm text-gray-600">Loan Tenure</div>
                        <div className="text-xl font-bold text-purple-700">
                          {option.term} months
                        </div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3">
                        <div className="text-sm text-gray-600">Monthly EMI</div>
                        <div className="text-xl font-bold text-orange-700">
                          {formatCurrency(option.monthlyPayment)}
                        </div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3">
                        <div className="text-sm text-gray-600">Total Interest</div>
                        <div className="text-xl font-bold text-red-700">
                          {formatCurrency(option.totalInterest)}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm text-gray-600">Total Amount</div>
                        <div className="text-xl font-bold text-gray-700">
                          {formatCurrency(option.loanAmount + option.totalInterest)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Repayment Schedule */}
              <div className="mb-6">
                <button
                  onClick={() => toggleSection('schedule')}
                  className="w-full flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <h3 className="text-lg font-semibold">Repayment Schedule</h3>
                  {expandedSections.has('schedule') ? <ChevronUp /> : <ChevronDown />}
                </button>
                
                {expandedSections.has('schedule') && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Month</th>
                            <th className="text-right py-2">EMI</th>
                            <th className="text-right py-2">Principal</th>
                            <th className="text-right py-2">Interest</th>
                            <th className="text-right py-2">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {repaymentSchedule.slice(0, 6).map((row) => (
                            <tr key={row.month} className="border-b">
                              <td className="py-2">{row.month}</td>
                              <td className="text-right">{formatCurrency(row.emi)}</td>
                              <td className="text-right">{formatCurrency(row.principal)}</td>
                              <td className="text-right">{formatCurrency(row.interest)}</td>
                              <td className="text-right">{formatCurrency(row.balance)}</td>
                            </tr>
                          ))}
                          {option.term > 6 && (
                            <tr className="text-gray-500">
                              <td colSpan={5} className="text-center py-2">
                                ... {option.term - 6} more months ...
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Fees & Charges */}
              <div className="mb-6">
                <button
                  onClick={() => toggleSection('fees')}
                  className="w-full flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <h3 className="text-lg font-semibold">Fees & Charges</h3>
                  {expandedSections.has('fees') ? <ChevronUp /> : <ChevronDown />}
                </button>
                
                {expandedSections.has('fees') && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-3">
                      {option.processingFee && (
                        <div className="flex justify-between py-2 border-b">
                          <span>Processing Fee</span>
                          <span className="font-semibold">{formatCurrency(option.processingFee)}</span>
                        </div>
                      )}
                      {option.flexiFee && (
                        <div className="flex justify-between py-2 border-b">
                          <span>Flexi Facility Fee</span>
                          <span className="font-semibold text-orange-600">{formatCurrency(option.flexiFee)}</span>
                        </div>
                      )}
                      {option.maintenanceFee && (
                        <div className="flex justify-between py-2 border-b">
                          <span>Annual Maintenance Fee</span>
                          <span className="font-semibold">{formatCurrency(option.maintenanceFee)}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-2 border-b">
                        <span>Prepayment Charges</span>
                        <span className="font-semibold text-green-600">NIL</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span>Late Payment Fee</span>
                        <span className="font-semibold">2% per month</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span>Bounce Charges</span>
                        <span className="font-semibold">{formatCurrency(500)}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Terms & Conditions */}
              <div className="mb-6">
                <button
                  onClick={() => toggleSection('terms')}
                  className="w-full flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <h3 className="text-lg font-semibold">Terms & Conditions</h3>
                  {expandedSections.has('terms') ? <ChevronUp /> : <ChevronDown />}
                </button>
                
                {expandedSections.has('terms') && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-4 text-sm text-gray-600">
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">1. Eligibility</h4>
                        <p>Applicant must be between 21-65 years of age with a minimum monthly income as per product requirements.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">2. Documentation</h4>
                        <p>Valid ID proof, address proof, income proof, and bank statements for the last 6 months are required.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">3. Disbursement</h4>
                        <p>Loan amount will be disbursed within 24-48 hours of approval directly to your bank account.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">4. Repayment</h4>
                        <p>EMIs will be auto-debited from your registered bank account on the scheduled date each month.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">5. Prepayment</h4>
                        <p>You can prepay the loan anytime without any additional charges after 3 EMIs.</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Important Disclosures */}
              <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Important Disclosures</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Interest calculated on reducing balance method</li>
                      <li>• GST applicable on all fees and charges</li>
                      <li>• Credit score impact for late/missed payments</li>
                      <li>• Subject to RBI guidelines and regulations</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Agreement Checkbox */}
              <div className="mb-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm text-gray-700">
                    I have read and understood all the terms and conditions, fees & charges, 
                    and agree to abide by them. I authorize the lender to debit EMIs from my 
                    registered bank account.
                  </span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t p-6 bg-gray-50">
              <div className="flex flex-col md:flex-row gap-3 justify-between">
                <div className="flex gap-3">
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={onClose}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={onApply}
                    disabled={!agreed}
                    className={cn(
                      "px-6",
                      agreed 
                        ? "bg-blue-600 hover:bg-blue-700" 
                        : "bg-gray-300 cursor-not-allowed"
                    )}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Accept & Apply
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}