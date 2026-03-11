"use client";

import React, { useState } from "react";
import {
  DollarSign,
  Clock,
  Users,
  TrendingDown,
  CheckCircle,
  ArrowRight,
  Target,
} from "lucide-react";
import type {
  ProjectEstimate,
  ConversationType,
} from "@/src/features/estimate/types";

interface EstimateCardProps {
  estimate: ProjectEstimate;
  estimateStep: number;
  conversationType: ConversationType;
  onContactManager: () => void;
  isVisible: boolean;
  hideHeader?: boolean;
  language?: "uk" | "en";
}

const EstimateCard: React.FC<EstimateCardProps> = ({
  estimate,
  onContactManager,
  isVisible,
  hideHeader = false,
  language = "en",
}) => {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const getPhaseDescription = (phaseKey: string): string => {
    const descriptions: Record<string, string> = {
      "ux-research":
        language === "uk"
          ? "Дослідження користувачів, аналіз потреб та створення user personas"
          : "User research, needs analysis and user personas creation",
      "ui-design":
        language === "uk"
          ? "Створення візуального дизайну, макетів та інтерфейсів"
          : "Visual design creation, layouts and interfaces",
      prototyping:
        language === "uk"
          ? "Прототипування інтерактивності та тестування користувацького досвіду"
          : "Interactive prototyping and user experience testing",
      "design-system":
        language === "uk"
          ? "Розробка дизайн-системи та компонентів для масштабування"
          : "Design system and components development for scaling",
      "mobile-adaptive":
        language === "uk"
          ? "Адаптація дизайну для мобільних пристроїв та responsive версій"
          : "Mobile device adaptation and responsive design versions",
    };
    return (
      descriptions[phaseKey] ||
      (language === "uk"
        ? "Детальний опис етапу буде надано під час роботи над проектом."
        : "Detailed stage description will be provided during project work.")
    );
  };

  const costPercentages: Record<string, number> = {
    "ux-research": 0.15,
    "ui-design": 0.5,
    prototyping: 0.15,
    "design-system": 0.1,
    "mobile-adaptive": 0.1,
  };
  const getPhaseCost = (phaseKey: string): string => {
    const totalCost = estimate.currentRange.max || 1;
    const pct = costPercentages[phaseKey] ?? 0.1;
    return `$${Math.round(totalCost * pct).toLocaleString()}`;
  };
  const getPhaseHours = (phaseKey: string): string => {
    const totalHours = (estimate.initialRange.max || 100) / 50;
    const pct = costPercentages[phaseKey] ?? 0.1;
    const hours = Math.round(totalHours * pct);
    return `${hours} ${language === "uk" ? "годин" : "hours"}`;
  };

  if (!isVisible) return null;

  const initialRange =
    estimate.initialRange.max - estimate.initialRange.min;
  const currentRange = estimate.currentRange.max - estimate.currentRange.min;
  const narrowingPercentage =
    (estimate as ProjectEstimate & { accuracyPercentage?: number })
      .accuracyPercentage ??
    (initialRange > 0
      ? Math.max(0, Math.min(100, ((initialRange - currentRange) / initialRange) * 100))
      : 0);

  const phaseKeys = [
    "ux-research",
    "ui-design",
    "prototyping",
    "design-system",
    "mobile-adaptive",
  ] as const;
  const getPhaseDisplayName = (key: string) => {
    const names: Record<string, string> = {
      "ux-research": language === "uk" ? "UX Дослідження" : "UX Research",
      "ui-design": language === "uk" ? "UI Дизайн" : "UI Design",
      prototyping: language === "uk" ? "Прототипування" : "Prototyping",
      "design-system": language === "uk" ? "Дизайн-система" : "Design System",
      "mobile-adaptive":
        language === "uk" ? "Мобільна адаптація" : "Mobile Adaptive",
    };
    return names[key] ?? key;
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col relative z-10 lg:max-w-md">
      {!hideHeader && (
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 lg:px-6 py-3 lg:py-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Target className="w-4 h-4 lg:w-6 lg:h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base lg:text-lg font-bold text-white">
                {language === "uk"
                  ? "Естімейт UI/UX Дизайну"
                  : "UI/UX Design Estimate"}
              </h3>
              <p className="text-xs lg:text-sm text-white/80">
                {language === "uk"
                  ? "Розрахунок вартості дизайн-послуг"
                  : "Design services cost calculation"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 flex-1 overflow-y-auto">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {language === "uk" ? "Діапазон вартості" : "Cost Range"}
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 transition-all duration-500">
            {estimate.currentRange.min === 0 && estimate.currentRange.max === 0 ? (
              <span className="text-gray-500">
                {language === "uk" ? "Визначається..." : "Determining..."}
              </span>
            ) : (
              <span className="animate-pulse">
                ${estimate.currentRange.min.toLocaleString()} - $
                {estimate.currentRange.max.toLocaleString()}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {estimate.currency} • {estimate.estimatedAt.toLocaleDateString()}
          </div>
        </div>

        {estimate.currentRange.min > 0 && estimate.currentRange.max > 0 ? (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {language === "uk"
                  ? "Точність естімейту"
                  : "Estimate Accuracy"}
              </span>
              <span className="text-sm font-bold text-purple-600">
                {narrowingPercentage.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${narrowingPercentage}%` }}
              />
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-600 dark:text-gray-400">
              <TrendingDown className="w-4 h-4 flex-shrink-0" />
              <span>
                {language === "uk"
                  ? `Діапазон звужено з ${estimate.initialRange.min.toLocaleString()} - ${estimate.initialRange.max.toLocaleString()} годин`
                  : `Range narrowed from ${estimate.initialRange.min.toLocaleString()} - ${estimate.initialRange.max.toLocaleString()} hours`}
              </span>
            </div>
            {narrowingPercentage < 50 && (
              <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                {language === "uk"
                  ? "💡 Надайте більше деталей проєкту для підвищення точності естімейту!"
                  : "💡 Provide more project details to increase estimate accuracy!"}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {language === "uk"
                ? "Очікуємо деталі проєкту для розрахунку часу роботи..."
                : "Waiting for project details to calculate work hours..."}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {language === "uk" ? "Час виконання" : "Timeline"}
              </span>
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              {estimate.timeline === "Визначається..." ||
              estimate.timeline === "Determining..." ? (
                <span className="text-gray-500">
                  {language === "uk" ? "Визначається..." : "Determining..."}
                </span>
              ) : (
                estimate.timeline
              )}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                {language === "uk" ? "Команда" : "Team"}
              </span>
            </div>
            <div className="text-sm text-green-700 dark:text-green-300">
              {estimate.team.designers.length === 0 ? (
                <span className="text-gray-500">
                  {language === "uk" ? "Визначається..." : "Determining..."}
                </span>
              ) : (
                `${estimate.team.designers.length} ${language === "uk" ? "дизайнерів" : "designers"}`
              )}
            </div>
          </div>
        </div>

        {estimate.initialRange.min > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <svg
                className="w-4 h-4 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                {language === "uk" ? "Години роботи" : "Work Hours"}
              </span>
            </div>
            <div className="text-sm text-purple-700 dark:text-purple-300">
              {estimate.initialRange.min} - {estimate.initialRange.max}{" "}
              {language === "uk" ? "годин" : "hours"}
            </div>
          </div>
        )}

        <div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between p-3 bg-[#404040] border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer active:scale-95"
            >
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-white">
                  {language === "uk"
                    ? "Етапи дизайн-процесу"
                    : "Design Process Stages"}
                </h4>
                <span className="text-xs text-gray-300">
                  ({phaseKeys.length}{" "}
                  {language === "uk" ? "етапів" : "stages"})
                </span>
              </div>
              <ArrowRight
                className={`w-4 h-4 text-white transition-transform ${
                  isDropdownOpen ? "rotate-90" : ""
                }`}
              />
            </button>
            <div
              className={`mt-2 space-y-2 ${isDropdownOpen ? "block" : "hidden"}`}
            >
              {phaseKeys.map((phaseKey) => {
                const description =
                  estimate.phaseDescriptions?.[phaseKey] ??
                  getPhaseDescription(phaseKey);
                return (
                  <div
                    key={phaseKey}
                    className="bg-gray-50 dark:bg-gray-700 rounded-md border-l-4 border-l-blue-400 shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPhase(
                          expandedPhase === phaseKey ? null : phaseKey
                        )
                      }
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 rounded-md cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {getPhaseDisplayName(phaseKey)}
                        </span>
                      </div>
                      <ArrowRight
                        className={`w-3 h-3 text-gray-400 dark:text-gray-500 transition-transform ${
                          expandedPhase === phaseKey ? "rotate-90" : ""
                        }`}
                      />
                    </button>
                    <div
                      className={`px-3 pb-3 border-t border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 rounded-b-md ${
                        expandedPhase === phaseKey ? "block" : "hidden"
                      }`}
                    >
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 mb-3">
                        {description}
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded border">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                            💰 {language === "uk" ? "Вартість" : "Cost"}
                          </div>
                          <div className="text-green-600 dark:text-green-400 font-semibold">
                            {getPhaseCost(phaseKey)}
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded border">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                            ⏱️ {language === "uk" ? "Години" : "Hours"}
                          </div>
                          <div className="text-blue-600 dark:text-blue-400 font-semibold">
                            {getPhaseHours(phaseKey)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pt-0 space-y-3 lg:space-y-4">
          <button
            type="button"
            onClick={onContactManager}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-2 lg:py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-sm lg:text-base"
          >
            <span className="hidden sm:inline">
              {language === "uk"
                ? "Зв'язатися з менеджером"
                : "Contact Manager"}
            </span>
            <span className="sm:hidden">
              {language === "uk" ? "Зв'язатися" : "Contact"}
            </span>
          </button>
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {language === "uk"
              ? "Це приблизний естімейт дизайн-послуг. Для точного розрахунку зв'яжіться з менеджером."
              : "This is an approximate design services estimate. For accurate calculation, contact our manager."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimateCard;
