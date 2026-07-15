import { Skeleton } from "@/components/ui/skeleton"

export default function EditProductLoading() {
  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-5 p-6">
      <div>
        <Skeleton className="mb-2.5 h-4 w-20" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-5 w-20 rounded-4xl" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-44" />
        </div>
      </div>
      <div className="grid grid-cols-[1.5fr_1fr] items-start gap-4">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
