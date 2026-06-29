interface PRWriteupProps {
  number: number;
  title: string;
  status: "open" | "merged" | "closed";
}

export function PRWriteup({ number, title, status }: PRWriteupProps) {
  return (
    <div>
      <span>#{number}</span>
      <span>{title}</span>
      <span>{status}</span>
    </div>
  );
}
