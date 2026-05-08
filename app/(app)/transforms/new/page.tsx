import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

import { TransformEditor } from "../_components/transform-editor";

export default async function NewTransformPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  return <TransformEditor mode={{ kind: "new" }} />;
}
