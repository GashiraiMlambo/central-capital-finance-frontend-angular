import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { OnboardingService, OnboardingData } from '../../services/onboarding.service';
import { CaptchaComponent } from '../captcha/captcha.component';
import { countryCodes } from '../../services/countrycodes';
import { countries } from '../../services/countries';

@Component({
  selector: 'app-onboarding-stepper',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, CaptchaComponent],
  templateUrl: './onboarding-stepper.component.html',
  styleUrl: './onboarding-stepper.component.css'
})
export class OnboardingStepperComponent implements OnInit {
  // Stepper navigation
  currentStep = 1;
  totalSteps = 6;
  
  // Terms & Conditions Modal
  showTermsModal = true;
  termsAccepted = false;

  // Step 1: Identity & Verification
  identityForm!: FormGroup;
  captchaNum1 = 0;
  captchaNum2 = 0;
  generatedCaptchaCode = '';
  isIdentityVerified = false;
  isVerifyingIdentity = false;

  // Country Codes List & selection properties
  countryCodesList = countryCodes;
  selectedCountry = countryCodes.find(c => c.code === 'ZW') || countryCodes[0];
  localPhoneNum = '';
  showCountryDropdown = false;
  countrySearchQuery = '';
  filteredCountryCodes = countryCodes;

  // Countries dropdown list
  countriesList = countries;

  // Step 2: Personal Information
  personalForm!: FormGroup;
  fatfCountries = [
    'IRAN', 'DEMOCRATIC PEOPLE\'S REPUBLIC OF KOREA (DPRK)', 'NORTH KOREA', 
    'MYANMAR', 'SYRIA', 'YEMEN', 'SOUTH SUDAN', 'VENEZUELA'
  ];
  isHighRiskBirthCountry = false;

  // Step 3: Employment Details
  employmentForm!: FormGroup;

  // Step 4: Documents Upload
  uploadedDocs: Array<{ category: string; name: string; url: string; size: string; progress: number }> = [];
  uploadingCategory: string | null = null;
  draggedCategory: string | null = null;

  // Step 5: Facial Biometrics
  biometricState: 'idle' | 'scanning' | 'processing' | 'done' | 'failed' = 'idle';
  biometricProgress = 0;
  biometricMessage = 'Align your face inside the frame';
  biometricSimilarityScore = 0;
  biometricLivenessScore = 0;
  facialVerificationSuccessful = false;
  facialVerificationDone = false;
  biometricSelfieUrl: string | null = null;

  // Step 6: Security Verification & OTP
  accountForm!: FormGroup;
  passwordForm!: FormGroup;
  otpForm!: FormGroup;
  isOtpSent = false;
  isOtpVerified = false;
  mockOtp = '123456';
  showOtpNotification = false;
  isSubmitting = false;
  securityStepStage: 'PASSWORD' | 'OTP_DISPATCH' | 'OTP_VERIFICATION' = 'PASSWORD';
  otpDispatchMethod: 'SMS' | 'EMAIL' = 'SMS';
  showDashboard = false;

  // Application Reference
  referenceNumber = '';
  
  // Toast notifications
  toastMessage = '';
  toastType: 'success' | 'danger' | 'info' | 'warning' = 'info';
  showToast = false;

  constructor(
    private fb: FormBuilder,
    private onboardingService: OnboardingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.generateCaptcha();
    this.initForms();
    
    // Check if resuming an existing session
    const activeRef = this.onboardingService.getActiveReference();
    if (activeRef) {
      const savedApp = this.onboardingService.getApplication(activeRef);
      if (savedApp) {
        this.loadApplicationState(savedApp);
      } else {
        this.startFreshSession();
      }
    } else {
      this.startFreshSession();
    }
  }

  // --- Initializers & Setups ---
  startFreshSession(): void {
    this.referenceNumber = this.onboardingService.generateReference();
    this.showTermsModal = true;
  }

  generateCaptcha(): void {
    this.captchaNum1 = Math.floor(Math.random() * 10) + 1;
    this.captchaNum2 = Math.floor(Math.random() * 10) + 1;
  }

