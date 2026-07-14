import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FilterByTypePipe } from '../../pipes/filter-by-type.pipe';
import { FilterByStatusPipe } from '../../pipes/filter-by-status.pipe';
import { countries } from '../../services/countries';
export interface Customer {
  id: string;
  name: string;
  nationality: string;
  nationalId: string;
  phone: string;
  email?: string;
  address: string;
  dob: string;
  occupation: string;
  kycStatus: 'Verified' | 'Pending' | 'Flagged' | 'Expired';
  documents: { type: string; url: string; status: 'Verified' | 'Pending' | 'Rejected' }[];
  registeredAt: string;
}

export interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  type: 'Exchange' | 'Remittance' | 'Transfer';
  currencyPair: string;
  direction: 'Buy' | 'Sell' | 'Local' | 'International' | 'Send' | 'Receive';
  amount: number;
  amountLocal: number;
  rate: number;
  fee: number;
  payoutMethod: 'Cash' | 'EcoCash' | 'Bank Transfer' | 'ZIPIT' | 'Mobile Wallet' | 'Online' | 'Cash (Branch)' | 'Cash (Agent)' | 'Wallet Credit' | 'Online (Savings)' | 'Online (Wallet)';
  recipientName?: string;
  recipientPhone?: string;
  payoutPin?: string;
  status: 'Completed' | 'Pending' | 'Failed' | 'Reversed' | 'Pending Branch' | 'Pending Agent';
  timestamp: string;
}

export interface SavingsAccount {
  accountNumber: string;
  customerId: string;
  customerName: string;
  productType: string;
  interestRate: number;
  balance: number;
  status: 'Active' | 'Locked';
}

export interface Loan {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  interestRate: number;
  outstandingBalance: number;
  productType: string;
  status: 'Repaying' | 'Paid';
}

@Component({
  selector: 'app-customer-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, FilterByTypePipe, FilterByStatusPipe],
  templateUrl: './customer-portal.component.html',
  styleUrl: './customer-portal.component.css'
})
export class CustomerPortalComponent implements OnInit {
  // Auth state
  portalStage: 'LOGIN' | 'OTP' | 'DASHBOARD' = 'LOGIN';
  loginSurname = '';
  loginPassword = '';
  loginError = '';
  
  otpInput = '';
  isHiddenOtpFocused = false;
  otpError = '';
  isOtpSent = false;
  otpPhoneTarget = '';
  
  // Theme state
  isDarkMode = false;

  // Data models
  customer!: Customer;
  savingsAccount!: SavingsAccount;
  activeLoan!: Loan;
  walletBalance = 250.00; // Cash/Wallet balance
  walletDeposits = 1450.00;
  walletWithdrawals = 1200.00;
  walletRecentActivity = [
    { type: 'Pre-load', amount: 500.00, date: '2026-07-11', status: 'Completed' },
    { type: 'Exchange Allocation', amount: 200.00, date: '2026-07-08', status: 'Completed' },
    { type: 'Pre-load', amount: 950.00, date: '2026-07-01', status: 'Completed' },
    { type: 'Refund', amount: 1000.00, date: '2026-06-25', status: 'Completed' }
  ];
  
  // Dashboard view routing (sidebar nav)
  activeView: 'home' | 'transactions' | 'exchange' | 'transfer' | 'receive' | 'rates' = 'home';

  // Mobile responsive sidebar
  isMobileSidebarOpen = false;
  toggleMobileSidebar(): void { this.isMobileSidebarOpen = !this.isMobileSidebarOpen; }
  closeMobileSidebar(): void { this.isMobileSidebarOpen = false; }

  // Dashboard details
  showFullHistory = false;
  showNotificationsDropdown = false;
  showProfileDropdown = false;
  unreadNotificationsCount = 3;
  notificationsList = [
    { text: 'Initial onboarding welcome bonus of $50 has been credited.', time: 'Just now' },
    { text: 'Your KYC documents are under review.', time: '10 mins ago' },
    { text: 'Welcome to Central Capital Finance!', time: '1 hour ago' }
  ];

  // Summary Metrics
  totalMoneySent = 14850.00;
  activeTransfersCount = 3;
  completedTransfersCount = 18;
  pendingTransfersCount = 1;

