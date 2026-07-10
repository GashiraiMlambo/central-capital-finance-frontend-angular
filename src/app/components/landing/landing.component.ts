import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { OnboardingService, OnboardingData } from '../../services/onboarding.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit {
  // Modal states
  showResumeModal = false;
  showStatusModal = false;
  
  // Search parameters
  resumeRefNumber = '';
  statusRefNumber = '';
  
  // Messages & Results
  resumeError = '';
  statusResult: OnboardingData | null = null;
  statusError = '';

  constructor(
    private onboardingService: OnboardingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Seed demo data for the user so it's ready to test
    this.onboardingService.seedMockApplications();
  }

  startNewApplication(): void {
    this.onboardingService.clearActiveSession();
    this.router.navigate(['/onboard']);
  }

  openResumeDialog(): void {
    this.showResumeModal = true;
    this.resumeRefNumber = '';
    this.resumeError = '';
  }

  closeResumeDialog(): void {
    this.showResumeModal = false;
  }

  openStatusDialog(): void {
    this.showStatusModal = true;
    this.statusRefNumber = '';
    this.statusResult = null;
    this.statusError = '';
  }

  closeStatusDialog(): void {
    this.showStatusModal = false;
  }

  handleResumeSearch(): void {
    this.resumeError = '';
    if (!this.resumeRefNumber.trim()) {
      this.resumeError = 'Please enter a valid application reference number.';
      return;
    }

    const app = this.onboardingService.getApplication(this.resumeRefNumber);
    if (app) {
      this.onboardingService.setActiveReference(app.referenceNumber);
      this.showResumeModal = false;
      this.router.navigate(['/onboard']);
    } else {
      this.resumeError = 'Application not found. Try "CCF-DEMO123" for testing.';
    }
  }

  handleStatusSearch(): void {
    this.statusError = '';
    this.statusResult = null;
    
    if (!this.statusRefNumber.trim()) {
      this.statusError = 'Please enter a valid application reference number.';
      return;
    }

    const app = this.onboardingService.getApplication(this.statusRefNumber);
    if (app) {
      this.statusResult = app;
    } else {
      this.statusError = 'No application found with this reference number.';
    }
  }

  quickLoadDemo(): void {
    this.resumeRefNumber = 'CCF-DEMO123';
    this.handleResumeSearch();
  }
}
