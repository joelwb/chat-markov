import { Routes } from '@angular/router';
import { Main } from './pages/main/main';

export const routes: Routes = [
    {path: '', redirectTo: '/new', pathMatch: 'full'},
    {
        path: ':chatId',
        component: Main,
    }
];
