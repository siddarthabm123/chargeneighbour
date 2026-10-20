import { redirect } from "next/navigation";
import { getCurrentUser } from "../auth/server";
import LegalShell from "../legal-shell";
import OperatorConsole from "./console";
export const metadata = {
  title: "Operator workspace | ChargeNeighbour",
  robots: { index: false, follow: false },
};
export default async function Operator() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=%2Foperator");
  if (!user.isOperator)
    return (
      <LegalShell title="Operator access required.">
        <p>
          This account has not been granted operator access. Contact the project
          owner. Access is assigned to a verified account ID, never inferred
          from an email address or user-editable profile.
        </p>
        <p>
          Your verified account ID: <code>{user.id}</code>
        </p>
      </LegalShell>
    );
  return (
    <LegalShell title="Pilot operations.">
      <p>
        Signed in as {user.email}. Record only completed verification and actual
        session evidence. Public stations are not partner inventory.
      </p>
      <OperatorConsole />
    </LegalShell>
  );
}
