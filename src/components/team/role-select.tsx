'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlayerRole } from '@/entities/player';

interface RoleSelectProps {
  value: PlayerRole;
  onChange: (value: PlayerRole) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ROLE_LABELS: Record<PlayerRole, string> = {
  [PlayerRole.MEMBER]: '成員',
  [PlayerRole.ADMIN]: '管理員',
  [PlayerRole.OWNER]: '隊長',
};

/**
 * T030 [US1] RoleSelect - 角色選擇元件
 * 用於邀請時選擇被邀請者的角色
 */
export function RoleSelect({
  value,
  onChange,
  disabled = false,
  placeholder = '選擇角色',
}: RoleSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={PlayerRole.MEMBER}>
          {ROLE_LABELS[PlayerRole.MEMBER]}
        </SelectItem>
        <SelectItem value={PlayerRole.ADMIN}>
          {ROLE_LABELS[PlayerRole.ADMIN]}
        </SelectItem>
        {/* OWNER 角色通常由系統管理，不在邀請時選擇 */}
      </SelectContent>
    </Select>
  );
}
