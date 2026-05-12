import { LucideIcon } from 'lucide-react';

interface PlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  phase: string;
}

export default function Placeholder({ title, description, icon: Icon, phase }: PlaceholderProps) {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold serif flex items-center gap-3">
          <Icon size={26} className="text-eqc-green" />
          {title}
        </h2>
        <p className="text-sm text-eqc-muted mt-1">{description}</p>
      </div>

      <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
        <Icon size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-bold text-gray-700 mb-2">Coming soon</h3>
        <p className="text-sm text-eqc-muted max-w-md mx-auto">
          This tab is being built in {phase}. The Firestore schema and data hooks are already in place — the UI is next.
        </p>
      </div>
    </div>
  );
}
