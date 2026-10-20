import LegalShell from "../legal-shell";
import HostMarketplace from "./marketplace";
import { getCurrentUser } from "../auth/server";
export const metadata = {
  title: "Verified host chargers | ChargeNeighbour",
  alternates: { canonical: "/hosts" },
};
export default async function Hosts() {
  const user = await getCurrentUser();
  return (
    <LegalShell title="A charge closer to everyday.">
      <p>
        Participating home chargers are listed only after access, permission,
        equipment and metering review. Public Google stations remain in{" "}
        <a href="/#explore">station discovery</a>.
      </p>
      <HostMarketplace signedIn={!!user} />
    </LegalShell>
  );
}
