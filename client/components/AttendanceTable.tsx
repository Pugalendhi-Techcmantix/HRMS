import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { parseTime } from '@/utils/timeCalculations';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TableRow {
  id: string;
  sNo: number | string;
  name: string;
  regNo: string;
  date: string;
  time: string;
}

export default function AttendanceTable() {
  // const sampleData: TableRow[] = [
  //   { id: '1', sNo: 1, name: 'Pugalendhi S', regNo: '6', date: '14-11-2025', time: '06:59 PM' },
  //   { id: '2', sNo: 2, name: 'Pugalendhi S', regNo: '6', date: '14-11-2025', time: '05:00 PM' },
  //   { id: '3', sNo: 3, name: 'Pugalendhi S', regNo: '6', date: '14-11-2025', time: '04:43 PM' },
  //   { id: '4', sNo: 4, name: 'Pugalendhi S', regNo: '6', date: '14-11-2025', time: '02:10 PM' },
  //   { id: '5', sNo: 5, name: 'Pugalendhi S', regNo: '6', date: '14-11-2025', time: '02:07 PM' },
  //   { id: '6', sNo: 6, name: 'Pugalendhi S', regNo: '6', date: '14-11-2025', time: '01:47 PM' },
  //   { id: '7', sNo: 7, name: 'Pugalendhi S', regNo: '6', date: '14-11-2025', time: '01:15 PM' },
  //   { id: '8', sNo: 8, name: 'Pugalendhi S', regNo: '6', date: '14-11-2025', time: '12:10 PM' },
  //   { id: '9', sNo: 9, name: 'Pugalendhi S', regNo: '6', date: '14-11-2025', time: '11:51 AM' },
  //   { id: '10', sNo: 10, name: 'Pugalendhi S', regNo: '6', date: '14-11-2025', time: '09:06 AM' },
  // ];
 const sampleData: TableRow[] = [];
  const [tableData, setTableData] = useState<TableRow[]>(sampleData);
  const [error, setError] = useState('');
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);

  const updateCell = (id: string, field: keyof TableRow, value: any) => {
    setTableData(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
    setError('');
  };

  const addRow = () => {
    const newId = Date.now().toString();
    const newRow: TableRow = {
      id: newId,
      sNo: tableData.length + 1,
      name: '',
      regNo: '',
      date: '',
      time: ''
    };
    setTableData([...tableData, newRow]);
  };

  const deleteRow = (id: string) => {
    const newData = tableData.filter(row => row.id !== id);
    setTableData(newData.map((row, i) => ({ ...row, sNo: i + 1 })));
  };

  const clearAll = () => {
    setTableData([]);
    setError('');
  };

  const parsePastedData = (text: string) => {
    try {
      const lines = text.trim().split('\n');
      const parsed: TableRow[] = [];

      lines.forEach((line, idx) => {
        const columns = line.split('\t');
        if (columns.length >= 5) {
          const sNo = parseInt(columns[0].trim());
          if (!isNaN(sNo)) {
            parsed.push({
              id: `${Date.now()}-${idx}`,
              sNo: sNo,
              name: columns[1]?.trim() || '',
              regNo: columns[2]?.trim() || '',
              date: columns[3]?.trim() || '',
              time: columns[4]?.trim() || '',
            });
          }
        }
      });

      if (parsed.length === 0) {
        setError('No valid data found. Make sure to paste tab-separated values.');
        return;
      }

      setTableData(parsed);
      setPasteText('');
      setShowPasteModal(false);
      setError('');
    } catch (err) {
      setError('Error parsing pasted data. Please check the format.');
    }
  };

  // Calculate working hours and break hours
  const calculateMetrics = () => {
    if (!tableData || tableData.length < 2) {
      return { 
        totalWorkHours: 0, 
        totalWorkMinutes: 0, 
        totalBreakHours: 0, 
        totalBreakMinutes: 0,
        totalClockHours: 0,
        totalClockMinutes: 0
      };
    }

    const validRows = tableData.filter(row => row && row.name && row.regNo && row.date && row.time);
    if (validRows.length < 2) {
      return { 
        totalWorkHours: 0, 
        totalWorkMinutes: 0, 
        totalBreakHours: 0, 
        totalBreakMinutes: 0,
        totalClockHours: 0,
        totalClockMinutes: 0
      };
    }

    const grouped: { [key: string]: TableRow[] } = {};
    validRows.forEach(row => {
      const key = `${row.name}|${row.regNo}|${row.date}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    });

    let totalWorkMinutes = 0;
    let totalBreakMinutes = 0;

    Object.entries(grouped).forEach(([key, groupRows]) => {
      const sortedTimes = groupRows
        .filter(row => row && row.time)
        .map(row => ({
          row,
          parsed: parseTime(row.time)
        }))
        .sort((a, b) => a.parsed.getTime() - b.parsed.getTime());

      if (sortedTimes.length < 2) return;

      for (let i = 0; i < sortedTimes.length - 1; i += 2) {
        const inTime = sortedTimes[i].parsed;
        const outTime = sortedTimes[i + 1].parsed;
        const durationMinutes = (outTime.getTime() - inTime.getTime()) / (1000 * 60);

        if (durationMinutes > 0) {
          totalWorkMinutes += durationMinutes;
        }

        if (i + 2 < sortedTimes.length) {
          const nextInTime = sortedTimes[i + 2].parsed;
          const breakMinutes = (nextInTime.getTime() - outTime.getTime()) / (1000 * 60);
          if (breakMinutes > 0) {
            totalBreakMinutes += breakMinutes;
          }
        }
      }
    });

    const totalWorkHours = Math.floor(totalWorkMinutes / 60);
    const remainingWorkMinutes = Math.round(totalWorkMinutes % 60);
    const totalBreakHours = Math.floor(totalBreakMinutes / 60);
    const remainingBreakMinutes = Math.round(totalBreakMinutes % 60);
    const totalClockMinutes = totalWorkMinutes + totalBreakMinutes;
    const totalClockHours = Math.floor(totalClockMinutes / 60);
    const totalClockMins = Math.round(totalClockMinutes % 60);

    return {
      totalWorkHours,
      totalWorkMinutes: remainingWorkMinutes,
      totalBreakHours,
      totalBreakMinutes: remainingBreakMinutes,
      totalClockHours,
      totalClockMinutes: totalClockMins
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-slate-900">Attendance Tracker</h1>
        <p className="text-lg text-slate-600">Click any cell to edit like Excel. Add/remove rows as needed. Calculations update automatically.</p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Data Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Attendance Data (Click cells to edit)</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowPasteModal(true)}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
              >
                📋 Paste Data
              </Button>
              <Button
                onClick={addRow}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Row
              </Button>
              <Button
                onClick={clearAll}
                variant="outline"
                className="border-slate-300 text-red-600 hover:text-red-700"
              >
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto bg-white">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-slate-100 to-slate-50 border-b-2 border-slate-300">
                  <th className="px-4 py-3 text-left text-sm font-bold text-slate-700 w-16 border-r border-slate-200">S No</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-slate-700 border-r border-slate-200">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-slate-700 w-24 border-r border-slate-200">Reg No</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-slate-700 w-32 border-r border-slate-200">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-slate-700 w-32 border-r border-slate-200">Time</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-slate-700 w-16">Action</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-200 hover:bg-blue-50 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-slate-700 font-medium border-r border-slate-200 w-16">
                      <div className="bg-slate-100 rounded px-2 py-1 text-center">{row.sNo}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 border-r border-slate-200 min-w-max">
                      <EditableCell
                        value={row.name}
                        isEditing={editingCell === `${row.id}-name`}
                        onChange={(val) => updateCell(row.id, 'name', val)}
                        onEditStart={() => setEditingCell(`${row.id}-name`)}
                        onEditEnd={() => setEditingCell(null)}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 border-r border-slate-200 w-24">
                      <EditableCell
                        value={row.regNo}
                        isEditing={editingCell === `${row.id}-regNo`}
                        onChange={(val) => updateCell(row.id, 'regNo', val)}
                        onEditStart={() => setEditingCell(`${row.id}-regNo`)}
                        onEditEnd={() => setEditingCell(null)}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 border-r border-slate-200 w-32">
                      <EditableCell
                        value={row.date}
                        isEditing={editingCell === `${row.id}-date`}
                        onChange={(val) => updateCell(row.id, 'date', val)}
                        onEditStart={() => setEditingCell(`${row.id}-date`)}
                        onEditEnd={() => setEditingCell(null)}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 border-r border-slate-200 w-32">
                      <EditableCell
                        value={row.time}
                        isEditing={editingCell === `${row.id}-time`}
                        onChange={(val) => updateCell(row.id, 'time', val)}
                        onEditStart={() => setEditingCell(`${row.id}-time`)}
                        onEditEnd={() => setEditingCell(null)}
                      />
                    </td>
                    <td className="px-4 py-3 text-center w-16">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRow(row.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl border-slate-300 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
              <CardTitle>Paste Attendance Data</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Paste tab-separated data (S No, Name, Reg No, Date, Time):
                </label>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`1\tPugalendhi S\t6\t14-11-2025\t06:59 PM
2\tPugalendhi S\t6\t14-11-2025\t05:00 PM
3\tPugalendhi S\t6\t14-11-2025\t04:43 PM
...`}
                  className="w-full p-3 border border-slate-300 rounded-lg font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-48"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => setShowPasteModal(false)}
                  variant="outline"
                  className="border-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => parsePastedData(pasteText)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Load Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Cards */}
      {tableData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm">
            <div className="text-sm text-blue-600 font-semibold">Total Entries</div>
            <div className="text-3xl font-bold text-blue-900">{tableData.length}</div>
          </div>
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg shadow-sm">
            <div className="text-sm text-green-600 font-semibold">Total Work Hours</div>
            <div className="text-3xl font-bold text-green-900">
              {metrics.totalWorkHours}h {metrics.totalWorkMinutes}m
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg shadow-sm">
            <div className="text-sm text-orange-600 font-semibold">Total Break Hours</div>
            <div className="text-3xl font-bold text-orange-900">
              {metrics.totalBreakHours}h {metrics.totalBreakMinutes}m
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg shadow-sm">
            <div className="text-sm text-purple-600 font-semibold">Total Clock Time</div>
            <div className="text-3xl font-bold text-purple-900">
              {metrics.totalClockHours}h {metrics.totalClockMinutes}m
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface EditableCellProps {
  value: any;
  isEditing: boolean;
  onChange: (value: any) => void;
  onEditStart: () => void;
  onEditEnd: () => void;
}

function EditableCell({ value, isEditing, onChange, onEditStart, onEditEnd }: EditableCellProps) {
  if (isEditing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onEditEnd}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onEditEnd();
          if (e.key === 'Escape') onEditEnd();
        }}
        className="w-full px-2 py-1 border border-blue-500 rounded bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    );
  }

  return (
    <div
      onClick={onEditStart}
      className="px-2 py-1 cursor-pointer rounded hover:bg-blue-100 transition-colors"
    >
      {value || '—'}
    </div>
  );
}
