"use client";

import { RoleSelect } from "@/components/team/role-select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import type { Player } from "@/entities/player";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { apiClient } from "@/lib/api/api-client";
import { getErrorMessage, showErrorToast } from "@/lib/api/error-toast";
import { ROLE_LABELS } from "@/lib/constants/labels";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const status = player.status;
  const isJoined = status === PlayerStatus.JOINED;
  const isOwnerPlayer = player.role === PlayerRole.OWNER;

  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  const revalidate = () => {
    mutate(`/api/players/${player._id}`);
    mutate(`/api/teams/${teamId}/players`);
  };

  const handleRemove = async () => {
    setRemoveError(null);
    setIsRemoving(true);
    try {
      await apiClient(`/api/players/${player._id}`, {
        method: "DELETE",
      });

      setRemoveOpen(false);
      toast({
        title: "成員已移除",
        description: `${player.name} 已從隊伍中移除`,
      });
      mutate(`/api/teams/${teamId}/players`);
      router.push(`/team/${teamId}`);
    } catch (err) {
      setRemoveError(getErrorMessage(err));
    } finally {
      setIsRemoving(false);
    }
  };

  const handleTransferOwnership = async () => {
    setTransferError(null);
    setIsTransferring(true);
    try {
      await apiClient(`/api/teams/${teamId}/ownership`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newOwnerId: player._id }),
      });

      setTransferOpen(false);
      toast({
        title: "所有權已移轉",
        description: `${player.name} 已成為新隊長`,
      });
      revalidate();
    } catch (err) {
      setTransferError(getErrorMessage(err));
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <>
      {status === PlayerStatus.NONE && (
        <InviteSection player={player} onSuccess={revalidate} toast={toast} />
      )}

      {status === PlayerStatus.INVITED && (
        <InvitedSection player={player} onSuccess={revalidate} toast={toast} />
      )}

      {isJoined && (
        <JoinedSection player={player} onSuccess={revalidate} toast={toast} />
      )}

      {!isOwnerPlayer && (
        <>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-destructive">移除成員</h3>
            <AlertDialog
              open={removeOpen}
              onOpenChange={(open) => {
                setRemoveOpen(open);
                if (!open) setRemoveError(null);
              }}
            >
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={isRemoving}>
                  移除成員
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    確定要將 {player.name} 從隊伍中移除嗎？
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    移除後該成員將無法繼續使用隊伍相關功能。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  {removeError && (
                    <p className="w-full text-sm text-destructive">
                      {removeError}
                    </p>
                  )}
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <Button
                    variant="destructive"
                    onClick={handleRemove}
                    loading={isRemoving}
                  >
                    確認移除
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}

      {isJoined && !isOwnerPlayer && isCurrentOwner && (
        <>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-destructive">移轉所有權</h3>
            <AlertDialog
              open={transferOpen}
              onOpenChange={(open) => {
                setTransferOpen(open);
                if (!open) setTransferError(null);
              }}
            >
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={isTransferring}>
                  移轉所有權給此球員
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    確定要將隊伍所有權移轉給 {player.name} 嗎？
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    移轉後你將被降級為管理員，{player.name} 將成為新隊長。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  {transferError && (
                    <p className="w-full text-sm text-destructive">
                      {transferError}
                    </p>
                  )}
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <Button
                    variant="destructive"
                    onClick={handleTransferOwnership}
                    loading={isTransferring}
                  >
                    確認移轉
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </>
  );
}

type FoundUser = { _id: string; name: string; image?: string };

// --- NONE: invite section with user search ---
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
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searchDone, setSearchDone] = useState(false);

  const handleSearch = async () => {
    if (!email) return;
    setIsSearching(true);
    setFoundUser(null);
    setSearchDone(false);

    try {
      const data = await apiClient<FoundUser>(
        `/api/users?email=${encodeURIComponent(email)}`,
      );
      setFoundUser(data);
    } catch {
      setFoundUser(null);
    } finally {
      setIsSearching(false);
      setSearchDone(true);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await apiClient(`/api/players/${player._id}/memberships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      toast({ title: "邀請已發送", description: `已向 ${email} 發送邀請` });
      setEmail("");
      setRole(PlayerRole.MEMBER);
      setFoundUser(null);
      setSearchDone(false);
      onSuccess();
    } catch (err) {
      showErrorToast(err, toast);
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
          <div className="flex gap-2">
            <Input
              id="invite-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFoundUser(null);
                setSearchDone(false);
              }}
              disabled={isSubmitting}
              required
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleSearch}
              disabled={isSearching || !email}
            >
              {isSearching ? "搜尋中..." : "搜尋"}
            </Button>
          </div>
        </div>

        {searchDone && (
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            {foundUser ? (
              <p className="text-foreground">
                找到用戶：<span className="font-medium">{foundUser.name}</span>
              </p>
            ) : (
              <p className="text-muted-foreground">
                此 email 尚未在系統中註冊，邀請將以 email 方式發送。
              </p>
            )}
          </div>
        )}

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
      await apiClient(`/api/players/${player._id}/memberships`, {
        method: "DELETE",
      });

      toast({ title: "邀請已取消" });
      onSuccess();
    } catch (err) {
      showErrorToast(err, toast);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">邀請狀態</h3>
      <div className="rounded-md bg-muted/50 p-3 text-sm">
        {player.userId ? (
          <p className="text-muted-foreground">
            已邀請已註冊用戶（
            <span className="font-medium text-foreground">
              userId: {player.userId}
            </span>
            ）
          </p>
        ) : (
          <p className="text-muted-foreground">
            已邀請{" "}
            <span className="font-medium text-foreground">{player.email}</span>
          </p>
        )}
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

// --- JOINED: role management only ---
function JoinedSection({
  player,
  onSuccess,
  toast,
}: {
  player: Player;
  onSuccess: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [role, setRole] = useState<PlayerRole>(
    player.role === PlayerRole.OWNER
      ? PlayerRole.ADMIN
      : player.role || PlayerRole.MEMBER,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateRole = async () => {
    setIsSubmitting(true);

    try {
      await apiClient(`/api/players/${player._id}/memberships`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      toast({
        title: "角色已變更",
        description: `已變更為${ROLE_LABELS[role]}`,
      });
      onSuccess();
    } catch (err) {
      showErrorToast(err, toast);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (player.role === PlayerRole.OWNER) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium">隊籍</h3>
        <div className="rounded-md bg-muted/50 p-3 text-sm">
          <p className="font-medium">{ROLE_LABELS[PlayerRole.OWNER]}</p>
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
      <Button
        className="w-full"
        onClick={handleUpdateRole}
        disabled={isSubmitting || role === player.role}
      >
        {isSubmitting ? "變更中..." : "變更角色"}
      </Button>
    </div>
  );
}
