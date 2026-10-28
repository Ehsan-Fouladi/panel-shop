import { Link } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";

export function FormActions({
  cancelTo,
  cancelLabel = "انصراف",
  saveLabel,
  submitting = false,
}: {
  cancelTo: string;
  cancelLabel?: string;
  saveLabel: string;
  submitting?: boolean;
}) {
  return (
    <div className="form-actions flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
      <Link className={buttonVariants({ variant: "outline" })} to={cancelTo}>
        {cancelLabel}
      </Link>
      <Button disabled={submitting} type="submit" variant="primary">
        {submitting ? "در حال ثبت…" : saveLabel}
      </Button>
    </div>
  );
}
