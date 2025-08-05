import { HttpClient, HttpDownloadProgressEvent, HttpEvent, HttpEventType } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Chat } from '../../models/chat';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly baseRoute = environment.API_URL + '/chats';
  private readonly http = inject(HttpClient);

  getAll(): Observable<Chat[]> {
    return this.http.get<Chat[]>(`${this.baseRoute}`);
  }

  create(name: string): Observable<Chat> {
    return this.http.post<Chat>(`${this.baseRoute}`, { name })
  }

  delete(chatId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseRoute}/${chatId}`);
  }

  listenToTrain(chatId: string): Observable<number> {
    return this.http.get<string>(`${this.baseRoute}/${chatId}/train-listener`, { observe: 'events', responseType: 'text' as any, reportProgress: true })
      .pipe(this.listenToTrainOperator())
  }

  train(chatId: string, file: File): Observable<number> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<string>(`${this.baseRoute}/${chatId}/train-v2`, formData, { observe: 'events', responseType: 'text' as any, reportProgress: true })
      .pipe(this.listenToTrainOperator())
  }

  private listenToTrainOperator() {
    return map((event: HttpEvent<string>) => {
      if (event.type === HttpEventType.DownloadProgress) {
        const partialText = (event as HttpDownloadProgressEvent).partialText;
        if (!partialText) return -1;
        const progresses = partialText.slice(0, -2).split('\n');
        const dataProgress = progresses.pop()!;
        const progress = dataProgress.replace('data: ', '');
        return +progress;
      } else if (event.type === HttpEventType.Response) {
        return 100;
      }

      return -1;
    })
  }

  generateText(chatId: string, promptText: string): Observable<{ text: string; done: boolean }> {
    return this.http.post(`${this.baseRoute}/${chatId}/generate-text`, { prompt: promptText }, { observe: 'events', responseType: 'text' as any, reportProgress: true })
      .pipe(
        map(event => {
          if (event.type === HttpEventType.DownloadProgress) {
            const partialText = (event as HttpDownloadProgressEvent).partialText;
            if (!partialText) return { text: "", done: false };
            return { text: partialText, done: false };
          } else if (event.type === HttpEventType.Response) {
            return { text: event.body! as any as string, done: true };
          }

          return { text: "", done: false };
        })
      )
  }
}
