"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { bridgeElevenLabsToolToCopilot, ActionHandlers } from "@/src/utils/toolBridge";
import { useVoiceRecording } from "@/src/components/unified/hooks/useVoiceRecording";
import { 
  DollarSign,
  Target, 
  FileText,
  CreditCard,
  Building2,
  TrendingUp,
  Calculator,
  Play, 
  Settings, 
  Terminal, 
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  FileJson,
  Trash2,
  Zap,
  Brain,
  FileQuestion,
  MessageSquare
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ToolTest {
  id: string;
  name: string;
  category: string;
  description: string;
  status: "idle" | "running" | "success" | "error";
  lastRun?: string;
  executionTime?: number;
}

export default function ToolTestingPage() {
  const { isAuthenticated } = useConvexAuth();
  // Convex integration
  const [conversationId, setConversationId] = useState<Id<"conversations"> | null>(null);
  const conversations = useQuery(api.conversations.list);
  const createConversation = useMutation(api.conversations.create);
  const createMessage = useMutation(api.messages.create);
  const seedSampleDocuments = useMutation(api.seedDocuments.seedSampleDocuments);

  // UI state
  const [selectedTool, setSelectedTool] = useState<string>("");
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedMode, setSelectedMode] = useState<'' | 'update' | 'overlay'>('');

  // Tool parameters (same as original test-tools page)
  const [balance, setBalance] = useState(4200);
  const [currency, setCurrency] = useState("USD");
  const [previousBalance, setPreviousBalance] = useState<number | undefined>(3900);
  const [currentSavings, setCurrentSavings] = useState(7800);
  const [goalAmount, setGoalAmount] = useState(12000);
  const [goalName, setGoalName] = useState("Emergency Fund");
  const [deadline, setDeadline] = useState("Jun 2025");
  const [monthlyTarget, setMonthlyTarget] = useState(400);
  const [totalLoans, setTotalLoans] = useState(5200);
  const [paidAmount, setPaidAmount] = useState(3100);
  const [lendingAmount, setLendingAmount] = useState(2500);
  const [userCreditScore, setUserCreditScore] = useState(720);
  const [userMonthlyIncome, setUserMonthlyIncome] = useState(4800);
  
  // Credit Score Parameters
  const [creditScoreRange, setCreditScoreRange] = useState<'Poor' | 'Fair' | 'Good' | 'Very Good' | 'Excellent'>('Very Good');
  const [creditProvider, setCreditProvider] = useState('Experian');
  const [lastUpdatedDate, setLastUpdatedDate] = useState('January 15, 2025');
  
  // EMI Parameters  
  const [emiLoanAmount, setEmiLoanAmount] = useState(2500);
  const [emiInterestRate, setEmiInterestRate] = useState(8.9);
  const [emiTermMonths, setEmiTermMonths] = useState(10);
  const [emiValue, setEmiValue] = useState(250);
  const [emiLoanType, setEmiLoanType] = useState('Personal Loan');
  
  // Quiz Parameters
  const [quizId, setQuizId] = useState('loan_eligibility');
  const [customQuizJson, setCustomQuizJson] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [contextualMessage, setContextualMessage] = useState('');

  // Wrap addResult in useCallback to keep stable reference across renders
  const addResult = useCallback((result: string) => {
    setTestResults(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${result}`,
    ]);
  }, []);

  // Removed URL adoption; conversation targeting is controlled via UI selector or auto-init

  // Real tool definitions based on actual working tools
  const tools: ToolTest[] = [
    {
      id: "show_balance",
      name: "Show Balance",
      category: "Financial",
      description: "Display user account balance with currency formatting",
      status: "idle"
    },
    {
      id: "show_savings_goal",
      name: "Show Savings Goal",
      category: "Financial",
      description: "Display savings goal progress and targets",
      status: "idle"
    },
    {
      id: "show_document_id",
      name: "Show Document ID",
      category: "Documents",
      description: "Display identification documents",
      status: "idle"
    },
    {
      id: "show_loans",
      name: "Show Loans",
      category: "Financial",
      description: "Display loan information and payment history",
      status: "idle"
    },
    {
      id: "show_lending_options",
      name: "Show Lending Options",
      category: "Financial",
      description: "Display available lending products and options",
      status: "idle"
    },
    {
      id: "show_credit_score",
      name: "Show Credit Score",
      category: "Financial",
      description: "Display credit score with gauge visualization and improvement tips",
      status: "idle"
    },
    {
      id: "show_emi_info",
      name: "Show EMI Info",
      category: "Financial", 
      description: "Display EMI calculation breakdown with educational content",
      status: "idle"
    },
    {
      id: "start_quiz",
      name: "Start Quiz",
      category: "Interactive",
      description: "Launch an interactive quiz with voice commands and UI",
      status: "idle"
    },
    {
      id: "update_quiz",
      name: "Update Quiz",
      category: "Interactive",
      description: "Update quiz progress with question navigation and answers",
      status: "idle"
    },
    {
      id: "contextual_update",
      name: "Send Context Update",
      category: "System",
      description: "Send contextual information to agent without triggering response",
      status: "idle"
    }
  ];

  const categories = ["all", "Financial", "Documents", "Interactive", "System"];

  const filteredTools = selectedCategory === "all" 
    ? tools 
    : tools.filter(tool => tool.category === selectedCategory);

  // Memoize actionHandlers to avoid creating a new object every render which could
  // cause downstream effects (e.g., endless state updates in child hooks).
  const actionHandlers: ActionHandlers = useMemo(() => ({
    show_balance: async (params) => {
      addResult('🔧 Bridge Handler - show_balance called: ' + JSON.stringify(params));
      
      if (conversationId) {
        try {
          const toolCallMessage = `TOOL_CALL:showAccountBalance:${JSON.stringify({
            balance: params.balance,
            currency: params.currency || 'USD',
            previousBalance: params.previousBalance
          })}`;
          
          await createMessage({
            conversationId,
            content: toolCallMessage,
            role: 'assistant',
            source: 'voice'
          });
          
          addResult('✅ Balance card message saved to Convex');
        } catch (error) {
          addResult('❌ Failed to save balance message: ' + error);
        }
      }
      
      const formattedBalance = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: params.currency || 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(params.balance);
      
      return `I'm displaying your current balance of ${formattedBalance} on screen now.`;
    },
    
    show_savings_goal: async (params) => {
      addResult('🎯 Bridge Handler - show_savings_goal called: ' + JSON.stringify(params));
      
      if (conversationId) {
        try {
          const toolCallMessage = `TOOL_CALL:showSavingsGoal:${JSON.stringify({
            currentSavings: params.currentSavings,
            goalAmount: params.goalAmount,
            goalName: params.goalName || "Financial Goal",
            currency: params.currency || 'USD',
            deadline: params.deadline,
            monthlyTarget: params.monthlyTarget
          })}`;
          
          await createMessage({
            conversationId,
            content: toolCallMessage,
            role: 'assistant',
            source: 'voice'
          });
          
          addResult('✅ Savings goal card message saved to Convex');
        } catch (error) {
          addResult('❌ Failed to save savings goal message: ' + error);
        }
      }
      
      const progress = Math.min((params.currentSavings / params.goalAmount) * 100, 100);
      return `Great progress! You're ${progress.toFixed(0)}% towards your goal. I'm showing your savings progress on screen now.`;
    },

    show_document_id: async (params) => {
      addResult('🆔 Bridge Handler - show_document_id called: ' + JSON.stringify(params));
      
      if (conversationId) {
        try {
          const toolCallMessage = `TOOL_CALL:showDocumentId:${JSON.stringify({
            userId: 'demo-user',
            documentId: params.documentId
          })}`;
          
          await createMessage({
            conversationId,
            content: toolCallMessage,
            role: 'assistant',
            source: 'voice'
          });
          
          addResult('✅ Document ID card message saved to Convex');
        } catch (error) {
          addResult('❌ Failed to save document ID message: ' + error);
        }
      }
      
      return params.documentId 
        ? `I'm displaying the document with ID ${params.documentId} on screen now.`
        : `I'm showing your identification document on screen now.`;
    },

    show_loans: async (params) => {
      addResult('💳 Bridge Handler - show_loans called: ' + JSON.stringify(params));
      
      if (conversationId) {
        try {
          const toolCallMessage = `TOOL_CALL:showLoans:${JSON.stringify({
            totalLoans: params.totalLoans,
            paidAmount: params.paidAmount,
            currency: params.currency || 'USD',
            monthlyData: params.monthlyData || [
              { month: "Jan", amount: 980, isPaid: true },
              { month: "Feb", amount: 1200, isPaid: true },
              { month: "Mar", amount: 1450, isPaid: true },
              { month: "Apr", amount: 890, isPaid: true },
              { month: "May", amount: 1100, isPaid: false },
              { month: "Jun", amount: 950, isPaid: false }
            ]
          })}`;
          
          await createMessage({
            conversationId,
            content: toolCallMessage,
            role: 'assistant',
            source: 'voice'
          });
          
          addResult('✅ Loans card message saved to Convex');
        } catch (error) {
          addResult('❌ Failed to save loans message: ' + error);
        }
      }
      
      const paidPercentage = (params.paidAmount / params.totalLoans) * 100;
      const formattedPaid = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: params.currency || 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(params.paidAmount);
      
      const formattedTotal = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: params.currency || 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(params.totalLoans);
      
      return `Here's your loan overview: You've paid ${formattedPaid} out of ${formattedTotal} total - that's ${paidPercentage.toFixed(0)}% complete. I'm showing your detailed loan payment progress on screen.`;
    },

    show_lending_options: async (params) => {
      addResult('💰 Bridge Handler - show_lending_options called: ' + JSON.stringify(params));
      
      if (conversationId) {
        try {
          const toolCallMessage = `TOOL_CALL:showLendingOptions:${JSON.stringify({
            options: params.options,
            currency: params.currency || 'USD',
            userProfile: params.userProfile
          })}`;
          
          await createMessage({
            conversationId,
            content: toolCallMessage,
            role: 'assistant',
            source: 'voice'
          });
          
          addResult('✅ Lending options message saved to Convex');
        } catch (error) {
          addResult('❌ Failed to save lending options message: ' + error);
        }
      }
      
      const optionCount = params.options?.length || 2;
      return `I'm displaying ${optionCount} lending options for you on the screen. Each option shows the loan amount, interest rate, monthly payment, and key features. You can click "Learn More" on any option to get additional details.`;
    },

    show_credit_score: async (params) => {
      addResult('📊 Bridge Handler - show_credit_score called: ' + JSON.stringify(params));
      
      if (conversationId) {
        try {
          const toolCallMessage = `TOOL_CALL:showCreditScore:${JSON.stringify({
            score: params.score,
            range: params.range,
            factors: params.factors,
            lastUpdated: params.lastUpdated,
            provider: params.provider || 'Credit Bureau',
            tips: params.tips
          })}`;
          
          await createMessage({
            conversationId,
            content: toolCallMessage,
            role: 'assistant',
            source: 'voice'
          });
          
          addResult('✅ Credit score message saved to Convex');
        } catch (error) {
          addResult('❌ Failed to save credit score message: ' + error);
        }
      }
      
      const range = params.range || (params.score <= 579 ? 'Poor' : params.score <= 669 ? 'Fair' : params.score <= 739 ? 'Good' : params.score <= 799 ? 'Very Good' : 'Excellent');
      return `I'm displaying your credit score of ${params.score} (${range}) on the screen. This gives you a comprehensive view of your credit health with tips for improvement.`;
    },

    show_emi_info: async (params) => {
      addResult('🧮 Bridge Handler - show_emi_info called: ' + JSON.stringify(params));
      
      if (conversationId) {
        try {
          const toolCallMessage = `TOOL_CALL:showEMIInfo:${JSON.stringify({
            loanAmount: params.loanAmount,
            interestRate: params.interestRate,
            termMonths: params.termMonths,
            emi: params.emi,
            currency: params.currency || 'USD',
            principal: params.principal,
            interest: params.interest,
            totalAmount: params.totalAmount,
            loanType: params.loanType || 'Personal Loan'
          })}`;
          
          await createMessage({
            conversationId,
            content: toolCallMessage,
            role: 'assistant',
            source: 'voice'
          });
          
          addResult('✅ EMI info message saved to Convex');
        } catch (error) {
          addResult('❌ Failed to save EMI info message: ' + error);
        }
      }
      
      const formattedEMI = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: params.currency || 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(params.emi);
      
      const termYears = Math.floor(params.termMonths / 12);
      const termDisplay = termYears > 0 ? `${termYears} years` : `${params.termMonths} months`;
      
      return `I'm showing your EMI calculation on screen: ${formattedEMI} per month for ${termDisplay}. The breakdown shows how your payment is split between principal and interest, plus helpful tips for managing your loan.`;
    },

    start_quiz: async (params) => {
      addResult('🧠 Bridge Handler - start_quiz called: ' + JSON.stringify(params));
      
      if (conversationId) {
        try {
          // Support both quizId (from tool config) and quiz_id (from type definitions)
          const quizId = params.quiz_id || params.quizId;
          
          const toolCallMessage = `TOOL_CALL:startQuiz:${JSON.stringify({
            quiz_id: quizId,
            quiz_json: params.quiz_json
          })}`;
          
          await createMessage({
            conversationId,
            content: toolCallMessage,
            role: 'assistant',
            source: 'voice'
          });
          
          addResult('✅ Start quiz message saved to Convex');
        } catch (error) {
          addResult('❌ Failed to save start quiz message: ' + error);
        }
      }
      
      const quizName = params.quiz_id || params.quizId || 'custom quiz';
      return `I'm starting the ${quizName} quiz for you. You can navigate using voice commands or by clicking the buttons on screen.`;
    },

    update_quiz: async (params) => {
      addResult('📝 Bridge Handler - update_quiz called: ' + JSON.stringify(params));
      
      // Normalize incoming parameters from different callers
      const anyParams = params as any;
      const normalizedAction: 'selectOption' | 'nextQuestion' | 'prevQuestion' | 'showResults' =
        (anyParams.action === 'answer' ? 'selectOption' : anyParams.action) as 'selectOption' | 'nextQuestion' | 'prevQuestion' | 'showResults';
      const normalizedQuestionId = (anyParams.question_id ?? anyParams.questionId ?? anyParams.questionIndex) as string | number | undefined;
      const normalizedSelectedValue = (anyParams.selected_value ?? anyParams.selectedValue ?? anyParams.selectedAnswer) as string | undefined;

      // Persist as contextual system message so the voice-chat tab can react via Convex subscription
      if (conversationId) {
        try {
          const messageContent = `TOOL_CALL:updateQuiz:${JSON.stringify({
            question_id: normalizedQuestionId,
            action: normalizedAction,
            selected_value: normalizedSelectedValue,
            mode: 'update'
          })}`;
          await createMessage({
            conversationId,
            content: messageContent,
            role: 'system',
            source: 'contextual'
          });
          addResult('✅ Quiz update saved to Convex (contextual/system)');
        } catch (error) {
          addResult('❌ Failed to save quiz update message: ' + error);
        }
      } else {
        addResult('⚠️ No conversationId; skipping Convex save');
      }

      // Return a concise confirmation
      if (normalizedAction === 'selectOption' && normalizedSelectedValue) {
        return `Recorded selection "${normalizedSelectedValue}" for question.`;
      } else if (normalizedAction === 'nextQuestion') {
        return `Moving to the next question.`;
      } else if (normalizedAction === 'prevQuestion') {
        return `Going back to the previous question.`;
      } else if (normalizedAction === 'showResults') {
        return `Showing results.`;
      }
      return `Quiz updated.`;
    }
  }), [conversationId, addResult, createMessage]);

  // Voice recording integration
  const { sendContextualUpdate: rawSendContextualUpdate } = useVoiceRecording({
    conversationId,
    actionHandlers
  });

  const sendContextualUpdate = useCallback((text: string) => {
    addResult(`📤 Contextual Update Sent: "${text}"`);
    
    if (conversationId) {
      createMessage({
        conversationId,
        content: text,
        role: 'system',
        source: 'contextual',
        metadata: {
          testSent: true,
          timestamp: Date.now()
        }
      }).then(() => {
        addResult('✅ Contextual update saved to Convex');
      }).catch((error) => {
        addResult('❌ Failed to save contextual update: ' + error);
      });
    }
    
    rawSendContextualUpdate(text);
  }, [rawSendContextualUpdate, conversationId, createMessage]);

  // Auto-initialize conversation
  useEffect(() => {
    async function autoInitConversation() {
      if (!isAuthenticated) return;
      if (conversations === undefined) return;
      if (conversationId) return;
      
      if (conversations.length > 0) {
        setConversationId(conversations[0]._id);
        addResult("🚀 Auto-initialized with existing conversation: " + conversations[0]._id);
      } else if (conversations.length === 0) {
        try {
          const id = await createConversation({ title: "Tool Testing" });
          setConversationId(id);
          addResult("🚀 Auto-created new conversation: " + id);
        } catch (error) {
          addResult("❌ Auto-initialization failed: " + error);
        }
      }
    }
    autoInitConversation();
  }, [isAuthenticated, conversations, createConversation, conversationId]);

  // Test functions
  const testTool = async (toolId: string) => {
    if (!conversationId) {
      addResult("❌ No conversation selected.");
      return;
    }

    addResult(`🚀 Testing ${toolId} tool call...`);
    setIsRunning(true);
    
    try {
      let toolCall;
      switch(toolId) {
        case 'show_balance':
          toolCall = {
            name: 'show_balance',
            parameters: {
              balance: balance,
              currency: currency,
              previousBalance: previousBalance,
              // Only include mode if selected
              ...(selectedMode && { mode: selectedMode })
            },
            timestamp: Date.now()
          };
          break;
        case 'show_savings_goal':
          toolCall = {
            name: 'show_savings_goal',
            parameters: {
              currentSavings: currentSavings,
              goalAmount: goalAmount,
              goalName: goalName,
              currency: currency,
              deadline: deadline,
              monthlyTarget: monthlyTarget,
              // Only include mode if selected
              ...(selectedMode && { mode: selectedMode })
            },
            timestamp: Date.now()
          };
          break;
        case 'show_document_id':
          toolCall = {
            name: 'show_document_id',
            parameters: { 
              documentId: undefined,
              // Only include mode if selected
              ...(selectedMode && { mode: selectedMode })
            },
            timestamp: Date.now()
          };
          break;
        case 'show_loans':
          toolCall = {
            name: 'show_loans',
            parameters: {
              totalLoans: totalLoans,
              paidAmount: paidAmount,
              currency: currency,
              // Only include mode if selected
              ...(selectedMode && { mode: selectedMode })
            },
            timestamp: Date.now()
          };
          break;
        case 'show_lending_options':
          toolCall = {
            name: 'show_lending_options',
            parameters: {
              options: [
                {
                  id: "personal-standard",
                  title: "Personal Loan Standard",
                  loanAmount: lendingAmount,
                  interestRate: 8.5,
                  term: 36,
                  monthlyPayment: Math.round((lendingAmount * (0.085/12)) / (1 - Math.pow(1 + 0.085/12, -36))),
                  totalInterest: Math.round((Math.round((lendingAmount * (0.085/12)) / (1 - Math.pow(1 + 0.085/12, -36))) * 36) - lendingAmount),
                  features: ["Fixed interest rate", "No collateral required"],
                  recommended: false
                }
              ],
              currency: currency,
              userProfile: { creditScore: userCreditScore, monthlyIncome: userMonthlyIncome },
              // Only include mode if selected
              ...(selectedMode && { mode: selectedMode })
            },
            timestamp: Date.now()
          };
          break;
        case 'show_credit_score':
          toolCall = {
            name: 'show_credit_score',
            parameters: {
              score: userCreditScore,
              range: creditScoreRange,
              factors: [
                {
                  name: "Payment History",
                  impact: "Positive",
                  description: "You have a strong history of on-time payments"
                },
                {
                  name: "Credit Utilization",
                  impact: "Neutral", 
                  description: "Your credit utilization is at a moderate level"
                },
                {
                  name: "Length of Credit History",
                  impact: "Positive",
                  description: "You have a good length of credit history"
                }
              ],
              lastUpdated: lastUpdatedDate,
              provider: creditProvider,
              tips: [
                "Keep credit utilization below 30%",
                "Pay bills on time every month",
                "Consider keeping old accounts open",
                "Monitor your credit report regularly"
              ],
              // Only include mode if selected
              ...(selectedMode && { mode: selectedMode })
            },
            timestamp: Date.now()
          };
          break;
        case 'show_emi_info':
          toolCall = {
            name: 'show_emi_info',
            parameters: {
              loanAmount: emiLoanAmount,
              interestRate: emiInterestRate,
              termMonths: emiTermMonths,
              emi: emiValue,
              currency: currency,
              principal: Math.round(emiLoanAmount * 0.75),
              interest: Math.round(emiLoanAmount * 0.25),
              totalAmount: emiValue * emiTermMonths,
              loanType: emiLoanType,
              // Only include mode if selected
              ...(selectedMode && { mode: selectedMode })
            },
            timestamp: Date.now()
          };
          break;
        case 'start_quiz':
          toolCall = {
            name: 'start_quiz',
            parameters: {
              quiz_id: quizId || undefined,
              quiz_json: customQuizJson || undefined,
              // Only include mode if selected
              ...(selectedMode && { mode: selectedMode })
            },
            timestamp: Date.now()
          };
          break;
        case 'update_quiz':
          toolCall = {
            name: 'update_quiz',
            parameters: {
              questionIndex: currentQuestionIndex,
              selectedAnswer: selectedAnswer,
              action: 'answer',
              // Only include mode if selected
              ...(selectedMode && { mode: selectedMode })
            },
            timestamp: Date.now()
          };
          break;
        case 'contextual_update':
          // For contextual updates, we don't use the bridge
          // Instead, we directly call sendContextualUpdate
          const messageToSend = contextualMessage.trim() || "User is viewing the tool testing page";
          if (!messageToSend) {
            addResult("❌ Please enter a contextual message to send");
            setIsRunning(false);
            return;
          }
          sendContextualUpdate(messageToSend);
          addResult(`✅ Sent contextual update: "${messageToSend}"`);
          setIsRunning(false);
          return; // Exit early as we don't need to bridge this
        default:
          addResult("❌ Unknown tool");
          setIsRunning(false);
          return;
      }

      const result = await bridgeElevenLabsToolToCopilot(toolCall, actionHandlers);
      addResult("✅ Bridge result: " + result);
      addResult("🎯 Check the voice-chat page to see the card render!");
      
    } catch (error) {
      addResult("❌ Bridge error: " + error);
    } finally {
      setIsRunning(false);
    }
  };

  const seedDocuments = async () => {
    addResult("🌱 Seeding sample documents...");
    
    try {
      const result = await seedSampleDocuments({ userId: 'demo-user' });
      addResult("✅ " + result.message);
      if (result.documentsCreated) {
        addResult(`📄 Created ${result.documentsCreated.length} documents`);
      }
    } catch (error) {
      addResult("❌ Failed to seed documents: " + error);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const runToolWithDefaults = async (tool: ToolTest) => {
    const toolId = tool.id;
    addResult(`🚀 Running ${toolId} with default parameters...`);
    await testTool(toolId);
  };

  // Status icon function (currently unused but kept for future status display)
  // const getStatusIcon = (status: string) => {
  //   switch(status) {
  //     case "success":
  //       return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  //     case "error":
  //       return <XCircle className="h-4 w-4 text-red-500" />;
  //     case "warning":
  //       return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  //     default:
  //       return <Clock className="h-4 w-4 text-gray-500" />;
  //   }
  // };

  const getToolIcon = (toolId: string) => {
    switch(toolId) {
      case "show_balance":
        return DollarSign;
      case "show_savings_goal":
        return Target;
      case "show_document_id":
        return FileText;
      case "show_loans":
        return CreditCard;
      case "show_lending_options":
        return Building2;
      case "show_credit_score":
        return TrendingUp;
      case "show_emi_info":
        return Calculator;
      case "start_quiz":
        return Brain;
      case "update_quiz":
        return FileQuestion;
      case "contextual_update":
        return MessageSquare;
      default:
        return Settings;
    }
  };

  const getToolColors = (toolId: string) => {
    switch(toolId) {
      case "show_balance":
        return {
          gradient: "from-violet-600/90 to-purple-700/90",
          border: "border-violet-500/20",
          iconBg: "bg-violet-500/20",
          iconColor: "text-white",
          textColor: "text-white"
        };
      case "show_savings_goal":
        return {
          gradient: "from-emerald-600/90 to-green-700/90",
          border: "border-emerald-500/20",
          iconBg: "bg-emerald-500/20",
          iconColor: "text-white",
          textColor: "text-white"
        };
      case "show_document_id":
        return {
          gradient: "from-blue-600/90 to-blue-700/90",
          border: "border-blue-500/20",
          iconBg: "bg-blue-500/20",
          iconColor: "text-white",
          textColor: "text-white"
        };
      case "show_loans":
        return {
          gradient: "from-red-600/90 to-red-700/90",
          border: "border-red-500/20",
          iconBg: "bg-red-500/20",
          iconColor: "text-white",
          textColor: "text-white"
        };
      case "show_lending_options":
        return {
          gradient: "from-amber-600/90 to-orange-700/90",
          border: "border-amber-500/20",
          iconBg: "bg-amber-500/20",
          iconColor: "text-white",
          textColor: "text-white"
        };
      case "show_credit_score":
        return {
          gradient: "from-green-600/90 to-green-700/90",
          border: "border-green-500/20",
          iconBg: "bg-green-500/20",
          iconColor: "text-white",
          textColor: "text-white"
        };
      case "show_emi_info":
        return {
          gradient: "from-indigo-600/90 to-indigo-700/90",
          border: "border-indigo-500/20",
          iconBg: "bg-indigo-500/20",
          iconColor: "text-white",
          textColor: "text-white"
        };
      case "start_quiz":
        return {
          gradient: "from-purple-600/90 to-pink-700/90",
          border: "border-purple-500/20",
          iconBg: "bg-purple-500/20",
          iconColor: "text-white",
          textColor: "text-white"
        };
      case "update_quiz":
        return {
          gradient: "from-cyan-600/90 to-blue-700/90",
          border: "border-cyan-500/20",
          iconBg: "bg-cyan-500/20",
          iconColor: "text-white",
          textColor: "text-white"
        };
      case "contextual_update":
        return {
          gradient: "from-slate-600/90 to-slate-700/90",
          border: "border-slate-500/20",
          iconBg: "bg-slate-500/20",
          iconColor: "text-white",
          textColor: "text-white"
        };
      default:
        return {
          gradient: "from-gray-600/90 to-gray-700/90",
          border: "border-gray-500/20",
          iconBg: "bg-gray-500/20",
          iconColor: "text-white",
          textColor: "text-white"
        };
    }
  };

  const getToolInfo = (toolId: string) => {
    switch(toolId) {
      case "show_balance":
        return {
          trigger: 'Trigger: "account balance", "available funds"',
          source: 'Source: Core Banking API | Security: PCI DSS compliant'
        };
      case "show_savings_goal":
        return {
          trigger: 'Trigger: "savings progress", "goal status"',
          source: 'Source: Personal Finance Platform | Sync: Real-time'
        };
      case "show_document_id":
        return {
          trigger: 'Trigger: "show ID", "identity verification"',
          source: 'Source: Document Management API | Encryption: AES-256'
        };
      case "show_loans":
        return {
          trigger: 'Trigger: "loan details", "payment history"',
          source: 'Source: Loan Servicing System | Update: Daily batch'
        };
      case "show_lending_options":
        return {
          trigger: 'Trigger: "loan options", "rates available"',
          source: 'Source: Rate Engine + Eligibility API | Refresh: Hourly'
        };
      case "show_credit_score":
        return {
          trigger: 'Trigger: "credit score", "credit health"',
          source: 'Source: Credit Bureau API | Provider: Experian'
        };
      case "show_emi_info":
        return {
          trigger: 'Trigger: "EMI calculation", "monthly payment"',
          source: 'Source: Loan Calculator Service | Compliance: RegE'
        };
      case "start_quiz":
        return {
          trigger: 'Trigger: "start quiz", "take quiz"',
          source: 'Source: Quiz Engine | Integration: Voice + UI'
        };
      case "update_quiz":
        return {
          trigger: 'Trigger: Quiz navigation, answer selection',
          source: 'Source: Quiz State Manager | Real-time updates'
        };
      case "contextual_update":
        return {
          trigger: 'Trigger: Navigation events, user interactions',
          source: 'Source: ElevenLabs SDK | Transport: WebSocket/WebRTC'
        };
      default:
        return {
          trigger: 'Trigger: Voice command',
          source: 'Source: Enterprise API | Integration: Secure'
        };
    }
  };

  return (
    <>
      {/* Inject buttons into header */}
      <div className="fixed top-0 right-6 z-20 flex items-center gap-2 h-14">
        <Button 
          onClick={seedDocuments}
          variant="outline"
          size="sm"
        >
          <FileJson className="h-4 w-4 mr-2" />
          Seed Documents
        </Button>
        <Button 
          onClick={clearResults} 
          variant="outline"
          size="sm"
          disabled={testResults.length === 0}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Results
        </Button>
      </div>
      
      <div className="flex flex-col h-full">

      <div className="grid gap-6 lg:grid-cols-3 flex-1 min-h-0">
        {/* Tool Selection Panel */}
        <div className="lg:col-span-1 flex flex-col">
          {/* Conversation selector */}
          <div className="mb-4">
            <Label htmlFor="convSelect">Target Conversation</Label>
            <select
              id="convSelect"
              value={(conversationId as unknown as string) || ''}
              onChange={(e) => setConversationId(e.target.value as unknown as Id<"conversations">)}
              className="w-full px-3 py-2 mt-1 bg-background text-foreground border border-input rounded-md shadow-sm"
            >
              <option value="" disabled>Select a conversation</option>
              {(conversations || []).map((c) => (
                <option key={(c._id as unknown as string)} value={(c._id as unknown as string)}>
                  {c.title || (c._id as unknown as string)}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">Choose which conversation to target</p>
          </div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Available Tools</h3>
            <p className="text-sm text-muted-foreground mb-4">Select a tool to test</p>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-2">
              {filteredTools.map((tool) => {
                const colors = getToolColors(tool.id);
                return (
                <Card 
                  key={tool.id}
                  className={`relative overflow-hidden bg-gradient-to-br ${colors.gradient} ${colors.border} backdrop-blur-xl shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] ${
                    selectedTool === tool.id ? "ring-2 ring-white/20" : ""
                  }`}
                >
                  {/* Glass effect overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.03] via-transparent to-white/[0.02] pointer-events-none" />
                  
                  <CardHeader className="relative p-3">
                    <div className="space-y-3">
                      <div className="cursor-pointer" onClick={() => setSelectedTool(tool.id)}>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 ${colors.iconBg} rounded-lg backdrop-blur-sm border border-white/20`}>
                              {(() => {
                                const IconComponent = getToolIcon(tool.id);
                                return <IconComponent className={`h-4 w-4 ${colors.iconColor}`} />;
                              })()}
                            </div>
                            <span className={`font-bold text-sm ${colors.textColor}`}>{tool.name}</span>
                          </div>
                          <p className={`text-xs ${colors.textColor}/90 leading-relaxed`}>
                            {tool.description}
                          </p>
                          <Badge variant="outline" className={`text-xs font-semibold bg-white/10 ${colors.textColor} border-white/30`}>
                            {tool.category}
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className={`w-full bg-white/10 hover:bg-white/20 text-white font-semibold border-white/20 cursor-pointer hover:cursor-pointer disabled:cursor-not-allowed`}
                        onClick={(e) => {
                          e.stopPropagation();
                          runToolWithDefaults(tool);
                        }}
                        disabled={isRunning || !conversationId}
                      >
                        {isRunning ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            Run Test
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Test Configuration & Execution */}
        <div className="lg:col-span-2 flex flex-col">
          {/* Tool Details */}
          {selectedTool && (
            <Card className="flex-shrink-0 mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {tools.find(t => t.id === selectedTool)?.name} Configuration
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => testTool(selectedTool)}
                    disabled={isRunning || !conversationId}
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run Test
                      </>
                    )}
                  </Button>
                </div>
                <CardDescription>
                  {tools.find(t => t.id === selectedTool)?.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Integration info */}
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border space-y-1">
                  <div>{getToolInfo(selectedTool).trigger}</div>
                  <div>{getToolInfo(selectedTool).source}</div>
                </div>
                {/* Tool-specific parameter inputs */}
                {selectedTool === 'show_balance' && (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label htmlFor="balance">Balance</Label>
                      <Input
                        id="balance"
                        type="number"
                        value={balance}
                        onChange={(e) => setBalance(Number(e.target.value))}
                        className="mt-1 bg-background text-foreground border-input shadow-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Input
                        id="currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="mt-1 bg-background text-foreground border-input shadow-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="previousBalance">Previous Balance</Label>
                      <Input
                        id="previousBalance"
                        type="number"
                        value={previousBalance || ''}
                        onChange={(e) => setPreviousBalance(e.target.value ? Number(e.target.value) : undefined)}
                        className="mt-1 bg-background text-foreground border-input shadow-sm"
                      />
                    </div>
                  </div>
                )}

                {selectedTool === 'show_savings_goal' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="currentSavings">Current Savings</Label>
                      <Input
                        id="currentSavings"
                        type="number"
                        value={currentSavings}
                        onChange={(e) => setCurrentSavings(Number(e.target.value))}
                        className="mt-1 bg-background text-foreground border-input shadow-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="goalAmount">Goal Amount</Label>
                      <Input
                        id="goalAmount"
                        type="number"
                        value={goalAmount}
                        onChange={(e) => setGoalAmount(Number(e.target.value))}
                        className="mt-1 bg-background text-foreground border-input shadow-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="goalName">Goal Name</Label>
                      <Input
                        id="goalName"
                        value={goalName}
                        onChange={(e) => setGoalName(e.target.value)}
                        className="mt-1 bg-background text-foreground border-input shadow-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="deadline">Deadline</Label>
                      <Input
                        id="deadline"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="mt-1 bg-background text-foreground border-input shadow-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="monthlyTarget">Monthly Target</Label>
                      <Input
                        id="monthlyTarget"
                        type="number"
                        value={monthlyTarget}
                        onChange={(e) => setMonthlyTarget(Number(e.target.value))}
                        className="mt-1 bg-background text-foreground border-input shadow-sm"
                      />
                    </div>
                  </div>
                )}

                {selectedTool === 'show_loans' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="totalLoans">Total Loans</Label>
                      <Input
                        id="totalLoans"
                        type="number"
                        value={totalLoans}
                        onChange={(e) => setTotalLoans(Number(e.target.value))}
                        className="mt-1 bg-background text-foreground border-input shadow-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="paidAmount">Paid Amount</Label>
                      <Input
                        id="paidAmount"
                        type="number"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(Number(e.target.value))}
                        className="mt-1 bg-background text-foreground border-input shadow-sm"
                      />
                    </div>
                  </div>
                )}

                {selectedTool === 'show_lending_options' && (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label htmlFor="lendingAmount">Loan Amount</Label>
                      <Input
                        id="lendingAmount"
                        type="number"
                        value={lendingAmount}
                        onChange={(e) => setLendingAmount(Number(e.target.value))}
                        className="mt-1 bg-background text-foreground border-input shadow-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="userCreditScore">Credit Score</Label>
                      <Input
                        id="userCreditScore"
                        type="number"
                        value={userCreditScore}
                        onChange={(e) => setUserCreditScore(Number(e.target.value))}
                        className="mt-1 bg-background text-foreground border-input shadow-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="userMonthlyIncome">Monthly Income</Label>
                      <Input
                        id="userMonthlyIncome"
                        type="number"
                        value={userMonthlyIncome}
                        onChange={(e) => setUserMonthlyIncome(Number(e.target.value))}
                        className="mt-1 bg-background text-foreground border-input shadow-sm"
                      />
                    </div>
                  </div>
                )}

                {selectedTool === 'show_credit_score' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="userCreditScore">Credit Score (300-850)</Label>
                      <Input
                        id="userCreditScore"
                        type="number"
                        min="300"
                        max="850"
                        value={userCreditScore}
                        onChange={(e) => setUserCreditScore(Number(e.target.value))}
                        className="mt-1 bg-background text-foreground border-input shadow-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="creditScoreRange">Credit Range</Label>
                      <select
                        id="creditScoreRange"
                        value={creditScoreRange}
                        onChange={(e) => setCreditScoreRange(e.target.value as 'Poor' | 'Fair' | 'Good' | 'Very Good' | 'Excellent')}
                        className="w-full px-3 py-2 mt-1 bg-background text-foreground border border-input rounded-md shadow-sm"
                      >
                        <option value="Poor">Poor (300-579)</option>
                        <option value="Fair">Fair (580-669)</option>
                        <option value="Good">Good (670-739)</option>
                        <option value="Very Good">Very Good (740-799)</option>
                        <option value="Excellent">Excellent (800-850)</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="creditProvider">Credit Provider</Label>
                      <Input
                        id="creditProvider"
                        value={creditProvider}
                        onChange={(e) => setCreditProvider(e.target.value)}
                        className="mt-1 bg-background text-foreground border-input shadow-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastUpdatedDate">Last Updated</Label>
                      <Input
                        id="lastUpdatedDate"
                        value={lastUpdatedDate}
                        onChange={(e) => setLastUpdatedDate(e.target.value)}
                        className="mt-1 bg-background text-foreground border-input shadow-sm"
                      />
                    </div>
                  </div>
                )}

                {selectedTool === 'show_emi_info' && (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <Label htmlFor="emiLoanAmount">Loan Amount</Label>
                      <Input
                        id="emiLoanAmount"
                        type="number"
                        value={emiLoanAmount}
                        onChange={(e) => setEmiLoanAmount(Number(e.target.value))}
                        className="mt-1 bg-background text-foreground border-input shadow-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emiInterestRate">Interest Rate (%)</Label>
                      <Input
                        id="emiInterestRate"
                        type="number"
                        step="0.1"
                        value={emiInterestRate}
                        onChange={(e) => setEmiInterestRate(Number(e.target.value))}
                        className="mt-1 bg-background text-foreground border-input shadow-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emiTermMonths">Term (Months)</Label>
                      <Input
                        id="emiTermMonths"
                        type="number"
                        value={emiTermMonths}
                        onChange={(e) => setEmiTermMonths(Number(e.target.value))}
                        className="mt-1 bg-background text-foreground border-input shadow-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emiValue">EMI Amount</Label>
                      <Input
                        id="emiValue"
                        type="number"
                        value={emiValue}
                        onChange={(e) => setEmiValue(Number(e.target.value))}
                        className="mt-1 bg-background text-foreground border-input shadow-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emiLoanType">Loan Type</Label>
                      <Input
                        id="emiLoanType"
                        value={emiLoanType}
                        onChange={(e) => setEmiLoanType(e.target.value)}
                        className="mt-1 bg-background text-foreground border-input shadow-sm"
                      />
                    </div>
                  </div>
                )}

                {selectedTool === 'start_quiz' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="quizId">Quiz Preset ID</Label>
                      <select
                        id="quizId"
                        value={quizId}
                        onChange={(e) => setQuizId(e.target.value)}
                        className="w-full px-3 py-2 mt-1 bg-background text-foreground border border-input rounded-md shadow-sm"
                      >
                        <option value="loan_eligibility">Loan Eligibility Assessment</option>
                        <option value="financial_health">Financial Health Check</option>
                        <option value="investment_risk">Investment Risk Profile</option>
                        <option value="">Custom Quiz (use JSON below)</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="customQuizJson">Custom Quiz JSON (optional)</Label>
                      <textarea
                        id="customQuizJson"
                        value={customQuizJson}
                        onChange={(e) => setCustomQuizJson(e.target.value)}
                        placeholder='{"title":"Custom Quiz","questions":[{"text":"Sample question?","options":["Option A","Option B"],"correctAnswer":0}]}'
                        rows={4}
                        className="w-full px-3 py-2 mt-1 bg-background text-foreground border border-input rounded-md shadow-sm resize-vertical"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave quiz preset empty to use custom JSON. JSON should have title and questions array.
                      </p>
                    </div>
                  </div>
                )}

                {selectedTool === 'update_quiz' && (
                  <div className="space-y-6">
                    {/* Loan Application Questions */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Loan Application Questions</h3>
                      
                      {/* Question 1: Loan Amount */}
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium mb-2">1. How much loan amount do you need? (ID: loanAmount)</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: '1000-3000', label: '$1,000 - $3,000' },
                            { value: '3000-5000', label: '$3,000 - $5,000' },
                            { value: '5000-8000', label: '$5,000 - $8,000' },
                            { value: '8000+', label: '$8,000+' }
                          ].map(option => (
                            <Button
                              key={option.value}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const toolCall = {
                                  name: 'update_quiz',
                                  parameters: { 
                                    question_id: 'loanAmount', 
                                    action: 'selectOption', 
                                    selected_value: option.value 
                                  },
                                  timestamp: Date.now()
                                };
                                addResult(`🔧 Tool Call: ${JSON.stringify(toolCall, null, 2)}`);
                                bridgeElevenLabsToolToCopilot(toolCall, actionHandlers);
                              }}
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Question 2: Loan Purpose */}
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium mb-2">2. What is the primary purpose for this loan? (ID: loanPurpose)</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: 'home_improvement', label: 'Home improvement / renovation' },
                            { value: 'medical', label: 'Medical expenses' },
                            { value: 'education', label: 'Education / training' },
                            { value: 'debt_consolidation', label: 'Debt consolidation' },
                            { value: 'wedding', label: 'Wedding expenses' },
                            { value: 'travel', label: 'Travel / vacation' },
                            { value: 'business', label: 'Business investment' },
                            { value: 'other', label: 'Other personal expenses' }
                          ].map(option => (
                            <Button
                              key={option.value}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const toolCall = {
                                  name: 'update_quiz',
                                  parameters: { 
                                    question_id: 'loanPurpose', 
                                    action: 'selectOption', 
                                    selected_value: option.value 
                                  },
                                  timestamp: Date.now()
                                };
                                addResult(`🔧 Tool Call: ${JSON.stringify(toolCall, null, 2)}`);
                                bridgeElevenLabsToolToCopilot(toolCall, actionHandlers);
                              }}
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Question 3: Employment Type */}
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium mb-2">3. What is your current employment status? (ID: employmentType)</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: 'salaried', label: 'Salaried Employee' },
                            { value: 'self_employed', label: 'Self-employed / Business' }
                          ].map(option => (
                            <Button
                              key={option.value}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const toolCall = {
                                  name: 'update_quiz',
                                  parameters: { 
                                    question_id: 'employmentType', 
                                    action: 'selectOption', 
                                    selected_value: option.value 
                                  },
                                  timestamp: Date.now()
                                };
                                addResult(`🔧 Tool Call: ${JSON.stringify(toolCall, null, 2)}`);
                                bridgeElevenLabsToolToCopilot(toolCall, actionHandlers);
                              }}
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Question 4: Monthly Income */}
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium mb-2">4. What is your monthly take-home income? (ID: monthlyIncome)</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: '2500-4000', label: '$2,500 - $4,000' },
                            { value: '4000-5500', label: '$4,000 - $5,500' },
                            { value: '5500-7000', label: '$5,500 - $7,000' },
                            { value: '7000+', label: '$7,000+' }
                          ].map(option => (
                            <Button
                              key={option.value}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const toolCall = {
                                  name: 'update_quiz',
                                  parameters: { 
                                    question_id: 'monthlyIncome', 
                                    action: 'selectOption', 
                                    selected_value: option.value 
                                  },
                                  timestamp: Date.now()
                                };
                                addResult(`🔧 Tool Call: ${JSON.stringify(toolCall, null, 2)}`);
                                bridgeElevenLabsToolToCopilot(toolCall, actionHandlers);
                              }}
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Question 5: Existing EMIs */}
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium mb-2">5. Do you have any existing loans or credit card EMIs? (ID: existingEMIs)</h4>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {['yes', 'no'].map(option => (
                            <Button
                              key={option}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const toolCall = {
                                  name: 'update_quiz',
                                  parameters: { 
                                    question_id: 'existingEMIs', 
                                    action: 'selectOption', 
                                    selected_value: option 
                                  },
                                  timestamp: Date.now()
                                };
                                addResult(`🔧 Tool Call: ${JSON.stringify(toolCall, null, 2)}`);
                                bridgeElevenLabsToolToCopilot(toolCall, actionHandlers);
                              }}
                            >
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </Button>
                          ))}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Follow-up if "yes": What is your total monthly EMI obligation?</p>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { value: '100-250', label: '$100 - $250' },
                            { value: '250-400', label: '$250 - $400' },
                            { value: '400+', label: '$400+' }
                          ].map(option => (
                            <Button
                              key={option.value}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const toolCall = {
                                  name: 'update_quiz',
                                  parameters: { 
                                    question_id: 'existingEMIs_followup', 
                                    action: 'selectOption', 
                                    selected_value: option.value 
                                  },
                                  timestamp: Date.now()
                                };
                                addResult(`🔧 Tool Call: ${JSON.stringify(toolCall, null, 2)}`);
                                bridgeElevenLabsToolToCopilot(toolCall, actionHandlers);
                              }}
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Question 6: Credit Score */}
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium mb-2">6. Do you know your current credit score? (ID: creditScore)</h4>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {['yes', 'no'].map(option => (
                            <Button
                              key={option}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const toolCall = {
                                  name: 'update_quiz',
                                  parameters: { 
                                    question_id: 'creditScore', 
                                    action: 'selectOption', 
                                    selected_value: option 
                                  },
                                  timestamp: Date.now()
                                };
                                addResult(`🔧 Tool Call: ${JSON.stringify(toolCall, null, 2)}`);
                                bridgeElevenLabsToolToCopilot(toolCall, actionHandlers);
                              }}
                            >
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </Button>
                          ))}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Follow-up if "yes": What is your approximate credit score range?</p>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { value: '750+', label: 'Excellent (750+)' },
                            { value: '700-750', label: 'Good (700-750)' },
                            { value: '650-700', label: 'Fair (650-700)' },
                            { value: '600-650', label: 'Poor (600-650)' },
                            { value: 'below-600', label: 'Very Poor (Below 600)' }
                          ].map(option => (
                            <Button
                              key={option.value}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const toolCall = {
                                  name: 'update_quiz',
                                  parameters: { 
                                    question_id: 'creditScore_followup', 
                                    action: 'selectOption', 
                                    selected_value: option.value 
                                  },
                                  timestamp: Date.now()
                                };
                                addResult(`🔧 Tool Call: ${JSON.stringify(toolCall, null, 2)}`);
                                bridgeElevenLabsToolToCopilot(toolCall, actionHandlers);
                              }}
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Question 7: Loan Tenure */}
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium mb-2">7. What loan repayment tenure do you prefer? (ID: loanTenure)</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { value: '12', label: '1 Year (Higher EMI, Lower Interest)' },
                            { value: '24', label: '2 Years (Balanced Option)' },
                            { value: '36', label: '3 Years (Popular Choice)' },
                            { value: '48', label: '4 Years (Lower EMI)' },
                            { value: '60', label: '5 Years (Lowest EMI, Higher Interest)' }
                          ].map(option => (
                            <Button
                              key={option.value}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const toolCall = {
                                  name: 'update_quiz',
                                  parameters: { 
                                    question_id: 'loanTenure', 
                                    action: 'selectOption', 
                                    selected_value: option.value 
                                  },
                                  timestamp: Date.now()
                                };
                                addResult(`🔧 Tool Call: ${JSON.stringify(toolCall, null, 2)}`);
                                bridgeElevenLabsToolToCopilot(toolCall, actionHandlers);
                              }}
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Navigation Actions */}
                    <div className="border rounded-lg p-4 bg-blue-50">
                      <h4 className="font-medium mb-2">Navigation Actions</h4>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const toolCall = {
                              name: 'update_quiz',
                              parameters: { question_id: 'current', action: 'nextQuestion' },
                              timestamp: Date.now()
                            };
                            addResult(`🔧 Tool Call: ${JSON.stringify(toolCall, null, 2)}`);
                            bridgeElevenLabsToolToCopilot(toolCall, actionHandlers);
                          }}
                        >
                          Next Question
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const toolCall = {
                              name: 'update_quiz',
                              parameters: { question_id: 'current', action: 'prevQuestion' },
                              timestamp: Date.now()
                            };
                            addResult(`🔧 Tool Call: ${JSON.stringify(toolCall, null, 2)}`);
                            bridgeElevenLabsToolToCopilot(toolCall, actionHandlers);
                          }}
                        >
                          Previous Question
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const toolCall = {
                              name: 'update_quiz',
                              parameters: { question_id: 'final', action: 'showResults' },
                              timestamp: Date.now()
                            };
                            addResult(`🔧 Tool Call: ${JSON.stringify(toolCall, null, 2)}`);
                            bridgeElevenLabsToolToCopilot(toolCall, actionHandlers);
                          }}
                        >
                          Show Results
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTool === 'contextual_update' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="contextMessage">Contextual Update Message</Label>
                      <div className="mt-2 space-y-2">
                        <textarea
                          id="contextMessage"
                          value={contextualMessage}
                          onChange={(e) => setContextualMessage(e.target.value)}
                          className="w-full min-h-[100px] p-3 border rounded-lg bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Enter contextual information to send to the agent...&#10;Example: User is interested in loans around $20,000 for buying a MacBook Pro. User clicked on 'Learn More' about loan options."
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setContextualMessage("User is interested in loans around $20,000 for buying a MacBook Pro")}
                          >
                            Example: Loan Interest
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setContextualMessage("User clicked on 'Learn More' about personal loan options")}
                          >
                            Example: User Action
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setContextualMessage("User has excellent credit score of 750 and monthly income of $8,500")}
                          >
                            Example: User Profile
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setContextualMessage("User spent 3 minutes on EMI calculator page, seems confused about terms")}
                          >
                            Example: User Behavior
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Note:</strong> Contextual updates provide background information to the agent without triggering a response.
                        Use this to inform the agent about user actions, interests, or navigation events.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Test Results */}
          <Card className="flex-1 flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle>Test Results</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {testResults.filter(r => r.includes('✅')).length} passed
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {testResults.filter(r => r.includes('❌')).length} failed
                  </Badge>
                </div>
              </div>
              <CardDescription>
                Real-time execution logs and responses
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 pr-4">
                {testResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <Terminal className="h-12 w-12 mb-4" />
                    <p className="text-sm">No test results yet</p>
                    <p className="text-xs mt-1">Select a tool and run a test to see results here</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {testResults.map((result, index) => (
                      <div 
                        key={index}
                        className="text-sm font-mono bg-card p-2 rounded border"
                      >
                        {result}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </>
  );
}