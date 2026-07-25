"use client";
import { PanelContent } from "@/components/custom/panel";
import {
  LiberoReplaceDialog,
  LiberoReplaceTrigger,
} from "@/components/team/lineup/panel/options/libero-replace";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormRadioGroup,
  FormRadioItem,
} from "@/components/ui/form";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useGame } from "@/hooks/use-data";
import { apiClient } from "@/lib/api/api-client";
import { showErrorToast } from "@/lib/api/error-toast";
import {
  type GamePlayerView,
  type GameView,
  SetOptionsFormSchema,
  type SetOptionsFormValues,
} from "@/lib/features/game/types";
import { useReplacePosition } from "@/lib/features/team/hooks/use-replace-position";
import { useAppSelector } from "@/lib/redux/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { RiArrowRightLine, RiSaveLine, RiUserLine } from "react-icons/ri";

export const Options = ({ gameId }: { gameId: string }) => {
  const router = useRouter();
  const { toast } = useToast();
  const { lineups } = useAppSelector((state) => state.lineup);
  const { setIndex } = useAppSelector((state) => state.game);
  const { hasPairedReplacePosition } = useReplacePosition();
  const { game, mutate } = useGame(gameId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liberoDialogOpen, setLiberoDialogOpen] = useState(false);
  const isNewSet = setIndex === game?.sets.length;
  const members = game?.teams.home.players ?? [];

  const defaultValues = useMemo<SetOptionsFormValues>(
    () => ({
      serve:
        setIndex === 0 || game?.sets[setIndex - 1]?.options?.serve === "home"
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
    [game, setIndex],
  );

  const form = useForm({
    resolver: zodResolver(SetOptionsFormSchema),
    defaultValues,
  });

  const onSubmit = async (data: SetOptionsFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await apiClient<GameView>(
        `/api/games/${gameId}/sets?si=${setIndex}`,
        {
          method: isNewSet ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineup: lineups[0],
            options: data,
          }),
        },
      );
      mutate(result, false);
      setLiberoDialogOpen(false);
      toast({
        title: "成功",
        description: isNewSet ? "新一局已開始" : "本局設定已儲存",
      });
      if (isNewSet) router.push(`/game/${gameId}/sets/${setIndex}/entry`);
    } catch (error) {
      showErrorToast(error, toast);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    form.reset({ ...defaultValues });
  }, [game, setIndex, defaultValues, form]);

  return (
    <PanelContent className="overflow-y-hidden">
      <Card className="size-full overflow-y-hidden p-0">
        <Dialog open={liberoDialogOpen} onOpenChange={setLiberoDialogOpen}>
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
              <ActionButton
                isNewSet={isNewSet}
                disabled={!hasPairedReplacePosition}
                loading={isSubmitting}
              />
            </DialogFooter>
          </Form>
          <LiberoReplaceDialog />
        </Dialog>
      </Card>
    </PanelContent>
  );
};

const ServingTeam = ({
  form,
}: {
  form: UseFormReturn<SetOptionsFormValues>;
}) => {
  return (
    <section className="flex w-full flex-col items-center justify-center gap-2 pb-2">
      <CardHeader className="w-full">
        <CardTitle>本局發球權</CardTitle>
      </CardHeader>
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
    </section>
  );
};

const SubstitutesTable = ({ members }: { members: GamePlayerView[] }) => {
  const { lineups } = useAppSelector((state) => state.lineup);
  const liberoCount = lineups[0]?.liberos.length;
  const substituteCount = lineups[0]?.substitutes.length;
  const substituteLimit = liberoCount < 2 ? 6 - liberoCount : 6;

  return (
    <section className="flex w-full flex-col items-center justify-center gap-2 pb-2">
      <CardHeader className="w-full">
        <CardTitle>
          替補名單 ({substituteCount}/{substituteLimit})
        </CardTitle>
      </CardHeader>
      <Table>
        <TableBody className="text-xl">
          {lineups[0]?.substitutes &&
            lineups[0].substitutes.map((player) => {
              const member = members?.find((m) => m.id === player.id);
              if (!member) return null;
              return (
                <TableRow key={member.id}>
                  <TableCell className="w-6 [&>svg]:size-6">
                    <RiUserLine />
                  </TableCell>
                  <TableCell className="w-10 text-left">
                    {member?.number}
                  </TableCell>
                  <TableCell className="text-lg">{member?.name}</TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </section>
  );
};

const ActionButton = ({
  isNewSet,
  disabled,
  loading,
}: {
  isNewSet: boolean;
  disabled: boolean;
  loading: boolean;
}) => {
  return (
    <Button type="submit" size="lg" disabled={disabled} loading={loading}>
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
