import AttendanceTable from '@/components/AttendanceTable';

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="py-8">
        <AttendanceTable />
      </div>
    </div>
  );
}
