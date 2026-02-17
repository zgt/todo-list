"use client";

import { Check, Clock } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@acme/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@acme/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@acme/ui/tooltip";

interface MemberStatus {
  id: string;
  name: string;
  image: string | null;
  hasSubmitted: boolean;
  hasVoted: boolean;
}

interface RoundStatusBoardProps {
  memberStatus: MemberStatus[];
  status: string;
}

export function RoundStatusBoard({
  memberStatus,
  status,
}: RoundStatusBoardProps) {
  if (status === "RESULTS" || status === "COMPLETED") {
    return null;
  }

  const isVotingPhase = status === "VOTING";

  const title = isVotingPhase ? "Voting Status" : "Submission Status";

  const sortedMembers = [...memberStatus].sort((a, b) => {
    if (isVotingPhase) {
      if (a.hasVoted === b.hasVoted) return a.name.localeCompare(b.name);
      return a.hasVoted ? 1 : -1;
    } else {
      if (a.hasSubmitted === b.hasSubmitted)
        return a.name.localeCompare(b.name);
      return a.hasSubmitted ? 1 : -1;
    }
  });

  const totalMembers = memberStatus.length;
  const completedCount = memberStatus.filter((m) =>
    isVotingPhase ? m.hasVoted : m.hasSubmitted,
  ).length;

  return (
    <Card className="gap-2 py-3">
      <CardHeader className="px-4 py-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
            {completedCount}/{totalMembers} Ready
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-0">
        <div className="max-h-[300px] overflow-y-auto pr-2">
          <div className="space-y-2">
            {sortedMembers.map((member) => {
              const isComplete = isVotingPhase
                ? member.hasVoted
                : member.hasSubmitted;

              return (
                <div
                  key={member.id}
                  className="group flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.image ?? undefined} />
                      <AvatarFallback className="text-[9px]">
                        {member.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`text-xs font-medium ${isComplete ? "text-muted-foreground" : "text-foreground"}`}
                    >
                      {member.name}
                    </span>
                  </div>
                  <StatusIndicator isComplete={isComplete} />
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusIndicator({ isComplete }: { isComplete: boolean }) {
  if (isComplete) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className="flex h-5 w-5 items-center justify-center rounded-full text-green-600">
              <Check className="h-3 w-3" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">Ready</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="text-muted-foreground/30 flex h-5 w-5 items-center justify-center rounded-full">
            <Clock className="h-3 w-3" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="text-xs">Waiting...</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
