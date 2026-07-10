import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FilterByTypePipe } from '../../pipes/filter-by-type.pipe';
import { FilterByStatusPipe } from '../../pipes/filter-by-status.pipe';
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
  payoutMethod: 'Cash' | 'EcoCash' | 'Bank Transfer' | 'ZIPIT' | 'Mobile Wallet' | 'Online' | 'Cash (Branch)' | 'Wallet Credit' | 'Online (Savings)';
  recipientName?: string;
  recipientPhone?: string;
  payoutPin?: string;
  status: 'Completed' | 'Pending' | 'Failed' | 'Reversed' | 'Pending Branch';
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

  // Payout Calculator
  calcSendAmount = 100;
  calcCurrencyPair = 'USD/ZWG';
  calcIsLoading = false;
  calcNetPayout = 0;
  calcFee = 10;
  calcRate = 25.50;

  // Remittance Tracker
  trackPin = '';
  trackStatus = 0; // 0: Idle, 1: Initiated, 2: Cleared, 3: Dispatched, 4: Paid Out
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

  // ── EXCHANGE MODULE ──────────────────────────────────────────────
  exFromCurrency: 'USD' | 'ZAR' | 'ZWG' = 'USD';
  exToCurrency:   'USD' | 'ZAR' | 'ZWG' = 'ZWG';
  exAmount = 100;
  exPaymentMethod: 'online' | 'cash' = 'cash';
  exIsLoading = false;
  exResult: { convertedAmount: number; rate: number; fee: number; net: number } | null = null;
  exConfirmed = false;
  exReceiptId = '';

  // ── TRANSFER MODULE ──────────────────────────────────────────────
  transferRecipientId = '';
  transferAmount = 0;
  transferCurrency: 'USD' | 'ZAR' | 'ZWG' = 'USD';
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
      name: 'Noah Chimboza',
      nationality: 'Zimbabwean',
      nationalId: '63-1234567A89',
      phone: '+263 77 123 4567',
      email: 'noah.chimboza@gmail.com',
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
      productType: 'Voluntary Savings',
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
        timestamp: new Date().toLocaleString()
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
        timestamp: new Date(Date.now() - 3600000).toLocaleString()
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
        timestamp: new Date(Date.now() - 7200000).toLocaleString()
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
        timestamp: new Date(Date.now() - 86400000).toLocaleString()
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
        timestamp: new Date(Date.now() - 172800000).toLocaleString()
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
        timestamp: new Date(Date.now() - 259200000).toLocaleString()
      }
    ];
  }

  // --- Auth Handlers ---
  handleLoginSubmit(): void {
    this.loginError = '';
    const surname = this.loginSurname.trim().toLowerCase();
    const password = this.loginPassword.trim();

    if (!surname || !password) {
      this.loginError = 'Surname and Password are required.';
      return;
    }

    const savedPassword = localStorage.getItem('ccf_registered_password') || 'Password123!';
    const customerNameLower = this.customer.name.toLowerCase();

    // Check surname and password match
    const isSurnameMatch = customerNameLower.includes(surname);
    const isPasswordMatch = (password === savedPassword) || (password === 'Password123!');

    if (isSurnameMatch && isPasswordMatch) {
      this.isOtpSent = true;
      this.otpPhoneTarget = this.customer.phone;
      this.portalStage = 'OTP';
    } else {
      this.loginError = 'Invalid surname or password. Please try again.';
    }
  }

  handleOtpSubmit(): void {
    this.otpError = '';
    if (this.otpInput === '123456') {
      this.portalStage = 'DASHBOARD';
      this.displayToast('Login successful! Welcome to CCF Customer Portal.', 'success');
    } else {
      this.otpError = 'Incorrect OTP code. Please enter 123456.';
    }
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

  // --- Remittance Tracker ---
  trackRemittance(): void {
    this.trackError = '';
    this.trackStatus = 0;
    this.trackLoading = true;

    if (!this.trackPin.trim()) {
      this.trackError = 'Please enter a 12-digit transaction PIN.';
      this.trackLoading = false;
      return;
    }

    setTimeout(() => {
      this.trackLoading = false;
      const cleanPin = this.trackPin.trim().toUpperCase();
      
      // Match mock pins
      if (cleanPin === 'REM-8893-XWZ') {
        this.trackStatus = 4; // Paid Out
      } else if (cleanPin === 'REM-1102-ABC') {
        this.trackStatus = 3; // Dispatched
      } else if (cleanPin.length >= 8) {
        this.trackStatus = 2; // Cleared
      } else {
        this.trackError = 'PIN code not found. Try REM-8893-XWZ or REM-1102-ABC.';
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
          <title>CCF Bank Statement - ${ref}</title>
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
            <div class="title">ACCOUNT STATEMENT</div>
          </div>
          <div class="info-grid">
            <div class="info-block">
              <h3>Customer Details</h3>
              <p><strong>Name:</strong> ${personal.name}</p>
              <p><strong>Phone:</strong> ${personal.phone}</p>
              <p><strong>Nationality:</strong> ${personal.nationality}</p>
            </div>
            <div class="info-block" style="text-align: right;">
              <h3>Account Details</h3>
              <p><strong>Account Reference:</strong> ${ref}</p>
              <p><strong>Savings Account:</strong> SA-90817-2938</p>
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
                <td>Digital Account Activation Levy</td>
                <td style="color: #2e7d32;">Completed</td>
                <td class="text-right text-red">-$5.00 USD</td>
              </tr>
              <tr>
                <td>Today</td>
                <td>Visa Debit Card Production Fee</td>
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
    // Supported pairs: USD/ZWG, ZAR/ZWG, USD/ZAR
    if (from === 'USD' && to === 'ZWG') return 25.00;
    if (from === 'ZWG' && to === 'USD') return 1 / 25.00;
    if (from === 'ZAR' && to === 'ZWG') return 1.40;
    if (from === 'ZWG' && to === 'ZAR') return 1 / 1.40;
    if (from === 'USD' && to === 'ZAR') return 25.00 / 1.40;
    if (from === 'ZAR' && to === 'USD') return 1.40 / 25.00;
    return 1;
  }

  get exComputedRate(): number { return this.getExchangeRate(this.exFromCurrency, this.exToCurrency); }
  get exConvertedAmount(): number { return this.exAmount * this.exComputedRate; }
  get exFeeAmount(): number { return Math.max(this.exConvertedAmount * 0.005, 1); }
  get exNetAmount(): number { return this.exConvertedAmount - this.exFeeAmount; }

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
        payoutMethod: this.exPaymentMethod === 'online' ? 'Online (Savings)' : 'Cash (Branch)',
        status: this.exPaymentMethod === 'online' ? 'Completed' : 'Pending Branch',
        timestamp: new Date().toLocaleString()
      });

      if (this.exPaymentMethod === 'online') {
        this.displayToast('Exchange completed online! Savings balance updated.', 'success');
      } else {
        this.displayToast('Exchange booked! Please visit any CCF branch to complete payment.', 'info');
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
        payoutMethod: 'Cash (Branch)',
        status: 'Pending Branch',
        timestamp: new Date().toLocaleString()
      });
      this.displayToast('Transfer booked. Please visit a CCF branch to hand over cash.', 'info');
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
      payoutMethod: 'Cash (Branch)',
      status: 'Pending Branch',
      timestamp: new Date().toLocaleString()
    });
    this.displayToast(`Cash collection booked! Visit a branch with Voucher ID to collect cash.`, 'success');
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
    const text = `CENTRAL CAPITAL FINANCE\nBOOKING RECEIPT\nType: ${type}\nReference ID: ${refId}\nAmount: ${amount} ${currency}\nDetails: ${detail}\nStatus: PENDING BRANCH\nDate: ${new Date().toLocaleString()}\n\nPresent this code to the branch teller.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CCF_${type}_${refId}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.displayToast('Receipt details saved!', 'success');
  }
}
