'use client';

type TotalDisplayProps = {
  leftMl: number;
  rightMl: number;
};

export function TotalDisplay({ leftMl, rightMl }: TotalDisplayProps) {
  const total = leftMl + rightMl;

  return (
    <div className="flex items-center justify-center py-2">
      <div className="rounded-lg bg-muted/50 px-4 py-2">
        <span className="text-sm text-muted-foreground">Total: </span>
        <span className="text-lg font-semibold">{total} ml</span>
      </div>
    </div>
  );
}
