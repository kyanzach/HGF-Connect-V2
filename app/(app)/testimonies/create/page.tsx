import { redirect } from "next/navigation";

export default function CreateTestimonyRedirectPage() {
  redirect("/feed/create?tab=testimony");
}
