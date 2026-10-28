import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/records/Shared";
import { buttonVariants } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title="صفحه پیدا نشد"
        description="مسیر واردشده در برنامهٔ مدیریت فروشگاه تعریف نشده است."
      />
      <EmptyState
        title="این مسیر وجود ندارد"
        description="از پیوند زیر برای بازگشت به داشبورد استفاده کنید."
        action={
          <Link className={buttonVariants({ variant: "primary" })} to="/">
            بازگشت به داشبورد
          </Link>
        }
      />
    </div>
  );
}
