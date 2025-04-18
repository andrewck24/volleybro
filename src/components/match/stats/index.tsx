"use client";
import { TeamsStats } from "@/components/match/stats/teams-stats";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardBtnGroup,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Set } from "@/entities/record";
import { useRecord } from "@/hooks/use-data";
import { useState } from "react";

export const Stats = ({ recordId }: { recordId: string }) => {
  const [setIndex, setSetIndex] = useState(-1);
  const { record } = useRecord(recordId);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          數據總覽
          <SetSwitch
            sets={record.sets}
            setIndex={setIndex}
            setSetIndex={setSetIndex}
          />
        </CardTitle>
      </CardHeader>
      <Tabs defaultValue="team-stats" className="relative w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="team-stats">隊伍數據</TabsTrigger>
          <TabsTrigger value="box-score" disabled>
            個人數據
          </TabsTrigger>
        </TabsList>
        <TabsContent value="team-stats">
          <TeamsStats teams={record.teams} setIndex={setIndex} />
        </TabsContent>
        <TabsContent value="box-score"></TabsContent>
      </Tabs>
    </Card>
  );
};

const SetSwitch = ({
  sets,
  setIndex,
  setSetIndex,
}: {
  sets: Set[];
  setIndex: number;
  setSetIndex: (index: number) => void;
}) => {
  return (
    <CardBtnGroup>
      <Button
        variant={setIndex === -1 ? "default" : "outline"}
        className="size-9"
        onClick={() => setSetIndex(-1)}
      >
        All
      </Button>
      {sets.map((_, index) => (
        <Button
          key={index}
          variant={setIndex === index ? "default" : "outline"}
          className="size-9"
          onClick={() => setSetIndex(index)}
        >
          {index + 1}
        </Button>
      ))}
    </CardBtnGroup>
  );
};
