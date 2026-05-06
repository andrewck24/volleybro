"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { useToast } from "@/components/ui/use-toast";
import { PlayerRole } from "@/entities/player";
import { apiClient } from "@/lib/api/api-client";
import { showErrorToast } from "@/lib/api/error-toast";
import {
  CreatePlayerSchema,
  type CreatePlayerInput,
} from "@/lib/validations/player";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { type Resolver } from "react-hook-form";
import { useSWRConfig } from "swr";
import { useFormDraft } from "@/hooks/use-form-draft";
import { useLeavePageWarning } from "@/hooks/use-leave-page-warning";

interface CreateFormProps {
  teamId: string;
}

export function CreateForm({ teamId }: CreateFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { mutate } = useSWRConfig();

  const { form, clearDraft } = useFormDraft<CreatePlayerInput>(
    `draft:player:new:${teamId}`,
    {
      resolver: zodResolver(CreatePlayerSchema) as Resolver<CreatePlayerInput>,
      defaultValues: {
        name: "",
        role: PlayerRole.MEMBER,
      },
    },
  );
  useLeavePageWarning(form.formState.isDirty);

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await apiClient(`/api/teams/${teamId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      toast({ title: "成功", description: "球員已新增" });
      mutate(`/api/teams/${teamId}/players`);
      clearDraft();
      router.push(`/team/${teamId}`);
    } catch (error) {
      showErrorToast(error, toast);
      form.setError("root", { message: "新增失敗，請稍後再試" });
    }
  });

  return (
    <Card className="py-8">
      <Form form={form} onSubmit={handleSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>姓名</FormLabel>
              <FormControl>
                <Input placeholder="輸入姓名" {...field} />
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
                  placeholder="例: 10"
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
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email（填寫後即為邀請）</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>角色</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇角色" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={PlayerRole.MEMBER}>成員</SelectItem>
                  <SelectItem value={PlayerRole.ADMIN}>管理員</SelectItem>
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
          disabled={form.formState.isSubmitting}
          className="w-full"
        >
          {form.formState.isSubmitting ? "提交中..." : "新增球員"}
        </Button>
      </Form>
    </Card>
  );
}
