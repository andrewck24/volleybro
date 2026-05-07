import { Header } from "@/components/layout/header";
import { NewTeamWorkspace } from "@/components/team/form";

const NewTeamPage = () => {
  return (
    <>
      <Header title="建立球隊" backHref="/home" />
      <NewTeamWorkspace />
    </>
  );
};

export default NewTeamPage;
