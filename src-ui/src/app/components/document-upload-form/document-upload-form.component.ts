import { NgClass } from '@angular/common'
import { HttpEventType } from '@angular/common/http'
import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core'
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms'
import { Router } from '@angular/router'
import { NgbAlert, NgbAlertModule } from '@ng-bootstrap/ng-bootstrap'
import { NgxBootstrapIconsModule } from 'ngx-bootstrap-icons'
import { Subject, takeUntil } from 'rxjs'
import { Correspondent } from 'src/app/data/correspondent'
import { CustomField, CustomFieldDataType } from 'src/app/data/custom-field'
import { DocumentType } from 'src/app/data/document-type'
import { StoragePath } from 'src/app/data/storage-path'
import { Tag } from 'src/app/data/tag'
import { IfPermissionsDirective } from 'src/app/directives/if-permissions.directive'
import {
  PermissionAction,
  PermissionType,
} from 'src/app/services/permissions.service'
import { CorrespondentService } from 'src/app/services/rest/correspondent.service'
import { CustomFieldsService } from 'src/app/services/rest/custom-fields.service'
import { DocumentTypeService } from 'src/app/services/rest/document-type.service'
import { DocumentService } from 'src/app/services/rest/document.service'
import { StoragePathService } from 'src/app/services/rest/storage-path.service'
import { TagService } from 'src/app/services/rest/tag.service'
import { ToastService } from 'src/app/services/toast.service'
import { CheckComponent } from '../common/input/check/check.component'
import { DateComponent } from '../common/input/date/date.component'
import { MonetaryComponent } from '../common/input/monetary/monetary.component'
import { NumberComponent } from '../common/input/number/number.component'
import { SelectComponent } from '../common/input/select/select.component'
import { TagsComponent } from '../common/input/tags/tags.component'
import { TextComponent } from '../common/input/text/text.component'
import { UrlComponent } from '../common/input/url/url.component'
import { PageHeaderComponent } from '../common/page-header/page-header.component'
import { ComponentWithPermissions } from '../with-permissions/with-permissions.component'

