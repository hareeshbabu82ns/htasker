"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getTrackerStats } from "@/app/actions/entries";
import { TrackerType } from "@/types";
import { ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatDuration } from "@/lib/utils";

type Stats = { today: number; week: number; month: number };

export default function TrackerStatsChart( { trackerId, trackerType }: { trackerId: string; trackerType: TrackerType } ) {
  const { data, isLoading, isError } = useQuery<Stats, Error>( {
    queryKey: [ "trackerStats", trackerId ],
    queryFn: async (): Promise<Stats> => {
      const res = await getTrackerStats( trackerId );
      if ( !res.success ) throw new Error( res.error );
      return res.data;
    },
  } );

  // Determine labels based on tracker type
  const seriesLabel = React.useMemo( () => {
    switch ( trackerType ) {
      case TrackerType.TIMER:
        return "Duration (s)";
      case TrackerType.COUNTER:
        return "Count";
      case TrackerType.AMOUNT:
        return "Amount";
      case TrackerType.OCCURRENCE:
        return "Occurrences";
      case TrackerType.CUSTOM:
        return "Entries";
      default:
        return "Value";
    }
  }, [ trackerType ] );
  const xAxisLabel = "Period";

  // Tooltip formatter based on tracker type
  const tooltipFormatter = React.useCallback( ( value: number ) => {
    switch ( trackerType ) {
      case TrackerType.TIMER:
        return formatDuration( value );
      case TrackerType.AMOUNT:
        return `$${value}`;
      default:
        return value.toString();
    }
  }, [ trackerType ] );

  if ( isLoading ) return <div>Loading stats...</div>;
  if ( isError || !data ) return <div>Error loading stats</div>;

  const stats = [
    { period: "Today", count: data.today },
    { period: "This Week", count: data.week },
    { period: "This Month", count: data.month },
  ];

  return (
    <ChartContainer
      id={`tracker-stats-${trackerId}`}
      config={{ count: { label: seriesLabel, color: "#10B981" } }}
      className="w-full h-64"
    >
      <BarChart data={stats} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" label={{ value: xAxisLabel, position: 'bottom', offset: 0 }} />
        <YAxis allowDecimals={false} label={{ value: seriesLabel, angle: -90, position: 'insideLeft', offset: 0 }} />
        <ChartTooltip formatter={tooltipFormatter} />
        <Bar dataKey="count" fill="var(--color-count)" />
      </BarChart>
    </ChartContainer>
  );
}
