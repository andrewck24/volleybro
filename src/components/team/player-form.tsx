'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Position, PlayerRole } from '@/entities/player';
import { CreatePlayerSchema } from '@/lib/validations/player';
import type { CreatePlayerInput } from '@/lib/validations/player';
import { ZodError } from 'zod';

interface PlayerFormProps {
  onSubmit: (data: CreatePlayerInput) => Promise<void>;
  isLoading?: boolean;
  isInvitation?: boolean; // true if creating invitation (with email), false for pure player
}

export function PlayerForm({
  onSubmit,
  isLoading = false,
  isInvitation = false,
}: PlayerFormProps) {
  const [formData, setFormData] = useState<Partial<CreatePlayerInput>>({
    name: '',
    role: PlayerRole.MEMBER,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'number' ? (value ? parseInt(value, 10) : undefined) : value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value || undefined,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const validated = CreatePlayerSchema.parse(formData);
      await onSubmit(validated);
      // Reset form on success
      setFormData({
        name: '',
        role: PlayerRole.MEMBER,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          const path = issue.path.join('.');
          newErrors[path] = issue.message;
        });
        setErrors(newErrors);
      } else if (error instanceof Error) {
        setErrors({ submit: error.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          姓名 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          name="name"
          placeholder="輸入姓名"
          value={formData.name || ''}
          onChange={handleChange}
          disabled={isLoading || isSubmitting}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-red-500">
            {errors.name}
          </p>
        )}
      </div>

      {/* Number */}
      <div className="space-y-2">
        <Label htmlFor="number">背號</Label>
        <Input
          id="number"
          name="number"
          type="number"
          min="0"
          max="99"
          placeholder="例: 10"
          value={formData.number || ''}
          onChange={handleChange}
          disabled={isLoading || isSubmitting}
          aria-invalid={!!errors.number}
          aria-describedby={errors.number ? 'number-error' : undefined}
        />
        {errors.number && (
          <p id="number-error" className="text-sm text-red-500">
            {errors.number}
          </p>
        )}
      </div>

      {/* Position */}
      <div className="space-y-2">
        <Label htmlFor="position">位置</Label>
        <Select
          value={formData.position || 'NONE'}
          onValueChange={(value) => handleSelectChange('position', value === 'NONE' ? '' : value)}
        >
          <SelectTrigger id="position" disabled={isLoading || isSubmitting}>
            <SelectValue placeholder="選擇位置" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">無</SelectItem>
            <SelectItem value="OH">攻擊手 (OH)</SelectItem>
            <SelectItem value="MB">中間攔網手 (MB)</SelectItem>
            <SelectItem value="OP">對角 (OP)</SelectItem>
            <SelectItem value="S">舞者/二傳 (S)</SelectItem>
            <SelectItem value="L">自由人 (L)</SelectItem>
          </SelectContent>
        </Select>
        {errors.position && (
          <p className="text-sm text-red-500">{errors.position}</p>
        )}
      </div>

      {/* Email (for invitations) */}
      {isInvitation && (
        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="user@example.com"
            value={formData.email || ''}
            onChange={handleChange}
            disabled={isLoading || isSubmitting}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-red-500">
              {errors.email}
            </p>
          )}
        </div>
      )}

      {/* Role */}
      <div className="space-y-2">
        <Label htmlFor="role">角色</Label>
        <Select
          value={formData.role || PlayerRole.MEMBER}
          onValueChange={(value) => handleSelectChange('role', value)}
        >
          <SelectTrigger id="role" disabled={isLoading || isSubmitting}>
            <SelectValue placeholder="選擇角色" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PlayerRole.MEMBER}>成員</SelectItem>
            <SelectItem value={PlayerRole.ADMIN}>管理員</SelectItem>
            {!isInvitation && <SelectItem value={PlayerRole.OWNER}>擁有者</SelectItem>}
          </SelectContent>
        </Select>
        {errors.role && (
          <p className="text-sm text-red-500">{errors.role}</p>
        )}
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <p className="text-sm text-red-500">{errors.submit}</p>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? '提交中...' : isInvitation ? '邀請' : '新增球員'}
      </Button>
    </form>
  );
}
