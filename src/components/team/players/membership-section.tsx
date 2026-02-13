"use client";

import { RoleSelect } from "@/components/team/role-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import type { Player } from "@/entities/player";
import { getPlayerStatus, PlayerRole, PlayerStatus } from "@/entities/player";
import { ROLE_LABELS } from "@/lib/constants/labels";
import { useState } from "react";
import { useSWRConfig } from "swr";

interface MembershipSectionProps {
  player: Player;
  teamId: string;
  isCurrentOwner: boolean;
}

export function MembershipSection({
  player,
  teamId,
  isCurrentOwner,
}: MembershipSectionProps) {
  const { toast } = useToast();
  const { mutate } = useSWRConfig();
  const status = getPlayerStatus(player);

  const revalidate = () => {
    mutate(`/api/players/${player._id}`);
    mutate(`/api/teams/${teamId}/players`);
  };

  if (status === PlayerStatus.PURE_PLAYER) {
    return (
      <InviteSection player={player} onSuccess={revalidate} toast={toast} />
    );
  }

  if (status === PlayerStatus.INVITED) {
    return (
      <InvitedSection player={player} onSuccess={revalidate} toast={toast} />
    );
  }

  // JOINED
  return (
    <JoinedSection
      player={player}
      teamId={teamId}
      isCurrentOwner={isCurrentOwner}
      onSuccess={revalidate}
      toast={toast}
    />
  );
}

// --- PURE_PLAYER: invite form ---
function InviteSection({
  player,
  onSuccess,
  toast,
}: {
  player: Player;
  onSuccess: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PlayerRole>(PlayerRole.MEMBER);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/players/${player._id}/memberships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "邀請失敗");
      }

      toast({ title: "邀請已發送", description: `已向 ${email} 發送邀請` });
      setEmail("");
      setRole(PlayerRole.MEMBER);
      onSuccess();
    } catch (err) {
      toast({
        title: "邀請失敗",
        description: err instanceof Error ? err.message : "發生錯誤",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">發送邀請</h3>
      <form onSubmit={handleInvite} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="invite-email">電子郵件</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>角色</Label>
          <RoleSelect value={role} onChange={setRole} disabled={isSubmitting} />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || !email}
        >
          {isSubmitting ? "發送中..." : "發送邀請"}
        </Button>
      </form>
    </div>
  );
}

// --- INVITED: cancel invitation ---
function InvitedSection({
  player,
  onSuccess,
  toast,
}: {
  player: Player;
  onSuccess: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCancel = async () => {
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/players/${player._id}/memberships`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "取消失敗");
      }

      toast({ title: "邀請已取消" });
      onSuccess();
    } catch (err) {
      toast({
        title: "取消失敗",
        description: err instanceof Error ? err.message : "發生錯誤",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">邀請狀態</h3>
      <div className="rounded-md bg-muted/50 p-3 text-sm">
        <p className="text-muted-foreground">
          已邀請{" "}
          <span className="font-medium text-foreground">{player.email}</span>
        </p>
      </div>
      <Button
        variant="outline"
        className="w-full"
        onClick={handleCancel}
        disabled={isSubmitting}
      >
        {isSubmitting ? "取消中..." : "取消邀請"}
      </Button>
    </div>
  );
}

// --- JOINED: role management + transfer ownership ---
function JoinedSection({
  player,
  teamId,
  isCurrentOwner,
  onSuccess,
  toast,
}: {
  player: Player;
  teamId: string;
  isCurrentOwner: boolean;
  onSuccess: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [role, setRole] = useState<PlayerRole>(
    player.role === PlayerRole.OWNER
      ? PlayerRole.ADMIN
      : player.role || PlayerRole.MEMBER,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isOwnerPlayer = player.role === PlayerRole.OWNER;

  const handleUpdateRole = async () => {
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/players/${player._id}/memberships`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "變更失敗");
      }

      toast({
        title: "角色已變更",
        description: `已變更為${ROLE_LABELS[role]}`,
      });
      onSuccess();
    } catch (err) {
      toast({
        title: "變更失敗",
        description: err instanceof Error ? err.message : "發生錯誤",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (
      !window.confirm(
        `確定要將隊伍所有權移轉給 ${player.name} 嗎？你將被降級為管理員。`,
      )
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/teams/${teamId}/ownership`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newOwnerId: player._id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "移轉失敗");
      }

      toast({
        title: "所有權已移轉",
        description: `${player.name} 已成為新隊長`,
      });
      onSuccess();
    } catch (err) {
      toast({
        title: "移轉失敗",
        description: err instanceof Error ? err.message : "發生錯誤",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isOwnerPlayer) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium">隊籍</h3>
        <div className="rounded-md bg-muted/50 p-3 text-sm">
          <p className="text-muted-foreground">
            角色：
            <span className="font-medium text-foreground">
              {ROLE_LABELS[PlayerRole.OWNER]}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">隊籍管理</h3>
      <div className="space-y-1.5">
        <Label>角色</Label>
        <RoleSelect value={role} onChange={setRole} disabled={isSubmitting} />
      </div>
      {role !== player.role && (
        <Button
          className="w-full"
          onClick={handleUpdateRole}
          disabled={isSubmitting}
        >
          {isSubmitting ? "變更中..." : "變更角色"}
        </Button>
      )}

      {isCurrentOwner && (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleTransferOwnership}
          disabled={isSubmitting}
        >
          移轉所有權給此球員
        </Button>
      )}
    </div>
  );
}
