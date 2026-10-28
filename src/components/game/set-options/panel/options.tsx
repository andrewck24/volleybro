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
import {
  Item,
  ItemAvatar,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { useToast } from "@/components/ui/use-toast";
import { useGame } from "@/hooks/use-data";
import { getSetOptions } from "@/lib/features/game/helpers";
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
    () =>
      getSetOptions(
        game,
        setIndex,
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      ),
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
              <SubstitutesList members={members} />
            </div>
            <DialogFooter>
              <ActionButton
                isNewSet={isNewSet}
                disabled={!hasPairedReplacePosition}
                loading={isSubmitting}
              />
            </DialogFooter>
          </Form>
          <LiberoReplaceDialog onSuccess={() => setLiberoDialogOpen(false)} />
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
                <FormRadioItem value="home">我方先發球</FormRadioItem>
                <FormRadioItem value="away">對方先發球</FormRadioItem>
              </FormRadioGroup>
            </FormControl>
          </FormItem>
        )}
      />
    </section>
  );
};

const SubstitutesList = ({ members }: { members: GamePlayerView[] }) => {
  const { lineups } = useAppSelector((state) => state.lineup);
  const liberoCount = lineups[0]?.liberos.length ?? 0;
  const substituteCount = lineups[0]?.substitutes.length;
  const substituteLimit = liberoCount < 2 ? 6 - liberoCount : 6;

  return (
    <section className="flex w-full flex-col items-center justify-center gap-2 pb-2">
      <CardHeader className="w-full">
        <CardTitle>
          替補名單 ({substituteCount}/{substituteLimit})
        </CardTitle>
      </CardHeader>
      <ItemGroup className="w-full">
        {lineups[0]?.substitutes &&
          lineups[0].substitutes.map((player) => {
            const member = members?.find((m) => m.id === player.id);
            if (!member) return null;
            return (
              <Item key={member.id}>
                <ItemMedia variant="image">
                  <ItemAvatar alt={member?.name} fallback={<RiUserLine />} />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="h-6">{member?.name}</ItemTitle>
                  <ItemDescription className="h-6">
                    {member?.number != null && `#${member.number}`}
                  </ItemDescription>
                </ItemContent>
              </Item>
            );
          })}
      </ItemGroup>
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
    <Button
      type="submit"
      size="lg"
      disabled={disabled}
      loading={loading}
      loadingText={isNewSet ? "開始中" : "儲存中"}
    >
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
