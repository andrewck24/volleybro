"use client";

import LoadingCard from "@/components/custom/loading/card";
import { MembershipSection } from "@/components/team/players/membership-section";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import type { Player } from "@/entities/player";
import { PlayerRole, canManageTeam } from "@/entities/player";
import { usePlayer, useTeamPlayers, useUser } from "@/hooks/use-data";
import { UpdatePlayerInfoSchema } from "@/lib/validations/player";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { ZodError } from "zod";

interface EditFormProps {
  teamId: string;
  playerId: string;
}

export function EditForm({ teamId, playerId }: EditFormProps) {
  const { player, isLoading, error } = usePlayer(playerId);
  const { user } = useUser();
  const { players: teamPlayers } = useTeamPlayers(teamId);

  if (isLoading) return <LoadingCard />;
  if (error)
    return <div className="p-4 text-sm text-destructive">載入失敗</div>;
  if (!player)
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        找不到球員
      </div>
    );

  const currentUserPlayer = teamPlayers?.find((p) => p.userId === user?._id);
  const isCurrentOwner = currentUserPlayer?.role === PlayerRole.OWNER;
  const showMembership = currentUserPlayer && canManageTeam(currentUserPlayer);

  return (
    <Card className="py-8">
      <InfoSection player={player} teamId={teamId} />
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

function InfoSection({ player, teamId }: { player: Player; teamId: string }) {
  const { toast } = useToast();
  const { mutate } = useSWRConfig();
  const [formData, setFormData] = useState({
    name: player.name,
    number: player.number,
    position: player.position || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "number" ? (value ? parseInt(value, 10) : undefined) : value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const data = {
        name: formData.name,
        number: formData.number,
        position: formData.position || undefined,
      };
      const validated = UpdatePlayerInfoSchema.parse(data);

      const res = await fetch(`/api/players/${player._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.error || "更新失敗");
      }

      toast({ title: "已更新", description: "球員資訊已更新" });
      mutate(`/api/players/${player._id}`);
      mutate(`/api/teams/${teamId}/players`);
    } catch (error) {
      if (error instanceof ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          newErrors[issue.path.join(".")] = issue.message;
        });
        setErrors(newErrors);
      } else if (error instanceof Error) {
        toast({
          title: "更新失敗",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-medium">基本資訊</h3>

      <div className="space-y-2">
        <Label htmlFor="edit-name">
          姓名 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="edit-name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          disabled={isSubmitting}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "edit-name-error" : undefined}
        />
        {errors.name && (
          <p id="edit-name-error" className="text-sm text-red-500">
            {errors.name}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-number">背號</Label>
        <Input
          id="edit-number"
          name="number"
          type="number"
          min="0"
          max="99"
          value={formData.number ?? ""}
          onChange={handleChange}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-position">位置</Label>
        <Select
          value={formData.position || "NONE"}
          onValueChange={(value) =>
            setFormData((prev) => ({
              ...prev,
              position: value === "NONE" ? "" : value,
            }))
          }
        >
          <SelectTrigger id="edit-position" disabled={isSubmitting}>
            <SelectValue placeholder="選擇位置" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">無</SelectItem>
            <SelectItem value="OH">攻擊手 (OH)</SelectItem>
            <SelectItem value="MB">中間攔網手 (MB)</SelectItem>
            <SelectItem value="OP">對角 (OP)</SelectItem>
            <SelectItem value="S">舉球員 (S)</SelectItem>
            <SelectItem value="L">自由人 (L)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "儲存中..." : "儲存變更"}
      </Button>
    </form>
  );
}
