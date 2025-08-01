"use client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { PanelSection, PanelSectionTitle } from "@/components/ui/panels";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReplacePosition } from "@/lib/features/team/hooks/use-replace-position";
import { lineupActions } from "@/lib/features/team/lineup-slice";
import {
  LiberoReplaceFormSchema,
  type LiberoReplaceFormValues,
} from "@/lib/features/team/types";
import { useAppDispatch } from "@/lib/redux/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  RiAlertLine,
  RiArrowRightWideLine,
  RiQuestionLine,
} from "react-icons/ri";

export const LiberoReplaceTrigger = () => {
  const { liberoReplaceMode, liberoReplacePosition, hasPairedReplacePosition } =
    useReplacePosition();

  return (
    <PanelSection>
      <PanelSectionTitle>自由球員設定</PanelSectionTitle>
      {!!liberoReplaceMode && !hasPairedReplacePosition && (
        <Alert variant="destructive">
          <RiAlertLine />
          <AlertTitle>無對位 {liberoReplacePosition}</AlertTitle>
          <AlertDescription>
            陣容中未設定對位 {liberoReplacePosition}
            ，無法使用自動替換自由球員功能。
          </AlertDescription>
        </Alert>
      )}
      <DialogTrigger asChild>
        <Button variant="outline" size="wide">
          替換模式
          <span className="flex-1 text-left text-primary">
            {liberoReplaceMode === 0 ? "手動替換" : "自動替換"}{" "}
            {liberoReplaceMode ? liberoReplacePosition : ""}
          </span>
          <RiArrowRightWideLine />
        </Button>
      </DialogTrigger>
      {liberoReplaceMode === 0 ? (
        <Alert>
          <RiQuestionLine />
          <AlertTitle>手動替換自由球員</AlertTitle>
          <AlertDescription>
            記錄比賽過程中不會隨著輪轉自動替換自由球員，仍可以手動替換。
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <RiQuestionLine />
          <AlertTitle>自動替換自由球員</AlertTitle>
          <AlertDescription>
            當我方 {liberoReplacePosition} 發球輪次失分時，自動將該名{" "}
            {liberoReplacePosition}{" "}
            替換為第一位自由球員。且在自由球員即將輪轉至前排時，自動將自由球員更換為原先之{" "}
            {liberoReplacePosition}。
          </AlertDescription>
          {liberoReplacePosition !== "OP" && (
            <AlertDescription className="text-destructive">
              陣容中須有對位之 {liberoReplacePosition}。
            </AlertDescription>
          )}
        </Alert>
      )}
    </PanelSection>
  );
};

export const LiberoReplaceDialog = () => {
  const dispatch = useAppDispatch();
  const { liberoReplaceMode, liberoReplacePosition } = useReplacePosition();

  const form = useForm<LiberoReplaceFormValues>({
    resolver: zodResolver(LiberoReplaceFormSchema),
    defaultValues: {
      mode: String(liberoReplaceMode) as LiberoReplaceFormValues["mode"],
      position: liberoReplacePosition,
    },
  });

  useEffect(() => {
    form.reset({
      mode: String(liberoReplaceMode) as LiberoReplaceFormValues["mode"],
      position: liberoReplacePosition,
    });
  }, [form, liberoReplaceMode, liberoReplacePosition]);

  const onSubmit = (data: LiberoReplaceFormValues) => {
    const modeNumber = parseInt(data.mode, 10) as 0 | 1 | 2;
    dispatch(
      lineupActions.setLiberoReplace({
        liberoReplaceMode: modeNumber,
        liberoReplacePosition: data.position,
      }),
    );
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>自由球員替換模式</DialogTitle>
        <DialogDescription>選擇自由球員替換模式與替換對象。</DialogDescription>
      </DialogHeader>
      <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="mode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>替換模式</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇替換模式" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="0">手動替換</SelectItem>
                  <SelectItem value="1">自動替換</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>替換對象</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇替換對象" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="MB">MB</SelectItem>
                  <SelectItem value="OH">OH</SelectItem>
                  <SelectItem value="OP">OP</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <DialogClose asChild>
          <Button type="submit">確定</Button>
        </DialogClose>
      </Form>
    </DialogContent>
  );
};
