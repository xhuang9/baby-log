'use client';

type TotalDisplayProps = {
  leftMl: number;
  rightMl: number;
};

export function TotalDisplay({ leftMl, rightMl }: TotalDisplayProps) {
  const total = leftMl + rightMl;

  return (
    <div className="rounded-xl bg-muted py-3 text-center">
      <span className="text-muted-foreground">Total: </span>
      <span className="font-medium text-primary">
        {total}
        {' '}
        ml
      </span>
    </div>
  );
}
