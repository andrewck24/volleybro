"use client";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RiCheckLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import {
  RecordMiscFormSchema,
  type RecordMiscFormValues,
  type RecordMatchInfoForm,
} from "@/lib/features/record/types";

const MatchMiscForm = ({
  info,
  setInfo,
  className,
}: {
  info: RecordMatchInfoForm;
  setInfo: (info: RecordMatchInfoForm) => void;
  className?: string;
}) => {
  const defaultValues = useMemo<RecordMiscFormValues>(
    () => ({
      location: {
        city: info?.location?.city || "",
        hall: info?.location?.hall || "",
      },
      time: {
        date: info?.time?.date
          ? new Date(info.time.date).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        start: info?.time?.start
          ? new Date(info.time.start).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        end: info?.time?.end
          ? new Date(info.time.end).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
      },
    }),
    [info]
  );

  const form = useForm<RecordMiscFormValues>({
    resolver: zodResolver(RecordMiscFormSchema),
    defaultValues,
  });

  const onSubmit = (data: RecordMiscFormValues) => {
    setInfo({
      ...info,
      location: {
        city: data.location.city,
        hall: data.location.hall,
      },
      time: {
        date: data.time.date,
        start: data.time.start,
        end: data.time.end,
      },
    });
  };

  useEffect(() => {
    form.reset({ ...defaultValues });
  }, [info, defaultValues, form]);

  return (
    <DialogContent className={className} size="lg">
      <DialogHeader>
        <DialogTitle>編輯賽事資訊</DialogTitle>
        <DialogDescription className="sr-only">
          填寫比賽相關資訊
        </DialogDescription>
      </DialogHeader>
      <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="location.city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>城市</FormLabel>
              <FormControl>
                <Input placeholder="Taipei" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="location.hall"
          render={({ field }) => (
            <FormItem>
              <FormLabel>場地</FormLabel>
              <FormControl>
                <Input placeholder="Taipei Arena" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <Separator />
        <FormField
          control={form.control}
          name="time.date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>比賽日期</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="time.start"
          render={({ field }) => (
            <FormItem>
              <FormLabel>開始時間</FormLabel>
              <FormControl>
                <Input type="time" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="time.end"
          render={({ field }) => (
            <FormItem>
              <FormLabel>結束時間</FormLabel>
              <FormControl>
                <Input type="time" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <DialogClose asChild>
          <Button type="submit" size="lg">
            <RiCheckLine />
            確認
          </Button>
        </DialogClose>
      </Form>
    </DialogContent>
  );
};

export default MatchMiscForm;