  // Active Transfers
  activeTransfers = [
    {
      refNumber: 'REF-90283-ZW',
      recipient: 'Sarah Chimboza',
      destinationCountry: 'ZIMBABWE',
      amountSent: 250.00,
      recipientReceives: 6250.00,
      currency: 'ZWG',
      status: 'Under Compliance Review',
      deliveryTime: '2 hours',
      timelineStep: 3,
      timestamp: '2026-07-13 09:15'
    },
    {
      refNumber: 'REF-77182-ZA',
      recipient: 'Albert Ndlovu',
      destinationCountry: 'SOUTH AFRICA',
      amountSent: 150.00,
      recipientReceives: 2700.00,
      currency: 'ZAR',
      status: 'Awaiting Payment',
      deliveryTime: '1 hour',
      timelineStep: 2,
      timestamp: '2026-07-13 10:30'
    },
    {
      refNumber: 'REF-55281-MW',
      recipient: 'Tendai Moyo',
      destinationCountry: 'MALAWI',
      amountSent: 500.00,
      recipientReceives: 850000.00,
      currency: 'MWK',
      status: 'Ready for Collection',
      deliveryTime: 'Instant',
      timelineStep: 6,
      timestamp: '2026-07-12 14:00'
    }
  ];
  selectedActiveTransfer = this.activeTransfers[0];

  // Favourite Recipients
  favouriteRecipients = [
    {
      name: 'Sarah Chimboza',
      country: 'Zimbabwe',
      currency: 'ZWG',
      preferredDeliveryMethod: 'EcoCash',
      lastTransferDate: '2026-07-09',
      avatar: 'SC'
    },
    {
      name: 'Albert Ndlovu',
      country: 'South Africa',
      currency: 'ZAR',
      preferredDeliveryMethod: 'Cash Pick-up',
      lastTransferDate: '2026-07-05',
      avatar: 'AN'
    },
    {
      name: 'Tendai Moyo',
      country: 'Malawi',
      currency: 'MWK',
      preferredDeliveryMethod: 'Bank Transfer',
      lastTransferDate: '2026-06-20',
      avatar: 'TM'
    }
  ];

  // Dashboard Categorized Notifications
  dashboardNotifications = [
    { id: 1, type: 'success', category: 'Transfer Approved', message: 'Your transfer to Sarah Chimboza (REF-90283-ZW) has been approved and cleared compliance.', time: 'Just now', read: false },
    { id: 2, type: 'info', category: 'Funds Ready', message: 'Voucher REF-55281-MW is ready for collection at any agent location in Blantyre, Malawi.', time: '1 hour ago', read: false },
    { id: 3, type: 'warning', category: 'KYC Required', message: 'Please upload a proof of income document to unlock transfers exceeding $5,000 daily.', time: '3 hours ago', read: false },
    { id: 4, type: 'success', category: 'Transfer Completed', message: 'Transfer REF-22918-ZA to Albert Ndlovu has been successfully collected.', time: 'Yesterday', read: true },
    { id: 5, type: 'info', category: 'Rate Alert', message: 'USD → ZiG has increased by 1.2% in the last 24 hours. Exchange rate is now 25.80.', time: 'Yesterday', read: true },
    { id: 6, type: 'info', category: 'Promotion', message: 'Zero fees on your next transfer to Malawi using mobile money payout!', time: '2 days ago', read: true }
  ];

  // Exchange Rates Popular Pairs
  popularExchangeRates = [
    { from: 'USD', to: 'ZiG', buyRate: 25.00, sellRate: 25.80, lastUpdated: 'Just now', trend: 'up' },
    { from: 'USD', to: 'ZAR', buyRate: 17.85, sellRate: 18.25, lastUpdated: '1 min ago', trend: 'down' },
    { from: 'GBP', to: 'ZiG', buyRate: 31.25, sellRate: 32.10, lastUpdated: 'Just now', trend: 'up' },
    { from: 'EUR', to: 'USD', buyRate: 1.08, sellRate: 1.10, lastUpdated: '3 mins ago', trend: 'stable' },
    { from: 'ZAR', to: 'MWK', buyRate: 94.50, sellRate: 97.20, lastUpdated: '5 mins ago', trend: 'up' }
  ];

  // Recent Transactions filters
  searchQuery = '';
  selectedDateFilter = 'All';
  customStartDate = '';
  customEndDate = '';

  // Fee Calculator
  feeCalcSendingCountry = 'UNITED STATES';
  feeCalcReceivingCountry = 'ZIMBABWE';
  feeCalcCurrency = 'ZWG';
  feeCalcAmount = 1000;
  feeCalcRate = 25.40;
  feeCalcFee = 15.00;
  feeCalcTaxes = 2.50;
  feeCalcPayout = 25375.00;
  feeCalcDelivery = 'Instant to Mobile Wallet';
  feeCalcCountriesList = ['UNITED STATES', 'UNITED KINGDOM', 'SOUTH AFRICA', 'ZIMBABWE', 'MALAWI', 'CANADA', 'GERMANY'];
  feeCalcCurrenciesList = ['ZWG', 'USD', 'ZAR', 'MWK', 'EUR'];

  // Security Status
  securityStatus = {
    kycStatus: 'Verified',
    twoFactor: 'Enabled',
    lastLogin: 'Today, 10:45 AM (IP: 197.221.34.8)',
    trustedDevices: 2
  };

  // Dashboard Charts View
  chartView: 'monthly' | 'quarterly' | 'yearly' = 'monthly';

