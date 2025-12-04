import { Component, inject, OnInit } from '@angular/core';
import { ChatBody } from "../../features/chat/chat-body/chat-body";
import { ChatInput } from "../../features/chat/chat-input/chat-input";
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-body',
  imports: [ChatBody, ChatInput],
  templateUrl: './body.html',
  styleUrl: './body.scss'
})
export class Body implements OnInit {
  private route = inject(ActivatedRoute);
  currentChatId: string = 'global'; // Default

  ngOnInit() {
    // Escuchar cambios en la URL para SPA
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.currentChatId = id;
        // Aquí podrías notificar a los hijos o dejar que ellos reaccionen al @Input change
      }
    });
  }

}
