import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '@app/core/config/api-base-url';

import { GroceryItem, GroceryItemPatch } from './grocery-list.types';

@Injectable({ providedIn: 'root' })
export class GroceryListApi {
  readonly #http = inject(HttpClient);
  readonly #base = inject(API_BASE_URL);

  getAll(): Observable<GroceryItem[]> {
    return this.#http.get<GroceryItem[]>(`${this.#base}/items`);
  }

  create(item: GroceryItem): Observable<GroceryItem> {
    return this.#http.post<GroceryItem>(`${this.#base}/items`, item);
  }

  patch(id: string, changes: GroceryItemPatch): Observable<GroceryItem> {
    return this.#http.patch<GroceryItem>(`${this.#base}/items/${id}`, changes);
  }

  delete(id: string): Observable<void> {
    return this.#http.delete<void>(`${this.#base}/items/${id}`);
  }
}
