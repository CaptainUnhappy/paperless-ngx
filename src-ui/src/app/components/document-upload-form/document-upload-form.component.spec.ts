import { HttpClientTestingModule } from '@angular/common/http/testing'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ReactiveFormsModule } from '@angular/forms'
import { RouterTestingModule } from '@angular/router/testing'
import { of } from 'rxjs'
import { CorrespondentService } from 'src/app/services/rest/correspondent.service'
import { CustomFieldsService } from 'src/app/services/rest/custom-fields.service'
import { DocumentTypeService } from 'src/app/services/rest/document-type.service'
import { DocumentService } from 'src/app/services/rest/document.service'
import { StoragePathService } from 'src/app/services/rest/storage-path.service'
import { TagService } from 'src/app/services/rest/tag.service'
import { ToastService } from 'src/app/services/toast.service'
import { DocumentUploadFormComponent } from './document-upload-form.component'

describe('DocumentUploadFormComponent', () => {
  let component: DocumentUploadFormComponent
  let fixture: ComponentFixture<DocumentUploadFormComponent>
  let documentService: DocumentService

  const mockCorrespondents = {
    results: [
      { id: 1, name: 'Test Correspondent 1' },
      { id: 2, name: 'Test Correspondent 2' },
    ],
  }

  const mockTags = {
    results: [
      { id: 1, name: 'Tag 1' },
      { id: 2, name: 'Tag 2' },
    ],
  }

  const mockDocumentTypes = {
    results: [
      { id: 1, name: 'Type 1' },
      { id: 2, name: 'Type 2' },
    ],
  }

  const mockStoragePaths = {
    results: [
      { id: 1, name: 'Path 1' },
      { id: 2, name: 'Path 2' },
    ],
  }

  const mockCustomFields = {
    results: [],
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        DocumentUploadFormComponent,
        HttpClientTestingModule,
        ReactiveFormsModule,
        RouterTestingModule,
      ],
      providers: [
        {
          provide: CorrespondentService,
          useValue: { listAll: () => of(mockCorrespondents) },
        },
        {
          provide: TagService,
          useValue: { listAll: () => of(mockTags) },
        },
        {
          provide: DocumentTypeService,
          useValue: { listAll: () => of(mockDocumentTypes) },
        },
        {
          provide: StoragePathService,
          useValue: { listAll: () => of(mockStoragePaths) },
        },
        {
          provide: CustomFieldsService,
          useValue: { listAll: () => of(mockCustomFields) },
        },
        {
          provide: DocumentService,
          useValue: {
            uploadDocument: jest.fn(),
          },
        },
        {
          provide: ToastService,
          useValue: {
            showError: jest.fn(),
            showInfo: jest.fn(),
          },
        },
      ],
    }).compileComponents()

    fixture = TestBed.createComponent(DocumentUploadFormComponent)
    component = fixture.componentInstance
    documentService = TestBed.inject(DocumentService)
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should initialize form with empty values', () => {
    expect(component.uploadForm).toBeDefined()
    expect(component.uploadForm.get('document')?.value).toBeNull()
    expect(component.uploadForm.get('title')?.value).toBe('')
    expect(component.uploadForm.get('created')?.value).toBe('')
    expect(component.uploadForm.get('correspondent')?.value).toBeNull()
    expect(component.uploadForm.get('document_type')?.value).toBeNull()
    expect(component.uploadForm.get('storage_path')?.value).toBeNull()
    expect(component.uploadForm.get('tags')?.value).toEqual([])
    expect(component.uploadForm.get('archive_serial_number')?.value).toBe('')
  })

  it('should require document field', () => {
    const documentControl = component.uploadForm.get('document')
    expect(documentControl?.hasError('required')).toBeTruthy()
  })

  it('should load metadata options on init', () => {
    expect(component.correspondents.length).toBe(2)
    expect(component.tags.length).toBe(2)
    expect(component.documentTypes.length).toBe(2)
    expect(component.storagePaths.length).toBe(2)
  })

  it('should handle file selection', () => {
    const file = new File(['test content'], 'test.pdf', {
      type: 'application/pdf',
    })
    const event = {
      target: {
        files: [file],
      },
    } as any

    component.onFileSelected(event)

    expect(component.selectedFile).toEqual(file)
    expect(component.uploadForm.get('document')?.value).toEqual(file)
  })

  it('should disable submit when no file is selected', () => {
    expect(component.uploadForm.invalid).toBeTruthy()
  })

  it('should enable submit when file is selected', () => {
    const file = new File(['test content'], 'test.pdf', {
      type: 'application/pdf',
    })
    component.selectedFile = file
    component.uploadForm.patchValue({ document: file })

    expect(component.uploadForm.valid).toBeTruthy()
  })

  it('should build FormData correctly', () => {
    const file = new File(['test content'], 'test.pdf', {
      type: 'application/pdf',
    })
    component.selectedFile = file
    component.uploadForm.patchValue({
      document: file,
      title: 'Test Document',
      correspondent: 1,
      tags: [1, 2],
    })

    const formData = component['buildFormData']()

    expect(formData).toBeInstanceOf(FormData)
    expect(formData.get('document')).toEqual(file)
    expect(formData.get('title')).toBe('Test Document')
    expect(formData.get('correspondent')).toBe('1')
    expect(formData.get('from_webui')).toBe('true')
  })

  it('should not include empty optional fields in FormData', () => {
    const file = new File(['test content'], 'test.pdf', {
      type: 'application/pdf',
    })
    component.selectedFile = file
    component.uploadForm.patchValue({
      document: file,
      title: '',
      correspondent: null,
    })

    const formData = component['buildFormData']()

    expect(formData.get('title')).toBeNull()
    expect(formData.get('correspondent')).toBeNull()
  })

  it('should reset form after successful upload', (done) => {
    const file = new File(['test content'], 'test.pdf', {
      type: 'application/pdf',
    })
    component.selectedFile = file
    component.uploadForm.patchValue({ document: file, title: 'Test' })

    component['onUploadSuccess']('task-123')

    expect(component.uploading).toBeFalsy()
    expect(component.uploadProgress).toBe(100)
    expect(component.uploadSuccess).toBeTruthy()

    // Wait for the timeout to reset
    setTimeout(() => {
      expect(component.selectedFile).toBeNull()
      expect(component.uploadForm.get('title')?.value).toBe('')
      done()
    }, 2100)
  })

  it('should handle cancel and navigate to documents', () => {
    const router = TestBed.inject(RouterTestingModule) as any
    spyOn(component['router'], 'navigate')

    component.onCancel()

    expect(component['router'].navigate).toHaveBeenCalledWith(['/documents'])
  })

  it('should extract custom fields data correctly', () => {
    const customFieldsGroup = component.uploadForm.get(
      'custom_fields'
    ) as any
    customFieldsGroup.addControl('1', component['fb'].control('value1'))
    customFieldsGroup.addControl('2', component['fb'].control(''))
    customFieldsGroup.addControl('3', component['fb'].control('value3'))

    const data = component['getCustomFieldsData']()

    expect(data).toEqual({
      '1': 'value1',
      '3': 'value3',
    })
    expect(data['2']).toBeUndefined()
  })
})
