import { Component, DOCUMENT, Inject, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2
  ) {}

  isDark = false;


  toggleTheme(){

    this.isDark = !this.isDark;
    document.body.classList.toggle('dark');
    if (this.document.documentElement.classList.contains('dark')) {
      this.renderer.removeClass(this.document.documentElement, 'dark');

    } else {
      this.renderer.addClass(this.document.documentElement, 'dark');
    }
  }
}
