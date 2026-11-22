import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { runAs } from "@/lib/assets/queries";
import { typeTemplate } from "@/lib/prechecks/queries";
import { STARTER_ITEMS } from "@/lib/prechecks/starter";
import { TemplateEditor } from "./template-editor";

export const dynamic = "force-dynamic";

export default async function TemplatePage({ params }: { params: Promise<{ typeId: string }> }) {
  const me = await requirePermission("precheck_templates", "edit");
  const { typeId } = await params;
  const t = await runAs(me, (tx) => typeTemplate(tx, typeId));
  if (!t) notFound();
  const items = t.items.length
    ? t.items.map((i) => ({ question: i.question, answer_type: i.answer_type, problem_answer: i.problem_answer, photo_required: i.photo_required, help: i.help ?? "" }))
    : STARTER_ITEMS;
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5">
      <h1 className="text-large-title">{t.type_name}</h1>
      <TemplateEditor typeId={typeId} initial={items} />
    </div>
  );
}
