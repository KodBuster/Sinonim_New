import { Header } from "@/components/Header";

export default function LoadingProduct() {
  return (
    <>
      <Header />
      <main role="status" className="w-full px-4 py-6">
        <span className="sr-only">Загружаем украшение…</span>
        <div aria-hidden="true" className="grid gap-5 motion-safe:animate-pulse md:grid-cols-[3fr_2fr]">
          <div className="aspect-square rounded-xl bg-[#f5f4f1]" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 rounded bg-[#f5f4f1]" />
            <div className="h-5 w-1/3 rounded bg-[#f5f4f1]" />
            <div className="h-12 rounded bg-[#f5f4f1]" />
          </div>
        </div>
      </main>
    </>
  );
}
