import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { logOut } from "../server/actions";

export function LogoutButton() {
  return (
    <form action={logOut}>
      <Button type="submit" variant="outline" className="h-12 w-full text-base">
        {en.auth.logout}
      </Button>
    </form>
  );
}