@Component({
  selector: 'pngx-document-upload-form',
  templateUrl: './document-upload-form.component.html',
  styleUrls: ['./document-upload-form.component.scss'],
  imports: [
    PageHeaderComponent,
    ReactiveFormsModule,
    FormsModule,
    NgClass,
    NgbAlertModule,
    NgxBootstrapIconsModule,
    IfPermissionsDirective,
    TextComponent,
    DateComponent,
    SelectComponent,
    TagsComponent,
    NumberComponent,
    CheckComponent,
    UrlComponent,
    MonetaryComponent,
  ],
})
export class DocumentUploadFormComponent
  extends ComponentWithPermissions
  implements OnInit, OnDestroy
{
  @ViewChild(NgbAlert) alert: NgbAlert

  private fb = inject(FormBuilder)
  private router = inject(Router)
  private documentService = inject(DocumentService)
  private correspondentService = inject(CorrespondentService)
  private tagService = inject(TagService)
  private documentTypeService = inject(DocumentTypeService)
  private storagePathService = inject(StoragePathService)
  private customFieldsService = inject(CustomFieldsService)
  private toastService = inject(ToastService)

  private unsubscribeNotifier: Subject<any> = new Subject()

  uploadForm: FormGroup
  selectedFile: File | null = null

  // Dropdown options
  correspondents: Correspondent[] = []
  tags: Tag[] = []
  documentTypes: DocumentType[] = []
  storagePaths: StoragePath[] = []
  customFields: CustomField[] = []

  // Upload status
  uploading = false
  uploadProgress = 0
  uploadError: string | null = null
  uploadSuccess = false

  // Permission types for template
  PermissionAction = PermissionAction
  PermissionType = PermissionType
  CustomFieldDataType = CustomFieldDataType

  ngOnInit(): void {
    this.initializeForm()
    this.loadMetadataOptions()
  }

  ngOnDestroy(): void {
    this.unsubscribeNotifier.next(true)
    this.unsubscribeNotifier.complete()
  }

  private initializeForm(): void {
    this.uploadForm = this.fb.group({
      document: [null, Validators.required],
      title: [''],
      created: [''],
      correspondent: [null],
      document_type: [null],
      storage_path: [null],
      tags: [[]],
      archive_serial_number: [''],
      custom_fields: this.fb.group({}),
    })
  }

  private loadMetadataOptions(): void {
    // Load correspondents
    this.correspondentService
      .listAll()
      .pipe(takeUntil(this.unsubscribeNotifier))
      .subscribe({
        next: (results) => {
          this.correspondents = results.results
        },
        error: (error) => {
          this.toastService.showError(
            $localize`Failed to load correspondents`,
            error
          )
        },
      })

    // Load tags
    this.tagService
      .listAll()
      .pipe(takeUntil(this.unsubscribeNotifier))
      .subscribe({
        next: (results) => {
          this.tags = results.results
        },
        error: (error) => {
          this.toastService.showError($localize`Failed to load tags`, error)
        },
      })

    // Load document types
    this.documentTypeService
      .listAll()
      .pipe(takeUntil(this.unsubscribeNotifier))
      .subscribe({
        next: (results) => {
          this.documentTypes = results.results
        },
        error: (error) => {
          this.toastService.showError(
            $localize`Failed to load document types`,
            error
          )
        },
      })

    // Load storage paths
    this.storagePathService
      .listAll()
      .pipe(takeUntil(this.unsubscribeNotifier))
      .subscribe({
        next: (results) => {
          this.storagePaths = results.results
        },
        error: (error) => {
          this.toastService.showError(
            $localize`Failed to load storage paths`,
            error
          )
        },
      })

    // Load custom fields
    this.customFieldsService
      .listAll()
      .pipe(takeUntil(this.unsubscribeNotifier))
      .subscribe({
        next: (results) => {
          this.customFields = results.results
          this.addCustomFieldControls()
        },
        error: (error) => {
          this.toastService.showError(
            $localize`Failed to load custom fields`,
            error
          )
        },
      })
  }

  private addCustomFieldControls(): void {
    const customFieldsGroup = this.uploadForm.get('custom_fields') as FormGroup

    this.customFields.forEach((field) => {
      const control = this.fb.control('')
      customFieldsGroup.addControl(field.id.toString(), control)
    })
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0]
      this.uploadForm.patchValue({ document: this.selectedFile })
      this.uploadError = null
      this.uploadSuccess = false
    }
  }

  onSubmit(): void {
    if (this.uploadForm.invalid || !this.selectedFile) {
      this.toastService.showError(
        $localize`Please select a file to upload`,
        null
      )
      return
    }

    const formData = this.buildFormData()

    this.uploading = true
    this.uploadError = null
    this.uploadSuccess = false
    this.uploadProgress = 0

    this.documentService
      .uploadDocument(formData)
      .pipe(takeUntil(this.unsubscribeNotifier))
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            this.uploadProgress = Math.round(
              (100 * event.loaded) / (event.total || 1)
            )
          } else if (event.type === HttpEventType.Response) {
            const taskId = event.body['task_id']
            this.onUploadSuccess(taskId)
          }
        },
        error: (error) => {
          this.uploading = false
          this.uploadProgress = 0
          this.uploadError =
            error.error?.document?.[0] ||
            error.error?.document ||
            $localize`Upload failed`
          this.toastService.showError($localize`Upload failed`, error)
        },
      })
  }

  private buildFormData(): FormData {
    const formData = new FormData()
    formData.append('document', this.selectedFile!, this.selectedFile!.name)
    formData.append('from_webui', 'true')

    const formValue = this.uploadForm.value

    // Add optional fields (only non-empty values)
    if (formValue.title?.trim()) {
      formData.append('title', formValue.title.trim())
    }
    if (formValue.created) {
      formData.append('created', formValue.created)
    }
    if (formValue.correspondent) {
      formData.append('correspondent', formValue.correspondent.toString())
    }
    if (formValue.document_type) {
      formData.append('document_type', formValue.document_type.toString())
    }
    if (formValue.storage_path) {
      formData.append('storage_path', formValue.storage_path.toString())
    }
    if (formValue.tags && formValue.tags.length > 0) {
      formValue.tags.forEach((tagId: number) => {
        formData.append('tags', tagId.toString())
      })
    }
    if (formValue.archive_serial_number) {
      formData.append(
        'archive_serial_number',
        formValue.archive_serial_number.toString()
      )
    }

    // Add custom fields
    const customFieldsData = this.getCustomFieldsData()
    if (Object.keys(customFieldsData).length > 0) {
      formData.append('custom_fields', JSON.stringify(customFieldsData))
    }

    return formData
  }

  private getCustomFieldsData(): { [key: string]: any } {
    const customFieldsGroup = this.uploadForm.get('custom_fields') as FormGroup
    const data: { [key: string]: any } = {}

    Object.keys(customFieldsGroup.controls).forEach((fieldId) => {
      const value = customFieldsGroup.get(fieldId)?.value
      if (value !== null && value !== '' && value !== undefined) {
        data[fieldId] = value
      }
    })

    return data
  }

  private onUploadSuccess(taskId: string): void {
    this.uploading = false
    this.uploadProgress = 100
    this.uploadSuccess = true

    this.toastService.showInfo(
      $localize`Document uploaded successfully`,
      $localize`The document is being processed. Task ID: ${taskId}`
    )

    // Reset form after a short delay
    setTimeout(() => {
      this.resetForm()
    }, 2000)
  }

  private resetForm(): void {
    this.uploadForm.reset()
    this.selectedFile = null
    this.uploadProgress = 0
    this.uploadSuccess = false
    this.uploadError = null

    // Reset custom fields group
    const customFieldsGroup = this.uploadForm.get('custom_fields') as FormGroup
    Object.keys(customFieldsGroup.controls).forEach((key) => {
      customFieldsGroup.get(key)?.setValue('')
    })

    // Reset tags to empty array
    this.uploadForm.patchValue({ tags: [] })

    // Reset file input
    const fileInput = document.getElementById(
      'documentFile'
    ) as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  onCancel(): void {
    this.router.navigate(['/documents'])
  }

  getCustomFieldType(field: CustomField): string {
    return CustomFieldDataType[field.data_type]
  }
}
