import React from 'react';
import LegalPage from './LegalPage';

const sections = [
  {
    heading: '1. Introduction',
    body: [
      'Welcome to IndEase. By using our platform you agree to these terms.',
      'Effective date: March 2026.'
    ]
  },
  {
    heading: '2. About the Platform',
    body: [
      'IndEase connects machine owners with repair experts.',
      'We are a marketplace, not a direct service provider.'
    ]
  },
  {
    heading: '3. User Accounts',
    body: [
      'Consumer accounts are available through self-registration.',
      'Expert accounts are created by IndEase admin only.',
      'You are responsible for keeping your credentials secure.'
    ]
  },
  {
    heading: '4. Service Requests',
    body: [
      'Consumers can submit service requests for their machines.',
      'Experts can accept or decline requests.',
      'IndEase does not guarantee availability of experts.'
    ]
  },
  {
    heading: '5. Payments',
    body: [
      'All payments are processed via Razorpay.',
      'The platform fee is 10% of the service amount.',
      'GST of 18% applies on the platform fee.',
      'Refunds are subject to service completion status.'
    ]
  },
  {
    heading: '6. Expert Obligations',
    body: [
      'Experts must respond to requests within 24 hours.',
      'Declining requests repeatedly will affect performance level.',
      'Inactivity for 10 or more days will result in point deduction.'
    ]
  },
  {
    heading: '7. Consumer Obligations',
    body: [
      'Consumers must provide accurate machine information.',
      'False fault reports may result in account suspension.'
    ]
  },
  {
    heading: '8. Intellectual Property',
    body: [
      'All content on IndEase is owned by IndEase Systems.'
    ]
  },
  {
    heading: '9. Limitation of Liability',
    body: [
      'IndEase is not liable for damages caused during repair.',
      'We facilitate connection only.'
    ]
  },
  {
    heading: '10. Termination',
    body: [
      'IndEase reserves the right to suspend accounts for violation of these terms.'
    ]
  },
  {
    heading: '11. Contact',
    body: [
      'For questions about these terms, contact support@indease.com.'
    ]
  }
];

function TermsPage() {
  return <LegalPage title="Terms & Conditions" effectiveDate="March 2026" sections={sections} />;
}

export default TermsPage;
