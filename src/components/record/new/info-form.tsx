"use client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormRadioGroup,
  FormRadioItem,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { category, division, phase } from "@/lib/constants/match";
import {
  MatchInfoFormSchema,
  type TMatchInfoForm,
} from "@/lib/features/record/types";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { RiCalendarLine, RiCheckLine } from "react-icons/ri";

export const MatchInfoForm = ({
  info,
  setInfo,
  handleViewChange,
  className,
}: {
  info: TMatchInfoForm;
  setInfo: (info: TMatchInfoForm) => void;
  handleViewChange: (view: string) => void;
  className?: string;
}) => {
  const form = useForm<TMatchInfoForm>({
    resolver: zodResolver(MatchInfoFormSchema),
    defaultValues: info,
  });

  const onSubmit = (data: TMatchInfoForm) => {
    setInfo({ ...info, ...data });
    handleViewChange("");
  };

  useEffect(() => {
    form.reset({ ...info });
  }, [info, form]);

  return (
    <Form
      form={form}
      onSubmit={form.handleSubmit(onSubmit)}
      className={cn(
        "flex h-full w-full flex-1 flex-col gap-2 overflow-y-hidden",
        className,
      )}
    >
      <Card className="flex-1 overflow-y-auto px-0 py-0 shadow-none">
        <BasicInfoFields form={form} />
        <Accordion type="single" collapsible>
          <MatchInfoFields form={form} />
          <TimeLocationFields form={form} />
          <MatchRulesFields form={form} />
        </Accordion>
      </Card>
      <Button type="submit" size="lg">
        <RiCheckLine />
        確認
      </Button>
    </Form>
  );
};

const BasicInfoFields = ({ form }) => {
  return (
    <>
      <FormField
        control={form.control}
        name="teams.home.name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>我方名稱</FormLabel>
            <FormControl>
              <Input placeholder="Taiwan" {...field} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="teams.away.name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>對手名稱</FormLabel>
            <FormControl>
              <Input placeholder="Japan" {...field} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>比賽名稱</FormLabel>
            <FormControl>
              <Input placeholder="Volleyball Nations League" {...field} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="time.date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>比賽日期</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    size="wide"
                    variant="outline"
                    className={cn(
                      "bg-transparent pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground",
                    )}
                  >
                    {field.value ? (
                      format(field.value, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <RiCalendarLine className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  showOutsideDays
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </FormItem>
        )}
      />
    </>
  );
};

const MatchInfoFields = ({ form }) => {
  return (
    <AccordionItem value="match">
      <AccordionTrigger>比賽資訊</AccordionTrigger>
      <AccordionContent>
        <FormField
          control={form.control}
          name="number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>比賽場次</FormLabel>
              <FormControl>
                <Input
                  placeholder="1"
                  type="number"
                  inputMode="numeric"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phase"
          render={({ field }) => (
            <FormItem>
              <FormLabel>比賽階段</FormLabel>
              <FormControl>
                <FormRadioGroup className="grid-cols-2" {...field}>
                  {Object.entries(phase).map(([key, value], index) => (
                    <FormRadioItem key={key} value={index.toString()}>
                      {value}
                    </FormRadioItem>
                  ))}
                </FormRadioGroup>
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="division"
          render={({ field }) => (
            <FormItem>
              <FormLabel>組別</FormLabel>
              <FormControl>
                <FormRadioGroup className="grid-cols-3" {...field}>
                  {Object.entries(division).map(([key, value], index) => (
                    <FormRadioItem key={key} value={index.toString()}>
                      {value}
                    </FormRadioItem>
                  ))}
                </FormRadioGroup>
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>年齡組</FormLabel>
              <FormControl>
                <FormRadioGroup className="grid-cols-3" {...field}>
                  {Object.entries(category).map(([key, value], index) => (
                    <FormRadioItem key={key} value={index.toString()}>
                      {value}
                    </FormRadioItem>
                  ))}
                </FormRadioGroup>
              </FormControl>
            </FormItem>
          )}
        />
      </AccordionContent>
    </AccordionItem>
  );
};

const TimeLocationFields = ({ form }) => {
  return (
    <AccordionItem value="timelocation">
      <AccordionTrigger>時間地點</AccordionTrigger>
      <AccordionContent>
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
      </AccordionContent>
    </AccordionItem>
  );
};

const MatchRulesFields = ({ form }) => {
  return (
    <AccordionItem value="rules">
      <AccordionTrigger>比賽規則</AccordionTrigger>
      <AccordionContent>
        <FormField
          control={form.control}
          name="scoring.setCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>局數</FormLabel>
              <FormControl>
                <FormRadioGroup className="grid-cols-3" {...field}>
                  <FormRadioItem value="1">單局</FormRadioItem>
                  <FormRadioItem value="3">BO3</FormRadioItem>
                  <FormRadioItem value="5">BO5</FormRadioItem>
                </FormRadioGroup>
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="scoring.decidingSetPoints"
          render={({ field }) => (
            <FormItem>
              <FormLabel>決勝局積分</FormLabel>
              <FormControl>
                <Input
                  placeholder="15"
                  type="number"
                  inputMode="numeric"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </AccordionContent>
    </AccordionItem>
  );
};
