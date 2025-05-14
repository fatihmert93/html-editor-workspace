import { TestBed } from '@angular/core/testing';

import { HtmlEditorService } from './html-editor.service';

describe('HtmlEditorService', () => {
  let service: HtmlEditorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HtmlEditorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
