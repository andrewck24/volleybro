"use client";

import { ServerErrorState } from "@/components/custom/error/server-error-state";
import { MembershipSection } from "@/components/team/players/membership-section";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { PlayerRole } from "@/entities/player";
import { usePlayer, useTeamPlayers, useUser } from "@/hooks/use-data";
import { apiClient } from "@/lib/api/api-client";
import { showErrorToast } from "@/lib/api/error-toast";
import type { PlayerView } from "@/lib/features/team/types";
import { UpdatePlayerInfoSchema, type UpdatePlayerInfoInput } from "@/lib/validations/player";
import { zodResolver } from "@hookform/resolvers/zod";
import { FiUser } from "react-icons/fi";
import { useEffect } from "react";
import { type Resolver } from "react-hook-form";
import { useFormDraft } from "@/hooks/use-form-draft";
import { useLeavePageWarning } from "@/hooks/use-leave-page-warning";
import { useSWRConfig } from "swr";

interface EditFormProps {
  teamId: string;
  playerId: string;
  onStateChange?: (isDirty: boolean) => void;
}

export function EditForm({ teamId, playerId, onStateChange }: EditFormProps) {
  const { player, isLoading, error, mutate } = usePlayer(playerId);
  const { user } = useUser();
  const { players: teamPlayers } = useTeamPlayers(teamId);

  if (isLoading) return <PlayerEditFormSkeleton />;
  if (error) return <ServerErrorState onRetry={() => mutate()} />;
  if (!player)
    return (
      <Empty>
        <EmptyMedia variant="icon">
          <FiUser />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>找不到球員</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );

  const currentUserPlayer = teamPlayers?.find((p) => p.userId === user?.id);
  const isCurrentOwner = currentUserPlayer?.role === PlayerRole.OWNER;
  const showMembership =
    currentUserPlayer &&
    (currentUserPlayer.role === PlayerRole.OWNER ||
      currentUserPlayer.role === PlayerRole.ADMIN);

  return (
    <Card className="py-8">
      <InfoSection player={player} teamId={teamId} onStateChange={onStateChange} />
      {showMembership && (
        <>
          <Separator />
          <MembershipSection
            player={player}
            teamId={teamId}
            isCurrentOwner={isCurrentOwner}
          />
        </>
      )}
    </Card>
  );
}

function PlayerEditFormSkeleton() {
  return (
    <Card className="space-y-4 py-8">
      <Skeleton className="mt-0.5 mb-4.5 h-4 w-16" />{" "}
      {/* section title: text-sm */}
      <div className="space-y-2">
        <Skeleton className="my-0.5 h-4 w-12" /> {/* Label */}
        <Skeleton className="h-9 w-full" /> {/* Input */}
      </div>
      <div className="space-y-2">
        <Skeleton className="my-0.5 h-4 w-8" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="my-0.5 h-4 w-8" />
        <Skeleton className="h-9 w-full" />
      </div>
      <Skeleton className="h-9 w-full" /> {/* submit button */}
    </Card>
  );
}

function InfoSection({
  player,
  teamId,
  onStateChange,
}: {
  player: PlayerView;
  teamId: string;
  onStateChange?: (isDirty: boolean) => void;
}) {
  const { toast } = useToast();
  const { mutate } = useSWRConfig();

  const { form, clearDraft } = useFormDraft<UpdatePlayerInfoInput>(
    `draft:player:${player.id}`,
    {
      resolver: zodResolver(UpdatePlayerInfoSchema) as Resolver<UpdatePlayerInfoInput>,
      defaultValues: {
        name: player.name,
        number: player.number,
        position: player.position,
      },
    },
  );
  const { isDirty } = form.formState;
  useLeavePageWarning(isDirty);

  useEffect(() => {
    onStateChange?.(isDirty);
  }, [isDirty, onStateChange]);

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await apiClient(`/api/players/${player.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      toast({ title: "已更新", description: "球員資訊已更新" });
      mutate(`/api/players/${player.id}`);
      mutate(`/api/teams/${teamId}/players`);
      clearDraft();
    } catch (error) {
      showErrorToast(error, toast);
      form.setError("root", { message: "更新失敗，請稍後再試" });
    }
  });

  return (
    <Form form={form} onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-medium">基本資訊</h3>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>姓名</FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ""} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="number"
        render={({ field: { onChange, value, ...rest } }) => (
          <FormItem>
            <FormLabel>背號</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={0}
                max={99}
                value={value ?? ""}
                onChange={(e) =>
                  onChange(
                    e.target.value ? parseInt(e.target.value, 10) : undefined,
                  )
                }
                {...rest}
              />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="position"
        render={({ field }) => (
          <FormItem>
            <FormLabel>位置</FormLabel>
            <Select
              onValueChange={(v) => field.onChange(v === "NONE" ? undefined : v)}
              value={field.value ?? "NONE"}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="選擇位置" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="NONE">無</SelectItem>
                <SelectItem value="OH">攻擊手 (OH)</SelectItem>
                <SelectItem value="MB">中間攔網手 (MB)</SelectItem>
                <SelectItem value="OP">對角 (OP)</SelectItem>
                <SelectItem value="S">舉球員 (S)</SelectItem>
                <SelectItem value="L">自由人 (L)</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
      {form.formState.errors.root && (
        <p className="text-sm text-destructive">
          {form.formState.errors.root.message}
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "儲存中..." : "儲存變更"}
      </Button>
    </Form>
  );
}
