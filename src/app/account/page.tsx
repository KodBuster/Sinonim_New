import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { accountLink } from "@/lib/advantshop/account";
import { AccountView } from "./AccountView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Личный кабинет — Синоним",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <>
      <Header />
      <AccountView registration={accountLink("ADVANTSHOP_REGISTER_URL")} reset={accountLink("ADVANTSHOP_PASSWORD_RESET_URL")} />
      <Footer />
    </>
  );
}
