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
      </SelectContent>
    </Select>
  );
}
