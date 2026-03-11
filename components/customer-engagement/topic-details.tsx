"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Topic, 
  Conversation, 
  ToolCall,
  UserPermission,
  getCXScoreColor 
} from "@/lib/types/customer-engagement";
import { 
  X, 
  MessageSquare, 
  Star, 
  Clock, 
  User,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  FileText,
  Shield,
  Settings,
  Unlock,
  Lock,
  Activity,
  Search,
  Filter,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  getAnonymizedName, 
  maskPII, 
  generateConversationSummary, 
  getAvatarInitials, 
  getAvatarColor 
} from "@/lib/utils/anonymization";
import { MessageContentWithPII } from "./pii-chip";

interface TopicDetailsProps {
  topic: Topic;
  selectedConversation: Conversation | null;
  onConversationSelect: (conversation: Conversation) => void;
  onClose: () => void;
}

// Conversation List Item Component
const ConversationListItem = ({ 
  conversation, 
  isSelected, 
  onClick 
}: { 
  conversation: Conversation; 
  isSelected: boolean; 
  onClick: () => void;
}) => {
  const anonymizedName = getAnonymizedName(conversation.customer.name);
  const avatarInitials = getAvatarInitials(anonymizedName);
  const avatarColor = getAvatarColor(anonymizedName);
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'text-green-600 bg-green-50 border-green-200';
      case 'pending': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'escalated': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return CheckCircle;
      case 'pending': return Clock;
      case 'escalated': return AlertCircle;
      default: return MessageSquare;
    }
  };

  const StatusIcon = getStatusIcon(conversation.status);

  return (
    <div
      className={cn(
        "p-4 border-l-4 cursor-pointer transition-all duration-200 hover:bg-blue-50",
        isSelected ? "bg-blue-100 border-l-blue-500" : "border-l-transparent hover:border-l-blue-200"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarFallback className={cn("bg-gradient-to-br text-white font-medium", avatarColor)}>
            {avatarInitials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium text-gray-900 truncate">
              {anonymizedName}
            </h4>
            <div className="flex items-center gap-2">
              <Badge className={cn("border text-xs", getCXScoreColor(conversation.cxRating * 20))}>
                {conversation.cxRating}/5
              </Badge>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
            {conversation.preview}
          </p>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <StatusIcon className="h-3 w-3" />
              <span className="capitalize">{conversation.status}</span>
            </div>
            <span>
              {formatDistanceToNow(conversation.updatedAt, { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Conversation Detail Component
const ConversationDetail = ({ conversation }: { conversation: Conversation }) => {
  const anonymizedName = getAnonymizedName(conversation.customer.name);
  const avatarInitials = getAvatarInitials(anonymizedName);
  const avatarColor = getAvatarColor(anonymizedName);
  const conversationSummary = generateConversationSummary(conversation.messages);
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b bg-white">
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className={cn("bg-gradient-to-br text-white font-medium", avatarColor)}>
              {avatarInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {anonymizedName}
            </h3>
            <p className="text-sm text-gray-600">{conversation.customer.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-500">Privacy Protected</span>
          </div>
        </div>
        
        {/* Conversation Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">Conversation Summary</h4>
              <p className="text-sm text-blue-700">{conversationSummary}</p>
            </div>
          </div>
        </div>
        
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Started {format(conversation.createdAt, 'MMM dd, yyyy')}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            <span>{conversation.messages.length} messages</span>
          </div>
          <Badge className={cn("border", getCXScoreColor(conversation.cxRating * 20))}>
            CX: {conversation.cxRating}/5
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-6 xl:space-y-8 p-6 xl:p-8 2xl:p-10">
            
            {/* Tool Calls Section - At the top of messages */}
            <ToolCallsSection toolCalls={conversation.toolCalls || []} />
            
            {/* User Permissions Section - After tool calls */}
            <UserPermissionsSection permissions={conversation.permissions || []} />
            
            {conversation.messages.map((message, index) => {
            const isCustomerMessage = message.sender === 'customer';
            const { maskedContent, hasPII } = maskPII(message.content, isCustomerMessage);
            
            return (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                isCustomerMessage ? 'flex-row' : 'flex-row-reverse'
              )}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className={cn(
                  isCustomerMessage 
                    ? avatarColor
                    : "bg-gradient-to-br from-green-500 to-teal-600",
                  "text-white font-medium text-sm"
                )}>
                  {isCustomerMessage 
                    ? avatarInitials
                    : 'AG'
                  }
                </AvatarFallback>
              </Avatar>
              
              <div className={cn(
                "max-w-[75%] xl:max-w-[70%] 2xl:max-w-[65%] space-y-1",
                isCustomerMessage ? 'items-start' : 'items-end'
              )}>
                <div className={cn(
                  "px-4 py-3 xl:px-5 xl:py-4 rounded-2xl relative",
                  isCustomerMessage
                    ? "bg-blue-600 text-white rounded-tl-sm"
                    : "bg-gray-100 text-gray-900 rounded-tr-sm"
                )}>
                  <div className="text-sm xl:text-base leading-relaxed">
                    <MessageContentWithPII 
                      content={maskedContent} 
                      isCustomerMessage={isCustomerMessage}
                    />
                  </div>
                  {hasPII && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-blue-500/20">
                      <Shield className="h-3 w-3 text-yellow-300" />
                      <span className="text-xs opacity-90">Private information protected</span>
                    </div>
                  )}
                  {message.cxRating && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-blue-500/20">
                      <Star className="h-3 w-3 text-yellow-300 fill-current" />
                      <span className="text-xs opacity-90">Rated {message.cxRating}/5</span>
                    </div>
                  )}
                </div>
                
                <div className={cn(
                  "flex items-center gap-2 px-2",
                  isCustomerMessage ? 'justify-start' : 'justify-end'
                )}>
                  <span className="text-xs text-gray-500">
                    {isCustomerMessage ? anonymizedName : 'Support Agent'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {format(message.timestamp, 'HH:mm')}
                  </span>
                </div>
              </div>
            </div>
          );})}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

// Tool Calls Component
const ToolCallsSection = ({ toolCalls }: { toolCalls: ToolCall[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!toolCalls || toolCalls.length === 0) return null;

  const getStatusIcon = (status: ToolCall['status']) => {
    switch (status) {
      case 'success': return CheckCircle;
      case 'error': return AlertCircle;
      case 'pending': return Clock;
      default: return Activity;
    }
  };

  const getStatusColor = (status: ToolCall['status']) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'pending': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full text-left hover:bg-purple-100 rounded p-1 -m-1 transition-colors">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-purple-600 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-purple-900">Agent Tool Calls</h4>
                {!isOpen && (
                  <div className="flex items-center gap-1 mt-1">
                    {toolCalls.slice(0, 3).map((toolCall, index) => {
                      const StatusIcon = getStatusIcon(toolCall.status);
                      return (
                        <Badge key={toolCall.id} className={cn("border text-xs h-5", getStatusColor(toolCall.status))}>
                          <StatusIcon className="h-2.5 w-2.5 mr-1" />
                          {toolCall.name}
                        </Badge>
                      );
                    })}
                    {toolCalls.length > 3 && (
                      <Badge variant="outline" className="text-xs h-5 text-purple-700 border-purple-300">
                        +{toolCalls.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-purple-600 transition-transform" />
            ) : (
              <ChevronRight className="h-4 w-4 text-purple-600 transition-transform" />
            )}
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-3">
          <p className="text-xs text-purple-700 mb-3">Actions performed by the AI agent during this conversation</p>
          <div className="space-y-2">
            {toolCalls.map((toolCall) => {
              const StatusIcon = getStatusIcon(toolCall.status);
              return (
                <div key={toolCall.id} className="bg-white border border-purple-200 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={cn("border text-xs", getStatusColor(toolCall.status))}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {toolCall.status}
                      </Badge>
                      <span className="font-medium text-sm">{toolCall.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {format(toolCall.timestamp, 'HH:mm')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{toolCall.description}</p>
                  {toolCall.result && (
                    <div className="bg-gray-50 border rounded p-2 text-xs text-gray-700">
                      <strong>Result:</strong> {toolCall.result}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

// User Permissions Component
const UserPermissionsSection = ({ permissions }: { permissions: UserPermission[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!permissions || permissions.length === 0) return null;

  const getDurationColor = (duration: UserPermission['duration']) => {
    switch (duration) {
      case 'permanent': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'session': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'one-time': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getDurationLabel = (duration: UserPermission['duration']) => {
    switch (duration) {
      case 'permanent': return 'Permanent';
      case 'session': return 'Session Only';
      case 'one-time': return 'One-Time Only';
      default: return 'Unknown';
    }
  };

  const grantedPermissions = permissions.filter(p => p.granted);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full text-left hover:bg-amber-100 rounded p-1 -m-1 transition-colors">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-amber-900">User Permissions</h4>
                {!isOpen && (
                  <div className="flex items-center gap-1 mt-1">
                    {grantedPermissions.slice(0, 2).map((permission) => {
                      const PermissionIcon = permission.granted ? Unlock : Lock;
                      return (
                        <Badge key={permission.id} className={cn("border text-xs h-5", getDurationColor(permission.duration))}>
                          <PermissionIcon className="h-2.5 w-2.5 mr-1" />
                          {permission.action}
                        </Badge>
                      );
                    })}
                    {grantedPermissions.length > 2 && (
                      <Badge variant="outline" className="text-xs h-5 text-amber-700 border-amber-300">
                        +{grantedPermissions.length - 2} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-amber-600 transition-transform" />
            ) : (
              <ChevronRight className="h-4 w-4 text-amber-600 transition-transform" />
            )}
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-3">
          <p className="text-xs text-amber-700 mb-3">Permissions granted by the user during this conversation</p>
          <div className="space-y-2">
            {permissions.map((permission) => {
              const PermissionIcon = permission.granted ? Unlock : Lock;
              return (
                <div key={permission.id} className="bg-white border border-amber-200 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <PermissionIcon className={cn("h-3 w-3", permission.granted ? "text-green-600" : "text-red-600")} />
                      <span className="font-medium text-sm">{permission.action}</span>
                      <Badge className={cn("border text-xs", getDurationColor(permission.duration))}>
                        {getDurationLabel(permission.duration)}
                      </Badge>
                    </div>
                    {permission.grantedAt && (
                      <span className="text-xs text-gray-500">
                        {format(permission.grantedAt, 'HH:mm')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{permission.description}</p>
                  {permission.expiresAt && (
                    <p className="text-xs text-red-600 mt-1">
                      Expires: {format(permission.expiresAt, 'MMM dd, yyyy HH:mm')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

// Empty State Component
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8">
    <MessageSquare className="h-16 w-16 text-gray-300 mb-4" />
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      Select a conversation
    </h3>
    <p className="text-gray-600">
      Choose a conversation from the list to view the full discussion and customer ratings.
    </p>
  </div>
);

export function TopicDetails({ 
  topic, 
  selectedConversation, 
  onConversationSelect, 
  onClose 
}: TopicDetailsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');

  // Filter and sort conversations
  const filteredConversations = topic.conversations
    .filter(conv => {
      const matchesSearch = !searchQuery.trim() || 
        conv.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.messages.some(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'oldest':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'rating-high':
          return b.cxRating - a.cxRating;
        case 'rating-low':
          return a.cxRating - b.cxRating;
        default:
          return 0;
      }
    });

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!selectedConversation && filteredConversations.length > 0) {
      onConversationSelect(filteredConversations[0]);
    }
  }, [topic, selectedConversation, onConversationSelect, filteredConversations]);

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="!max-w-[95vw] !w-[min(95vw,1600px)] max-h-[90vh] p-0 overflow-hidden animate-in slide-in-from-bottom-10 fade-in-0 duration-300 lg:!max-w-[1600px] xl:!max-w-[1800px] 2xl:!max-w-[2000px]">
        <DialogHeader className="p-6 pb-4">
          <div className="space-y-2">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {topic.name}
            </DialogTitle>
            <p className="text-gray-600 text-base">
              {topic.description}
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>{topic.conversations.length} conversations</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4" />
                <span>Avg CX Score: {topic.cxScore}%</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="flex h-[75vh] flex-col lg:flex-row">
          {/* Conversation List - Left Panel */}
          <div className="w-full lg:w-1/3 xl:w-1/4 2xl:w-1/5 border-r lg:border-b-0 border-b bg-gray-50 h-[35vh] lg:h-full flex flex-col">
            <div className="p-4 border-b bg-white">
              <h3 className="font-semibold text-gray-900 mb-3">
                {filteredConversations.length} of {topic.conversations.length} conversations
              </h3>
              
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                <Input 
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-8 text-sm bg-white border-gray-200 text-gray-900 placeholder:text-gray-500 focus-visible:border-blue-300 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-200"
                />
              </div>
              
              {/* Filters */}
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-sm flex-1">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-8 text-sm flex-1">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="rating-high">Highest Rating</SelectItem>
                    <SelectItem value="rating-low">Lowest Rating</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="pb-4">
                  {filteredConversations.length > 0 ? (
                    filteredConversations.map((conversation) => (
                      <ConversationListItem
                        key={conversation.id}
                        conversation={conversation}
                        isSelected={selectedConversation?.id === conversation.id}
                        onClick={() => onConversationSelect(conversation)}
                      />
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No conversations match your filters</p>
                      <button 
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('all');
                        }}
                        className="text-blue-600 hover:text-blue-700 text-xs mt-1"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Conversation Detail - Right Panel */}
          <div className="flex-1 bg-white min-h-[40vh] lg:min-h-full">
            {selectedConversation ? (
              <ConversationDetail conversation={selectedConversation} />
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}