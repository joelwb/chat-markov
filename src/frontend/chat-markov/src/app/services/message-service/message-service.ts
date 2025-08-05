import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Message } from '../../models/message';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private readonly baseRoute = environment.API_URL + '/chats';
  private readonly http = inject(HttpClient);

  getAll(chatId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.baseRoute}/${chatId}/messages`);
  }
}
