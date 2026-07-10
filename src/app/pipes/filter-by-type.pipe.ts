import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterByType',
  standalone: true
})
export class FilterByTypePipe implements PipeTransform {
  transform(transactions: Array<{ type: string }>, type: string): number {
    if (!transactions) return 0;
    return transactions.filter(t => t.type === type).length;
  }
}
