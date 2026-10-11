import { requireOwnerAdmin } from "@/lib/admin";
import { referralBalance } from "@/lib/referral-commissions";
import { client } from "@/lib/prisma";
import { reviewReferralWithdrawal } from "@/actions/referrals";

export const dynamic = "force-dynamic";
export default async function AdminReferralsPage() {
  await requireOwnerAdmin();
  const requests = await client.referralWithdrawal.findMany({
    include: { partner: { include: { user: { select: { email: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const balances = new Map(
    await Promise.all(
      requests
        .filter((row) => row.status === "REQUESTED")
        .map(
          async (row) =>
            [row.id, await referralBalance(client, row.partnerId)] as const,
        ),
    ),
  );
  return (
    <div className="mx-auto max-w-5xl space-y-5 p-5 text-slate-900 dark:text-slate-100">
      <h1 className="text-2xl font-bold">Referral withdrawals</h1>
      <p className="text-sm text-slate-500">
        Requests reserve the partner&apos;s available commission. Review refunds and
        payment details before paying externally. Marking paid records a
        completed transfer; it does not send money.
      </p>
      {requests.length === 0 && <p>No withdrawal requests yet.</p>}
      {requests.map((request) => (
        <section
          key={request.id}
          className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex flex-wrap justify-between gap-3">
            <strong>{request.partner.user?.email ?? "Deleted account"}</strong>
            <span>
              ${(request.amountCents / 100).toFixed(2)} USD · {request.status}
            </span>
          </div>
          <p className="mt-2 break-all text-sm">
            PayPal: {request.paypalEmail}
          </p>
          <p className="text-xs text-slate-500">
            {request.createdAt.toISOString()} · {request.id}
          </p>
          {request.status === "REQUESTED" ? (
            <form
              action={reviewReferralWithdrawal}
              className="mt-4 grid gap-3 sm:grid-cols-2"
            >
              <input type="hidden" name="id" value={request.id} />
              <label className="text-sm">
                Review decision
                <select
                  name="action"
                  className="mt-1 block w-full rounded-lg border bg-transparent p-2"
                >
                  <option value="CANCELED">Cancel / release balance</option>
                  <option
                    value="PAID"
                    disabled={(balances.get(request.id)?.balanceCents ?? 0) < 0}
                  >
                    Record external payment
                  </option>
                </select>
              </label>
              <label className="text-sm">
                Payment reference (required if paid)
                <input
                  name="reference"
                  maxLength={200}
                  className="mt-1 block w-full rounded-lg border bg-transparent p-2"
                />
              </label>
              <label className="text-sm">
                Review note
                <input
                  name="note"
                  minLength={5}
                  maxLength={500}
                  required
                  className="mt-1 block w-full rounded-lg border bg-transparent p-2"
                />
              </label>
              <label className="text-sm">
                Type PAID or CANCELED to confirm
                <input
                  name="confirmation"
                  required
                  className="mt-1 block w-full rounded-lg border bg-transparent p-2"
                />
              </label>
              <button className="rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white sm:col-span-2">
                Save review
              </button>
            </form>
          ) : (
            <p className="mt-3 text-sm">
              {request.reviewNote}
              {request.paymentReference
                ? ` · Reference: ${request.paymentReference}`
                : ""}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
