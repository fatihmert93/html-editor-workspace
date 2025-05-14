
import { 
  Component, 
  forwardRef, 
  Input, 
  ViewChild, 
  ElementRef, 
  AfterViewInit, 
  ChangeDetectorRef,
  OnDestroy, 
  NgZone,
  Renderer2,
  ViewEncapsulation  // ViewEncapsulation ekledik
} from '@angular/core';
import { 
  ControlValueAccessor, 
  NG_VALUE_ACCESSOR
} from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

@Component({
  selector: 'html-editor',  // app-html-editor yerine html-editor
  templateUrl: './html-editor.component.html',
  styleUrls: ['./html-editor.component.scss'],
  encapsulation: ViewEncapsulation.None,  // İkon stillerinin düzgün yüklenmesi için
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => HtmlEditorComponent),
      multi: true
    }
  ],
  standalone: false  // Angular 19'da varsayılan true olabilir, false'a ayarlayalım
})
export class HtmlEditorComponent implements ControlValueAccessor, AfterViewInit, OnDestroy {
  @Input() height = '250px';
  @Input() placeholder = 'İçerik giriniz...';
  @Input() ariaLabel: string | undefined;
  @Input() maxLength: number | undefined;
  @Input() minLength: number | undefined;
  @Input() sanitize = true;
  
  @ViewChild('editor')
  editorElement!: ElementRef;
  @ViewChild('sourceCodeArea')
  sourceCodeArea!: ElementRef;
  
  value: string = '';
  disabled: boolean = false;
  showSourceCode: boolean = false;
  
  // Dialog states and data
  showLinkDialog: boolean = false;
  linkDialogData = { url: 'https://', text: '', target: '_self' };
  
  showImageDialog: boolean = false;
  imageDialogData = { url: '', alt: '', width: '', height: '' };
  
  showTableDialog: boolean = false;
  tableDialogData = { rows: 3, cols: 3, width: '100%', border: 1, header: true };
  
  // Track selection position
  savedSelection: Range | null = null;
  
  fontFamilies = [
    { label: 'Arial', value: 'Arial,Helvetica,sans-serif' },
    { label: 'Times New Roman', value: 'Times New Roman,Times,serif' },
    { label: 'Courier New', value: 'Courier New,Courier,monospace' },
    { label: 'Georgia', value: 'Georgia,serif' },
    { label: 'Verdana', value: 'Verdana,Geneva,sans-serif' },
    { label: 'Roboto', value: 'Roboto,sans-serif' },
    { label: 'Open Sans', value: 'Open Sans,sans-serif' }
  ];
  
  fontSizes = [
    { label: 'Çok Küçük', value: '1' },
    { label: 'Küçük', value: '2' },
    { label: 'Normal', value: '3' },
    { label: 'Büyük', value: '4' },
    { label: 'Daha Büyük', value: '5' },
    { label: 'Çok Büyük', value: '6' },
    { label: 'En Büyük', value: '7' }
  ];
  
  // To track component destruction
  private destroy$ = new Subject<void>();
  
  // Debounced content change tracking
  private contentChange$ = new Subject<string>();
  
  onChange: any = () => {};
  onTouched: any = () => {};
  
  constructor(
    private sanitizer: DomSanitizer,
    private renderer: Renderer2,
    private changeDetectorRef: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}
  
  // Geri kalanı korunuyor - orijinal component.ts kodundan
  
