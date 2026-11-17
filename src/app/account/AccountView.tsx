"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { formatPrice } from "@/lib/products";

type AccountData = {
  customer: { firstName?: string; lastName?: string; email?: string; phone?: number | string } | null;
  orders?: { id: number; number: string; date?: string; sum?: number; status?: string }[];
  ordersUnavailable?: boolean;
  hasMoreOrders?: boolean;
};

const field = "h-12 w-full rounded-[10px] border border-[#ddd] px-4 text-sm text-[#141414]";
const primary = "flex min-h-12 w-full items-center justify-center rounded-[10px] bg-[#141414] px-4 text-center font-medium text-white hover:bg-[#333] disabled:opacity-50";

async function loadAccount(page: number, signal?: AbortSignal): Promise<AccountData> {
  const response = await fetch(`/api/account?page=${page}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error("Не удалось загрузить кабинет. Попробуйте ещё раз.");
  return response.json();
}

export function AccountView({ registration, reset }: { registration?: string; reset?: string }) {
  const [account, setAccount] = useState<AccountData>();
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    loadAccount(1, controller.signal).then(setAccount).catch(() => {
      if (!controller.signal.aborted) setError("Не удалось загрузить кабинет. Попробуйте ещё раз.");
    });
    return () => controller.abort();
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fields.get("email"), password: fields.get("password") }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error);
      }
      const next = await loadAccount(1);
      if (!next.customer) throw new Error("Не удалось открыть кабинет. Попробуйте войти ещё раз.");
      setAccount(next);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Не удалось войти в кабинет.");
    } finally {
      setBusy(false);
    }
  }

  async function changePage(nextPage: number) {
    setBusy(true);
    setError("");
    try {
      setAccount(await loadAccount(nextPage));
      setPage(nextPage);
    } catch {
      setError("Не удалось загрузить заказы. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setAccount({ customer: null });
      setPage(1);
      setShowPassword(false);
    } catch {
      setError("Не удалось выйти из кабинета. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1320px] grow px-5 py-10 text-[#141414] md:px-10 md:py-14">
      <h1 className="sr-only">Личный кабинет</h1>
      {error && <p role="alert" className="mb-5 text-sm text-red-700">{error}</p>}
      {!account && !error ? <p role="status">Загрузка кабинета…</p> : account?.customer ? (
        <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
          <section>
            <h2 className="mb-5 text-lg font-semibold">Ваш профиль</h2>
            <p>{account.customer.firstName} {account.customer.lastName}</p>
            <p className="break-all">{account.customer.email}</p>
            <p>{account.customer.phone}</p>
            <button type="button" disabled={busy} className="mt-5 underline underline-offset-4" onClick={() => void signOut()}>Выйти</button>
          </section>
          <section className="md:border-l md:border-[#ddd] md:pl-10">
            <h2 className="mb-5 text-lg font-semibold">Ваши заказы</h2>
            {account.ordersUnavailable ? (
              <p>Не удалось загрузить заказы. <button type="button" className="underline" disabled={busy} onClick={() => void changePage(page)}>Повторить</button></p>
            ) : account.orders?.length ? (
              <ul className="divide-y divide-[#ddd] border-y border-[#ddd]">
                {account.orders.map((order) => (
                  <li key={order.id} className="flex flex-wrap justify-between gap-2 py-4">
                    <span>Заказ № {order.number}{order.status && ` · ${order.status}`}</span>
                    <span>{order.date?.slice(0, 10).split("-").reverse().join(".")}{typeof order.sum === "number" && ` · ${formatPrice(order.sum)}`}</span>
                  </li>
                ))}
              </ul>
            ) : <p>Заказов пока нет.</p>}
            {(page > 1 || account.hasMoreOrders) && (
              <div className="mt-5 flex gap-4">
                <button type="button" disabled={busy || page === 1} className="underline disabled:opacity-40" onClick={() => void changePage(page - 1)}>Назад</button>
                <button type="button" disabled={busy || !account.hasMoreOrders} className="underline disabled:opacity-40" onClick={() => void changePage(page + 1)}>Далее</button>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 md:gap-0">
          <section className="md:px-[clamp(16px,5vw,96px)]">
            <h2 className="mb-6 text-base font-semibold uppercase">Войти</h2>
            <form onSubmit={signIn} className="ym-disable-keys grid gap-5">
              <input type="email" name="email" aria-label="Электронная почта" placeholder="Электронная почта" autoComplete="username" maxLength={254} className={field} required />
              <div className="relative">
                <input type={showPassword ? "text" : "password"} name="password" aria-label="Пароль" placeholder="Пароль" autoComplete="current-password" maxLength={256} className={`${field} pr-24`} required />
                <button type="button" className="absolute inset-y-0 right-3 text-xs underline" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? "Скрыть" : "Показать"}
                </button>
              </div>
              {reset ? <a href={reset} className="w-fit underline underline-offset-4">Забыли пароль?</a> : (
                <Link href="/showroom" className="w-fit underline underline-offset-4">Помощь со входом</Link>
              )}
              <button type="submit" className={primary} disabled={busy}>{busy ? "Входим…" : "Войти"}</button>
            </form>
          </section>
          <section className="border-t border-[#ddd] pt-8 md:border-l md:border-t-0 md:px-[clamp(16px,5vw,96px)] md:pt-0">
            <h2 className="mb-6 text-base font-semibold uppercase">Создать аккаунт</h2>
            {registration ? (
              <a href={registration} className={primary}>Перейти к регистрации</a>
            ) : <p className="text-sm text-[#525252]">Регистрация сейчас недоступна.</p>}
          </section>
        </div>
      )}
    </main>
  );
}
