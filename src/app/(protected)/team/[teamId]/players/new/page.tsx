import { PlayerForm } from "@/components/team/player-form";

const PlayerCreatePage = async (props: {
  params: Promise<{ teamId: string }>;
}) => {
  const { teamId } = await props.params;

  const handleSubmit = async (data: unknown) => {
    console.log("Player data:", data, teamId);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">新增成員</h1>
      <PlayerForm onSubmit={handleSubmit} isInvitation={false} />
    </div>
  );
};

export default PlayerCreatePage;
