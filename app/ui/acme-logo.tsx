import { ViewfinderCircleIcon } from '@heroicons/react/24/solid';
import { lusitana } from '@/app/ui/fonts';

export default function AcmeLogo() {
  return (
    <div
      className={`${lusitana.className} flex flex-row items-center leading-none text-white w-full`}
    >
      <ViewfinderCircleIcon className="h-12 w-12 rounded-sm border-black" />
      <p className="text-[44px]">Expense Tracker</p>
    </div>
  );
}
