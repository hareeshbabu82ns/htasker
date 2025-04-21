"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LimitSelectorProps {
  currentLimit: number;
  limitOptions: number[];
  baseUrl: string; // Base URL for creating limit URLs
}

export default function LimitSelector( {
  currentLimit,
  limitOptions,
  baseUrl,
}: LimitSelectorProps ) {
  const router = useRouter();

  const handleValueChange = ( value: string ) => {
    const newLimit = parseInt( value, 10 );
    // Create the URL on the client side
    const params = new URLSearchParams( baseUrl );
    params.set( "limit", newLimit.toString() );

    // Remove any page parameter to reset to first page when changing limit
    params.delete( "page" );

    router.push( `/trackers?${params.toString()}` );
  };

  return (
    <Select
      value={currentLimit.toString()}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-[70px]">
        <SelectValue placeholder="Limit" />
      </SelectTrigger>
      <SelectContent>
        {limitOptions.map( ( option ) => (
          <SelectItem key={option} value={option.toString()}>
            {option}
          </SelectItem>
        ) )}
      </SelectContent>
    </Select>
  );
}