import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getParticipationReport, getSocietyReport, getVenueReport } from "@/lib/reports";
import { toCsv } from "@/lib/csv";

export async function GET(request: NextRequest) {
  await requireAdmin();
  const type = request.nextUrl.searchParams.get("type");

  let csv: string;
  let filename: string;

  if (type === "societies") {
    const report = await getSocietyReport();
    csv = toCsv(
      report.map((r) => ({
        society: r.society.name,
        approvedEvents: r.eventCount,
        registrations: r.registrationCount,
        avgRating: r.avgRating != null ? r.avgRating.toFixed(2) : "",
        feedbackCount: r.feedbackCount,
      })),
      [
        { key: "society", label: "Society" },
        { key: "approvedEvents", label: "Approved events" },
        { key: "registrations", label: "Registrations" },
        { key: "avgRating", label: "Avg rating" },
        { key: "feedbackCount", label: "Feedback count" },
      ],
    );
    filename = "society-activity.csv";
  } else if (type === "participation") {
    const report = await getParticipationReport();
    csv = toCsv(
      report.map((r) => ({ branch: r.branch ?? "", year: r.year ?? "", count: r.count })),
      [
        { key: "branch", label: "Branch" },
        { key: "year", label: "Year" },
        { key: "count", label: "Registrations" },
      ],
    );
    filename = "participation-by-department-year.csv";
  } else if (type === "venues") {
    const report = await getVenueReport();
    csv = toCsv(
      report.map((r) => ({ venue: r.venue.name, type: r.venue.type, eventCount: r.eventCount })),
      [
        { key: "venue", label: "Venue" },
        { key: "type", label: "Type" },
        { key: "eventCount", label: "Approved events" },
      ],
    );
    filename = "venue-utilisation.csv";
  } else {
    return new NextResponse("Unknown report type", { status: 400 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
