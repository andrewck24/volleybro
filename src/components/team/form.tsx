"use client";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { useEffect } from "react";
import { type Resolver } from "react-hook-form";
import { z } from "zod";

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
