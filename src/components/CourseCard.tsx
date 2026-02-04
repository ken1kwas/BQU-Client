import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Clock, MapPin, User, Users } from "lucide-react";

interface CourseCardProps {
  title: string;
  code: string;
  time: string;
  location: string;
  instructor: string;
  type: string;
  variant?: "today" | "week";
  topic?: string;
  group?: string;
  userRole?: "student" | "teacher";
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case "lecture": return "Lecture";
    case "seminar": return "Seminar";
    case "lab": return "Lab";
    default: return type;
  }
};

const getTypeBadgeVariant = (type: string) => {
  return type === "seminar" ? "default" : "secondary";
};

export function CourseCard({ title, code, time, location, instructor, type, variant = "today", topic, group, userRole = "student" }: CourseCardProps) {
  if (variant === "week") {
    return (
      <div className="p-3 rounded-lg border relative pb-10">
        <div className="space-y-2 pr-20">
          <div className="flex items-start gap-2">
            <span className="font-medium overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{title}</span>
          </div>
          {topic && (
            <div className="text-sm text-muted-foreground italic">
              {topic}
            </div>
          )}
          {userRole === "teacher" && (
            <>
              {group && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-3 w-3 shrink-0" />
                  <span>{group}</span>
                </div>
              )}
              {instructor && instructor !== "Not specified" && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <User className="h-3 w-3 shrink-0" />
                  <span>{instructor}</span>
                </div>
              )}
            </>
          )}
          {userRole === "student" && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <User className="h-3 w-3 shrink-0" />
              <span>{instructor}</span>
            </div>
          )}
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{time}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span>{location}</span>
            </div>
          </div>
          <Badge variant={getTypeBadgeVariant(type)} className="absolute top-3 right-3 text-xs">{getTypeLabel(type)}</Badge>
          <Badge variant="outline" className="absolute bottom-3 left-3 text-xs">{code}</Badge>
          {userRole === "student" && (
            <Button variant="outline" size="sm" className="absolute bottom-3 right-3 shadow-md hover:shadow-lg transition-shadow">
              Syllabus
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg border relative pb-10">
      <div className="space-y-2 pr-20">
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{title}</span>
          <Badge variant={getTypeBadgeVariant(type)} className="shrink-0 px-4 py-1.5 text-xs">{getTypeLabel(type)}</Badge>
        </div>
        {topic && (
          <div className="text-sm text-muted-foreground italic">
            {topic}
          </div>
        )}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {userRole === "student" ? (
            <>
              <User className="h-3 w-3 shrink-0" />
              <span>{instructor}</span>
            </>
          ) : (
            <>
              <Users className="h-3 w-3 shrink-0" />
              <span>{group || instructor}</span>
            </>
          )}
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" />
            <span>{time}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span>{location}</span>
          </div>
        </div>
        <Badge variant="outline" className="absolute bottom-3 left-3 text-xs">{code}</Badge>
        {userRole === "student" && (
          <Button variant="outline" size="sm" className="absolute bottom-3 right-3 shadow-md hover:shadow-lg transition-shadow">
            Syllabus
          </Button>
        )}
      </div>
    </div>
  );
}
