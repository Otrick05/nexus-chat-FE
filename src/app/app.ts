import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './layout/header/header';
import { LeftSide } from "./layout/left-side/left-side";
import { Body } from './layout/body/body';
import { Layout } from './layout/layout/layout';

@Component({
  selector: 'app-root',
  imports: [
    Layout
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('nexus-chat');
}
