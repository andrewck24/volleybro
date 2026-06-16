"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFormDraft } from "@/hooks/use-form-draft";
import { useLeavePageWarning } from "@/hooks/use-leave-page-warning";
import { useTeam } from "@/hooks/use-data";
import { apiClient } from "@/lib/api/api-client";
import type { TeamView } from "@/lib/features/team/types";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { type Resolver } from "react-hook-form";
import { useSWRConfig } from "swr";
import { Skeleton } from "@/components/ui/skeleton";
import { z } from "zod";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

const TeamSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: "隊伍名稱不得為空" })
      .max(20, { message: "請輸入長度小於 20 的隊伍名稱" }),
    nickname: z.string().max(8, { message: "請輸入長度小於 8 的隊伍簡稱" }),
  })
  .required();

export type TeamFormValues = z.infer<typeof TeamSchema>;

interface TeamFormProps {
  draftKey: string;
  defaultValues?: Partial<TeamFormValues>;
  onSubmit: (data: TeamFormValues) => Promise<void>;
  onStateChange?: (isDirty: boolean) => void;
  className?: string;
}

const TeamForm = ({ draftKey, defaultValues, onSubmit, onStateChange, className }: TeamFormProps) => {
  const { form, clearDraft } = useFormDraft<TeamFormValues>(draftKey, {
    resolver: zodResolver(TeamSchema) as Resolver<TeamFormValues>,
    defaultValues: {
      name: defaultValues?.name ?? "",
      nickname: defaultValues?.nickname ?? "",
    },
  });
  const { isDirty } = form.formState;
  useLeavePageWarning(isDirty);

  // RHF does not re-initialize when defaultValues prop changes after mount.
  // Only reset if the form is still in its empty initial state (no draft, no user input).
  useEffect(() => {
    if (!defaultValues || isDirty) return;
    const values = form.getValues();
    if (values.name || values.nickname) return;
    form.reset({
      name: defaultValues.name ?? "",
      nickname: defaultValues.nickname ?? "",
    });
  }, [defaultValues, form, isDirty]);

  useEffect(() => {
    onStateChange?.(isDirty);
  }, [isDirty, onStateChange]);

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await onSubmit(data);
      clearDraft();
    } catch (e) {
      form.setError("root", {
        message: e instanceof Error ? e.message : "提交失敗，請稍後再試",
      });
    }
  });

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>編輯隊伍資訊</CardTitle>
      </CardHeader>
      <Form form={form} onSubmit={handleSubmit}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>隊伍名稱</FormLabel>
              <FormControl>
                <Input placeholder="日本國家男子排球隊" {...field} />
              </FormControl>
              <FormDescription>請輸入 20 字以內的隊伍全名</FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="nickname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>隊伍簡稱</FormLabel>
              <FormControl>
                <Input placeholder="RYUJIN" {...field} />
              </FormControl>
              <FormDescription>請輸入 8 字以內隊伍簡稱</FormDescription>
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <p className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button size="lg">{defaultValues?.name ? "儲存修改" : "建立隊伍"}</Button>
      </Form>
    </Card>
  );
};

export default TeamForm;

export function EditTeamWorkspace({ teamId }: { teamId: string }) {
  const router = useRouter();
  const { team, isLoading, mutate } = useTeam(teamId);

  const onSubmit = async (formData: TeamFormValues) => {
    const teamData = await apiClient<TeamView>(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify(formData),
    });
    mutate({ ...team, ...teamData }, { revalidate: true });
    router.push(`/team/${teamId}?tab=about`);
  };

  if (isLoading) return <EditTeamWorkspaceSkeleton />;

  if (!team) {
    return (
      <div className="p-4">
        <Alert>
          <AlertTitle>找不到球隊</AlertTitle>
          <AlertDescription>此球隊不存在或已被刪除。</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.back()}>返回</Button>
      </div>
    );
  }

  return (
    <TeamForm
      draftKey={`draft:team:${teamId}`}
      defaultValues={team}
      onSubmit={onSubmit}
      className="w-full"
    />
  );
}

function EditTeamWorkspaceSkeleton() {
  return (
    <Card className="w-full space-y-4 p-4">
      <Skeleton className="h-5 w-24" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-9 w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
    </Card>
  );
}

export function NewTeamWorkspace() {
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const onSubmit = async (formData: TeamFormValues) => {
    const team = await apiClient<TeamView>("/api/teams", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(formData),
    });
    mutate(`/api/teams/${team.id}`, team, false);
    router.push(`/team/${team.id}?tab=about`);
  };

  return (
    <TeamForm draftKey="draft:team:new" onSubmit={onSubmit} className="w-full" />
  );
}