  // İkon sınıflarını almak için yardımcı fonksiyon (material mat-icon yerine)
  getIconClass(iconName: string): string {
    // Bu fonksiyon kullanılan ikon setine göre sınıf adı döndürür
    // Örnek kullanım: [class]="getIconClass('bold')"
    
    // Font Awesome için ikon eşleştirmeleri
    const iconMap: { [key: string]: string } = {
      'bold': 'fas fa-bold',
      'italic': 'fas fa-italic',
      'underline': 'fas fa-underline',
      'strikeThrough': 'fas fa-strikethrough',
      'foreColor': 'fas fa-font',
      'backColor': 'fas fa-fill-drip',
      'justifyLeft': 'fas fa-align-left',
      'justifyCenter': 'fas fa-align-center',
      'justifyRight': 'fas fa-align-right',
      'justifyFull': 'fas fa-align-justify',
      'insertUnorderedList': 'fas fa-list-ul',
      'insertOrderedList': 'fas fa-list-ol',
      'outdent': 'fas fa-outdent',
      'indent': 'fas fa-indent',
      'link': 'fas fa-link',
      'image': 'fas fa-image',
      'table': 'fas fa-table',
      'undo': 'fas fa-undo',
      'redo': 'fas fa-redo',
      'code': 'fas fa-code',
      'removeFormat': 'fas fa-eraser'
    };
    
    return iconMap[iconName] || 'fas fa-question'; // Varsayılan ikon
  }
  
