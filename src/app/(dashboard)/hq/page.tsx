import { Metadata } from "next";
import TallerTrackHQView from "@/components/hq/TallerTrackHQView";

export const metadata: Metadata = {
  title: "Control HQ • Centro de Mando SaaS | TallerTrack",
  description: "Panel de administración y control plane multi-tenant para TallerTrack",
};

export default function HqPage() {
  return <TallerTrackHQView />;
}