  // Payout Calculator
  calcSendAmount = 100;
  calcCurrencyPair = 'USD/ZWG';
  calcIsLoading = false;
  calcNetPayout = 0;
  calcFee = 10;
  calcRate = 25.50;

  // Remittance Tracker
  trackPin = '';
  trackStatus = 0; // 0: Idle, 1..7: timeline steps
  trackError = '';
  trackLoading = false;

  // KYC Document Manager simulation
  uploadProgress = 0;
  isUploading = false;
  selectedUploadType = 'Utility Bill';

  // Mock lists
  transactions: Transaction[] = [];
  exchangeRates = [
    { pair: 'USD/ZWG', buyRate: 25.00, sellRate: 26.00, spread: 1.00, lastUpdated: 'Live', status: 'Live' },
    { pair: 'ZAR/ZWG', buyRate: 1.40, sellRate: 1.50, spread: 0.10, lastUpdated: 'Live', status: 'Live' },
    { pair: 'USD/ZAR', buyRate: 17.85, sellRate: 18.25, spread: 0.40, lastUpdated: 'Live', status: 'Live' },
    { pair: 'USD/EUR', buyRate: 0.91, sellRate: 0.93, spread: 0.02, lastUpdated: 'Live', status: 'Live' },
    { pair: 'USD/GBP', buyRate: 0.77, sellRate: 0.79, spread: 0.02, lastUpdated: 'Live', status: 'Live' },
    { pair: 'USD/BWP', buyRate: 13.40, sellRate: 13.80, spread: 0.40, lastUpdated: 'Live', status: 'Live' },
    { pair: 'USD/CNY', buyRate: 7.20, sellRate: 7.30, spread: 0.10, lastUpdated: 'Live', status: 'Live' }
  ];

