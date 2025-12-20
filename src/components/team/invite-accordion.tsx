'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RoleSelect } from '@/components/team/role-select';
import { PlayerRole } from '@/entities/player';

interface InviteAccordionProps {
  teamId: string;
  onInviteSent?: () => void;
  isLoading?: boolean;
}

/**
 * T029 [US1] InviteAccordion - 邀請成員表單元件
 * 用於輸入被邀請者 email 和選擇角色
 */
export function InviteAccordion({
  teamId,
  onInviteSent,
  isLoading = false,
}: InviteAccordionProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<PlayerRole>(PlayerRole.MEMBER);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/teams/${teamId}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'invite',
          email,
          role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '邀請失敗，請重試');
      }

      // Reset form
      setEmail('');
      setRole(PlayerRole.MEMBER);
      onInviteSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生未知錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>邀請成員</CardTitle>
        <CardDescription>
          輸入成員的電子郵件地址並選擇角色來邀請他們加入隊伍
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">電子郵件</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading || isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">角色</Label>
            <RoleSelect
              value={role}
              onChange={setRole}
              disabled={isLoading || isSubmitting}
              placeholder="選擇角色"
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || isSubmitting || !email}
            className="w-full"
          >
            {isSubmitting ? '發送中...' : '發送邀請'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
