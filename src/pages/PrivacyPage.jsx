import React from 'react';
import LegalPage from './LegalPage';

const sections = [
  {
    heading: '1. What data we collect',
    body: [
      'We collect your name, email, and phone number.',
      'We collect machine details, chat messages, and service history.',
      'Payment information is processed by Razorpay and is not stored by us.'
    ]
  },
  {
    heading: '2. How we use your data',
    body: [
      'We use your data to connect consumers with experts.',
      'We use your data to process payments.',
      'We use your data to send notifications and emails.',
      'We use your data to improve the platform.'
    ]
  },
  {
    heading: '3. Data sharing',
    body: [
      'We share your name and contact information with matched experts only.',
      'We do not sell your data to third parties.',
      'Payment data is handled by Razorpay.'
    ]
  },
  {
    heading: '4. Data security',
    body: [
      'All data is encrypted.',
      'Passwords are hashed.'
    ]
  },
  {
    heading: '5. Your rights',
    body: [
      'You can request deletion of your account and data.',
      'Contact support@indease.com to make a request.'
    ]
  },
  {
    heading: '6. Cookies',
    body: [
      'We use cookies for authentication only.'
    ]
  },
  {
    heading: '7. Contact',
    body: [
      'For privacy questions, contact support@indease.com.'
    ]
  }
];

function PrivacyPage() {
  return <LegalPage title="Privacy Policy" effectiveDate="March 2026" sections={sections} />;
}

export default PrivacyPage;
