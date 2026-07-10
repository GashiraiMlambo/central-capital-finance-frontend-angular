import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterByStatus',
  standalone: true
})
export class FilterByStatusPipe implements PipeTransform {
  transform(items: Array<{ status: string }>, status: string): number {
    if (!items) return 0;
    return items.filter(i => i.status === status).length;
  }
}
