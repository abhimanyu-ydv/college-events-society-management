import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getParticipationReport, getSocietyReport, getVenueReport } from "@/lib/reports";

export default async function AdminReportsPage() {
  await requireAdmin();

  const [societyReport, participation, venueUtilisation] = await Promise.all([
    getSocietyReport(),
    getParticipationReport(),
    getVenueReport(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <h1 className="text-xl font-semibold">Reports</h1>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Society activity</h2>
          <a href="/dashboard/admin/reports/export.csv?type=societies" className="text-sm text-foreground/70 hover:text-foreground">
            Export CSV
          </a>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-foreground/60">
            <tr>
              <th className="py-1.5 pr-2">Society</th>
              <th className="py-1.5 pr-2">Approved events</th>
              <th className="py-1.5 pr-2">Registrations</th>
              <th className="py-1.5 pr-2">Avg. rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            {societyReport.map((row) => (
              <tr key={row.society.id}>
                <td className="py-1.5 pr-2">{row.society.name}</td>
                <td className="py-1.5 pr-2">{row.eventCount}</td>
                <td className="py-1.5 pr-2">{row.registrationCount}</td>
                <td className="py-1.5 pr-2">
                  {row.avgRating != null ? `${row.avgRating.toFixed(1)} (${row.feedbackCount})` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Participation by department &amp; year</h2>
          <a href="/dashboard/admin/reports/export.csv?type=participation" className="text-sm text-foreground/70 hover:text-foreground">
            Export CSV
          </a>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-foreground/60">
            <tr>
              <th className="py-1.5 pr-2">Branch</th>
              <th className="py-1.5 pr-2">Year</th>
              <th className="py-1.5 pr-2">Registrations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            {participation.map((row, i) => (
              <tr key={i}>
                <td className="py-1.5 pr-2">{row.branch ?? "—"}</td>
                <td className="py-1.5 pr-2">{row.year ?? "—"}</td>
                <td className="py-1.5 pr-2">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Venue utilisation</h2>
          <a href="/dashboard/admin/reports/export.csv?type=venues" className="text-sm text-foreground/70 hover:text-foreground">
            Export CSV
          </a>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-foreground/60">
            <tr>
              <th className="py-1.5 pr-2">Venue</th>
              <th className="py-1.5 pr-2">Type</th>
              <th className="py-1.5 pr-2">Approved events</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            {venueUtilisation.map((row) => (
              <tr key={row.venue.id}>
                <td className="py-1.5 pr-2">{row.venue.name}</td>
                <td className="py-1.5 pr-2">{row.venue.type.replace("_", " ")}</td>
                <td className="py-1.5 pr-2">{row.eventCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <Link href="/dashboard/admin" className="text-sm text-foreground/70 hover:text-foreground">
        ← Back to admin
      </Link>
    </div>
  );
}
