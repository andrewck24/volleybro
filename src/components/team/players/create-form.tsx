"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DialogBody, DialogFooter } from "@/components/ui/dialog";
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
import { useFormDraft } from "@/hooks/use-form-draft";
import { useLeavePageWarning } from "@/hooks/use-leave-page-warning";
import { apiClient } from "@/lib/api/api-client";
import { resolveErrorDisplay, showErrorToast } from "@/lib/api/error-toast";
import { ROLE_LABELS } from "@/lib/constants/labels";
import type { PlayerView } from "@/lib/features/team/types";
import {
  CreatePlayerSchema,
  type CreatePlayerInput,
} from "@/interface/validations/player";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { type Resolver } from "react-hook-form";
import { RiAddLine } from "react-icons/ri";
import { useSWRConfig } from "swr";

interface CreateFormProps {
  teamId: string;
  onStateChange?: (isDirty: boolean) => void;
}

export function CreateForm({ teamId, onStateChange }: CreateFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { mutate } = useSWRConfig();

  const { form, clearDraft } = useFormDraft<CreatePlayerInput>(
    `draft:player:new:${teamId}`,
    {
      resolver: zodResolver(CreatePlayerSchema) as Resolver<CreatePlayerInput>,
      defaultValues: {
        name: "",
        number: undefined,
        position: undefined,
        email: undefined,
        role: undefined,
      },
    },
  );
  const { isDirty } = form.formState;
  const email = form.watch("email");
  useLeavePageWarning(isDirty);

  useEffect(() => {
    onStateChange?.(isDirty);
  }, [isDirty, onStateChange]);

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      const player = await apiClient<PlayerView>(
        `/api/teams/${teamId}/players`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      toast({ title: "成功", description: "球員已新增" });
      mutate(`/api/teams/${teamId}/players`);
      clearDraft();
      router.replace(`/team/${teamId}/players/${player.id}`);
    } catch (error) {
      showErrorToast(error, toast);
      form.setError("root", {
        message: resolveErrorDisplay(error).description,
      });
    }
  });

  return (
    <Form form={form} onSubmit={handleSubmit} className="min-h-0 flex-1 gap-0">
      <DialogBody>
        <Card className="gap-4 py-8">
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
                        e.target.value
                          ? parseInt(e.target.value, 10)
                          : undefined,
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
                  onValueChange={(v) =>
                    field.onChange(v === "NONE" ? undefined : v)
                  }
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
                    // An emptied field is no invitation, not an invalid email.
                    onChange={(e) =>
                      field.onChange(e.target.value || undefined)
                    }
                    value={field.value ?? ""}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          {/* A role only means something as part of an invitation, and the
              field unregisters with it so a cleared email clears the role. */}
          {email && (
            <FormField
              control={form.control}
              name="role"
              shouldUnregister
              render={({ field }) => (
                <FormItem>
                  <FormLabel>角色</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? PlayerRole.MEMBER}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇角色" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={PlayerRole.MEMBER}>
                        {ROLE_LABELS[PlayerRole.MEMBER]}
                      </SelectItem>
                      <SelectItem value={PlayerRole.ADMIN}>
                        {ROLE_LABELS[PlayerRole.ADMIN]}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          )}
          {form.formState.errors.root && (
            <p className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}
        </Card>
      </DialogBody>
      <DialogFooter>
        <Button
          type="submit"
          loading={form.formState.isSubmitting}
          loadingText="提交中"
          className="w-full"
        >
          <RiAddLine />
          新增球員
        </Button>
      </DialogFooter>
    </Form>
  );
}
