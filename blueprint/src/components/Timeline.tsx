interface TimelineEvent {
  date: string;
  label: string;
  description: string;
}

interface TimelineProps {
  events: TimelineEvent[];
}

export function Timeline({ events }: TimelineProps) {
  return (
    <ul>
      {events.map((event, i) => (
        <li key={i}>
          <span>{event.date}</span>
          <strong>{event.label}</strong>
          <p>{event.description}</p>
        </li>
      ))}
    </ul>
  );
}
