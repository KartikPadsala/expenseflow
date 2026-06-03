'use client';
import { useState } from 'react';
import { useExpenses, type ExpenseFilters } from '@/hooks/use-expenses';
import { useCategories } from '@/hooks/use-categories';
import { useAuthStore } from '@/store/auth.store';
import { ExpenseCard } from '@/components/expenses/expense-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, SlidersHorizontal, X } from 'lucide-react';

function FilterPanel({
  filters,
  onChange,
  onClear,
  categories,
}: {
  filters: ExpenseFilters;
  onChange: (f: Partial<ExpenseFilters>) => void;
  onClear: () => void;
  categories: any[];
}) {
  const hasFilters = !!(filters.categoryId || filters.fromDate || filters.toDate || filters.minAmount || filters.maxAmount);

  return (
    <div className="rounded-lg border p-4 bg-card space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Category</Label>
          <Select
            value={filters.categoryId || 'all'}
            onValueChange={(v) => onChange({ categoryId: v === 'all' ? undefined : v })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">From date</Label>
          <Input
            type="date"
            className="h-9 text-sm"
            value={filters.fromDate || ''}
            onChange={(e) => onChange({ fromDate: e.target.value || undefined })}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">To date</Label>
          <Input
            type="date"
            className="h-9 text-sm"
            value={filters.toDate || ''}
            onChange={(e) => onChange({ toDate: e.target.value || undefined })}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Min amount</Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              className="h-9 text-sm"
              value={filters.minAmount ?? ''}
              onChange={(e) => onChange({ minAmount: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max amount</Label>
            <Input
              type="number"
              min={0}
              placeholder="∞"
              className="h-9 text-sm"
              value={filters.maxAmount ?? ''}
              onChange={(e) => onChange({ maxAmount: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
        </div>
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
          <X className="w-3 h-3 mr-1" /> Clear filters
        </Button>
      )}
    </div>
  );
}

export default function ExpensesPage() {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ExpenseFilters>({});
  const { user } = useAuthStore();
  const { data: categories = [] } = useCategories();
  const { data, isLoading } = useExpenses({ ...filters, search: search || undefined });

  const handleFilterChange = (partial: Partial<ExpenseFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  const clearFilters = () => {
    setFilters({});
    setShowFilters(false);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">All Expenses</h1>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="icon"
          onClick={() => setShowFilters((p) => !p)}
          title="Filters"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {showFilters && (
        <FilterPanel
          filters={filters}
          onChange={handleFilterChange}
          onClear={clearFilters}
          categories={categories as any[]}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {data?.data.map((e: any) => (
            <ExpenseCard key={e.id} expense={e} currentUserId={user?.id} />
          ))}
          {data?.data.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">No expenses found.</div>
          )}
        </div>
      )}
    </div>
  );
}
