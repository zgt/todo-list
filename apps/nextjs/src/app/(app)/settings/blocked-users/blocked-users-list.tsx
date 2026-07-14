"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ShieldOff } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@acme/ui/avatar";
import { Button } from "@acme/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@acme/ui/card";

import { useTRPC } from "~/trpc/react";

export function BlockedUsersList() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: blockedUsers } = useSuspenseQuery(
    trpc.moderation.getBlockedUsers.queryOptions(),
  );

  const unblockUser = useMutation(
    trpc.moderation.unblockUser.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.moderation.getBlockedUsers.queryFilter(),
        );
        void queryClient.invalidateQueries(
          trpc.moderation.getBlockedUserIds.queryFilter(),
        );
      },
    }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {blockedUsers.length > 0
            ? `${blockedUsers.length} blocked user${blockedUsers.length !== 1 ? "s" : ""}`
            : "No blocked users"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {blockedUsers.length > 0 ? (
          <div className="space-y-3">
            {blockedUsers.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={entry.user.image ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                    {entry.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {entry.user.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Blocked {new Date(entry.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    unblockUser.mutate({
                      blockedUserId: entry.blockedUserId,
                    })
                  }
                  disabled={unblockUser.isPending}
                >
                  Unblock
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <ShieldOff className="text-muted-foreground h-10 w-10" />
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                No blocked users
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Users you block will appear here. You can unblock them at any
                time.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