  currencies = [
    { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
    { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
    { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦' },
    { code: 'ZWG', name: 'Zimbabwe Gold', flag: '🇿🇼' },
    { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
    { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
    { code: 'BWP', name: 'Botswana Pula', flag: '🇧🇼' },
    { code: 'MWK', name: 'Malawian Kwacha', flag: '🇲🇼' },
    { code: 'ZMW', name: 'Zambian Kwacha', flag: '🇿🇲' },
    { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
    { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
    { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' }
  ];

  // ── EXCHANGE MODULE ──────────────────────────────────────────────
  exFromCurrency: string = 'USD';
  exToCurrency:   string = 'ZWG';
  exAmount = 100;
  exPaymentMethod: 'online' | 'cash' = 'cash';
  exIsLoading = false;
  exResult: { convertedAmount: number; rate: number; fee: number; net: number } | null = null;
  exConfirmed = false;
  exReceiptId = '';

  // ── TRANSFER MODULE ──────────────────────────────────────────────
  transferRecipientId = '';
  transferAmount = 0;
  transferCurrency: string = 'USD';
  transferNote = '';
  transferPaymentMethod: 'online' | 'cash' = 'cash';
  transferIsLoading = false;
  transferConfirmed = false;
  transferReceiptId = '';
  transferError = '';

  // ── RECEIVE MODULE ───────────────────────────────────────────────
  incomingTransfers = [
    { id: 'TRF-2026-0091', senderName: 'Mary Chimboza', senderPhone: '+263 77 999 8877', amount: 50.00, currency: 'USD', note: 'School fees', timestamp: '2026-07-09 14:32', status: 'Pending' },
    { id: 'TRF-2026-0087', senderName: 'James Moyo',    senderPhone: '+263 71 444 2211', amount: 200.00, currency: 'ZWG', note: 'Salary advance', timestamp: '2026-07-09 10:01', status: 'Pending' }
  ];

  // Toast notifications
  toastMessage = '';
  toastType: 'success' | 'danger' | 'info' | 'warning' = 'info';
  showToast = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadRegisteredCustomer();
    this.initializeMockData();
    this.runCalculator();
    this.runFeeCalculator();
  }

  // --- Auth Controls ---
  loadRegisteredCustomer(): void {
    const savedCustomer = localStorage.getItem('ccf_registered_customer');
    if (savedCustomer) {
      try {
        this.customer = JSON.parse(savedCustomer);
      } catch (e) {
        this.fallbackCustomer();
      }
    } else {
      this.fallbackCustomer();
    }
  }

  fallbackCustomer(): void {
    this.customer = {
      id: 'CCF-2026-8893',
      name: 'Sakhe Ndlovu',
      nationality: 'Zimbabwean',
      nationalId: '63-1234567A89',
      phone: '+263 77 123 4567',
      email: 'sakhe.ndlovu@gmail.com',
      address: '123 Samora Machel Ave, Harare',
      dob: '1990-05-15',
      occupation: 'Software Engineer',
      kycStatus: 'Verified',
      documents: [
        { type: 'National ID', url: 'national_id.pdf', status: 'Verified' },
        { type: 'Proof of Residence', url: 'utility_bill.pdf', status: 'Verified' }
      ],
      registeredAt: new Date().toISOString()
    };
  }

  initializeMockData(): void {
    // Balances
    const currency = localStorage.getItem('ccf_currency') || 'USD';
    this.savingsAccount = {
      accountNumber: 'SA-90817-2938',
      customerId: this.customer.id,
      customerName: this.customer.name,
      productType: 'Exchange Wallet',
      interestRate: 4.5,
      balance: 1550.00,
      status: 'Active'
    };

    this.activeLoan = {
      id: 'LN-88392-ZW',
      customerId: this.customer.id,
      customerName: this.customer.name,
      amount: 5000.00,
      interestRate: 12.0,
      outstandingBalance: 3200.00,
      productType: 'SME Expansion Loan',
      status: 'Repaying'
    };

    // Transactions list
    this.transactions = [
      {
        id: 'TXN-90281-ZWG',
        customerId: this.customer.id,
        customerName: this.customer.name,
        type: 'Exchange',
        currencyPair: 'USD/ZWG',
        direction: 'Buy',
        amount: 50.00,
        amountLocal: 1275.00,
        rate: 25.50,
        fee: 0.25,
        payoutMethod: 'EcoCash',
        status: 'Completed',
        timestamp: new Date().toISOString()
      },
      {
        id: 'TXN-88392-ZWG',
        customerId: this.customer.id,
        customerName: this.customer.name,
        type: 'Remittance',
        currencyPair: 'ZAR/ZWG',
        direction: 'International',
        amount: 250.00,
        amountLocal: 362.50,
        rate: 1.45,
        fee: 10.00,
        payoutMethod: 'EcoCash',
        recipientName: 'Sarah Chimboza',
        payoutPin: 'REM-8893-XWZ',
        status: 'Completed',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'TXN-77391-ZWG',
        customerId: this.customer.id,
        customerName: this.customer.name,
        type: 'Exchange',
        currencyPair: 'EUR/ZWG',
        direction: 'Buy',
        amount: 100.00,
        amountLocal: 2760.00,
        rate: 27.60,
        fee: 0.50,
        payoutMethod: 'Bank Transfer',
        status: 'Completed',
        timestamp: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
      },
      {
        id: 'TXN-66381-ZWG',
        customerId: this.customer.id,
        customerName: this.customer.name,
        type: 'Exchange',
        currencyPair: 'USD/ZWG',
        direction: 'Sell',
        amount: 40.00,
        amountLocal: 1020.00,
        rate: 25.50,
        fee: 0.20,
        payoutMethod: 'ZIPIT',
        status: 'Completed',
        timestamp: new Date(Date.now() - 3600000 * 24 * 15).toISOString()
      },
      {
        id: 'TXN-55481-ZWG',
        customerId: this.customer.id,
        customerName: this.customer.name,
        type: 'Remittance',
        currencyPair: 'USD/ZWG',
        direction: 'Local',
        amount: 150.00,
        amountLocal: 3825.00,
        rate: 25.50,
        fee: 10.00,
        payoutMethod: 'Cash',
        recipientName: 'Albert Ndlovu',
        payoutPin: 'REM-1102-ABC',
        status: 'Pending',
        timestamp: new Date(Date.now() - 3600000 * 24 * 45).toISOString()
      },
      {
        id: 'TRF-2026-5CW1',
        customerId: this.customer.id,
        customerName: this.customer.name,
        type: 'Remittance',
        currencyPair: 'USD/ZWG',
        direction: 'Local',
        amount: 350.00,
        amountLocal: 8925.00,
        rate: 25.50,
        fee: 10.00,
        payoutMethod: 'Cash (Agent)',
        recipientName: 'Albert Ndlovu',
        payoutPin: 'REM-9912-XYZ',
        status: 'Pending Agent',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'TXN-44381-ZWG',
        customerId: this.customer.id,
        customerName: this.customer.name,
        type: 'Exchange',
        currencyPair: 'ZAR/ZWG',
        direction: 'Buy',
        amount: 800.00,
        amountLocal: 1160.00,
        rate: 1.45,
        fee: 4.00,
        payoutMethod: 'Mobile Wallet',
        status: 'Completed',
        timestamp: new Date(Date.now() - 3600000 * 24 * 120).toISOString()
      }
    ];
  }

  handleLoginSubmit(): void {
    this.loginError = '';
    const surname = this.loginSurname.trim().toLowerCase();
    const password = this.loginPassword.trim();

    if (!surname || !password) {
      this.loginError = 'Surname and Password are required.';
      return;
    }

    if (surname === 'ndlovu' || surname === 'sakhe' || surname.includes('ndlovu')) {
      this.customer.name = 'Sakhe Ndlovu';
    }

    const customerNameLower = this.customer.name.toLowerCase();

    // Check surname match (allow if matches or is ndlovu/sakhe)
    const isSurnameMatch = customerNameLower.includes(surname) || surname === 'ndlovu' || surname === 'sakhe' || surname.includes('ndlovu');
    // Allow any password for testing
    const isPasswordMatch = true;

    if (isSurnameMatch && isPasswordMatch) {
      localStorage.setItem('ccf_registered_customer', JSON.stringify(this.customer));
      this.isOtpSent = true;
      this.otpPhoneTarget = this.maskPhoneNumber(this.customer.phone);
      this.otpInput = '';
      this.portalStage = 'OTP';
    } else {
      this.loginError = 'Invalid surname or password. Please try again.';
    }
  }

  maskPhoneNumber(phone: string): string {
    if (!phone) return '';
    const parts = phone.split(' ');
    if (parts.length >= 4) {
      parts[2] = '***';
      return parts.join(' ');
    }
    if (phone.length > 8) {
      return phone.substring(0, 8) + '***' + phone.substring(11);
    }
    return phone;
  }

  scrollToSection(elementId: string): void {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  handleOtpSubmit(): void {
    this.otpError = '';
    if (this.otpInput.length === 6) {
      this.portalStage = 'DASHBOARD';
      this.displayToast('Login successful! Welcome to CCF Customer Portal.', 'success');
    } else {
      this.otpError = 'Please enter a 6-digit OTP code.';
    }
  }

  focusHiddenOtp(): void {
    const el = document.getElementById('hidden-otp-input');
    if (el) {
      el.focus();
    }
  }

  onHiddenOtpInput(event: any): void {
    this.otpInput = this.otpInput.replace(/\D/g, '').substring(0, 6);
  }

  handleLogout(): void {
    this.portalStage = 'LOGIN';
    this.loginSurname = '';
    this.loginPassword = '';
    this.otpInput = '';
    this.showProfileDropdown = false;
    this.displayToast('Signed out successfully.', 'info');
  }

  // --- Calculator ---
  runCalculator(): void {
    this.calcIsLoading = true;
    setTimeout(() => {
      const rate = this.exchangeRates.find(r => r.pair === this.calcCurrencyPair)?.buyRate || 25.50;
      this.calcRate = rate;
      
      const rawPayout = this.calcSendAmount * rate;
      // Fee calculation: 0.5% with minimum fee of 10 ZWG
      const calculatedFee = rawPayout * 0.005;
      this.calcFee = Math.max(10, calculatedFee);
      this.calcNetPayout = Math.max(0, rawPayout - this.calcFee);
      this.calcIsLoading = false;
    }, 450);
  }

  onCalcChange(): void {
    this.runCalculator();
  }

  getCurrencySymbol(pair: string): string {
    const from = pair.split('/')[0];
    switch (from) {
      case 'USD': return '$';
      case 'ZAR': return 'R';
      case 'GBP': return '£';
      case 'EUR': return '€';
      default: return '$';
    }
  }

  trackRemittance(): void {
    this.trackError = '';
    this.trackStatus = 0;
    this.trackLoading = true;

    if (!this.trackPin.trim()) {
      this.trackError = 'Please enter a transaction reference number.';
      this.trackLoading = false;
      return;
    }

    setTimeout(() => {
      this.trackLoading = false;
      const cleanPin = this.trackPin.trim().toUpperCase();
      
      // Match from active transfers
      const foundTxn = this.activeTransfers.find(t => t.refNumber.toUpperCase() === cleanPin);
      if (foundTxn) {
        this.trackStatus = foundTxn.timelineStep;
      } else {
        this.trackError = 'Transaction reference not found. Try REF-90283-ZW.';
      }
    }, 800);
  }

  // --- Document Upload Simulation ---
  simulateDocUpload(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    this.isUploading = true;
    this.uploadProgress = 0;

    const interval = setInterval(() => {
      this.uploadProgress += 20;
      if (this.uploadProgress >= 100) {
        clearInterval(interval);
        this.isUploading = false;
        
        // Add to document list
        this.customer.documents.push({
          type: this.selectedUploadType,
          url: file.name,
          status: 'Pending'
        });

        this.displayToast(`${this.selectedUploadType} uploaded successfully for compliance review.`, 'success');
      }
    }, 300);
  }

  // --- PDF statement generator ---
  generatePdfReport(): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.displayToast('Pop-up blocked. Please allow pop-ups to view PDF statement.', 'warning');
      return;
    }
    
    const personal = this.customer;
    const ref = this.customer.id;
    
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
              <p><strong>Name:</strong> ${personal.name}</p>
              <p><strong>Phone:</strong> ${personal.phone}</p>
              <p><strong>Nationality:</strong> ${personal.nationality}</p>
            </div>
            <div class="info-block" style="text-align: right;">
              <h3>Wallet Details</h3>
              <p><strong>Profile Reference:</strong> ${ref}</p>
              <p><strong>Exchange Wallet:</strong> SA-90817-2938</p>
              <p><strong>Active Wallet Status:</strong> Active</p>
              <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
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
                <td>Today</td>
                <td>Initial Onboarding Welcome Bonus</td>
                <td style="color: #2e7d32;">Completed</td>
                <td class="text-right text-green">+$50.00 USD</td>
              </tr>
              <tr>
                <td>Today</td>
                <td>Digital Wallet Activation Fee</td>
                <td style="color: #2e7d32;">Completed</td>
                <td class="text-right text-red">-$5.00 USD</td>
              </tr>
              <tr>
                <td>Today</td>
                <td>Wallet Setup Fee</td>
                <td style="color: #2e7d32;">Completed</td>
                <td class="text-right text-red">-$10.00 USD</td>
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
  }

  // --- UI Helpers ---
  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
  }

  toggleNotifications(): void {
    this.showNotificationsDropdown = !this.showNotificationsDropdown;
    this.showProfileDropdown = false;
    if (this.showNotificationsDropdown) {
      this.unreadNotificationsCount = 0;
    }
  }

  toggleProfile(): void {
    this.showProfileDropdown = !this.showProfileDropdown;
    this.showNotificationsDropdown = false;
  }

  displayToast(msg: string, type: 'success' | 'danger' | 'info' | 'warning' = 'info'): void {
    this.toastMessage = msg;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => {
      this.closeToast();
    }, 5000);
  }

  closeToast(): void {
    this.showToast = false;
  }

  // ── EXCHANGE MODULE ─────────────────────────────────────────────
  getExchangeRate(from: string, to: string): number {
    const rates: { [key: string]: number } = {
      USD: 1.00,
      EUR: 0.92,
      GBP: 0.78,
      ZAR: 17.857,
      ZWG: 25.00,
      CAD: 1.37,
      AUD: 1.50,
      BWP: 13.50,
      MWK: 1730.00,
      ZMW: 25.50,
      CNY: 7.25,
      INR: 83.50,
      JPY: 160.00
    };
    const fromRate = rates[from] || 1.00;
    const toRate = rates[to] || 1.00;
    return toRate / fromRate;
  }

  get exComputedRate(): number { return this.getExchangeRate(this.exFromCurrency, this.exToCurrency); }
  get exConvertedAmount(): number { return (this.exAmount || 0) * this.exComputedRate; }
  get exFeeAmount(): number { return Math.max(this.exConvertedAmount * 0.005, 1); }
  get exNetAmount(): number { return Math.max(0, this.exConvertedAmount - this.exFeeAmount); }

  swapExCurrencies(): void {
    const tmp = this.exFromCurrency;
    this.exFromCurrency = this.exToCurrency;
    this.exToCurrency = tmp;
    this.exResult = null;
    this.exConfirmed = false;
  }

  previewExchange(): void {
    if (!this.exAmount || this.exAmount <= 0) {
      this.displayToast('Please enter a valid amount.', 'warning');
      return;
    }
    if (this.exFromCurrency === this.exToCurrency) {
      this.displayToast('From and To currencies must be different.', 'warning');
      return;
    }
    this.exIsLoading = true;
    this.exResult = null;
    setTimeout(() => {
      this.exIsLoading = false;
      this.exResult = {
        convertedAmount: this.exConvertedAmount,
        rate: this.exComputedRate,
        fee: this.exFeeAmount,
        net: this.exNetAmount
      };
    }, 700);
  }

  confirmExchange(): void {
    if (!this.exResult) return;

    // If online, check balance
    if (this.exPaymentMethod === 'online' && this.exFromCurrency === 'USD') {
      if (this.savingsAccount.balance < this.exAmount) {
        this.displayToast('Insufficient USD savings balance for online exchange.', 'warning');
        return;
      }
    }

    this.exIsLoading = true;
    setTimeout(() => {
      this.exIsLoading = false;

      // Perform balance transfer if online
      if (this.exPaymentMethod === 'online') {
        if (this.exFromCurrency === 'USD') {
          this.savingsAccount.balance -= this.exAmount;
        } else if (this.exToCurrency === 'USD') {
          this.savingsAccount.balance += this.exResult!.net;
        }
      }

      this.exConfirmed = true;
      this.exReceiptId = 'EXC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Add to transaction history
      this.transactions.unshift({
        id: this.exReceiptId,
        customerId: this.customer.id,
        customerName: this.customer.name,
        type: 'Exchange',
        currencyPair: `${this.exFromCurrency}/${this.exToCurrency}`,
        direction: 'Buy',
        amount: this.exAmount,
        amountLocal: this.exResult!.net,
        rate: this.exResult!.rate,
        fee: this.exResult!.fee,
        payoutMethod: this.exPaymentMethod === 'online' ? 'Online (Wallet)' : 'Cash (Agent)',
        status: this.exPaymentMethod === 'online' ? 'Completed' : 'Pending Agent',
        timestamp: new Date().toLocaleString()
      });

      if (this.exPaymentMethod === 'online') {
        this.displayToast('Exchange completed online! Wallet balance updated.', 'success');
      } else {
        this.displayToast('Exchange booked! Please visit any CCF agent location to complete payment.', 'info');
      }
    }, 1000);
  }

  resetExchange(): void {
    this.exResult = null;
    this.exConfirmed = false;
    this.exReceiptId = '';
    this.exAmount = 100;
  }

  // ── TRANSFER MODULE ─────────────────────────────────────────────
  submitTransfer(): void {
    this.transferError = '';
    if (!this.transferRecipientId.trim()) {
      this.transferError = 'Please enter a valid Recipient ID or phone number.';
      return;
    }
    if (!this.transferAmount || this.transferAmount <= 0) {
      this.transferError = 'Please enter a valid transfer amount.';
      return;
    }
    this.transferIsLoading = true;
    setTimeout(() => {
      this.transferIsLoading = false;
      this.transferConfirmed = true;
      this.transferReceiptId = 'TRF-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      this.transactions.unshift({
        id: this.transferReceiptId,
        customerId: this.customer.id,
        customerName: this.customer.name,
        type: 'Transfer',
        currencyPair: `${this.transferCurrency}/—`,
        direction: 'Send',
        amount: this.transferAmount,
        amountLocal: this.transferAmount,
        rate: 1,
        fee: 0,
        payoutMethod: 'Cash (Agent)',
        status: 'Pending Agent',
        timestamp: new Date().toLocaleString()
      });
      this.displayToast('Transfer booked. Please visit a CCF agent to hand over cash.', 'info');
    }, 1000);
  }

  resetTransfer(): void {
    this.transferRecipientId = '';
    this.transferAmount = 0;
    this.transferCurrency = 'USD';
    this.transferNote = '';
    this.transferPaymentMethod = 'cash';
    this.transferConfirmed = false;
    this.transferReceiptId = '';
    this.transferError = '';
  }

  // ── RECEIVE MODULE ──────────────────────────────────────────────
  acceptIncoming(transfer: any): void {
    transfer.status = 'Booked';
    this.transactions.unshift({
      id: transfer.id,
      customerId: this.customer.id,
      customerName: this.customer.name,
      type: 'Transfer',
      currencyPair: `${transfer.currency}/—`,
      direction: 'Receive',
      amount: transfer.amount,
      amountLocal: transfer.amount,
      rate: 1,
      fee: 0,
      payoutMethod: 'Cash (Agent)',
      status: 'Pending Agent',
      timestamp: new Date().toLocaleString()
    });
    this.displayToast(`Cash collection booked! Visit a CCF agent with Voucher ID to collect cash.`, 'success');
  }

  declineIncoming(transfer: any): void {
    transfer.status = 'Declined';
    this.displayToast(`Transfer from ${transfer.senderName} declined.`, 'warning');
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.displayToast('Code copied to clipboard!', 'success');
    }).catch(() => {
      this.displayToast('Failed to copy code.', 'danger');
    });
  }

