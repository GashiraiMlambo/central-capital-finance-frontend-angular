import { Injectable } from '@angular/core';

export interface OnboardingData {
  referenceNumber: string;
  step: number;
  termsAccepted: boolean;
  personalDetails: any;
  employmentDetails: any;
  documents: Array<{category: string; name: string; url: string; size: string}>;
  facialBiometric: {
    selfieUrl?: string;
    videoUrl?: string;
    similarityScore?: number;
    faceMatch?: boolean;
    livenessScore?: number;
    requiresManualVerification?: boolean;
  } | null;
  accountInformation: any;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'MANUAL_REVIEW' | 'REJECTED';
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private activeReferenceNumber: string | null = null;
  
  public branches = [
    { code: '999', name: 'Digital Branch (Head Office)', location: 'Harare' },
    { code: '001', name: 'Harare Central Branch', location: 'Harare' },
    { code: '002', name: 'Bulawayo Plaza Branch', location: 'Bulawayo' },
    { code: '003', name: 'Mutare City Center Branch', location: 'Mutare' },
    { code: '004', name: 'Gweru Mall Branch', location: 'Gweru' },
    { code: '005', name: 'Victoria Falls Premium Suite', location: 'Victoria Falls' }
  ];

  constructor() {
    // Try to restore session reference number if any
    if (typeof window !== 'undefined') {
      this.activeReferenceNumber = localStorage.getItem('ccf_active_ref');
    }
  }

  generateReference(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'CCF-';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  saveApplication(data: OnboardingData): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`ccf_app_${data.referenceNumber}`, JSON.stringify(data));
    this.setActiveReference(data.referenceNumber);
    
    // Maintain a list of all application keys for convenience
    const allApps = this.getAllSavedReferences();
    if (!allApps.includes(data.referenceNumber)) {
      allApps.push(data.referenceNumber);
      localStorage.setItem('ccf_all_apps', JSON.stringify(allApps));
    }
  }

  getApplication(refNumber: string): OnboardingData | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(`ccf_app_${refNumber.trim().toUpperCase()}`);
    if (raw) {
      try {
        return JSON.parse(raw) as OnboardingData;
      } catch (e) {
        console.error('Failed to parse saved application', e);
      }
    }
    return null;
  }

  setActiveReference(refNumber: string | null): void {
    this.activeReferenceNumber = refNumber;
    if (typeof window !== 'undefined') {
      if (refNumber) {
        localStorage.setItem('ccf_active_ref', refNumber);
      } else {
        localStorage.removeItem('ccf_active_ref');
      }
    }
  }

  getActiveReference(): string | null {
    return this.activeReferenceNumber;
  }

  getAllSavedReferences(): string[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem('ccf_all_apps');
    return raw ? JSON.parse(raw) : [];
  }

  clearActiveSession(): void {
    this.setActiveReference(null);
  }

  // Prepopulate mock applications for demonstration purposes
  seedMockApplications(): void {
    if (typeof window === 'undefined') return;
    const mockRef = 'CCF-DEMO123';
    if (!this.getApplication(mockRef)) {
      const demoData: OnboardingData = {
        referenceNumber: mockRef,
        step: 3, // Starts at step 3 (Employment Details)
        termsAccepted: true,
        personalDetails: {
          title: 'MR',
          firstName: 'John',
          lastName: 'Doe',
          middleName: 'Alexander',
          gender: 'MALE',
          dateOfBirth: '1990-05-15',
          maritalStatus: 'MARRIED',
          citizenship: 'Resident',
          countryOfBirth: 'ZIMBABWE',
          birthDistrict: 'Harare',
          nationalId: '63-123456A78',
          phoneNumber: '+263771234567',
          email: 'john.doe@example.com',
          usaCitizen: 'NO',
          usaPermanentResident: 'NO',
          usaGreenCardHolder: 'NO',
          addressLine1: '45 Samora Machel Avenue',
          city: 'Harare',
          country: 'ZIMBABWE',
          postalCode: '0000',
          isResAddressThePostalAddress: 'YES'
        },
        employmentDetails: {
          employmentStatus: 'EMPLOYED',
          employerName: 'Digital Solutions Corp',
          occupation: 'Senior Software Engineer',
          monthlySalary: '4500',
          employmentDate: '2018-10-01',
          employerAddress: 'Block C, Sam Levy\'s Village, Borrowdale'
        },
        documents: [
          { category: 'IDENTITY_DOCUMENT', name: 'national_id_front.jpg', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', size: '154 KB' }
        ],
        facialBiometric: null,
        accountInformation: {},
        status: 'DRAFT',
        updatedAt: new Date().toISOString()
      };
      this.saveApplication(demoData);
    }
  }
}