  ngAfterViewInit() {
    this.initEditor();
    
    this.contentChange$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300)
      )
      .subscribe(() => {
        this.updateValue(this.editorElement.nativeElement.innerHTML);
      });
      
    document.addEventListener('selectionchange', () => {
      if (document.activeElement === this.editorElement.nativeElement) {
        this.ngZone.run(() => this.onSelectionChange());
      }
    });
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  initEditor() {
    if (this.value) {
      const safeValue = this.sanitizeHtml(this.value);
      this.editorElement.nativeElement.innerHTML = safeValue;
    }
    
    this.renderer.setAttribute(this.editorElement.nativeElement, 'contenteditable', !this.disabled ? 'true' : 'false');
    
    this.editorElement.nativeElement.addEventListener('focus', () => {
      if (this.editorElement.nativeElement.innerHTML.trim() === '') {
        this.execCommand('insertHTML', '<p><br></p>');
      }
    });
  }

  
  // Check if the current selection contains a link
  isLinkActive(): boolean {
    if (!window.getSelection) return false;
    
    const selection = window.getSelection();
    if (!selection?.rangeCount) return false;
    
    let node = selection.anchorNode;
    while (node && node.nodeType !== Node.ELEMENT_NODE) {
      node = node.parentNode;
    }
    
    // Check if we have an anchor element in the selection path
    while (node) {
      if (node.nodeName === 'A') return true;
      node = node.parentNode;
    }
    
    return false;
  }// src/app/shared/components/html-editor/html-editor.component.ts
  
  writeValue(value: any): void {
    this.value = value || '';
    
    // Update the editor if it exists
    if (this.editorElement && this.editorElement.nativeElement) {
      const safeValue = this.sanitizeHtml(this.value);
      this.editorElement.nativeElement.innerHTML = safeValue;
    }
    
    // Update the source code area if it exists and is visible
    if (this.sourceCodeArea && this.sourceCodeArea.nativeElement && this.showSourceCode) {
      this.sourceCodeArea.nativeElement.value = this.value;
    }
  }
  
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    
    if (this.editorElement && this.editorElement.nativeElement) {
      this.renderer.setAttribute(
        this.editorElement.nativeElement, 
        'contenteditable', 
        !isDisabled ? 'true' : 'false'
      );
    }
  }
  
  // Update value and call form callbacks
  updateValue(value: string) {
    const safeValue = this.sanitizeHtml(value);
    this.value = safeValue;
    this.onChange(safeValue);
  }
  
  // Sanitize HTML to prevent XSS attacks
  sanitizeHtml(content: string): string {
    if (!content || !this.sanitize) {
      return content;
    }
    
    try {
      // Use Angular's DomSanitizer to sanitize HTML
      // This works by creating a safe value and then bypassing security
      const sanitizedValue = this.sanitizer.sanitize(0, content);
      
      // If sanitizedValue is null, return empty string
      return sanitizedValue || '';
    } catch (e) {
      console.error('HTML Sanitization error:', e);
      
      // Fallback sanitization if Angular's sanitizer fails
      return content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=\s*["']?[^"']*["']?/gi, '');
    }
  }
  
  // Track selection position in editor
  saveSelection() {
    if (window.getSelection) {
      const sel = window.getSelection();
      if (sel?.getRangeAt && sel?.rangeCount) {
        this.savedSelection = sel.getRangeAt(0).cloneRange();
      }
    }
  }
  
  // Restore selection position
  restoreSelection() {
    if (this.savedSelection) {
      if (window.getSelection) {
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(this.savedSelection);
      }
    }
  }
  
  // Execute document commands
  execCommand(command: string, value: string = ''): void {
    if (this.disabled) return;
    
    // Focus editor if not already focused
    this.editorElement.nativeElement.focus();
    
    // Restore selection if we have one
    this.restoreSelection();
    
    // Execute the command
    document.execCommand(command, false, value);
    
    // Update the model value - use setTimeout to ensure command has completed
    setTimeout(() => {
      this.contentChange$.next(this.editorElement.nativeElement.innerHTML);
    }, 0);
  }
  
  // Handle selection changes to update toolbar state
  onSelectionChange(): void {
    if (this.disabled) return;
    
    this.saveSelection();
    
    // Ensure we have access to document commands
    if (!document.queryCommandSupported) return;
    
    // Run in NgZone to ensure change detection works
    this.ngZone.run(() => {
      try {
        // Force change detection to update button states
        this.changeDetectorRef.detectChanges();
      } catch (e) {
        console.error('Error updating selection state:', e);
      }
    });
  }
  
  // Check if a format is currently active
  isActive(command: string): boolean {
    try {
      if (document.queryCommandState) {
        return document.queryCommandState(command);
      }
    } catch (e) {
      // Some commands might not be supported in all browsers
      console.debug(`Command state check failed for ${command}:`, e);
    }
    return false;
  }
  
  // Font family selection
  setFontFamily(event: Event) {
    const select = event.target as HTMLSelectElement;
    if (select.value) {
      this.execCommand('fontName', select.value);
      select.value = ''; // Reset select
    }
  }
  
  // Font size selection
  setFontSize(event: Event) {
    const select = event.target as HTMLSelectElement;
    if (select.value) {
      this.execCommand('fontSize', select.value);
      select.value = ''; // Reset select
    }
  }
  
  // Apply format block
  applyFormatBlock(event: Event) {
    const select = event.target as HTMLSelectElement;
    if (select.value) {
      this.execCommand('formatBlock', '<' + select.value + '>');
      select.value = ''; // Reset select
    }
  }
  
  // Text color
  setForeColor(event: Event) {
    const input = event.target as HTMLInputElement;
    this.execCommand('foreColor', input.value);
  }
  
  // Background color
  setBackColor(event: Event) {
    const input = event.target as HTMLInputElement;
    this.execCommand('hiliteColor', input.value);
  }
  
  // Link dialog
  addLink() {
    if (this.disabled) return;
    
    this.saveSelection();
    
    // Get selected text for the link
    const sel = window.getSelection();
    if (sel?.toString()) {
      this.linkDialogData.text = sel.toString();
    } else {
      this.linkDialogData.text = 'Link';
    }
    
    this.showLinkDialog = true;
    this.changeDetectorRef.detectChanges();
  }
  
  // Insert link after dialog confirmation
  insertLink(event: Event) {
    event.preventDefault();
    
    this.showLinkDialog = false;
    
    // Focus editor and restore selection
    this.editorElement.nativeElement.focus();
    this.restoreSelection();
    
    // Create link
    const linkHtml = `<a href="${this.linkDialogData.url}" target="${this.linkDialogData.target}">${this.linkDialogData.text}</a>`;
    this.execCommand('insertHTML', linkHtml);
    
    // Reset form
    this.linkDialogData = { url: 'https://', text: '', target: '_self' };
  }
  
  // Cancel link dialog
  cancelLinkDialog() {
    this.showLinkDialog = false;
    this.linkDialogData = { url: 'https://', text: '', target: '_self' };
  }
  
  // Image dialog
  insertImage() {
    if (this.disabled) return;
    
    this.saveSelection();
    this.showImageDialog = true;
    this.changeDetectorRef.detectChanges();
  }
  
  // Insert image after dialog confirmation
  insertImageElement(event: Event) {
    event.preventDefault();
    
    this.showImageDialog = false;
    
    // Focus editor and restore selection
    this.editorElement.nativeElement.focus();
    this.restoreSelection();
    
    // Build style string for width/height
    let styleAttr = '';
    if (this.imageDialogData.width || this.imageDialogData.height) {
      const styles = [];
      if (this.imageDialogData.width) styles.push(`width: ${this.imageDialogData.width}px`);
      if (this.imageDialogData.height) styles.push(`height: ${this.imageDialogData.height}px`);
      styleAttr = ` style="${styles.join('; ')}"`;
    }
    
    // Create image
    const imgHtml = `<img src="${this.imageDialogData.url}" alt="${this.imageDialogData.alt}"${styleAttr}>`;
    this.execCommand('insertHTML', imgHtml);
    
    // Reset form
    this.imageDialogData = { url: '', alt: '', width: '', height: '' };
  }
  
  // Cancel image dialog
  cancelImageDialog() {
    this.showImageDialog = false;
    this.imageDialogData = { url: '', alt: '', width: '', height: '' };
  }
  
  // Table dialog
  insertTable() {
    if (this.disabled) return;
    
    this.saveSelection();
    this.showTableDialog = true;
    this.changeDetectorRef.detectChanges();
  }
  
  // Insert table after dialog confirmation
  insertTableElement(event: Event) {
    event.preventDefault();
    
    this.showTableDialog = false;
    
    // Focus editor and restore selection
    this.editorElement.nativeElement.focus();
    this.restoreSelection();
    
    // Create table HTML
    let tableHtml = `<table style="width: ${this.tableDialogData.width}" border="${this.tableDialogData.border}" cellpadding="5" cellspacing="0">`;
    
    // Add header row if selected
    if (this.tableDialogData.header) {
      tableHtml += '<thead><tr>';
      for (let i = 0; i < this.tableDialogData.cols; i++) {
        tableHtml += `<th>Başlık ${i + 1}</th>`;
      }
      tableHtml += '</tr></thead>';
    }
    
    // Add table body
    tableHtml += '<tbody>';
    for (let i = 0; i < this.tableDialogData.rows; i++) {
      tableHtml += '<tr>';
      for (let j = 0; j < this.tableDialogData.cols; j++) {
        tableHtml += '<td>&nbsp;</td>';
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table>';
    
    // Insert table
    this.execCommand('insertHTML', tableHtml);
    
    // Reset form but keep some values for convenience
    this.tableDialogData = { ...this.tableDialogData, rows: 3, cols: 3 };
  }
  
  // Cancel table dialog
  cancelTableDialog() {
    this.showTableDialog = false;
  }
  
  // Toggle HTML source code view
  toggleSourceCode() {
    if (this.disabled) return;
    
    // Save current view's content
    if (this.showSourceCode) {
      // Switching from source to visual
      if (this.sourceCodeArea && this.sourceCodeArea.nativeElement) {
        const sourceValue = this.sourceCodeArea.nativeElement.value;
        this.updateValue(sourceValue);
        
        // We need to wait for Angular to update the view before setting innerHTML
        setTimeout(() => {
          if (this.editorElement && this.editorElement.nativeElement) {
            this.editorElement.nativeElement.innerHTML = this.value;
          }
        });
      }
    } else {
      // Switching from visual to source
      this.updateValue(this.editorElement.nativeElement.innerHTML);
    }
    
    // Toggle view
    this.showSourceCode = !this.showSourceCode;
    
    // Let Angular update the view
    this.changeDetectorRef.detectChanges();
    
    // Then set the source code textarea value
    if (this.showSourceCode) {
      setTimeout(() => {
        if (this.sourceCodeArea && this.sourceCodeArea.nativeElement) {
          this.sourceCodeArea.nativeElement.value = this.value;
        }
      });
    }
  }
  
  // Handle source code changes
  onSourceCodeChange(event: Event) {
    if (this.disabled) return;
    
    const textarea = event.target as HTMLTextAreaElement;
    this.value = textarea.value;
    this.onChange(this.value);
  }
  
  // Handle source code blur
  onSourceCodeBlur() {
    this.onTouched();
  }
  
  // Handle editor content changes
  onContentChange() {
    if (this.disabled) return;
    
    this.contentChange$.next(this.editorElement.nativeElement.innerHTML);
  }
  
  // Handle editor blur
  onContentBlur() {
    this.onTouched();
  }
  
  // Undo
  undo() {
    this.execCommand('undo');
  }
  
  // Redo
  redo() {
    this.execCommand('redo');
  }
  
  // Handle keyboard shortcuts
  onEditorKeyDown(event: KeyboardEvent): boolean {
    if (this.disabled) return true;
    
    // Save selection on any keydown
    this.saveSelection();
    
    // Handle keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'b': // Bold
          event.preventDefault();
          this.execCommand('bold');
          break;
        case 'i': // Italic
          event.preventDefault();
          this.execCommand('italic');
          break;
        case 'u': // Underline
          event.preventDefault();
          this.execCommand('underline');
          break;
        case 'z': // Undo
          event.preventDefault();
          if (event.shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
          break;
        case 'y': // Redo
          event.preventDefault();
          this.redo();
          break;
      }
    }
    
    // Check content length if maxLength is set
    if (this.maxLength) {
      const textContent = this.editorElement.nativeElement.textContent || '';
      if (textContent.length >= this.maxLength && !this.isControlKey(event)) {
        event.preventDefault();
        return false;
      }
    }
    
    return true;
  }
  
  // Check if key is a control key
  isControlKey(event: KeyboardEvent): boolean {
    return event.ctrlKey || event.metaKey || event.altKey || 
           ['Control', 'Shift', 'Alt', 'Meta', 'CapsLock', 'Escape', 'ArrowLeft', 
            'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', 'Delete', 'Tab', 
            'Home', 'End', 'PageUp', 'PageDown'].includes(event.key);
  }
  
  // Handle paste events to clean formatting
  onPaste(event: ClipboardEvent): void {
    if (this.disabled) return;
    
    // Prevent default paste
    event.preventDefault();
    
    // Get text from clipboard
    const text = event.clipboardData?.getData('text/plain') || '';
    const html = event.clipboardData?.getData('text/html') || '';
    
    // We need to handle different paste scenarios
    if (html && html.trim() !== '') {
      try {
        // Clean HTML content for security
        const cleanHtml = this.sanitize ? this.sanitizeHtml(html) : html;
        
        // Direct insertion into the editor
        this.ngZone.runOutsideAngular(() => {
          document.execCommand('insertHTML', false, cleanHtml);
          
          // Update the model value after paste
          setTimeout(() => {
            this.ngZone.run(() => {
              this.updateValue(this.editorElement.nativeElement.innerHTML);
            });
          }, 10);
        });
      } catch (e) {
        console.error('Error pasting HTML:', e);
        // Fallback to inserting text
        document.execCommand('insertText', false, text);
      }
    } else if (text && text.trim().startsWith('<') && text.includes('>')) {
      // This might be HTML code pasted as plain text
      try {
        // Create a temporary div to parse HTML string
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        
        // Get the HTML content from the div
        const parsedHtml = this.sanitize ? this.sanitizeHtml(tempDiv.innerHTML) : tempDiv.innerHTML;
        
        // Insert parsed HTML
        document.execCommand('insertHTML', false, parsedHtml);
        
        setTimeout(() => {
          this.updateValue(this.editorElement.nativeElement.innerHTML);
        }, 10);
      } catch (e) {
        console.error('Error parsing HTML from plain text:', e);
        // Fallback to inserting text
        document.execCommand('insertText', false, text);
      }
    } else {
      // Just insert as plain text
      document.execCommand('insertText', false, text);
    }
  }
  }