  initForms(): void {
    // Step 1 Form
    this.identityForm = this.fb.group({
      documentType: ['NATIONAL_ID', Validators.required],
      documentNumber: ['', [Validators.required, this.idFormatValidator.bind(this)]],
      passportNumber: [''],
      expiryDate: [''],
      issuingCountry: [''],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\+?[1-9]\d{8,14}$/)]],
      captchaInput: ['', Validators.required]
    });

    this.identityForm.get('documentType')?.valueChanges.subscribe(type => {
      const passNumControl = this.identityForm.get('passportNumber');
      const expiryControl = this.identityForm.get('expiryDate');
      const countryControl = this.identityForm.get('issuingCountry');

      if (type === 'NATIONAL_ID') {
        passNumControl?.clearValidators();
        expiryControl?.clearValidators();
        countryControl?.clearValidators();
        
        passNumControl?.setValue('');
        expiryControl?.setValue('');
        countryControl?.setValue('');
      } else {
        passNumControl?.setValidators([Validators.required]);
        expiryControl?.setValidators([Validators.required]);
        countryControl?.setValidators([Validators.required]);
      }
      
      passNumControl?.updateValueAndValidity();
      expiryControl?.updateValueAndValidity();
      countryControl?.updateValueAndValidity();
    });

    // Step 2 Form
    this.personalForm = this.fb.group({
      title: ['MR', Validators.required],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      middleName: [''],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      gender: ['MALE', Validators.required],
      dobDay: ['', Validators.required],
      dobMonth: ['', Validators.required],
      dobYear: ['', Validators.required],
      citizenship: ['Resident', Validators.required],
      countryOfBirth: ['ZIMBABWE', Validators.required],
      usaCitizen: ['NO', Validators.required],
      usaPermanentResident: ['NO', Validators.required],
      usaGreenCardHolder: ['NO', Validators.required],
      addressLine1: ['', Validators.required],
      city: ['', Validators.required],
      country: ['ZIMBABWE', Validators.required],
      postalCode: [''],
      isPostalSame: ['YES', Validators.required]
    }, {
      validators: [this.titleGenderValidator, this.dateOfBirthValidator.bind(this)]
    });

    // Step 3 Form
    this.employmentForm = this.fb.group({
      employmentStatus: ['', Validators.required],
      employerName: ['', Validators.required],
      occupation: ['', Validators.required],
      monthlySalary: ['', [Validators.required, Validators.min(0)]],
      employerAddress: ['', Validators.required],
      sources: this.fb.array([])
    });

    // Step 6 Form
    this.accountForm = this.fb.group({
      preferredBranch: ['999', Validators.required],
      currency: ['USD', Validators.required],
      accountType: ['SAVINGS', Validators.required]
    });

    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, {
      validators: this.passwordMatchValidator.bind(this)
    });

    this.otpForm = this.fb.group({
      otpInput: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });

    // Listen to changes for conditional validation / actions
    this.personalForm.get('countryOfBirth')?.valueChanges.subscribe(country => {
      this.checkHighRiskCountry(country);
    });

    this.personalForm.get('title')?.valueChanges.subscribe(() => {
      this.personalForm.updateValueAndValidity();
    });
    this.personalForm.get('gender')?.valueChanges.subscribe(() => {
      this.personalForm.updateValueAndValidity();
    });

    this.employmentForm.get('employmentStatus')?.valueChanges.subscribe(status => {
      const employerControl = this.employmentForm.get('employerName');
      const occControl = this.employmentForm.get('occupation');
      const addrControl = this.employmentForm.get('employerAddress');
      const salaryControl = this.employmentForm.get('monthlySalary');

      employerControl?.clearValidators();
      occControl?.clearValidators();
      addrControl?.clearValidators();
      salaryControl?.clearValidators();

      // Reset values if they are changing to something else to ensure data cleaness
      if (status !== 'UNEMPLOYED') {
        while (this.sourcesArray.length !== 0) {
          this.sourcesArray.removeAt(0);
        }
      } else {
        if (this.sourcesArray.length === 0) {
          this.addSource();
        }
      }
      if (status === 'UNEMPLOYED' || status === 'STUDENT' || status === 'RETIRED_PENSIONER' || status === 'RETIRED_NON_PENSIONER' || status === '') {
        employerControl?.setValue('', { emitEvent: false });
        occControl?.setValue('', { emitEvent: false });
        addrControl?.setValue('', { emitEvent: false });
      }
      if (status === 'UNEMPLOYED') {
        salaryControl?.setValue('', { emitEvent: false });
      }

      if (status === 'UNEMPLOYED') {
        // Validation managed via FormArray elements
      } else if (status === 'STUDENT' || status === 'RETIRED_PENSIONER' || status === 'RETIRED_NON_PENSIONER') {
        salaryControl?.setValidators([Validators.required, Validators.min(0)]);
      } else if (status === '') {
        // No extra validation required
      } else {
        employerControl?.setValidators(Validators.required);
        occControl?.setValidators(Validators.required);
        addrControl?.setValidators(Validators.required);
        salaryControl?.setValidators([Validators.required, Validators.min(0)]);
      }

      employerControl?.updateValueAndValidity();
      occControl?.updateValueAndValidity();
      addrControl?.updateValueAndValidity();
      salaryControl?.updateValueAndValidity();
    });
  }

  setDocumentType(type: string): void {
    if (this.isIdentityVerified) return;
    this.identityForm.get('documentType')?.setValue(type);
  }

  // --- Validators ---
  idFormatValidator(control: AbstractControl): {[key: string]: any} | null {
    if (!control.value) return null;
    const value = control.value.toUpperCase().trim();
    const normalized = value.replace(/[-\s]/g, '');
    const idPattern = /^\d{2}\d{6,7}[A-Z]\d{2}$/;
    if (!idPattern.test(normalized)) {
      return { invalidNationalId: 'Format must match national standards (e.g. 63 236767 M 34)' };
    }
    return null;
  }

  titleGenderValidator(control: AbstractControl): {[key: string]: any} | null {
    const title = control.get('title')?.value;
    const gender = control.get('gender')?.value;

    if (!title || !gender) return null;

    if (title === 'MR' && gender !== 'MALE') {
      return { titleGenderMismatch: 'Title "MR" requires "MALE" gender selection.' };
    }
    if ((title === 'MRS' || title === 'MISS' || title === 'MS') && gender !== 'FEMALE') {
      return { titleGenderMismatch: 'Title requires "FEMALE" gender selection.' };
    }
    return null;
  }

  dateOfBirthValidator(control: AbstractControl): {[key: string]: any} | null {
    const day = control.get('dobDay')?.value;
    const month = control.get('dobMonth')?.value;
    const year = control.get('dobYear')?.value;

    if (!day || !month || !year) return null;

    const date = new Date(Number(year), Number(month) - 1, Number(day));
    
    // Check if valid date (e.g. prevents Feb 30)
    if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) {
      return { invalidDate: 'Selected day is invalid for the chosen month.' };
    }

    // Check if at least 18
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }

    if (age < 18) {
      return { underage: 'Applicants must be at least 18 years of age.' };
    }
    return null;
  }

  checkHighRiskCountry(country: string): void {
    if (!country) {
      this.isHighRiskBirthCountry = false;
      return;
    }
    const cleanCountry = country.toUpperCase().trim();
    this.isHighRiskBirthCountry = this.fatfCountries.includes(cleanCountry);
  }

  // --- Terms & Conditions ---
  hasReadTerms = false;

  onTermsScroll(event: Event): void {
    const element = event.target as HTMLElement;
    // Check if scroll position reaches bottom with a small buffer
    if (element.scrollHeight - element.scrollTop <= element.clientHeight + 25) {
      this.hasReadTerms = true;
    }
  }

  acceptTerms(): void {
    if (!this.hasReadTerms) return;
    this.termsAccepted = true;
    this.showTermsModal = false;
    this.displayToast('Terms and conditions accepted.', 'success');
  }

  declineTerms(): void {
    this.termsAccepted = false;
    this.showTermsModal = false;
    this.onboardingService.clearActiveSession();
    this.router.navigate(['/']);
  }

  exitOnboarding(): void {
    this.onboardingService.clearActiveSession();
    this.router.navigate(['/']);
  }

  onCaptchaCodeGenerated(code: string): void {
    this.generatedCaptchaCode = code;
  }

  updatePhoneNumber(): void {
    const cleanLocal = this.localPhoneNum.replace(/\D/g, ''); // strip non-digits
    const normalizedLocal = cleanLocal.startsWith('0') ? cleanLocal.substring(1) : cleanLocal;
    const fullNum = `${this.selectedCountry.dialCode}${normalizedLocal}`;
    
    this.identityForm.get('phoneNumber')?.setValue(fullNum);
    this.identityForm.get('phoneNumber')?.markAsTouched();
  }

  onCountryChange(countryCode: string): void {
    const country = this.countryCodesList.find(c => c.code === countryCode);
    if (country) {
      this.selectedCountry = country;
      this.updatePhoneNumber();
    }
  }

  parsePhoneNumber(fullNumber: string): void {
    if (!fullNumber) return;
    
    const sortedCountries = [...this.countryCodesList].sort((a, b) => b.dialCode.length - a.dialCode.length);
    for (const country of sortedCountries) {
      if (fullNumber.startsWith(country.dialCode)) {
        this.selectedCountry = country;
        this.localPhoneNum = fullNumber.substring(country.dialCode.length);
        this.identityForm.get('phoneNumber')?.setValue(fullNumber);
        return;
      }
    }
    
    this.localPhoneNum = fullNumber;
    this.identityForm.get('phoneNumber')?.setValue(fullNumber);
  }

  toggleCountryDropdown(event: Event): void {
    if (this.isIdentityVerified) return;
    event.stopPropagation();
    this.showCountryDropdown = !this.showCountryDropdown;
    if (this.showCountryDropdown) {
      this.countrySearchQuery = '';
      this.filteredCountryCodes = this.countryCodesList;
      setTimeout(() => {
        const searchInputEl = document.querySelector('.dropdown-search-box input') as HTMLInputElement;
        if (searchInputEl) {
          searchInputEl.focus();
        }
      }, 50);
    }
  }

  filterCountries(): void {
    const query = this.countrySearchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredCountryCodes = this.countryCodesList;
    } else {
      this.filteredCountryCodes = this.countryCodesList.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.dialCode.toLowerCase().includes(query) ||
        c.code.toLowerCase().includes(query)
      );
    }
  }

  selectCountry(country: any): void {
    this.selectedCountry = country;
    this.updatePhoneNumber();
    this.showCountryDropdown = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.showCountryDropdown = false;
  }

  verifyIdentity(): void {
    this.isVerifyingIdentity = true;
    
    // Simulate API check against national database
    setTimeout(() => {
      this.isVerifyingIdentity = false;
      this.isIdentityVerified = true;
      this.displayToast('Identity details verified against national database registry.', 'success');
      this.saveDraft();
      this.navigateNext();
    }, 2000);
  }

  // --- Step 4: Documents Upload Simulation ---
  onFileSelected(event: any, category: string): void {
    const file = event.target.files[0];
    if (file) {
      this.simulateFileUpload(file, category);
    }
  }

  onFileDropped(event: any, category: string): void {
    event.preventDefault();
    this.draggedCategory = null;
    const file = event.dataTransfer.files[0];
    if (file) {
      this.simulateFileUpload(file, category);
    }
  }

  simulateFileUpload(file: File, category: string): void {
    this.uploadingCategory = category;
    
    const sizeStr = (file.size / 1024 / 1024).toFixed(2) + ' MB';
    const reader = new FileReader();
    
    // Create an object to track progress
    const docIndex = this.uploadedDocs.findIndex(d => d.category === category);
    const newDoc = {
      category,
      name: file.name,
      url: '',
      size: sizeStr,
      progress: 0
    };

    if (docIndex > -1) {
      this.uploadedDocs[docIndex] = newDoc;
    } else {
      this.uploadedDocs.push(newDoc);
    }

    // Simulate progress timer
    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      const doc = this.uploadedDocs.find(d => d.category === category);
      if (doc) doc.progress = progress;

      if (progress >= 100) {
        clearInterval(interval);
        
        // Once done, convert file to data URL for preview if it's an image
        reader.onload = (e: any) => {
          const completedDoc = this.uploadedDocs.find(d => d.category === category);
          if (completedDoc) {
            completedDoc.url = e.target.result;
          }
          this.uploadingCategory = null;
          this.displayToast(`${category.replace('_', ' ')} uploaded successfully.`, 'success');
          this.saveDraft();
        };
        reader.readAsDataURL(file);
      }
    }, 250);
  }

  removeDocument(category: string): void {
    this.uploadedDocs = this.uploadedDocs.filter(d => d.category !== category);
    this.displayToast(`Removed uploaded document.`, 'warning');
    this.saveDraft();
  }

  getDocument(category: string) {
    return this.uploadedDocs.find(d => d.category === category);
  }

  // --- Step 5: Webcam / Biometrics Simulator ---
  startLivenessCheck(): void {
    this.biometricState = 'scanning';
    this.biometricProgress = 0;
    this.biometricMessage = 'Scanning for presence... Please blink your eyes';

    const scanInterval = setInterval(() => {
      this.biometricProgress += 5;
      
      if (this.biometricProgress === 40) {
        this.biometricMessage = 'Positioning complete. Now smile slightly';
      }
      
      if (this.biometricProgress === 75) {
        this.biometricMessage = 'Analyzing movement and depth... Please hold still';
      }

      if (this.biometricProgress >= 100) {
        clearInterval(scanInterval);
        this.biometricState = 'processing';
        this.biometricMessage = 'Comparing selfie against identity document...';
        
        setTimeout(() => {
          // Generate realistic biometric scores
          this.biometricSimilarityScore = +(88 + Math.random() * 8).toFixed(1);
          this.biometricLivenessScore = +(92 + Math.random() * 7).toFixed(1);
          
          this.biometricSelfieUrl = '/landing_background.png'; // Simulation preview
          this.facialVerificationSuccessful = true;
          this.facialVerificationDone = true;
          this.biometricState = 'done';
          this.biometricMessage = 'Verification Successful!';
          this.displayToast('Liveness biometric scan matched with high confidence.', 'success');
          this.saveDraft();
        }, 2000);
      }
    }, 150);
  }

  resetBiometrics(): void {
    this.biometricState = 'idle';
    this.biometricProgress = 0;
    this.biometricSelfieUrl = null;
    this.facialVerificationSuccessful = false;
    this.facialVerificationDone = false;
  }

  // --- Step 6: OTP Flow ---
  sendMockOtp(): void {
    const phone = this.identityForm.get('phoneNumber')?.value;
    if (!phone) return;

    this.mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    this.isOtpSent = true;
    this.showOtpNotification = true;
    
    // Hide SMS notification after 8 seconds
    setTimeout(() => {
      this.showOtpNotification = false;
    }, 15000);
    
    this.displayToast('Mock OTP code generated.', 'info');
  }

  verifyOtp(): void {
    this.otpForm.markAllAsTouched();
    if (this.otpForm.invalid) return;

    const input = this.otpForm.get('otpInput')?.value;
    if (input === this.mockOtp || input === '123456') { // Fallback standard code
      this.isOtpVerified = true;
      this.showOtpNotification = false;
      this.displayToast('OTP verified successfully.', 'success');
      this.saveDraft();
    } else {
      this.otpForm.get('otpInput')?.setErrors({ incorrect: true });
      this.displayToast('Invalid OTP code. Please enter the correct code.', 'danger');
    }
  }

  // --- Navigation & Flow Controls ---
  goBackInSecurity(): void {
    if (this.securityStepStage === 'OTP_VERIFICATION') {
      this.securityStepStage = 'OTP_DISPATCH';
      this.isOtpSent = false;
    } else if (this.securityStepStage === 'OTP_DISPATCH') {
      this.securityStepStage = 'PASSWORD';
    } else {
      this.currentStep = 5;
      window.scrollTo(0, 0);
    }
  }

  navigateBack(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      window.scrollTo(0, 0);
    } else {
      this.router.navigate(['/']);
    }
  }

  navigateNext(): void {
    // Allow step navigation without validation constraints for testing purposes
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.saveDraft();
      window.scrollTo(0, 0);
    }
  }

  // --- Data Mapping & Persistence ---
  preparePayload(status: 'DRAFT' | 'SUBMITTED'): OnboardingData {
    return {
      referenceNumber: this.referenceNumber,
      step: this.currentStep,
      termsAccepted: this.termsAccepted,
      personalDetails: this.personalForm.value,
      employmentDetails: this.employmentForm.value,
      documents: this.uploadedDocs.map(d => ({
        category: d.category,
        name: d.name,
        url: d.url,
        size: d.size
      })),
      facialBiometric: this.facialVerificationDone ? {
        selfieUrl: this.biometricSelfieUrl || undefined,
        similarityScore: this.biometricSimilarityScore,
        faceMatch: this.facialVerificationSuccessful,
        livenessScore: this.biometricLivenessScore
      } : null,
      accountInformation: this.accountForm.value,
      status: status,
      updatedAt: new Date().toISOString()
    };
  }

  saveDraft(): void {
    const payload = this.preparePayload('DRAFT');
    this.onboardingService.saveApplication(payload);
  }

  manualSave(): void {
    this.saveDraft();
    this.displayToast(`Progress saved. Reference: ${this.referenceNumber}`, 'success');
  }

  loadApplicationState(app: OnboardingData): void {
    this.referenceNumber = app.referenceNumber;
    this.termsAccepted = app.termsAccepted;
    this.showTermsModal = !app.termsAccepted;
    this.currentStep = app.step;

    // Load step 1 details if present (personalDetails contains phone, idNumber, etc. too)
    if (app.personalDetails) {
      this.identityForm.patchValue({
        documentType: app.personalDetails.idType || 'NATIONAL_ID',
        documentNumber: app.personalDetails.idNumber || app.personalDetails.nationalId || '',
        captchaInput: ''
      });
      this.parsePhoneNumber(app.personalDetails.phoneNumber || '');
      this.isIdentityVerified = true;
    }

    // Load form details
    if (app.personalDetails) {
      // Deconstruct dob into select bindings if present in main string
      let day = '', month = '', year = '';
      if (app.personalDetails.dateOfBirth) {
        const dobParts = app.personalDetails.dateOfBirth.split('-');
        if (dobParts.length === 3) {
          year = dobParts[0];
          month = String(Number(dobParts[1])); // remove leading zero
          day = String(Number(dobParts[2]));
        }
      }
      
      this.personalForm.patchValue({
        title: app.personalDetails.title,
        firstName: app.personalDetails.firstName,
        middleName: app.personalDetails.middleName || '',
        lastName: app.personalDetails.lastName,
        gender: app.personalDetails.gender,
        dobDay: day || app.personalDetails.dobDay || '',
        dobMonth: month || app.personalDetails.dobMonth || '',
        dobYear: year || app.personalDetails.dobYear || '',
        citizenship: app.personalDetails.citizenship,
        countryOfBirth: app.personalDetails.countryOfBirth || 'ZIMBABWE',
        usaCitizen: app.personalDetails.usaCitizen || 'NO',
        usaPermanentResident: app.personalDetails.usaPermanentResident || 'NO',
        usaGreenCardHolder: app.personalDetails.usaGreenCardHolder || 'NO',
        addressLine1: app.personalDetails.addressLine1 || app.personalDetails.addressLine1 || '',
        city: app.personalDetails.city || '',
        country: app.personalDetails.country || 'ZIMBABWE',
        postalCode: app.personalDetails.postalCode || '',
        isPostalSame: app.personalDetails.isPostalSame || 'YES'
      });
    }

    if (app.employmentDetails) {
      const validStatuses = ['PERMANENT', 'TEMPORARY', 'PART_TIME', 'SELF_EMPLOYED', 'RETIRED_PENSIONER', 'RETIRED_NON_PENSIONER', 'UNEMPLOYED'];
      let status = app.employmentDetails.employmentStatus;
      if (!validStatuses.includes(status)) {
        if (status === 'EMPLOYED') {
          status = 'PERMANENT';
        } else if (status === 'SELF_EMPLOYED' || status === 'SELF-EMPLOYED') {
          status = 'SELF_EMPLOYED';
        } else {
          status = '';
        }
      }

      const modifiedDetails = {
        ...app.employmentDetails,
        employmentStatus: status
      };

      if (modifiedDetails.sources && Array.isArray(modifiedDetails.sources)) {
        while (this.sourcesArray.length !== 0) {
          this.sourcesArray.removeAt(0);
        }
        modifiedDetails.sources.forEach(() => {
          this.addSource();
        });
      }
      this.employmentForm.patchValue(modifiedDetails);
    }

    if (app.documents) {
      this.uploadedDocs = app.documents.map(d => ({
        ...d,
        progress: 100
      }));
    }

    if (app.facialBiometric) {
      this.biometricSelfieUrl = app.facialBiometric.selfieUrl || null;
      this.biometricSimilarityScore = app.facialBiometric.similarityScore || 0;
      this.biometricLivenessScore = app.facialBiometric.livenessScore || 0;
      this.facialVerificationSuccessful = app.facialBiometric.faceMatch || false;
      this.facialVerificationDone = true;
      this.biometricState = 'done';
    }

    if (app.accountInformation) {
      this.accountForm.patchValue(app.accountInformation);
    }

    this.displayToast('Saved application progress loaded.', 'success');
  }

  submitApplication(): void {
    this.isSubmitting = true;
    
    setTimeout(() => {
      this.isSubmitting = false;
      const payload = this.preparePayload('SUBMITTED');
      payload.status = 'APPROVED'; // Mock auto approval for this onboarding
      this.onboardingService.saveApplication(payload);

      // Save customer to localStorage for the standalone dashboard
      const personal = this.personalForm.value;
      const identity = this.identityForm.value;
      const account = this.accountForm.value;
      const password = this.passwordForm.get('password')?.value || 'Password123!';
      
      const customer = {
        id: this.referenceNumber || 'CCF-2026-8893',
        name: `${personal.firstName} ${personal.middleName ? personal.middleName + ' ' : ''}${personal.lastName}`,
        nationality: personal.citizenship || 'Zimbabwean',
        nationalId: identity.documentNumber || identity.passportNumber || '63-1234567A89',
        phone: identity.phoneNumber || '+263 77 123 4567',
        email: personal.email || 'customer@ccf.co.zw',
        address: `${personal.addressLine1 || ''}, ${personal.city || ''}, ${personal.country || ''}`,
        dob: `${personal.dobYear || '1990'}-${personal.dobMonth || '01'}-${personal.dobDay || '01'}`,
        occupation: this.employmentForm.get('occupation')?.value || 'Self-Employed',
        kycStatus: 'Verified',
        documents: this.uploadedDocs.map(d => ({
          type: d.category,
          url: d.name,
          status: 'Verified'
        })),
        registeredAt: new Date().toISOString()
      };

      localStorage.setItem('ccf_registered_customer', JSON.stringify(customer));
      localStorage.setItem('ccf_registered_password', password);
      localStorage.setItem('ccf_currency', account.currency || 'USD');
      
      this.displayToast('Application submitted successfully!', 'success');
      this.currentStep = 7; // Navigates to success view
      this.onboardingService.clearActiveSession();
    }, 2500);
  }

  get sourcesArray(): FormArray {
    return this.employmentForm.get('sources') as FormArray;
  }

  createSourceGroup(): FormGroup {
    return this.fb.group({
      sourceOfIncome: ['', Validators.required],
      incomeCurrency: ['USD', Validators.required],
      incomeAmount: ['', [Validators.required, Validators.min(1)]]
    });
  }

  addSource(): void {
    this.sourcesArray.push(this.createSourceGroup());
  }

  removeSource(index: number): void {
    if (this.sourcesArray.length > 1) {
      this.sourcesArray.removeAt(index);
    } else {
      this.sourcesArray.at(0).reset({
        sourceOfIncome: '',
        incomeCurrency: 'USD',
        incomeAmount: ''
      });
    }
  }

  clearSourceFields(): void {
    while (this.sourcesArray.length > 1) {
      this.sourcesArray.removeAt(1);
    }
    if (this.sourcesArray.length === 1) {
      this.sourcesArray.at(0).reset({
        sourceOfIncome: '',
        incomeCurrency: 'USD',
        incomeAmount: ''
      });
    }
  }

  // --- Toast Handler ---
  displayToast(msg: string, type: 'success' | 'danger' | 'info' | 'warning'): void {
    this.toastMessage = msg;
    this.toastType = type;
    this.showToast = true;
    
    setTimeout(() => {
      this.showToast = false;
    }, 4500);
  }

  closeToast(): void {
    this.showToast = false;
  }

  // --- Dropdown helpers ---
  getDaysArray(): number[] {
    return Array.from({ length: 31 }, (_, i) => i + 1);
  }

  getMonthsArray(): { val: number; label: string }[] {
    return [
      { val: 1, label: 'January' },
      { val: 2, label: 'February' },
      { val: 3, label: 'March' },
      { val: 4, label: 'April' },
      { val: 5, label: 'May' },
      { val: 6, label: 'June' },
      { val: 7, label: 'July' },
      { val: 8, label: 'August' },
      { val: 9, label: 'September' },
      { val: 10, label: 'October' },
      { val: 11, label: 'November' },
      { val: 12, label: 'December' }
    ];
  }

  getYearsArray(): number[] {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear - 18; y >= currentYear - 100; y--) {
      years.push(y);
    }
    return years;
  }

  passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    if (password !== confirmPassword) {
      control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  confirmPasswordSetup(): void {
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.valid) {
      this.securityStepStage = 'OTP_DISPATCH';
    }
  }

  sendOtpBySelectedMethod(method: 'SMS' | 'EMAIL'): void {
    this.otpDispatchMethod = method;
    this.mockOtp = '123456';
    this.isOtpSent = true;
    this.showOtpNotification = false;
    this.securityStepStage = 'OTP_VERIFICATION';
  }

  openDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  generatePdfReport(): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.displayToast('Pop-up blocked. Please allow pop-ups to view PDF statement.', 'warning');
      return;
    }
    
    const personal = this.personalForm.value;
    const account = this.accountForm.value;
    const ref = this.referenceNumber;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>CCF Wallet Statement - ${ref}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0076f6; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #0076f6; }
            .title { font-size: 20px; font-weight: bold; text-align: right; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
            .info-block h3 { margin: 0 0 10px 0; color: #555; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
            .info-block p { margin: 3px 0; font-size: 14px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .table th { background: #f4f6f9; color: #333; font-weight: 600; padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 13px; text-align: left; }
            .table td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .text-right { text-align: right; }
            .text-green { color: #2e7d32; font-weight: bold; }
            .text-red { color: #c62828; }
            .footer { margin-top: 50px; font-size: 11px; color: #777; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Central Capital Finance</div>
            <div class="title">WALLET STATEMENT</div>
          </div>
          <div class="info-grid">
            <div class="info-block">
              <h3>Customer Details</h3>
              <p><strong>Name:</strong> \${personal.title} \${personal.firstName} \${personal.middleName || ''} \${personal.lastName}</p>
              <p><strong>Address:</strong> \${personal.addressLine1}, \${personal.city}</p>
              <p><strong>Country:</strong> \${personal.country}</p>
            </div>
            <div class="info-block" style="text-align: right;">
              <h3>Wallet Details</h3>
              <p><strong>Profile Reference:</strong> \${ref}</p>
              <p><strong>Currency:</strong> \${account.currency}</p>
              <p><strong>Wallet Type:</strong> \${account.accountType}</p>
              <p><strong>Date Generated:</strong> \${new Date().toLocaleDateString()}</p>
            </div>
          </div>
          
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction Description</th>
                <th>Status</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>\${new Date().toLocaleDateString()}</td>
                <td>Initial Onboarding Welcome Bonus</td>
                <td style="color: #2e7d32;">Completed</td>
                <td class="text-right text-green">+$50.00</td>
              </tr>
              <tr>
                <td>\${new Date().toLocaleDateString()}</td>
                <td>Digital Wallet Activation Fee</td>
                <td style="color: #2e7d32;">Completed</td>
                <td class="text-right text-red">-$5.00</td>
              </tr>
              <tr>
                <td>\${new Date().toLocaleDateString()}</td>
                <td>Wallet Setup Fee</td>
                <td style="color: #2e7d32;">Completed</td>
                <td class="text-right text-red">-$10.00</td>
              </tr>
            </tbody>
          </table>
          
          <div class="footer">
            <p>This is a system-generated statement. Central Capital Finance is regulated by the Reserve Bank of Zimbabwe.</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  formatDocType(type: string): string {
    return type ? type.replace(/_/g, ' ') : '';
  }

  formatCategory(cat: string): string {
    return cat ? cat.replace(/_/g, ' ') : '';
  }
}
