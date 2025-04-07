"use client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useUser, useTeam, useTeamMembers } from "@/hooks/use-data";
import { RiUserLine, RiUserAddLine, RiAdminLine } from "react-icons/ri";
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
import {
  Select,
  SelectTrigger,
  SelectItem,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  name: z.string().min(1, { message: "姓名不得為空" }),
  number: z.coerce
    .number()
    .min(1, { message: "背號不得為空或小於 1" })
    .max(99, { message: "背號不得大於 99" }),
  email: z
    .string()
    .email({ message: "請輸入有效的 email" })
    .optional()
    .or(z.literal("")),
  role: z.coerce.number().min(0).max(2), // TODO: use Role enum from "@/entities/team"
});

const MemberForm = ({ teamId, className }) => {
  const router = useRouter();
  const { user } = useUser();
  const { team, mutate: mutateTeam } = useTeam(teamId);
  const { members, mutate: mutateTeamMembers } = useTeamMembers(teamId);
  const isAdmin = team?.members?.some(
    (m) => m.user_id === user?._id && !!m.role
  );
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      number: "",
      email: "",
      role: "0",
    },
  });

  const onSubmit = async (formData) => {
    formData.team_id = teamId;
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const member = await res.json();
      mutateTeam();
      mutateTeamMembers([...members, member], false);
      return router.push(`/team/${teamId}/members/${member._id}`);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>新增成員</CardTitle>
      </CardHeader>
      <Form form={form} onSubmit={form.handleSubmit(onSubmit)} className="mt-4">
        <Separator content="基本資訊" />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>姓名</FormLabel>
              <FormControl>
                <Input placeholder="石川祐希" {...field} />
              </FormControl>
              <FormDescription>請輸入成員姓名</FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="number"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>背號</FormLabel>
              <FormControl>
                <Input
                  placeholder="14"
                  type="number"
                  inputMode="numeric"
                  {...field}
                />
              </FormControl>
              <FormDescription>請輸入背號</FormDescription>
            </FormItem>
          )}
        />
        <Separator content="邀請與權限" />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>信箱</FormLabel>
              <FormControl>
                <Input placeholder="volleybro@example.com" {...field} />
              </FormControl>
              <FormDescription>請輸入信箱</FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>權限</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={!isAdmin}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇權限" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="0">
                    <RiUserLine />
                    一般成員
                  </SelectItem>
                  <SelectItem value="2">
                    <RiAdminLine />
                    管理者
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                管理者有權限變更隊伍與成員資訊，以及權限設定
              </FormDescription>
            </FormItem>
          )}
        />
        <Button size="lg">
          <RiUserAddLine />
          新增成員
        </Button>
      </Form>
    </Card>
  );
};

export default MemberForm;
