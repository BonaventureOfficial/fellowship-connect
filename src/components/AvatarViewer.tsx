import { Dialog, DialogContent } from "@/components/ui/dialog";

export function AvatarViewer({
  open,
  onOpenChange,
  src,
  name,
  serial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  src: string | null;
  name: string;
  serial: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-border bg-card p-4">
        <div className="lf-ring-gradient mx-auto w-full rounded-3xl p-[2px]">
          <div className="overflow-hidden rounded-[22px] bg-background">
            {src ? (
              <img
                src={src}
                alt={name}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center text-5xl font-extrabold text-muted-foreground">
                {name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 text-center">
          <p className="text-base font-semibold text-foreground">{name}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {serial ?? "Serial en attente"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
