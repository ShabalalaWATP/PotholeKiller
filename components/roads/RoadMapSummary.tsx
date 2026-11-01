import { CheckCircle2, MapPin, Users } from "lucide-react";

export type RoadMapSummaryProps = {
  issueCount: number;
  reportCount?: number;
  userCount?: number;
  clearedCount?: number;
  isDemo?: boolean;
};

export function RoadMapSummary({ issueCount, reportCount, userCount, clearedCount = 0, isDemo = false }: RoadMapSummaryProps) {
  return <div className="road-map-summary" aria-label={isDemo ? "Mock world map totals" : "Community road map totals"}>
    <span><MapPin size={14} /><strong>{issueCount}</strong> active {isDemo ? "mock " : ""}issues</span>
    {reportCount !== undefined && <span><strong>{reportCount}</strong> {isDemo ? "mock " : ""}reports</span>}
    {userCount !== undefined && <span><Users size={14} /><strong>{userCount}</strong> {isDemo ? "fictional collectors" : "collectors"}</span>}
    <span className="road-map-cleared"><CheckCircle2 size={14} /><strong>{clearedCount}</strong> community cleared</span>
  </div>;
}

export default RoadMapSummary;
