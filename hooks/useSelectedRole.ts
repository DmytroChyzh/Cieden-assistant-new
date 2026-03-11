"use client";

import { useState, useEffect } from "react";

const roles = [
  {
    id: "ai-ops-lead",
    name: "AI Ops Lead",
    description: "Keep fleet healthy; manage spend/latency; kill-switches",
  },
  {
    id: "service-design",
    name: "Service Design", 
    description: "Design policies, offers, arbitration, and paths",
  },
  {
    id: "growth-marketing-manager",
    name: "Growth/Marketing Manager",
    description: "Launch promos, set objectives, read uplift",
  },
  {
    id: "risk-compliance-officer",
    name: "Risk/Compliance Officer",
    description: "Enforce guardrails, review incidents, audit",
  },
  {
    id: "data-scientist-ml",
    name: "Data Scientist/ML",
    description: "Evaluate models/bandits, drift, and explainability",
  }
];

export function useSelectedRole() {
  const [selectedRole, setSelectedRole] = useState<string>("service-design");

  useEffect(() => {
    const savedRole = localStorage.getItem("selected-role");
    if (savedRole && roles.find(r => r.id === savedRole)) {
      setSelectedRole(savedRole);
    }
  }, []);

  const currentRole = roles.find(r => r.id === selectedRole) || roles[0];

  return {
    selectedRole,
    currentRole,
  };
}