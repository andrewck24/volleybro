"use client";

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
import { useToast } from "@/components/ui/use-toast";
import { PlayerRole } from "@/entities/player";
import { apiClient } from "@/lib/api/api-client";
import { showErrorToast } from "@/lib/api/error-toast";
import {
  CreatePlayerSchema,
  type CreatePlayerInput,
} from "@/lib/validations/player";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { ZodError } from "zod";

interface CreateFormProps {
  teamId: string;
}

export function CreateForm({ teamId }: CreateFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { mutate } = useSWRConfig();
  const [formData, setFormData] = useState<Partial<CreatePlayerInput>>({
    name: "",
    role: PlayerRole.MEMBER,
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

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value || undefined,
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
      const validated = CreatePlayerSchema.parse(formData);

      await apiClient(`/api/teams/${teamId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      toast({ title: "成功", description: "球員已新增" });
      mutate(`/api/teams/${teamId}/players`);
      router.push(`/team/${teamId}`);
    } catch (error) {
      if (error instanceof ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          newErrors[issue.path.join(".")] = issue.message;
        });
        setErrors(newErrors);
      } else {
        showErrorToast(error, toast);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="py-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            姓名 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            placeholder="輸入姓名"
            value={formData.name || ""}
            onChange={handleChange}
            disabled={isSubmitting}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {errors.name && (
            <p id="name-error" className="text-sm text-red-500">
              {errors.name}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="number">背號</Label>
          <Input
            id="number"
            name="number"
            type="number"
            min="0"
            max="99"
            placeholder="例: 10"
            value={formData.number ?? ""}
            onChange={handleChange}
            disabled={isSubmitting}
            aria-invalid={!!errors.number}
            aria-describedby={errors.number ? "number-error" : undefined}
          />
          {errors.number && (
            <p id="number-error" className="text-sm text-red-500">
              {errors.number}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="position">位置</Label>
          <Select
            value={formData.position || "NONE"}
            onValueChange={(value) =>
              handleSelectChange("position", value === "NONE" ? "" : value)
            }
          >
            <SelectTrigger id="position" disabled={isSubmitting}>
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

        <div className="space-y-2">
          <Label htmlFor="email">Email（填寫後即為邀請）</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="user@example.com"
            value={formData.email || ""}
            onChange={handleChange}
            disabled={isSubmitting}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-red-500">
              {errors.email}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">角色</Label>
          <Select
            value={formData.role || PlayerRole.MEMBER}
            onValueChange={(value) => handleSelectChange("role", value)}
          >
            <SelectTrigger id="role" disabled={isSubmitting}>
              <SelectValue placeholder="選擇角色" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PlayerRole.MEMBER}>成員</SelectItem>
              <SelectItem value={PlayerRole.ADMIN}>管理員</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {errors.submit && (
          <p className="text-sm text-red-500">{errors.submit}</p>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "提交中..." : "新增球員"}
        </Button>
      </form>
    </Card>
  );
}
