import { Button } from "./ui/button";

interface AlertDialogProps {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
}

export function AlertDialog({ open, title, message, onConfirm }: AlertDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onConfirm} />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        {title && (
          <h3 className="mb-4">{title}</h3>
        )}
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex justify-end">
          <Button onClick={onConfirm}>확인</Button>
        </div>
      </div>
    </div>
  );
}
