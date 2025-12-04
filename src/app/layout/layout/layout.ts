import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from "../header/header";
import { LeftSide } from "../left-side/left-side";
import { ChatBody } from "../../features/chat/chat-body/chat-body";
import { Body } from "../body/body";

@Component({
  selector: 'app-layout',
  imports: [Header, LeftSide, Body],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class Layout {

}
