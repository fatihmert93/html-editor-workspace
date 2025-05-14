import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HtmlEditorComponent } from './html-editor.component';

@NgModule({
  declarations: [
    HtmlEditorComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    HtmlEditorComponent
  ]
})
export class HtmlEditorModule { }