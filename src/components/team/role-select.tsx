"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlayerRole } from "@/entities/player";
import { ROLE_LABELS } from "@/lib/constants/labels";

interface RoleSelectProps {
  value: PlayerRole;
  onChange: (value: PlayerRole) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * T030 [US1] RoleSelect - 角色選擇元件
 * 用於邀請時選擇被邀請者的角色
 */
export function RoleSelect({
  value,
  onChange,
  disabled = false,
  placeholder = "選擇角色",
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
