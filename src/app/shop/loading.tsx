import { Header } from "@/components/Header";

export default function LoadingCatalog() {
  return (
    <>
      <Header />
      <main role="status" className="w-full px-4 py-6">
        <span className="sr-only">Загружаем каталог…</span>
        <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">
          <div className="h-8 w-40 rounded bg-[#f5f4f1]" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="aspect-[4/5] rounded bg-[#f5f4f1]" />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
