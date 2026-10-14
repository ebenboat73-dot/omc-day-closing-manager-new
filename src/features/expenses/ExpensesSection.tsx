/**
 * Station Daily Expenses Section
 * PRD v3.1 Section 11:
 * "Each expense includes description, amount in GHS, optional category, and note.
 * Display individual expenses and the total. Keep expenses editable.
 * Do not subtract expenses from fuel sales."
 */

import React from 'react';
import { ReportExpense } from '../../types/report';
import { Receipt, Plus, Trash2 } from 'lucide-react';
import { formatNumberWithCommas } from '../sharing/reportFormatter';

interface ExpensesSectionProps {
  expenses: ReportExpense[];
  onUpdateExpenses: (expenses: ReportExpense[]) => void;
}

export const ExpensesSection: React.FC<ExpensesSectionProps> = ({
  expenses,
  onUpdateExpenses,
}) => {
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amountGhs || 0), 0);

  const handleAddExpense = () => {
    const newItem: ReportExpense = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      category: 'Other',
      description: '',
      amountGhs: 0,
      note: '',
    };
    onUpdateExpenses([...expenses, newItem]);
  };

  const handleRemoveExpense = (id: string) => {
    onUpdateExpenses(expenses.filter((e) => e.id !== id));
  };

  const handleChangeExpense = (id: string, field: keyof ReportExpense, value: any) => {
    onUpdateExpenses(
      expenses.map((e) => {
        if (e.id === id) {
          return { ...e, [field]: value };
        }
        return e;
      })
    );
  };

  const categories: ReportExpense['category'][] = [
    'Staff/Meals',
    'Utilities',
    'Maintenance',
    'Transport',
    'Security',
    'Fuel/Gen',
    'Other',
  ];

  return (
    <section className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            <span>Station Daily Expenses</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational disbursements deducted from station cash (Currency: GHS)
          </p>
        </div>

        {/* Total Expenses Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
              Total Expenses
            </span>
            <span className="font-mono text-base font-bold text-amber-400">
              GHS {formatNumberWithCommas(totalExpenses, 2)}
            </span>
          </div>

          <button
            type="button"
            id="btn-add-expense"
            onClick={handleAddExpense}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Expenses List */}
      {expenses.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
          No expenses recorded for this report date. Click "Add Item" if disbursements occurred.
        </div>
      ) : (
        <div className="space-y-2.5">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all text-xs"
            >
              {/* Category */}
              <div className="w-full sm:w-40 shrink-0">
                <select
                  value={expense.category}
                  onChange={(e) => {
                    const cat = e.target.value as ReportExpense['category'];
                    handleChangeExpense(expense.id, 'category', cat);
                    if (!expense.description) {
                      handleChangeExpense(expense.id, 'description', cat);
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-amber-400"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="flex-1">
                <input
                  type="text"
                  value={expense.description}
                  onChange={(e) => handleChangeExpense(expense.id, 'description', e.target.value)}
                  placeholder="e.g. Pump attendants lunch allowance, Generator fuel..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Amount in GHS */}
              <div className="flex items-center gap-1.5 w-full sm:w-36 shrink-0">
                <span className="text-slate-400 font-mono text-xs">GHS</span>
                <input
                  type="number"
                  step="0.01"
                  value={expense.amountGhs || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    handleChangeExpense(expense.id, 'amountGhs', !isNaN(val) ? val : 0);
                  }}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-right font-mono text-white focus:outline-none focus:border-amber-400 font-bold"
                />
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => handleRemoveExpense(expense.id)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors shrink-0 self-end sm:self-center"
                title="Remove expense"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Suggested Quick Add Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] text-slate-500">
        <span>Quick Add:</span>
        <button
          type="button"
          onClick={() => {
            onUpdateExpenses([
              ...expenses,
              { id: `exp_${Date.now()}`, category: 'Staff/Meals', description: 'Attendants Lunch Allowance', amountGhs: 180 },
            ]);
          }}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          + Staff Lunch (GHS 180)
        </button>
        <button
          type="button"
          onClick={() => {
            onUpdateExpenses([
              ...expenses,
              { id: `exp_${Date.now()}`, category: 'Utilities', description: 'ECG Prepaid Power Recharge', amountGhs: 300 },
            ]);
          }}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          + ECG Power (GHS 300)
        </button>
        <button
          type="button"
          onClick={() => {
            onUpdateExpenses([
              ...expenses,
              { id: `exp_${Date.now()}`, category: 'Maintenance', description: 'Nozzle Seal Replacement', amountGhs: 150 },
            ]);
          }}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          + Maintenance (GHS 150)
        </button>
      </div>
    </section>
  );
};
