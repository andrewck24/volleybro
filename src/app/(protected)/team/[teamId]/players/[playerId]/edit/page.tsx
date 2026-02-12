import { Card } from "@/components/ui/card";

const EditPlayerPage = async (props: {
  params: Promise<{ teamId: string; playerId: string }>;
}) => {
  const params = await props.params;
  const { teamId, playerId } = params;

  return (
    <Card className="w-full p-6">
      <h1 className="text-2xl font-bold mb-4">編輯球員</h1>
      <p className="text-muted-foreground">
        Team ID: {teamId}, Player ID: {playerId}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        此頁面將在 Phase 3 實作完整內容
      </p>
    </Card>
  );
};

export default EditPlayerPage;
