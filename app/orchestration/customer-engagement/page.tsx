"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopicsExplorer } from "@/components/customer-engagement/topics-explorer";
import { TopicDetails } from "@/components/customer-engagement/topic-details";
import { SystemInsights } from "@/components/customer-engagement/system-insights";
import { KnowledgeManagement } from "@/components/customer-engagement/knowledge-management";
import { mockTopics, defaultFilters } from "@/lib/mock-data/customer-engagement";
import { Topic, Conversation, Filters } from "@/lib/types/customer-engagement";
import { Search, Brain, Database } from "lucide-react";

export default function CustomerEngagementPage() {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [activeTab, setActiveTab] = useState("explorer");

  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopic(topic);
    setSelectedConversation(null); // Reset conversation selection when changing topics
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const handleCloseDetails = () => {
    setSelectedTopic(null);
    setSelectedConversation(null);
  };

  const handleFiltersChange = (newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return (
    <div className="space-y-8">
      {/* Large Tab Navigation as Page Headers */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="grid w-full max-w-4xl grid-cols-3 mx-0 h-20 p-2 bg-gray-100 rounded-xl">
          <TabsTrigger 
            value="explorer" 
            className="flex flex-col items-center justify-center gap-2 h-full text-lg font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200"
          >
            <Search className="h-6 w-6" />
            <div className="text-center">
              <div className="font-bold">Topics Explorer</div>
              <div className="text-xs text-gray-600 font-normal">Analyze customer conversations</div>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="insights" 
            className="flex flex-col items-center justify-center gap-2 h-full text-lg font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200"
          >
            <Brain className="h-6 w-6" />
            <div className="text-center">
              <div className="font-bold">System Insights</div>
              <div className="text-xs text-gray-600 font-normal">AI agent performance analytics</div>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="knowledge" 
            className="flex flex-col items-center justify-center gap-2 h-full text-lg font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200"
          >
            <Database className="h-6 w-6" />
            <div className="text-center">
              <div className="font-bold">Knowledge Management</div>
              <div className="text-xs text-gray-600 font-normal">Agent knowledge updates & feeds</div>
            </div>
          </TabsTrigger>
        </TabsList>

        {/* Topics Explorer Tab */}
        <TabsContent value="explorer" className="space-y-6 mt-6">
          <TopicsExplorer
            topics={mockTopics}
            filters={filters}
            onTopicSelect={handleTopicSelect}
            onFiltersChange={handleFiltersChange}
          />
        </TabsContent>

        {/* System Insights Tab */}
        <TabsContent value="insights" className="space-y-6 mt-6">
          <SystemInsights />
        </TabsContent>

        {/* Knowledge Management Tab */}
        <TabsContent value="knowledge" className="space-y-6 mt-6">
          <KnowledgeManagement />
        </TabsContent>
      </Tabs>

      {/* Topic Details Modal/Panel */}
      {selectedTopic && (
        <TopicDetails
          topic={selectedTopic}
          selectedConversation={selectedConversation}
          onConversationSelect={handleConversationSelect}
          onClose={handleCloseDetails}
        />
      )}
    </div>
  );
}