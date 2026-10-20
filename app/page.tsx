import Marketplace from "./marketplace";
import { getCurrentUser } from "./auth/server";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await getCurrentUser();
  return (
    <Marketplace
      user={user ? { name: user.displayName, email: user.email } : null}
    />
  );
}
