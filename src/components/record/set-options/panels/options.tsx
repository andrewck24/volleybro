"use client";
import {
  LiberoReplaceDialog,
  LiberoReplaceTrigger,
} from "@/components/team/lineup/panels/options/libero-replace";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogFooter } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormRadioGroup,
  FormRadioItem,
} from "@/components/ui/form";
import {
  PanelContent,
  PanelSection,
  PanelSectionTitle,
} from "@/components/ui/panels";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Player } from "@/entities/record";
import { useRecord } from "@/hooks/use-data";
import {
  SetOptionsFormSchema,
  type SetOptionsFormValues,
} from "@/lib/features/record/types";
import { useReplacePosition } from "@/lib/features/team/hooks/use-replace-position";
import { useAppSelector } from "@/lib/redux/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { RiArrowRightLine, RiSaveLine, RiUserLine } from "react-icons/ri";

export const Options = ({ recordId }: { recordId: string }) => {
  const router = useRouter();
  const { lineups } = useAppSelector((state) => state.lineup);
  const { mode } = useAppSelector((state) => state.record);
  const { setIndex } = useAppSelector((state) => state.record[mode].status);
  const { hasPairedReplacePosition } = useReplacePosition();
  const { record, mutate } = useRecord(recordId);
  const isNewSet = setIndex === record?.sets.length;
  const members = record.teams.home.players;

  const defaultValues = useMemo<SetOptionsFormValues>(
    () => ({
      serve:
        setIndex === 0 || record?.sets[setIndex - 1]?.options?.serve === "home"
          ? "away"
          : "home",
      time: {
        start: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        end: "",
      },
    }),
    [record, setIndex],
  );

  const form = useForm({
    resolver: zodResolver(SetOptionsFormSchema),
    defaultValues,
  });

  const onSubmit = async (data: SetOptionsFormValues) => {
    const res = await fetch(`/api/records/${recordId}/sets?si=${setIndex}`, {
      method: isNewSet ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lineup: lineups[0],
        options: data,
      }),
    });
    const record = await res.json();
    mutate(record, false);
    isNewSet && router.push(`/record/${recordId}?si=${setIndex}`);
  };

  useEffect(() => {
    form.reset({ ...defaultValues });
  }, [record, setIndex, defaultValues, form]);

  return (
    <PanelContent>
      <Dialog>
        <Form
          form={form}
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex w-full flex-1 flex-col gap-2 overflow-y-hidden"
        >
          <div className="flex w-full flex-1 flex-col items-center justify-start gap-2 overflow-y-scroll">
            <ServingTeam form={form} />
            <LiberoReplaceTrigger />
            <SubstitutesTable members={members} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <ActionButton
                isNewSet={isNewSet}
                disabled={!hasPairedReplacePosition}
              />
            </DialogClose>
          </DialogFooter>
        </Form>
        <LiberoReplaceDialog />
      </Dialog>
    </PanelContent>
  );
};

const ServingTeam = ({ form }) => {
  return (
    <PanelSection>
      <PanelSectionTitle>本局發球權</PanelSectionTitle>
      <FormField
        control={form.control}
        name="serve"
        render={({ field }) => (
          <FormItem className="w-full">
            <FormControl>
              <FormRadioGroup className="grid-cols-2" {...field}>
                <FormRadioItem value="home" className="h-10">
                  我方先發
                </FormRadioItem>
                <FormRadioItem value="away" className="h-10">
                  對方先發
                </FormRadioItem>
              </FormRadioGroup>
            </FormControl>
          </FormItem>
        )}
      />
    </PanelSection>
  );
};

const SubstitutesTable = ({ members }: { members: Player[] }) => {
  const { lineups } = useAppSelector((state) => state.lineup);
  const liberoCount = lineups[0]?.liberos.length;
  const substituteCount = lineups[0]?.substitutes.length;
  const substituteLimit = liberoCount < 2 ? 6 - liberoCount : 6;

  return (
    <PanelSection>
      <PanelSectionTitle>
        替補名單 ({substituteCount}/{substituteLimit})
      </PanelSectionTitle>
      <Table>
        <TableBody className="text-xl">
          {lineups[0]?.substitutes &&
            lineups[0].substitutes.map((player) => {
              const member = members?.find((m) => m._id === player._id);
              return (
                <TableRow key={member._id}>
                  <TableCell className="w-6 [&>svg]:size-6">
                    <RiUserLine />
                  </TableCell>
                  <TableCell className="w-[2.5rem] text-left">
                    {member?.number}
                  </TableCell>
                  <TableCell className="text-lg">{member?.name}</TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </PanelSection>
  );
};

const ActionButton = ({
  isNewSet,
  disabled,
}: {
  isNewSet: boolean;
  disabled: boolean;
}) => {
  return (
    <Button type="submit" size="lg" disabled={disabled}>
      {isNewSet ? (
        <>
          開始新一局
          <RiArrowRightLine />
        </>
      ) : (
        <>
          <RiSaveLine />
          儲存設定
        </>
      )}
    </Button>
  );
};
