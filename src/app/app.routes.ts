import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';
import { OnboardingStepperComponent } from './components/onboarding-stepper/onboarding-stepper.component';
import { CustomerPortalComponent } from './components/customer-portal/customer-portal.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'onboard', component: OnboardingStepperComponent },
  { path: 'dashboard', component: CustomerPortalComponent },
  { path: '**', redirectTo: '' }
];
