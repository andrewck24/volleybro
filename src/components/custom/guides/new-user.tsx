import { Link } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const GuidesForNewUser = () => {
  return (
    <Card className="flex w-full items-center justify-center">
      <CardHeader>
        <CardTitle>歡迎使用 VolleyBro !</CardTitle>
      </CardHeader>
      <CardContent>
        <p>加入隊伍後，您將可以使用完整功能。</p>
        <p>點擊下方按鈕，加入或建立一個隊伍吧！</p>
      </CardContent>
      <CardFooter>
        <Link href="/user/invitations" size="lg" className="px-4">
          前往查看
        </Link>
      </CardFooter>
    </Card>
  );
};