  downloadReceipt(type: string, refId: string, amount: number, currency: string, detail: string): void {
    const text = `CENTRAL CAPITAL FINANCE\nBOOKING RECEIPT\nType: ${type}\nReference ID: ${refId}\nAmount: ${amount} ${currency}\nDetails: ${detail}\nStatus: PENDING AGENT\nDate: ${new Date().toLocaleString()}\n\nPresent this code to the payout agent.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CCF_${type}_${refId}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.displayToast('Receipt details saved!', 'success');
  }

  // --- New Dashboard Features Helpers ---
  selectActiveTransfer(transfer: any): void {
    this.selectedActiveTransfer = transfer;
    this.displayToast(`Viewing details for transfer ${transfer.refNumber}`, 'info');
  }

  sendAgain(recipient: any): void {
    this.transferRecipientId = recipient.name;
    this.transferCurrency = recipient.currency === 'ZWG' ? 'ZWG' : (recipient.currency === 'ZAR' ? 'ZAR' : 'USD');
    this.activeView = 'transfer';
    this.displayToast(`Pre-filled transfer to ${recipient.name}`, 'success');
  }

  viewRecipientHistory(recipient: any): void {
    this.searchQuery = recipient.name;
    this.activeView = 'transactions';
  }

  getFilteredTransactions(): Transaction[] {
    return this.transactions.filter(txn => {
      // Search query filtering
      const query = this.searchQuery.trim().toLowerCase();
      const matchesSearch = !query || 
        txn.id.toLowerCase().includes(query) ||
        (txn.recipientName && txn.recipientName.toLowerCase().includes(query)) ||
        txn.payoutMethod.toLowerCase().includes(query) ||
        txn.status.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // Date filtering
      if (this.selectedDateFilter === 'All') return true;

      const txnDate = new Date(txn.timestamp);
      const now = new Date();
      
      // Calculate difference in time
      const diffTime = Math.abs(now.getTime() - txnDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (this.selectedDateFilter === 'Today') {
        return txnDate.toDateString() === now.toDateString();
      } else if (this.selectedDateFilter === '7Days') {
        return diffDays <= 7;
      } else if (this.selectedDateFilter === '30Days') {
        return diffDays <= 30;
      } else if (this.selectedDateFilter === '3Months') {
        return diffDays <= 90;
      } else if (this.selectedDateFilter === 'Custom') {
        if (!this.customStartDate || !this.customEndDate) return true;
        const start = new Date(this.customStartDate);
        const end = new Date(this.customEndDate);
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
        return txnDate >= start && txnDate <= end;
      }
      return true;
    });
  }

  runFeeCalculator(): void {
    const amount = this.feeCalcAmount || 0;
    
    let rate = 1.0;
    let fee = 10.0;
    let taxes = 0.0;
    let delivery = '1-2 Hours';

    if (this.feeCalcSendingCountry === 'UNITED STATES' || this.feeCalcSendingCountry === 'UNITED KINGDOM' || this.feeCalcSendingCountry === 'CANADA' || this.feeCalcSendingCountry === 'GERMANY') {
      if (this.feeCalcReceivingCountry === 'ZIMBABWE') {
        rate = this.feeCalcCurrency === 'ZWG' ? 25.50 : 1.0;
        fee = Math.max(5, amount * 0.015);
        taxes = amount * 0.001; 
        delivery = 'Instant to Mobile Wallet / Cash Pick-up';
      } else if (this.feeCalcReceivingCountry === 'SOUTH AFRICA') {
        rate = this.feeCalcCurrency === 'ZAR' ? 18.20 : 1.0;
        fee = Math.max(7, amount * 0.02);
        taxes = 0;
        delivery = 'Within 1 Hour';
      } else if (this.feeCalcReceivingCountry === 'MALAWI') {
        rate = this.feeCalcCurrency === 'MWK' ? 1730.00 : 1.0;
        fee = Math.max(10, amount * 0.025);
        taxes = amount * 0.005;
        delivery = 'Same Day to Bank / Cash';
      } else {
        rate = 1.0;
        fee = 15.0;
        delivery = '1-2 Business Days';
      }
    } else if (this.feeCalcSendingCountry === 'SOUTH AFRICA') {
      if (this.feeCalcReceivingCountry === 'ZIMBABWE') {
        rate = this.feeCalcCurrency === 'ZWG' ? 1.40 : 0.055;
        fee = Math.max(5, amount * 0.03);
        delivery = 'Instant Cash Pick-up';
      } else {
        rate = 1.0;
        fee = 20.0;
        delivery = 'Same Day';
      }
    }

    this.feeCalcRate = rate;
    this.feeCalcFee = fee;
    this.feeCalcTaxes = taxes;
    this.feeCalcPayout = Math.max(0, (amount - fee - taxes) * rate);
    this.feeCalcDelivery = delivery;
  }

  markNotifRead(notif: any): void {
    notif.read = true;
    this.updateUnreadCount();
  }

  markAllNotifsRead(): void {
    this.dashboardNotifications.forEach(n => n.read = true);
    this.updateUnreadCount();
  }

  updateUnreadCount(): void {
    this.unreadNotificationsCount = this.dashboardNotifications.filter(n => !n.read).length;
  }

  setChartView(view: 'monthly' | 'quarterly' | 'yearly'): void {
    this.chartView = view;
  }

  manageSecurity(): void {
    this.displayToast('Security configuration is managed by 2FA. Changes require OTP validation.', 'info');
  }

  supportAction(channel: string): void {
    this.displayToast(`Connecting to Customer Support via ${channel}...`, 'success');
  }

  addRecipientMock(): void {
    const name = prompt("Enter recipient's full name:");
    if (!name) return;
    const country = prompt("Enter recipient's country (e.g. Zimbabwe):", "Zimbabwe");
    if (!country) return;
    const method = prompt("Enter delivery method (e.g. EcoCash, Cash Pick-up):", "EcoCash");
    if (!method) return;

    this.favouriteRecipients.push({
      name,
      country,
      currency: country.toLowerCase().includes('south') ? 'ZAR' : (country.toLowerCase().includes('malawi') ? 'MWK' : 'ZWG'),
      preferredDeliveryMethod: method,
      lastTransferDate: 'Just added',
      avatar: name.split(' ').map(n => n.charAt(0)).join('').toUpperCase()
    });

    this.displayToast(`${name} added to favourite recipients.`, 'success');
  }

  downloadReceiptAction(txn: any): void {
    this.downloadReceipt(txn.type, txn.id, txn.amount, txn.currencyPair.split('/')[0], txn.recipientName || 'Self');
  }
}
