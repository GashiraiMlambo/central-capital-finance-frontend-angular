import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-captcha',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './captcha.component.html',
  styleUrl: './captcha.component.css'
})
export class CaptchaComponent implements OnInit {
  @Output() codeGenerated = new EventEmitter<string>();
  
  state: 'idle' | 'verifying' | 'verified' = 'idle';

  ngOnInit(): void {
    this.state = 'idle';
    this.codeGenerated.emit('');
  }

  verify(): void {
    if (this.state !== 'idle') return;
    
    this.state = 'verifying';
    
    // Simulate a secure automated verification delay of 1.5s
    setTimeout(() => {
      this.state = 'verified';
      this.codeGenerated.emit('VERIFIED');
    }, 1500);
  }
}
