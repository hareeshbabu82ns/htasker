import ExportSection from "@/components/features/settings/ExportSection";

export default function ExportPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Export Data</h1>
        <p className="text-foreground/70 mt-1">
          Download your tracker data as CSV files
        </p>
      </div>
      <ExportSection />
    </div>
  );
}
